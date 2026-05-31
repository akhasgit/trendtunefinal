# module4.py

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import get_openai_api_key

def finalize_answer(responses: list[str]) -> str:
    """
    Uses GPT-4o to intelligently combine product and trend analysis
    into a cohesive final recommendation.
    """
    if not responses:
        return "Sorry, I couldn't find any data to answer your question."

    if len(responses) == 1:
        return responses[0]

    chat = ChatOpenAI(model="gpt-4o", temperature=0, api_key=get_openai_api_key())

    system_prompt = """
You are a retail insight composer AI.

You will be given two responses:
1. A product analysis (e.g. inventory or stock info)
2. A trend analysis (e.g. market demand, seasonality)

Your job is to:
- Read both.
- Compose a single clear, professional response.
- Remove any duplication.
- Explain insights in a helpful, actionable way for a business user.
- Use markdown formatting (headings, bullets, paragraphs).
- Use a confident tone. Do not hedge or speculate.
"""

    user_prompt = f"""
Here are the two pieces of information to combine:

--- PRODUCT INFO ---
{responses[0]}

--- TREND INFO ---
{responses[1]}

Now, write one final well-structured answer.
"""

    result = chat([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])

    return result.content.strip()
