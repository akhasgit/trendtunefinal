from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import json

from config import get_openai_api_key

chat = ChatOpenAI(model="gpt-4o", temperature=0, api_key=get_openai_api_key())

def classify_query(prompt: str) -> dict:
    """
    Classify whether a user prompt is related to product info, trend info, or both.
    """
    system = SystemMessage(content="""
You are a classification assistant. Given a user input, return a JSON object that says whether it relates to:
1. Product-related analysis (inventory, stock, reviews, performance)
2. Trend-related analysis (fashion trends, market shifts, demand changes)
3. Both

Return ONLY in JSON format like:
{"product_related": true/false, "trend_related": true/false}
Do not explain your answer.
""")

    response = chat([system, HumanMessage(content=prompt)])
    return json.loads(response.content.strip())


def decompose_query(prompt: str, classification: dict) -> dict:
    """
    Given the classification result, decompose the original prompt into subqueries.
    """
    if classification["product_related"] and classification["trend_related"]:
        # Ask the model to split the prompt into two
        system = SystemMessage(content="""
You are a query splitting assistant.

Given a user query that asks both about product information and trend analysis,
decompose it into two subqueries:

- One purely focused on product/inventory
- One purely focused on fashion trends

Return ONLY in this JSON format:
{
  "product_subquery": "...",
  "trend_subquery": "..."
}

Be precise. Do not lose important details from the original.
""")
        response = chat([system, HumanMessage(content=prompt)])
        return json.loads(response.content.strip())

    elif classification["product_related"]:
        return {"product_subquery": prompt, "trend_subquery": None}

    elif classification["trend_related"]:
        return {"product_subquery": None, "trend_subquery": prompt}

    else:
        return {"product_subquery": None, "trend_subquery": None}