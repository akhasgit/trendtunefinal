import json
import os
from pathlib import Path

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, initialize_app

load_dotenv(Path(__file__).resolve().parent / ".env")


def get_openai_api_key() -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return api_key


def get_xai_api_key() -> str:
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise RuntimeError("XAI_API_KEY environment variable is not set")
    return api_key


def init_firebase() -> None:
    if firebase_admin._apps:
        return

    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path:
        cred = credentials.Certificate(credentials_path)
    else:
        raw_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not raw_json:
            raise RuntimeError(
                "Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON"
            )
        cred = credentials.Certificate(json.loads(raw_json))

    initialize_app(cred)
