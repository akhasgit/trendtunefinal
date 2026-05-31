from module1 import classify_query, decompose_query
from module2 import query_csv_with_agent
from module3 import analyze_trends
from module4 import finalize_answer
from datetime import datetime
from module5 import handle_general_query
from config import get_openai_api_key, get_xai_api_key, init_firebase
from firebase_admin import firestore
import time
from fastapi import FastAPI, UploadFile, File, Form, Body, Path
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
from openai import OpenAI
import requests
import pandas as pd
from typing import List, Optional
from pydantic import BaseModel
from firebase_admin import credentials, initialize_app, firestore
import firebase_admin
import os
import requests
import pandas as pd
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain.agents.agent_types import AgentType
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from typing import List, Dict
import json
import re
from openai import OpenAI
import time
from firebase_admin import credentials, initialize_app, firestore
import firebase_admin
import math
import os
import re
from fastapi import HTTPException
import pandas as pd
from openai import OpenAI
import json
from langchain_openai import ChatOpenAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain.agents.agent_types import AgentType
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.docstore.document import Document
from langchain.schema import SystemMessage, HumanMessage


app = FastAPI()

# CORS Configuration
origins = [
    "http://localhost:5173",  # Update with your frontend URL

    "*",
    "https://ttdev.vercel.app/",
    "https://*.tuneaiconsole.web.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows specific origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

class AgentRequest(BaseModel):
    prompt: str
    userid: str
    chatId: str

def clean_floats(data):
            for k, v in data.items():
                if isinstance(v, str):
                    try:
                        if "." in v or v.isdigit():
                            data[k] = float(v) if "." in v else int(v)
                    except:
                        continue
            return data



def ask_agent(prompt: str, ) -> str:
    """
    Main router function that:
    1. Classifies the input intent
    2. Decomposes the query if needed
    3. Delegates to the appropriate modules
    4. Returns the final combined response
    """
    print("🔎 Classifying user query...")
    classification = classify_query(prompt)

    print(f"➡️  Classification: {classification}")


    if not classification["product_related"] and not classification["trend_related"]:
        print("💬 General query detected → Routing to Module 5")
        return handle_general_query(prompt)

    print("🧩 Decomposing query based on classification...")
    subqueries = decompose_query(prompt, classification)

    responses = []

    if subqueries["product_subquery"]:
        print("📦 Product-related query detected → Routing to Module 2")
        product_response = query_csv_with_agent(subqueries["product_subquery"], "data.csv")
        responses.append(product_response)

    if subqueries["trend_subquery"]:
        print("📈 Trend-related query detected → Routing to Module 3")
        trend_response = analyze_trends(subqueries["trend_subquery"])
        responses.append(trend_response)

    print("🧵 Merging responses in Module 4...")
    final_response = finalize_answer(responses)

    return final_response

@app.post("/aks_ai")
async def ask_agent_endpoint(


  userid: str = Form(...),
    chatId: str = Form(...),
    prompt: str = Form(...)

):
    """
    Endpoint to ask questions to the agent.
    
    Args:
        request (AgentRequest): The request containing the prompt and optional csv_path
        
    Returns:
        AgentResponse: The response from the agent
    """



    init_firebase()

    db = firestore.client()

    try:
        messages_ref = db.collection('Sessions').document(userid).collection('chats').document(chatId).collection('messages')
        messages = list(messages_ref.stream())

        print(messages)

        if not messages:
            sorted_msgs = []
            chat_history = []

        # Parse and sort
        msg_list = []
        for msg in messages:
            data = msg.to_dict()
            timestamp = data.get("timestamp")
            if isinstance(timestamp, str):
                timestamp = datetime.strptime(timestamp, "%b %d, %Y at %I:%M:%S %p UTC%z")
            data['timestamp'] = timestamp
            msg_list.append(data)

        sorted_msgs = sorted(msg_list, key=lambda x: x['timestamp'])

        # Build chat history pairs
        chat_history = []
        temp = {}

        for msg in sorted_msgs:
            sender = msg.get("sender")
            content = msg.get("content", "")
            if sender == "user":
                if temp:  # Push old incomplete pair
                    chat_history.append(temp)
                    temp = {}
                temp["user"] = content
            elif sender == "bot":
                temp["bot"] = content
                chat_history.append(temp)
                temp = {}

        # Catch any unmatched last user message
        if temp:
            chat_history.append(temp)

        relevant_hist = chat_history[-20:]



    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})
   




    try:


        chat_context = ""
        for pair in relevant_hist :
            if "user" in pair:
                chat_context += f"User: {pair['user']}\n"
            if "bot" in pair:
                chat_context += f"Bot: {pair['bot']}\n"

        # Add current user input
        chat_context += f"User: {prompt}\n"

        # Condensation prompt
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
Answer only in text without any other formatting or markdown.
"""


        # OpenAI API call
        client = OpenAI(api_key=get_openai_api_key())

        response = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": chat_context}
    ],
    temperature=0.4
)

        condensed_query = response.choices[0].message.content.strip()

        print("Condensed Input:", condensed_query)



        # Utility to clean float conversion

        # === Firestore extraction ===
        product_lists_ref = db.collection('products').document(userid).collection('productLists')
        product_lists = product_lists_ref.stream()

        products_result = {}
        reviews_result = {}

        for list_doc in product_lists:
            list_id = list_doc.id

            # Products
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

            # Reviews
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

        # === Data structuring ===
        data = {
            "products": products_result,
            "reviews": reviews_result
        }

        # Flatten product data
        product_dict = {}
        for list_id, product_list in data.get("products", {}).items():
            for name, product in product_list.items():
                pname = product["productName"]
                if pname not in product_dict:
                    product_dict[pname] = {
                        "productName": pname,
                        "productDescription": product["productDescription"].strip("\""),
                        "productQuantity": product["productQuantity"]
                    }

        # Flatten review data
        review_rows = []
        for list_id, product_reviews in data.get("reviews", {}).items():
            for product_name, review_data in product_reviews.items():
                review_rows.append({
                    "productName": review_data["productName"],
                    "review": review_data["review"].strip("\""),
                    "sentiment": review_data["sentiment"].strip("\"")
                })

        try:
            # Convert to DataFrames
            product_df = pd.DataFrame(product_dict.values())
            review_df = pd.DataFrame(review_rows)

            print(product_df.head(), review_df.head(), "`DATA`")

            # Check if either DataFrame is empty
            if product_df.empty and review_df.empty:
                # Both are empty, create empty DataFrame with specified columns
                enriched_review_df = pd.DataFrame(columns=['productName', 'productDescription', 'productQuantity'])
            elif product_df.empty:
                # Only product_df is empty, use review_df
                enriched_review_df = review_df
            elif review_df.empty:
                # Only review_df is empty, use product_df
                enriched_review_df = product_df
            else:
                # Both have data, merge them
                enriched_review_df = review_df.merge(product_df, on="productName", how="left")

            # Save to CSV
            enriched_review_df.to_csv("data.csv", index=False)
            print("we here")

        except Exception as e:
            # If any error occurs, create empty DataFrame with specified columns
            enriched_review_df = pd.DataFrame(columns=['productName', 'productDescription', 'productQuantity'])
            enriched_review_df.to_csv("data.csv", index=False)
            print(f"Error creating DataFrame: {str(e)}")
        
        try:
            response = ask_agent(condensed_query)
        except Exception as e:
            print(e , "error")
            response = ask_agent(prompt)
            
        try:
            print(response , type(response) , response.keys())
            return response["output"]
        except Exception as e:
            print(e , "error")
            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




####################################NEW CHAT AGENT############################################################################################################

def clean_floats(data):
            for k, v in data.items():
                if isinstance(v, str):
                    try:
                        if "." in v or v.isdigit():
                            data[k] = float(v) if "." in v else int(v)
                    except:
                        continue
            return data







def classify_query_mode_2(prompt: str) -> list:
    
    client = OpenAI(api_key=get_openai_api_key())

    system = {
        "role": "system",
        "content": """
