# module5.py

from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage

from config import get_openai_api_key

GENERAL_SUPPORT_PROMPT = """
You are a helpful onboarding assistant for a retail analytics platform.

When users ask general questions that don’t relate to product inventory or fashion trends,
you should:

- Explain what the platform can do
- Describe how to interact with the system
- List the kinds of questions users can ask (with examples)
- Be clear, friendly, and helpful

Do not mention that this is an AI or refer to OpenAI. Just answer like a smart assistant for the platform.
"""

def handle_general_query(prompt: str) -> str:
    chat = ChatOpenAI(model="gpt-4o", temperature=0, api_key=get_openai_api_key())
    return chat([
        SystemMessage(content=GENERAL_SUPPORT_PROMPT),
        HumanMessage(content=prompt)
    ]).content
