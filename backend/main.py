from module1 import classify_query, decompose_query
from module2 import query_csv_with_agent
from module3 import analyze_trends
from module4 import finalize_answer
from module5 import handle_general_query
from config import get_openai_api_key, get_xai_api_key, init_firebase

from datetime import datetime
from firebase_admin import firestore
from fastapi import FastAPI, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Dict
import requests
import pandas as pd
import json
import re
import os
import math
import time

from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_classic.agents.agent_types import AgentType
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_floats(data):
    for k, v in data.items():
        if isinstance(v, str):
            try:
                if "." in v or v.isdigit():
                    data[k] = float(v) if "." in v else int(v)
            except:
                continue
    return data


def _get_firestore_client():
    init_firebase()
    return firestore.client()


def _load_chat_history(db, userid, chatId, n=20):
    messages_ref = db.collection('Sessions').document(userid).collection('chats').document(chatId).collection('messages')
    messages = list(messages_ref.stream())

    if not messages:
        return []

    msg_list = []
    for msg in messages:
        data = msg.to_dict()
        timestamp = data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, "%b %d, %Y at %I:%M:%S %p UTC%z")
        data['timestamp'] = timestamp
        msg_list.append(data)

    sorted_msgs = sorted(msg_list, key=lambda x: x['timestamp'])

    chat_history = []
    temp = {}
    for msg in sorted_msgs:
        sender = msg.get("sender")
        content = msg.get("content", "")
        if sender == "user":
            if temp:
                chat_history.append(temp)
                temp = {}
            temp["user"] = content
        elif sender == "bot":
            temp["bot"] = content
            chat_history.append(temp)
            temp = {}

    if temp:
        chat_history.append(temp)

    return chat_history[-n:]


def _condense_query(chat_history, prompt, model="gpt-4o"):
    chat_context = ""
    for pair in chat_history:
        if "user" in pair:
            chat_context += f"User: {pair['user']}\n"
        if "bot" in pair:
            chat_context += f"Bot: {pair['bot']}\n"
    chat_context += f"User: {prompt}\n"

    system_instruction = """
You are a highly intelligent, context-aware assistant designed to generate clean, self-contained user queries from recent conversations.

Your job is to:
- Analyze the full conversation history
- Understand what the user is *currently* asking or trying to accomplish
- Decide when to include prior context and when to ignore it (e.g. topic switch)
- Remove unnecessary back-and-forth, acknowledgments, or meta-questions
- Refocus ambiguous or fragmented user input into a single, clear objective

If the user is continuing a prior question, preserve and rephrase relevant context.
If the user has clearly shifted topics, drop prior context and refocus on the new goal.

Respond with one natural-language query that reflects the user's most useful intent in a way that can be passed to another AI or agent.
"""

    client = OpenAI(api_key=get_openai_api_key())
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": chat_context}
        ],
        temperature=0.4
    )
    return response.choices[0].message.content.strip()


def _extract_user_data_csv(db, userid):
    product_lists_ref = db.collection('products').document(userid).collection('productLists')
    product_lists = product_lists_ref.stream()

    products_result = {}
    reviews_result = {}

    for list_doc in product_lists:
        list_id = list_doc.id

        products_ref = product_lists_ref.document(list_id).collection('products')
        products = products_ref.stream()
        products_dict = {}
        for prod in products:
            prod_data = prod.to_dict()
            prod_data.pop("productAddedDate", None)
            product_name = prod_data.get("productName")
            if product_name:
                products_dict[product_name] = clean_floats(prod_data)
        products_result[list_id] = products_dict

        reviews_ref = product_lists_ref.document(list_id).collection('reviews')
        reviews = reviews_ref.stream()
        reviews_dict = {}
        for review in reviews:
            review_data = review.to_dict()
            review_data.pop("uploadedAt", None)
            product_name = review_data.get("productName")
            if product_name:
                reviews_dict[product_name] = clean_floats(review_data)
        reviews_result[list_id] = reviews_dict

    data = {"products": products_result, "reviews": reviews_result}

    product_dict = {}
    for list_id, product_list in data.get("products", {}).items():
        for name, product in product_list.items():
            pname = product["productName"]
            if pname not in product_dict:
                product_dict[pname] = {
                    "productName": pname,
                    "productDescription": product.get("productDescription", "").strip("\""),
                    "productQuantity": product.get("productQuantity", 0)
                }

    review_rows = []
    for list_id, product_reviews in data.get("reviews", {}).items():
        for product_name, review_data in product_reviews.items():
            review_rows.append({
                "productName": review_data.get("productName", ""),
                "review": review_data.get("review", "").strip("\""),
                "sentiment": review_data.get("sentiment", "").strip("\"")
            })

    try:
        product_df = pd.DataFrame(product_dict.values())
        review_df = pd.DataFrame(review_rows)

        if product_df.empty and review_df.empty:
            enriched_review_df = pd.DataFrame(columns=['productName', 'productDescription', 'productQuantity'])
        elif product_df.empty:
            enriched_review_df = review_df
        elif review_df.empty:
            enriched_review_df = product_df
        else:
            enriched_review_df = review_df.merge(product_df, on="productName", how="left")

        enriched_review_df.to_csv("data.csv", index=False)
    except Exception as e:
        enriched_review_df = pd.DataFrame(columns=['productName', 'productDescription', 'productQuantity'])
        enriched_review_df.to_csv("data.csv", index=False)
        print(f"Error creating DataFrame: {str(e)}")


