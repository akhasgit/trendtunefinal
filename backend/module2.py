# module2.py

import pandas as pd
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain.agents.agent_types import AgentType
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage

from config import get_openai_api_key

def query_csv_with_agent(prompt: str, csv_path: str = None) -> str:
    chat = ChatOpenAI(
        temperature=0,
        model="gpt-4o",
        api_key=get_openai_api_key(),
    )

    if not csv_path or csv_path.strip() == "":
        system = SystemMessage(
            content="No CSV data is loaded. Please upload your product/review CSV file to proceed."
        )
        human = HumanMessage(content=prompt)
        return chat([system, human]).content

    df = pd.read_csv(csv_path)

    

    
    agent = create_pandas_dataframe_agent(
        chat,
        df,
        verbose=True,
        agent_type=AgentType.OPENAI_FUNCTIONS,
        allow_dangerous_code=True
    )
    return agent.invoke(prompt)