You are a product query decomposition assistant. Given a user input, decompose it into a list of subqueries that extract relevant information from a product list. Do not perform any analysis or reasoning — your job is to generate actionable subqueries only.

Each subquery must be returned in JSON format with:
- \"type\": either 'vector' or 'table'
- \"query\": a natural language sub-query that retrieves the required product data

Use these rules:
- Use 'vector' for semantic or fuzzy matching (e.g., identifying products matching trends, concepts, or vague categories like 'hat items', 'eco-friendly shoes').
- Use 'table' for structured operations (e.g., filter by price, count items, retrieve quantity, check average rating).

⚠️ You are not responsible for performing the final reasoning or recommendation logic. Only extract data needed to support it.

Ask clarifying questions if the input is too vague or ambiguous.

### Examples:

#### User Input:
What products align with the Gen Z wellness trend, and should I restock them?

#### Output:
[
  {\"type\": \"vector\", \"query\": \"Identify products that align with the Gen Z wellness trend\"},
  {\"type\": \"table\", \"query\": \"Retrieve current stock quantities for the identified products\"}
]

#### User Input:
How many of our organic cotton items are priced under $50?

#### Output:
[
  {\"type\": \"vector\", \"query\": \"Find all products made of organic cotton\"},
  {\"type\": \"table\", \"query\": \"Filter those items with price under $50 and return the count\"}
]

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

    # Clean out triple backticks if present
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
You are a trend crawler assistant that returns well-structured, JSON-formatted trend data.

Given the following:
- **User Query**: {trend_query}

Your task is to return a list of up to 5 emerging *fashion* trends relevant to the implied audience and region (e.g., if the user mentions '40–50 year old Singaporean mothers', infer and use that in the response). For each trend, include:
1. **name** – The trend name (e.g., 'Quiet Luxury', 'Modern Cheongsam Revival')
2. **demographic** – The inferred audience descriptor
3. **last_6_months** – An array of monthly popularity scores (length: 6)
4. **next_12_months_forecast** – An array of projected popularity scores (length: 12)
5. **products** – A list of 2–3 *fashion products* tied to the trend. For each product, include:
   - title
   - description
   - reviewStars (float) – indicate the source platform (e.g., Lazada, Zalora, Shopee)
   - price (float) – indicate the marketplace or average from multiple platforms
   - monthlySales (int) – specify if this is an estimate or based on public data
   - monthlyRevenue (float) – specify how it is calculated (e.g., price × monthlySales)
   - sourceNotes – a short explanation of where and how each numeric field was derived

Only return fashion-related data that is relevant to the input demographic and region. Format the entire response strictly in JSON.
"""

    payload = {
        "messages": [
            {
                "role": "user",
                "content": system_prompt
            }
        ],
        "search_parameters": {
            "mode": "auto"
        },
        "model": "grok-3-latest"
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Request failed: {response.status_code}\n{response.text}")











# Build vector index
def build_vector_index(df: pd.DataFrame):
    texts = [str(row) for row in df["productName"]]
    docs = [Document(page_content=t) for t in texts]
    embeddings = OpenAIEmbeddings(api_key=get_openai_api_key())
    index = FAISS.from_documents(docs, embeddings)
    return index

# Follow-up prompt synthesizer
def synthesize_followup_prompt(prev_output: str, next_task: str) -> str:


    
    client = OpenAI(api_key=get_openai_api_key())

    messages = [
        {
            "role": "system",
            "content": (
                "You are a query synthesis engine for an AI assistant. "
                "Your job is to generate a precise, information-rich natural language query for the next task, "
                "based on the context of the previous output. "
                "\n\nGuidelines:\n"
                "- Extract and preserve key entities, product categories, metrics, or terms from the previous result.\n"
                "- Ensure the synthesized prompt is logically aligned with the next task.\n"
                "- Include numerical data or product types if they help narrow down the next query.\n"
                "- Avoid generalities — be specific and useful for querying a structured product database.\n"
                "- Think like a data analyst: translate context into actionable query logic.\n"
                "- Output only the new prompt — do not add explanations or meta commentary."
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
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0
    )
    
    return response.choices[0].message.content.strip()

# Query pipeline
def run_query_pipeline(subqueries: List[Dict[str, str]]) -> str:
    context = ""
    index = None
    last_output = ""
    df = pd.read_csv("data.csv")

    client = OpenAI(api_key=get_openai_api_key())

    print(subqueries , "subqueries")

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
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=vector_prompt,
                temperature=0.3
            )
            vector_result = response.choices[0].message.content.strip()
            context += f"\n🧠 Vector Insight:\n{vector_result}\n"
            
            last_output = vector_result

        elif query_type == "table":
            followup_prompt = synthesize_followup_prompt(last_output, query_text)
            print(followup_prompt , "followup")

            df_summary = df.describe(include="all").to_string()


            messages = [
                {"role": "system", "content": "You are a smart assistant that can understand a data summary and help interpret user queries about it."},
                {"role": "user", "content": f"The following is the summary of a DataFrame:\n\n{df_summary}\n\nUser query: {followup_prompt}\n\nRewrite or refine the user query so it aligns with the structure and columns of the DataFrame."}
            ]

            # Make the call
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0,
                #BAS
                
            )

            # Extract result
            refined_prompt = response.choices[0].message.content.strip()
            print(refined_prompt)



            chat_agent = create_pandas_dataframe_agent(
                ChatOpenAI(model="gpt-4o", temperature=0,api_key=get_openai_api_key())  ,
                df,
                verbose=True,
                agent_type=AgentType.OPENAI_FUNCTIONS,
                allow_dangerous_code=True
            )
            table_result = chat_agent.invoke(refined_prompt)
            context += f"\n📊 Table Insight:\n{table_result}\n"
            last_output = table_result

        else:
            context += f"\n⚠️ Unknown query type: {query_type}"

    return context.strip()



def summarize_pipeline_output(pipeline_output: str) -> str:
    """
    Takes raw multi-step AI output (semantic, table, etc.) and generates a concise, user-friendly summary.
    """

    system_prompt = (
        "You are a post-processing assistant. Your job is to clean up and correct the final output from a multi-step AI system.\n\n"
        "The input may contain semantic search results, product listings, and tabular answers.\n\n"
        "Your task is to:\n"
        "- Remove irrelevant or incorrect items.\n"
        "- Fix misclassifications (e.g., if a non-product is listed as a product).\n"
        "- Keep only the most relevant information.\n"
        "- Output a **clean, corrected final user-facing message** with no extra commentary.\n\n"
        "Avoid repeating the same information. Do not include system headings like 'Vector Insight' or 'Table Insight'."
    )

    client = OpenAI(api_key=get_openai_api_key())  # Replace with your key


    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Here is the AI output:\n\n{pipeline_output}"}
    ]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2
    )

    return response.choices[0].message.content.strip()









def trend_agent(prompt):
    print(prompt , "prompt")
    trend_ans = query_trend_api(prompt)['choices'][0]['message']['content']
    return trend_ans

# 📦 SKU Agent — dummy or real CSV-backed query handler
def sku_agent(prompt):
    ans = classify_query_mode_2(prompt)
    response = run_query_pipeline(ans)
    print( "response")
    # response = summarize_pipeline_output(response)
    return response






def insight_synthesizer(trend_text: str, sku_result: str) -> str:
    print( "trend_text" , trend_text , "sku_result" , sku_result )
    client = OpenAI(api_key=get_openai_api_key())
    system = {
        "role": "system",
        "content": (


 """
You are a fashion business analyst assistant. Your job is to deliver a clear, natural, and insightful summary for a retail or brand manager based on the input below.

You may receive:
- Descriptions of recent or emerging fashion trends
- Product or inventory performance insights (e.g., ratings, pricing, sales, or customer feedback)

Write like you're a smart, experienced strategist — someone who understands fashion, reads trends, and knows how to translate raw data into clear, useful insight for decision-makers.

Use a tone that is confident, human, and conversational — like you're drafting a short internal email or briefing note for a brand director who values clarity over fluff.

If — and only if — certain data would genuinely be clearer when visualized, you may include a visual aid using the following formats. Only use these flags if they help highlight something important that cannot be easily understood from the text alone.

---

📈 **For charts** (e.g., trend evolution, review score changes, monthly sales):
Use `\\c` and `\\cx` to wrap two arrays:
- First array: list of numeric values to plot
- Second array: `[Y-axis label, X-axis label]` as plain strings

✅ Use this only if the trend or sequence is important to communicate visually.

Example:
"This trend shows strong early momentum, followed by a dip:  
\\c  
[23, 42, 56, 62, 71, 34, 31, 20, 8, 10, 6, 2], ["Trend Score", "Month"]  
\\cx"

---

📊 **For tables** (e.g., SKU comparisons, price vs. rating):
Use `\\t` and `\\tx` to wrap the table as a dictionary object.

Structure:
- `"columns"`: list of column headers
- `"rows"`: list of row data (as lists)

✅ Only include this if multiple items are being compared and the table helps clarify value or ranking.

Example:
\\t
{
  "columns": ["Product", "Rating", "Price", "Monthly Sales"],
  "rows": [
    ["Knit Cardigan", 4.2, 48, 320],
    ["Linen Midi Dress", 4.5, 69, 275],
    ["Wide-Leg Navy Trousers", 4.7, 59, 410]
  ]
}
\\tx

---

⚠️ Guidelines:
- Use `\\c` or `\\t` flags **only when the visual adds meaningful clarity.** Don’t include them unless they improve the reader’s understanding.
- Never wrap your full response — only the specific parts where the visual applies.
- Never explain the flags or call attention to them.
- Don’t mention missing data — just focus on what’s provided.
- When surfacing insights, be subtle and constructive — not overly critical.
- Avoid sounding robotic or formulaic. You're here to help decision-makers with smart, well-reasoned insight.
"""



        )
    }

    # Build the content string without using f-strings
    content_parts = []
    if trend_text is not None and trend_text.strip():
        content_parts.append("Trend Info:\n" + trend_text)
    if sku_result is not None and sku_result.strip():
        if content_parts:  # If we already have trend info, add a separator
            content_parts.append("\n\n")
        content_parts.append("Product Info:\n" + sku_result)

    user = {
        "role": "user",
        "content": "".join(content_parts)
    }

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[system, user],
        temperature=0.9
    )

    return response.choices[0].message.content.strip()



# 🤖 LLM-Orchestrated Planner & Router
def orchestrate_with_llm(user_input):
    system = {
    "role": "system",
    "content": (
        "You are a planning orchestrator for a trend-product assistant.\n"
        "Given a user query, output:\n"
        "- trend_query: a rewritten sub-query asking about trends, inferred from the full user input\n"
        "- sku_query: a rewritten sub-query asking about SKUs, inventory, or products\n"
        "- compare: true if the user wants to compare trends vs products\n"
        "- execution_order: a list showing whether to call ['trend'], ['sku'], or both in order\n"
        "\nExample: If the user says 'How does our hat inventory compare to current fashion trends?',\n"
        "you might respond:\n"
        "{\n"
        "  \"trend_query\": \"What are the current fashion trends related to hats?\",\n"
        "  \"sku_query\": \"What is our current hat inventory?\",\n"
        "  \"compare\": true,\n"
        "  \"execution_order\": [\"sku\", \"trend\"]\n"
        "}\n"
        "Respond only with the final JSON. Do not include any explanations or markdown."
    )
}

    user = {"role": "user", "content": user_input}
    client = OpenAI(api_key=get_openai_api_key())
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[system, user],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    # 🧽 Clean markdown if GPT wrapped it
    content = re.sub(r"^```(?:json)?|```$", "", content.strip(), flags=re.MULTILINE).strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        raise ValueError(f"Failed to parse JSON:\n{content}")

    print("🔍 Decomposed Query:")
    print(json.dumps(parsed, indent=2))

    trend_text, sku_data = None, None

    if parsed["compare"]:
        if parsed["execution_order"][0] == "trend":
            trend_text = trend_agent(parsed["trend_query"])
            composed_query = f"Which products align with the following trends: {trend_text}"
            sku_data = sku_agent(composed_query)
            
            return insight_synthesizer(trend_text, sku_data)

        elif parsed["execution_order"][0] == "sku":
            sku_data = sku_agent(parsed["sku_query"])
            trend_text = trend_agent(parsed["trend_query"])
            return insight_synthesizer(trend_text, sku_data)

    elif parsed["trend_query"]:
        print( "trend_data")
        return insight_synthesizer(trend_agent(parsed["trend_query"]) , sku_data)
        # return trend_agent(parsed["trend_query"])

    elif parsed["sku_query"]:
        print( "sku_data")
        
        return insight_synthesizer(trend_text , sku_agent(parsed["sku_query"]))

    return "❌ Unable to determine a valid task from input."




@app.post("/ask_ai")
async def ask_AI(
  userid: str = Form(...),
    chatId: str = Form(...),
    prompt: str = Form(...)
):


    print(userid , chatId , prompt)

    init_firebase()

    db = firestore.client()

    try:
        messages_ref = db.collection('Sessions').document(userid).collection('chats').document(chatId).collection('messages')
        messages = list(messages_ref.stream())

        print(messages)

        if not messages:
            sorted_msgs = []
            chat_history = []

        # Parse and sort
        msg_list = []
        for msg in messages:
            data = msg.to_dict()
            timestamp = data.get("timestamp")
            if isinstance(timestamp, str):
                timestamp = datetime.strptime(timestamp, "%b %d, %Y at %I:%M:%S %p UTC%z")
            data['timestamp'] = timestamp
            msg_list.append(data)

        sorted_msgs = sorted(msg_list, key=lambda x: x['timestamp'])

        # Build chat history pairs
        chat_history = []
        temp = {}

        for msg in sorted_msgs:
            sender = msg.get("sender")
            content = msg.get("content", "")
            if sender == "user":
                if temp:  # Push old incomplete pair
                    chat_history.append(temp)
                    temp = {}
                temp["user"] = content
            elif sender == "bot":
                temp["bot"] = content
                chat_history.append(temp)
                temp = {}

        # Catch any unmatched last user message
        if temp:
            chat_history.append(temp)

        relevant_hist = chat_history[-20:]



    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})
   




    try:


        chat_context = ""
        for pair in relevant_hist :
            if "user" in pair:
                chat_context += f"User: {pair['user']}\n"
            if "bot" in pair:
                chat_context += f"Bot: {pair['bot']}\n"

        # Add current user input
        chat_context += f"User: {prompt}\n"

        # Condensation prompt
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


        # OpenAI API call
        client = OpenAI(api_key=get_openai_api_key())

        response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": chat_context}
    ],
    temperature=0.4
)

        condensed_query = response.choices[0].message.content.strip()

        print("Condensed Input:", condensed_query)



        # Utility to clean float conversion

        # === Firestore extraction ===
        product_lists_ref = db.collection('products').document(userid).collection('productLists')
        product_lists = product_lists_ref.stream()

        products_result = {}
        reviews_result = {}

        for list_doc in product_lists:
            list_id = list_doc.id

            # Products
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

            # Reviews
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

        # === Data structuring ===
        data = {
            "products": products_result,
            "reviews": reviews_result
        }

        # Flatten product data
        product_dict = {}
        for list_id, product_list in data.get("products", {}).items():
            for name, product in product_list.items():
                pname = product["productName"]
                if pname not in product_dict:
                    product_dict[pname] = {
                        "productName": pname,
                        "productDescription": product["productDescription"].strip("\""),
                        "productQuantity": product["productQuantity"]
                    }

        # Flatten review data
        review_rows = []
        for list_id, product_reviews in data.get("reviews", {}).items():
            for product_name, review_data in product_reviews.items():
                review_rows.append({
                    "productName": review_data["productName"],
                    "review": review_data["review"].strip("\""),
                    "sentiment": review_data["sentiment"].strip("\"")
                })

        try:
            # Convert to DataFrames
            product_df = pd.DataFrame(product_dict.values())
            review_df = pd.DataFrame(review_rows)

            print(product_df.head(), review_df.head(), "`DATA`")

            # Check if either DataFrame is empty
            if product_df.empty and review_df.empty:
                # Both are empty, create empty DataFrame with specified columns
                enriched_review_df = pd.DataFrame(columns=['productName', 'productDescription', 'productQuantity'])
            elif product_df.empty:
                # Only product_df is empty, use review_df
                enriched_review_df = review_df
            elif review_df.empty:
                # Only review_df is empty, use product_df
                enriched_review_df = product_df
            else:
                # Both have data, merge them
                enriched_review_df = review_df.merge(product_df, on="productName", how="left")

            # Save to CSV
            enriched_review_df.to_csv("data.csv", index=False)
            print("we here")

        except Exception as e:
            # If any error occurs, create empty DataFrame with specified columns
            enriched_review_df = pd.DataFrame(columns=['productName', 'productDescription', 'productQuantity'])
            enriched_review_df.to_csv("data.csv", index=False)
            print(f"Error creating DataFrame: {str(e)}")
        
        try:
            response = orchestrate_with_llm(condensed_query)
            
        except Exception as e:
            print(e , "error")
            response = orchestrate_with_llm(condensed_query)
            
        try:
            print(response , type(response) , response.keys())
            return response["output"]
        except Exception as e:
            print(e , "error")
            return response
    except Exception as e:
        print(e , "`ERRO`")
        raise HTTPException(status_code=500, detail=str(e))


####################################NEW CHAT AGENT############################################################################################################




####################################TREND AGENT############################################################################################################



def clean_floats(data):
            for k, v in data.items():
                if isinstance(v, str):
                    try:
                        if "." in v or v.isdigit():
                            data[k] = float(v) if "." in v else int(v)
                    except:
                        continue
            return data



def query_trend_api(trend_query: str):
    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {get_xai_api_key()}"
    }



#     system_prompt = f"""
# You are a fashion trend intelligence assistant that returns well-structured, JSON-formatted data.

# Given the following:
# - **User Query**: {trend_query}

# Return exactly one current or emerging *fashion trend* that is most relevant to the user's input.

# Respond in strict JSON format with the following fields:

# 1. **trend** – The name of the fashion trend (e.g., "Quiet Luxury")
# 2. **demographic** – A brief description of the target audience
# 3. **last_6_months** – List of 6 monthly popularity scores (scale 0–100)
# 4. **next_12_months_forecast** – List of 12 forecasted popularity scores (scale 0–100)
# 5. **products** – A list of 2–3 real fashion products tied to the trend. For each product, include:
#    - title – The real product title from Shopee, Zalora, or Lazada

# 6. **averageMonthlyRevenue** – An estimated average monthly revenue across the listed products:
#    - value – A float representing the average of (price × monthly sales volume) across the products
#    - sources – A list of up to 2 platforms used to determine price (e.g., ["Shopee", "Zalora"])
#    - volume – A list of up to 2 platforms used to estimate sales volume (e.g., ["Shopee", "Lazada"])

# 7. **revenueCalculationNotes** – A short explanation of how price and volume were estimated, including:
#    - Any assumptions made (e.g., average of similar SKUs, trending SKU sales approximations)
#    - The platforms and/or signals used (e.g., seller stats, number of reviews, platform-wide averages)

# 8. **reviewSummary** – A concise aggregation of review feedback across all listed products:
#    - positive – A list of actual positive reviews or review phrases across products
#    - negative – A list of actual negative reviews or review phrases across products

# 9. **trendDescription** – A 1–2 sentence explanation of the trend’s aesthetic, influences, key elements or/and demographics influenced.

# All data must be realistic and based on real fashion products and platforms. Use only real, verifiable product titles and reviews. If no reviews are found, return empty lists.

# Respond in strict JSON format. Do not include markdown, explanation, or extra text.
# """

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
    - sourceNotes – A short note on how you got the numbers (e.g., based on top SKUs, platform stats)

    6. **reviewSummary**:
    - positive – Actual or realistic-sounding positive review quotes or phrases
    - negative – Realistic negative review snippets
    - Use variety — not just generic praise or criticism

    7. **trendDescription** – 1–2 sentences describing the aesthetic, key elements, inspirations, or mood behind the trend. Feel free to use engaging or descriptive language.

    �� Only return **realistic, grounded data** tied to fashion. Make sure the products sound like they could actually be found online. When uncertain, base assumptions on reasonable retail logic. If data is missing (like reviews), use empty lists.

    Respond in **clean, valid JSON only** — no markdown, no extra commentary, no wrapping text.
    """


    payload = {
        "messages": [
            {
                "role": "user",
                "content": system_prompt
            }
        ],
        "search_parameters": {
            "mode": "auto"
        },
        "model": "grok-3-latest"
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Request failed: {response.status_code}\n{response.text}")


def init_firebase():
    init_firebase()



    return firestore.client()




# === GET LAST N CHAT HISTORY ===
def get_last_n_conversations(db, userid, chatId, n=20):
    try:
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
    except Exception as e:
        print(e , "`ERROss`")
        return []


# === EXTRACT TRENDS FROM CHAT ===
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
        trend_list = eval(raw_output)  # ONLY SAFE if you control the output format
        return trend_list
    except Exception as e:
        print("⚠️ Failed to parse trend list:", e)
        return []


import json



def extract_trend_data(output):
    """
    Extracts and cleans trend-related data from a model output response.
    Returns a structured dictionary with fallbacks, aligned to the new format.
    """

    # Step 1: Parse content safely
    response_content = output.get("choices", [{}])[0].get("message", {}).get("content", "{}")

    try:
        parsed_json = json.loads(response_content)
    except json.JSONDecodeError:
        print("⚠️ Error: Invalid JSON content.")
        parsed_json = {}

    # Step 2: Extract top-level trend fields
    trend_name = parsed_json.get("trend", "Unknown Trend")
    demographic = parsed_json.get("demographic", "Unknown Demographic")
    last_6_months = parsed_json.get("last_6_months", [])
    next_12_months = parsed_json.get("next_12_months_forecast", [])

    # Step 3: Extract revenue data
    avg_revenue_block = parsed_json.get("averageMonthlyRevenue", {})
    avg_revenue = avg_revenue_block.get("value", 0.0)
    revenue_sources = avg_revenue_block.get("sources", [])
    revenue_volume = avg_revenue_block.get("volume", [])

    # Step 4: Explanation for revenue calculation
    revenue_notes = parsed_json.get("revenueCalculationNotes", "No explanation provided.")

    # Step 5: Extract product details (title only)
    products = []
    for product in parsed_json.get("products", []):
        product_entry = {
            "title": product.get("title", "Unknown Title")
        }
        products.append(product_entry)

    # Step 6: Review summary (aggregated, not product-specific)
    review_summary = parsed_json.get("reviewSummary", {})
    positive_feedback = review_summary.get("positive", [])
    negative_feedback = review_summary.get("negative", [])
    trend_description = parsed_json.get("trendDescription", "No description provided.")

    # Step 7: Assemble final result
    result = {
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

        "watchList" : False,
        "trendDescription" : trend_description,

    }

    return result


def upload_analysed_trends(analysed_trends, db, user_id):
    """
    Uploads each trend in analysed_trends to:
    1. TrendsRepo/{auto_id}
    2. personalisedTrends/{user_id}/allTrends/{auto_id}
    Includes only relevant fields for TrendsRepo and personalisedTrends.
    """
    trends_repo_ref = db.collection("TrendsRepo")
    personal_ref = db.collection("personalisedTrends").document(user_id).collection("allTrends")

    for trend_name, trend_data in analysed_trends.items():
        # Generate Firestore-style auto ID
        auto_doc = trends_repo_ref.document()
        trend_id = auto_doc.id

        # Timestamp
        created_at = firestore.SERVER_TIMESTAMP

        # Build document for TrendsRepo (global repository)
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

        # Build document for personalisedTrends
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
            "relevantSKUs" : trend_data.get("relevantSKUs" , []) ,

             "lastAccessed": created_at,
            "chatUsedIn" : [],
            "remarks" : [],


        }

        # Upload to Firestore
        try:
            auto_doc.set(global_doc)
            print(f"✅ [Global] Uploaded: {trend_name} → TrendsRepo/{trend_id}")
        except Exception as e:
            print(f"❌ [Global] Failed to upload {trend_name}: {e}")

        try:
            personal_ref.document(trend_id).set(user_doc)
            print(f"✅ [User]   Uploaded: {trend_name} → personalisedTrends/{user_id}/allTrends/{trend_id}")
        except Exception as e:
            print(f"❌ [User]   Failed to upload {trend_name} for user {user_id}: {e}")


def clean_search_index(text: str):
    """Returns a lowercase string with only alphanumeric characters and spaces, split as a list"""
    cleaned = re.sub(r'[^a-zA-Z0-9 ]', '', text.lower())
    return [cleaned.strip()]


@app.post("/analyse_trends")
async def execute_trend_analysis(
        
    user_id: str = Form(...),
    chat_id: str = Form(...),
    

):
    

    db = init_firebase()
    chat_history = get_last_n_conversations(db, user_id, chat_id, n=20)


    if len(chat_history) > 0:
            trend_list = extract_trends_from_chat_history(chat_history)


    else:
            trend_list = []
            print("No chat history found.")
            return {"message": "No chat history found."}


    analysed_trends = {}
    for i in trend_list :
        queried_data = query_trend_api(i)
        cleaned_result = extract_trend_data(queried_data)
        analysed_trends[cleaned_result["trend_name"]] = cleaned_result
    upload_analysed_trends(analysed_trends, db, user_id=user_id)










####################################TREND AGENT############################################################################################################






@app.post("/generate_summary")
async def generate_summary(
  userid: str = Form(...),
    chatId: str = Form(...),
    prompt: str = Form(...)
):


    print(userid , chatId , prompt)

    init_firebase()

    db = firestore.client()

    try:
        messages_ref = db.collection('Sessions').document(userid).collection('chats').document(chatId).collection('messages')
        messages = list(messages_ref.stream())

        print(messages)

        if not messages:
            sorted_msgs = []
            chat_history = []

        # Parse and sort
        msg_list = []
        for msg in messages:
            data = msg.to_dict()
            timestamp = data.get("timestamp")
            if isinstance(timestamp, str):
                timestamp = datetime.strptime(timestamp, "%b %d, %Y at %I:%M:%S %p UTC%z")
            data['timestamp'] = timestamp
            msg_list.append(data)

        sorted_msgs = sorted(msg_list, key=lambda x: x['timestamp'])

        # Build chat history pairs
        chat_history = []
        temp = {}

        for msg in sorted_msgs:
            sender = msg.get("sender")
            content = msg.get("content", "")
            if sender == "user":
                if temp:  # Push old incomplete pair
                    chat_history.append(temp)
                    temp = {}
                temp["user"] = content
            elif sender == "bot":
                temp["bot"] = content
                chat_history.append(temp)
                temp = {}

        # Catch any unmatched last user message
        if temp:
            chat_history.append(temp)

        relevant_hist = chat_history[-20:]



    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})
   




    try:


        chat_context = ""
        for pair in relevant_hist:
            if "user" in pair:
                chat_context += f"User: {pair['user']}\n"
            if "bot" in pair:
                chat_context += f"Bot: {pair['bot']}\n"

        # Add current user input
        chat_context += f"User: {prompt}\n"

        # Summary prompt
        system_instruction = """
        You are a highly intelligent, context-aware assistant designed to summarize multi-turn conversations into clean, structured reports.

        Your job is to:
        - Analyze the entire conversation
        - Extract key objectives, outcomes, requests, and responses
        - Identify decisions, next steps, or unresolved issues if present
        - Remove filler dialogue, back-and-forth chatter, or meta-comments

        Respond with a professional, bullet-point summary of the conversation that could be used in a project log, meeting notes, or report. Keep it clear and structured. Use concise, factual language.
        """

        # OpenAI API call
        client = OpenAI(api_key=get_openai_api_key())  # truncated for safety

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": chat_context}
            ],
            temperature=0.8
        )

        summary_report = response.choices[0].message.content.strip()
        print(summary_report)
        return {"message": summary_report}

        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to get messages: {str(e)}"})