# ==================== LEGACY CHAT PIPELINE (/aks_ai) ====================

def ask_agent(prompt: str) -> str:
    classification = classify_query(prompt)

    if not classification["product_related"] and not classification["trend_related"]:
        return handle_general_query(prompt)

    subqueries = decompose_query(prompt, classification)
    responses = []

    if subqueries["product_subquery"]:
        product_response = query_csv_with_agent(subqueries["product_subquery"], "data.csv")
        responses.append(product_response)

    if subqueries["trend_subquery"]:
        trend_response = analyze_trends(subqueries["trend_subquery"])
        responses.append(trend_response)

    final_response = finalize_answer(responses)
    return final_response


@app.post("/aks_ai")
async def ask_agent_endpoint(
    userid: str = Form(...),
    chatId: str = Form(...),
    prompt: str = Form(...)
):
    db = _get_firestore_client()

    try:
        relevant_hist = _load_chat_history(db, userid, chatId)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})

    try:
        condensed_query = _condense_query(relevant_hist, prompt, model="gpt-4.1")
        _extract_user_data_csv(db, userid)

        try:
            response = ask_agent(condensed_query)
        except Exception:
            response = ask_agent(prompt)

        try:
            return response["output"]
        except Exception:
            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PRIMARY CHAT PIPELINE (/ask_ai) ====================

def classify_query_mode_2(prompt: str) -> list:
    client = OpenAI(api_key=get_openai_api_key())

    system = {
        "role": "system",
        "content": """
You are a product query decomposition assistant. Given a user input, decompose it into a list of subqueries that extract relevant information from a product list. Do not perform any analysis or reasoning — your job is to generate actionable subqueries only.

Each subquery must be returned in JSON format with:
- "type": either 'vector' or 'table'
- "query": a natural language sub-query that retrieves the required product data

Use these rules:
- Use 'vector' for semantic or fuzzy matching (e.g., identifying products matching trends, concepts, or vague categories like 'hat items', 'eco-friendly shoes').
- Use 'table' for structured operations (e.g., filter by price, count items, retrieve quantity, check average rating).

Respond with only a JSON array. Do not include explanations or markdown formatting.
"""
    }

    user = {"role": "user", "content": prompt}

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[system, user],
        temperature=0
    )

    content = response.choices[0].message.content.strip()
    content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise ValueError(f"Could not parse the response as JSON:\n{content}")


