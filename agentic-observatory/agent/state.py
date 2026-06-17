from typing import TypedDict, Any

class AgentState(TypedDict):
    answer: str
    question: str
    context: dict[str, Any]
    tool_results: list[dict[str, Any]]