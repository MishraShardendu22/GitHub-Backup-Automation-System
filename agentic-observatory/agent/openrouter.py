import json
import time
from data.tools import (
    list_backup_runs,
    list_execution_logs,
    fetch_backup_metrics,
    fetch_latest_backup_run,
    fetch_analytics_for_run,
    fetch_backup_run_details,
    list_historical_analytics,
    list_tracked_repositories,
    fetch_dashboard_statistics,
    fetch_latest_analytics_snapshot,
)
from config import settings
from .prompts import SYSTEM_PROMPT
from langchain_core.messages import (
    ToolMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_openrouter import ChatOpenRouter


TOOLS = [
    list_backup_runs,
    list_execution_logs,
    fetch_backup_metrics,
    fetch_latest_backup_run,
    fetch_analytics_for_run,
    fetch_backup_run_details,
    list_historical_analytics,
    list_tracked_repositories,
    fetch_dashboard_statistics,
    fetch_latest_analytics_snapshot,
]

TOOLS_BY_NAME = {
    tool.name: tool
    for tool in TOOLS
}

# Initialize the LLM
def get_llm() -> ChatOpenRouter:
    return ChatOpenRouter(
        temperature=0.2,
        model=settings.OPENROUTER_MODEL,
        api_key=settings.OPENROUTER_API_KEY,
    )

# Bind tools to the LLM, so that it can call them when needed
def get_bound_llm():
    return get_llm().bind_tools(
        TOOLS,
        strict=True,
    )

def serialize_tool_result(data) -> str:
    content = json.dumps(data)

    if len(content) > 15000:
        content = content[:15000]

    return content

async def invoke_agent(question: str):
    start = time.perf_counter()
    llm = get_bound_llm()

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=question),
    ]

    print(f"[Agent] Question: {question}")

    # First LLM call
    response = await llm.ainvoke(messages)

    print("\n=== TOOL CALLS ===")
    print(f"[Agent] Tool Calls: {response.tool_calls}")

    # No tools needed directly return the content
    if not response.tool_calls:
        duration = time.perf_counter() - start
        print(f"[Agent] Completed in {duration:.2f}s")

        return {
            "answer": response.content,
            "tool_calls": [],
        }

    # Add AI message containing tool requests
    messages.append(response)
    executed_tools = []

    # Execute every requested tool
    for tool_call in response.tool_calls:
        tool_args = tool_call["args"]
        tool_name = tool_call["name"]

        print(f"[Tool] Args: {tool_args}")
        print(f"[Tool] Executing {tool_name}")

        try:
            tool = TOOLS_BY_NAME[tool_name]
            tool_result = await tool.ainvoke(tool_args)
            executed_tools.append(
                {
                    "name": tool_name,
                    "args": tool_args,
                }
            )

            messages.append(
                ToolMessage(
                    content=serialize_tool_result(tool_result),
                    tool_call_id=tool_call["id"],
                )
            )

            print(f"[Tool] Success: {tool_name}")
        except Exception as e:
            messages.append(
                ToolMessage(
                    content=f"Tool execution failed: {str(e)}",
                    tool_call_id=tool_call["id"],
                )
            )

    # Second LLM call with tool results
    final_response = await llm.ainvoke(messages)

    duration = time.perf_counter() - start
    print(f"[Agent] Completed in {duration:.2f}s")

    return {
        "answer": final_response.content,
        "tool_calls": executed_tools,
    }