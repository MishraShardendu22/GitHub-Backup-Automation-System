from config.settings import settings
from langchain_openrouter import ChatOpenRouter

def get_llm() -> ChatOpenRouter:
    return ChatOpenRouter(
        model=settings.OPENROUTER_MODEL,
        api_key=settings.OPENROUTER_API_KEY,
        temperature=0.5,
    )