def query_trend_api(trend_query: str):
    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {get_xai_api_key()}"
    }

    system_prompt = f"""
    You are a creative fashion trend intelligence assistant.

    The user is looking for insights about a specific fashion trend based on this query:

    - "{trend_query}"

    Your task is to identify **one current or emerging fashion trend** that best fits the context of the query — including the implied **demographic**, **style preferences**, and **regional cues** (e.g., age group, lifestyle, location).

    Respond with a detailed JSON object that includes the following:

    1. **trend** – The name of the trend (e.g., "Coastal Grandmother", "Modern Cheongsam Revival")
    2. **demographic** – A short description of who the trend resonates with
    3. **last_6_months** – Popularity scores from the last 6 months (array of 6 numbers, 0–100)
    4. **next_12_months_forecast** – Forecasted popularity (array of 12 numbers, 0–100)
    5. **products** – A list of 2–3 real fashion items associated with the trend. Each should include:
    - title – Actual product name found on Shopee, Zalora, or Lazada
    - description – A natural and engaging product description
    - reviewStars – A float (include source platform)
    - price – A float (include currency and platform if relevant)
    - sourceNotes – A short note on how you got the numbers

    6. **reviewSummary**:
    - positive – Actual or realistic-sounding positive review quotes or phrases
    - negative – Realistic negative review snippets

    7. **trendDescription** – 1–2 sentences describing the aesthetic, key elements, inspirations, or mood behind the trend.

    Respond in **clean, valid JSON only** — no markdown, no extra commentary, no wrapping text.
    """

    payload = {
        "messages": [{"role": "user", "content": system_prompt}],
        "search_parameters": {"mode": "auto"},
        "model": "grok-3-latest"
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Request failed: {response.status_code}\n{response.text}")


def build_vector_index(df: pd.DataFrame):
    texts = [str(row) for row in df["productName"]]
    docs = [Document(page_content=t) for t in texts]
    embeddings = OpenAIEmbeddings(api_key=get_openai_api_key())
    index = FAISS.from_documents(docs, embeddings)
    return index


def synthesize_followup_prompt(prev_output: str, next_task: str) -> str:
    client = OpenAI(api_key=get_openai_api_key())
    messages = [
        {
            "role": "system",
            "content": (
                "You are a query synthesis engine for an AI assistant. "
                "Your job is to generate a precise, information-rich natural language query for the next task, "
                "based on the context of the previous output. "
                "Output only the new prompt — do not add explanations or meta commentary."
            )
        },
        {
            "role": "user",
            "content": (
                f"### Previous Output:\n{prev_output}\n\n"
                f"### Next Task:\n{next_task}\n\n"
                f"### Synthesized Prompt:"
            )
        }
    ]
    response = client.chat.completions.create(model="gpt-4o", messages=messages, temperature=0)
    return response.choices[0].message.content.strip()


def run_query_pipeline(subqueries: List[Dict[str, str]]) -> str:
    context = ""
    index = None
    last_output = ""
    df = pd.read_csv("data.csv")
    client = OpenAI(api_key=get_openai_api_key())

    for step in subqueries:
        query_type = step["type"]
        query_text = step["query"]

        if query_type == "vector":
            if index is None:
                index = build_vector_index(df)
            docs = index.similarity_search(query_text, k=5)
            matched_context = "\n\n".join([d.page_content for d in docs])

            vector_prompt = [
                {"role": "system", "content": "You are a product search assistant. Given a user query and top product matches, summarize the relevant items and explain why they match."},
                {"role": "user", "content": f"User query: {query_text}\n\nTop matches:\n{matched_context}"}
            ]
            response = client.chat.completions.create(model="gpt-4o", messages=vector_prompt, temperature=0.3)
            vector_result = response.choices[0].message.content.strip()
            context += f"\nVector Insight:\n{vector_result}\n"
            last_output = vector_result

        elif query_type == "table":
            followup_prompt = synthesize_followup_prompt(last_output, query_text)
            df_summary = df.describe(include="all").to_string()

            messages = [
                {"role": "system", "content": "You are a smart assistant that can understand a data summary and help interpret user queries about it."},
                {"role": "user", "content": f"The following is the summary of a DataFrame:\n\n{df_summary}\n\nUser query: {followup_prompt}\n\nRewrite or refine the user query so it aligns with the structure and columns of the DataFrame."}
            ]
            response = client.chat.completions.create(model="gpt-4o", messages=messages, temperature=0)
            refined_prompt = response.choices[0].message.content.strip()

            chat_agent = create_pandas_dataframe_agent(
                ChatOpenAI(model="gpt-4o", temperature=0, api_key=get_openai_api_key()),
                df,
                verbose=True,
                agent_type=AgentType.OPENAI_FUNCTIONS,
                allow_dangerous_code=True
            )
            table_result = chat_agent.invoke(refined_prompt)
            context += f"\nTable Insight:\n{table_result}\n"
            last_output = table_result
        else:
            context += f"\nUnknown query type: {query_type}"

    return context.strip()


def summarize_pipeline_output(pipeline_output: str) -> str:
    system_prompt = (
        "You are a post-processing assistant. Your job is to clean up and correct the final output from a multi-step AI system.\n\n"
        "The input may contain semantic search results, product listings, and tabular answers.\n\n"
        "Your task is to:\n"
        "- Remove irrelevant or incorrect items.\n"
        "- Fix misclassifications.\n"
        "- Keep only the most relevant information.\n"
        "- Output a clean, corrected final user-facing message with no extra commentary.\n\n"
        "Avoid repeating the same information."
    )

    client = OpenAI(api_key=get_openai_api_key())
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Here is the AI output:\n\n{pipeline_output}"}
    ]
    response = client.chat.completions.create(model="gpt-4o", messages=messages, temperature=0.2)
    return response.choices[0].message.content.strip()


def trend_agent(prompt):
    trend_ans = query_trend_api(prompt)['choices'][0]['message']['content']
    return trend_ans


def sku_agent(prompt):
    ans = classify_query_mode_2(prompt)
    response = run_query_pipeline(ans)
    return response


def insight_synthesizer(trend_text: str, sku_result: str) -> str:
    client = OpenAI(api_key=get_openai_api_key())
    system = {
        "role": "system",
        "content": """
You are a fashion business analyst assistant. Your job is to deliver a clear, natural, and insightful summary for a retail or brand manager based on the input below.

You may receive:
- Descriptions of recent or emerging fashion trends
- Product or inventory performance insights

Write like you're a smart, experienced strategist — someone who understands fashion, reads trends, and knows how to translate raw data into clear, useful insight for decision-makers.

If — and only if — certain data would genuinely be clearer when visualized, you may include a visual aid using the following formats:

For charts: Use \\c and \\cx to wrap two arrays:
- First array: list of numeric values to plot
- Second array: [Y-axis label, X-axis label]

For tables: Use \\t and \\tx to wrap a dictionary object with "columns" and "rows".

Guidelines:
- Use \\c or \\t flags only when the visual adds meaningful clarity.
- Never wrap your full response — only the specific parts where the visual applies.
- Don't mention missing data — just focus on what's provided.
"""
    }

    content_parts = []
    if trend_text is not None and trend_text.strip():
        content_parts.append("Trend Info:\n" + trend_text)
    if sku_result is not None and sku_result.strip():
        if content_parts:
            content_parts.append("\n\n")
        content_parts.append("Product Info:\n" + sku_result)

    user = {"role": "user", "content": "".join(content_parts)}

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[system, user],
        temperature=0.9
    )
    return response.choices[0].message.content.strip()


def orchestrate_with_llm(user_input):
    system = {
        "role": "system",
        "content": (
            "You are a planning orchestrator for a trend-product assistant.\n"
            "Given a user query, output:\n"
            "- trend_query: a rewritten sub-query asking about trends\n"
            "- sku_query: a rewritten sub-query asking about SKUs, inventory, or products\n"
            "- compare: true if the user wants to compare trends vs products\n"
            "- execution_order: a list showing whether to call ['trend'], ['sku'], or both in order\n"
            "Respond only with the final JSON. Do not include any explanations or markdown."
        )
    }

    user = {"role": "user", "content": user_input}
    client = OpenAI(api_key=get_openai_api_key())
    response = client.chat.completions.create(model="gpt-4o", messages=[system, user], temperature=0)

    content = response.choices[0].message.content.strip()
    content = re.sub(r"^```(?:json)?|```$", "", content.strip(), flags=re.MULTILINE).strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        raise ValueError(f"Failed to parse JSON:\n{content}")

    trend_text, sku_data = None, None

    if parsed.get("compare"):
        if parsed["execution_order"][0] == "trend":
            trend_text = trend_agent(parsed["trend_query"])
            composed_query = f"Which products align with the following trends: {trend_text}"
            sku_data = sku_agent(composed_query)
            return insight_synthesizer(trend_text, sku_data)
        elif parsed["execution_order"][0] == "sku":
            sku_data = sku_agent(parsed["sku_query"])
            trend_text = trend_agent(parsed["trend_query"])
            return insight_synthesizer(trend_text, sku_data)

    elif parsed.get("trend_query"):
        return insight_synthesizer(trend_agent(parsed["trend_query"]), sku_data)

    elif parsed.get("sku_query"):
        return insight_synthesizer(trend_text, sku_agent(parsed["sku_query"]))

    return "Unable to determine a valid task from input."


@app.post("/ask_ai")
async def ask_AI(
    userid: str = Form(...),
    chatId: str = Form(...),
    prompt: str = Form(...)
):
    db = _get_firestore_client()

    try:
        relevant_hist = _load_chat_history(db, userid, chatId)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})

    try:
        condensed_query = _condense_query(relevant_hist, prompt)
        _extract_user_data_csv(db, userid)

        try:
            response = orchestrate_with_llm(condensed_query)
        except Exception as e:
            print(e, "error in orchestrate_with_llm")
            response = orchestrate_with_llm(condensed_query)

        try:
            return response["output"]
        except Exception:
            return response
    except Exception as e:
        print(e, "ERROR")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TREND ANALYSIS ENDPOINT ====================

def extract_trends_from_chat_history(chat_turns):
    client = OpenAI(api_key=get_openai_api_key())

    convo = "\n\n".join(
        [f"User: {c.get('user', '')}\nBot: {c.get('bot', '')}" for c in chat_turns]
    )

    trend_extraction_prompt = f"""
From the conversation below, extract up to 5 specific fashion, consumer, or product trends the user is interested in.
Return only a plain Python list of trend names — no descriptions, no bullets, no markdown. Just the list.

Conversation:
{convo}
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a trend extractor assistant."},
            {"role": "user", "content": trend_extraction_prompt}
        ],
        temperature=0.2
    )

    raw_output = response.choices[0].message.content.strip()
    try:
        trend_list = json.loads(raw_output)
        return trend_list
    except Exception:
        try:
            trend_list = eval(raw_output)
            return trend_list
        except Exception:
            return []


def extract_trend_data(output):
    response_content = output.get("choices", [{}])[0].get("message", {}).get("content", "{}")

    try:
        parsed_json = json.loads(response_content)
    except json.JSONDecodeError:
        parsed_json = {}

    trend_name = parsed_json.get("trend", "Unknown Trend")
    demographic = parsed_json.get("demographic", "Unknown Demographic")
    last_6_months = parsed_json.get("last_6_months", [])
    next_12_months = parsed_json.get("next_12_months_forecast", [])

    avg_revenue_block = parsed_json.get("averageMonthlyRevenue", {})
    avg_revenue = avg_revenue_block.get("value", 0.0)
    revenue_sources = avg_revenue_block.get("sources", [])
    revenue_volume = avg_revenue_block.get("volume", [])

    revenue_notes = parsed_json.get("revenueCalculationNotes", "No explanation provided.")

    products = []
    for product in parsed_json.get("products", []):
        products.append({"title": product.get("title", "Unknown Title")})

    review_summary = parsed_json.get("reviewSummary", {})
    positive_feedback = review_summary.get("positive", [])
    negative_feedback = review_summary.get("negative", [])
    trend_description = parsed_json.get("trendDescription", "No description provided.")

    return {
        "trend_name": trend_name,
        "demographic": demographic,
        "last_6_months": last_6_months if isinstance(last_6_months, list) else [],
        "next_12_months_forecast": next_12_months if isinstance(next_12_months, list) else [],
        "averageMonthlyRevenue": {
            "value": avg_revenue if isinstance(avg_revenue, (float, int)) else 0.0,
            "sources": revenue_sources if isinstance(revenue_sources, list) else [],
            "volume": revenue_volume if isinstance(revenue_volume, list) else []
        },
        "revenueCalculationNotes": revenue_notes,
        "products": products,
        "reviewSummary": {
            "positive": positive_feedback if isinstance(positive_feedback, list) else [],
            "negative": negative_feedback if isinstance(negative_feedback, list) else []
        },
        "watchList": False,
        "trendDescription": trend_description,
    }


def clean_search_index(text: str):
    cleaned = re.sub(r'[^a-zA-Z0-9 ]', '', text.lower())
    return [cleaned.strip()]


def upload_analysed_trends(analysed_trends, db, user_id):
    trends_repo_ref = db.collection("TrendsRepo")
    personal_ref = db.collection("personalisedTrends").document(user_id).collection("allTrends")

    for trend_name, trend_data in analysed_trends.items():
        auto_doc = trends_repo_ref.document()
        trend_id = auto_doc.id
        created_at = firestore.SERVER_TIMESTAMP

        global_doc = {
            "trend_name": trend_data.get("trend_name", "Unnamed Trend"),
            "demographic": trend_data.get("demographic", ""),
            "last_6_months": trend_data.get("last_6_months", []),
            "next_12_months_forecast": trend_data.get("next_12_months_forecast", []),
            "averageMonthlyRevenue": trend_data.get("averageMonthlyRevenue", {}),
            "revenueCalculationNotes": trend_data.get("revenueCalculationNotes", ""),
            "products": trend_data.get("products", []),
            "reviewSummary": trend_data.get("reviewSummary", {}),
            "trendDescription": trend_data.get("trendDescription", ""),
            "numberOnWatchList": 0,
            "created_at": created_at
        }

        trend_name_cleaned = trend_data.get("trend_name", "").strip()
        user_doc = {
            "trendId": trend_id,
            "trendName": trend_name_cleaned,
            "trendSearchIndex": clean_search_index(trend_name_cleaned),
            "watchList": False,
            "recent": True,
            "recommended": False,
            "trendDescription": trend_data.get("trendDescription", ""),
            "demographic": trend_data.get("demographic", ""),
            "relevantSKUs": trend_data.get("relevantSKUs", []),
            "lastAccessed": created_at,
            "chatUsedIn": [],
            "remarks": [],
        }

        try:
            auto_doc.set(global_doc)
        except Exception as e:
            print(f"Failed to upload {trend_name}: {e}")

        try:
            personal_ref.document(trend_id).set(user_doc)
        except Exception as e:
            print(f"Failed to upload {trend_name} for user {user_id}: {e}")


@app.post("/analyse_trends")
async def execute_trend_analysis(
    user_id: str = Form(...),
    chat_id: str = Form(...),
):
    db = _get_firestore_client()
    chat_history = _load_chat_history(db, user_id, chat_id, n=20)

    if len(chat_history) > 0:
        trend_list = extract_trends_from_chat_history(chat_history)
    else:
        return {"message": "No chat history found."}

    analysed_trends = {}
    for i in trend_list:
        queried_data = query_trend_api(i)
        cleaned_result = extract_trend_data(queried_data)
        analysed_trends[cleaned_result["trend_name"]] = cleaned_result

    upload_analysed_trends(analysed_trends, db, user_id=user_id)
    return {"message": f"Analysed {len(analysed_trends)} trends successfully."}


# ==================== SUMMARY ENDPOINT ====================

@app.post("/generate_summary")
async def generate_summary(
    userid: str = Form(...),
    chatId: str = Form(...),
    prompt: str = Form(...)
):
    db = _get_firestore_client()

    try:
        relevant_hist = _load_chat_history(db, userid, chatId)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})

    try:
        chat_context = ""
        for pair in relevant_hist:
            if "user" in pair:
                chat_context += f"User: {pair['user']}\n"
            if "bot" in pair:
                chat_context += f"Bot: {pair['bot']}\n"
        chat_context += f"User: {prompt}\n"

        system_instruction = """
        You are a highly intelligent, context-aware assistant designed to summarize multi-turn conversations into clean, structured reports.

        Your job is to:
        - Analyze the entire conversation
        - Extract key objectives, outcomes, requests, and responses
        - Identify decisions, next steps, or unresolved issues if present
        - Remove filler dialogue, back-and-forth chatter, or meta-comments

        Respond with a professional, bullet-point summary of the conversation that could be used in a project log, meeting notes, or report. Keep it clear and structured. Use concise, factual language.
        """

        client = OpenAI(api_key=get_openai_api_key())
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": chat_context}
            ],
            temperature=0.8
        )

        summary_report = response.choices[0].message.content.strip()
        return {"message": summary_report}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to generate summary: {str(e)}"})
