from __future__ import annotations

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
from langchain_core.messages import (
    ToolMessage,
    HumanMessage,
    SystemMessage,
)
from config import settings
from utils.logging import logger
from .prompts import SYSTEM_PROMPT
from typing import AsyncIterator
from langchain_openrouter import ChatOpenRouter
from .state import AgentResponse, ToolExecution, create_request_id, safe_serialize_payload

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

TOOLS_BY_NAME = {tool.name: tool for tool in TOOLS}

# Initialize the LLM
def get_llm() -> ChatOpenRouter:
    return ChatOpenRouter(
        temperature=0.2,
        model=settings.OPENROUTER_MODEL,
        api_key=settings.OPENROUTER_API_KEY,
        # We can pass extra_body to the LLM to tell it which tools are available for it to call
        # Open has web search tool, we can tell the LLM that it can use it by passing it in the extra_body
        # extra_body={
        #     "tools": [
        #         {
        #             "type": "openrouter:web_search"
        #         }
        #     ]
        # }
    )

# Bind tools to the LLM, so that it can call them when needed
def get_bound_llm():
    return get_llm().bind_tools(TOOLS, strict=True)


# Main function to invoke the agent with a user question,
# handle tool calls, and return the final answer
async def invoke_agent(question: str, request_id: str | None = None) -> AgentResponse:
    request_id = request_id or create_request_id()
    start = time.perf_counter()
    llm = get_bound_llm()

    # initialize the conversation with a system prompt and the user's question
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=question),
    ]

    logger.info(f"[request_id={request_id}] Agent question: {question}")

    # First LLM Call
    # 1.) Invoke the LLM to get the initial response, which may include tool calls
    response = await llm.ainvoke(messages)
    logger.info(f"[request_id={request_id}] === TOOL CALLS ===")
    logger.info(f"[request_id={request_id}] Tool calls: {response.tool_calls}")

    # If there are no tool calls, we can return the response directly
    # This is the case when the LLM can answer the question without needing any external data
    # This will be useful for chats when we have alred made tool calls and have data in the context, so the LLM can answer without needing to call any tools
    if not response.tool_calls:
        duration = time.perf_counter() - start
        logger.info(f"[request_id={request_id}] Agent completed in {duration:.2f}s")

        return AgentResponse(
            request_id=request_id,
            question=question,
            answer=response.content or "",
            tool_calls=[],
            tool_results=[],
        )

    # 2. Execute Tool Calls, store the tool results, and feed them back to the LLM for a final answer
    # If there are tool calls, we need to execute them and then feed the results back to the LLM
    # store the tools call results so we can use them in the final response 
    messages.append(response)
    executed_tools: list[ToolExecution] = []

    for tool_call in response.tool_calls:
        tool_args = tool_call["args"]
        tool_name = tool_call["name"]

        logger.debug(f"[request_id={request_id}] Tool args: {tool_args}")
        logger.info(f"[request_id={request_id}] Executing tool: {tool_name}")

        tool_start = time.perf_counter()
        try:
            tool = TOOLS_BY_NAME[tool_name]
            tool_result = await tool.ainvoke(tool_args)
            tool_duration_ms = (time.perf_counter() - tool_start) * 1000
            executed_tool = ToolExecution(
                name=tool_name,
                args=tool_args,
                success=True,
                duration_ms=tool_duration_ms,
                result=tool_result,
            )

            # If tools execution is successful, we store the result and feed it back to the LLM for a final answer
            executed_tools.append(executed_tool)
            messages.append(
                ToolMessage(
                    content=safe_serialize_payload(tool_result),
                    tool_call_id=tool_call["id"],
                )
            )
            logger.info(
                f"[request_id={request_id}] Tool success: {tool_name} ({tool_duration_ms:.2f}ms)"
            )
        except Exception as exc:
            tool_duration_ms = (time.perf_counter() - tool_start) * 1000
            executed_tool = ToolExecution(
                name=tool_name,
                args=tool_args,
                success=False,
                duration_ms=tool_duration_ms,
                error=str(exc),
            )

            # If tools execution fails, we store the error and feed it back to the LLM for a final answer
            executed_tools.append(executed_tool)
            messages.append(
                ToolMessage(
                    content=safe_serialize_payload(f"Tool execution failed: {str(exc)}"),
                    tool_call_id=tool_call["id"],
                )
            )
            logger.error(
                f"[request_id={request_id}] Tool failed: {tool_name} ({tool_duration_ms:.2f}ms) error={str(exc)}"
            )

    # 3. Final LLM Call
    # After executing all the tool calls, we make a final call to the LLM to get
    final_response = await llm.ainvoke(messages)

    # Log the final response and return it along with the executed tool calls and their results
    duration = time.perf_counter() - start
    logger.info(f"[request_id={request_id}] Agent completed in {duration:.2f}s")

    # Return the final response along with the executed tool calls and their results
    return AgentResponse(
        request_id=request_id,
        question=question,
        answer=final_response.content or "",
        tool_calls=executed_tools,
        tool_results=[tool.dict() for tool in executed_tools],
    )


# Take a streaming LLM chunk and extract only the text from it.
# regardless of how the provider formats the chunk.
def extract_text_from_chunk(chunk) -> str:
    # get content safely, wont crash if content is not present, will return None
    content = getattr(chunk, "content", None)

    # if the content is a string, return it directly
    if isinstance(content, str):
        return content

    # if the content is a list, concatenate all the text parts and return it
    if isinstance(content, list):
        text_parts = []
        for item in content:
            # the item can be a string, apped it directly
            if isinstance(item, str):
                text_parts.append(item)

            # the item can be an object with a text attribute, get the text attribute and append it
            elif isinstance(item, dict):
                text_parts.append(item.get("text", "") or item.get("content", ""))

        # concatenate all the text parts and return it
        return "".join(text_parts)

    # some providers store text differently
    # do the above cases wiht the content_blocks attribute instead of content
    # some store it as chunk.content_blocks = [...] instead of chunk.content = [...]
    if hasattr(chunk, "content_blocks"):
        text_parts = []
        for block in getattr(chunk, "content_blocks", []) or []:
            if isinstance(block, str):
                text_parts.append(block)
            elif hasattr(block, "text"):
                text_parts.append(getattr(block, "text", ""))
            elif isinstance(block, dict):
                text_parts.append(block.get("text", "") or block.get("content", ""))
        
        # concatenate all the text parts and return it 
        return "".join(text_parts)

    # final fall back
    return ""


# an asynchronous generator function, it yields tokens asynchronously as they are generated by the LLM, and also executes tool calls and feeds the results back to the LLM for a final answer
async def _stream_final_answer(llm, messages, request_id: str, start: float) -> AsyncIterator[str]:
    async for chunk in llm.astream(messages):
        token = extract_text_from_chunk(chunk)
        if token:
            yield token

    duration = time.perf_counter() - start
    logger.info(f"[request_id={request_id}] Streamed final answer in {duration:.2f}s")

# same as invoke_agent but it streams the final answer back to the client as it is generated by the LLM, instead of waiting for the final answer to be generated and then returning it
async def stream_agent(question: str, request_id: str | None = None) -> AsyncIterator[str]:
    # if request_id is not provided, create a new one
    request_id = request_id or create_request_id()

    # start the timer to measure the total time taken by the agent to generate the final answer
    start = time.perf_counter()

    # get the LLM instance with tools bound to it
    llm = get_bound_llm()

    # initialize the conversation with a system prompt and the user's question
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=question),
    ]

    logger.info(f"[request_id={request_id}] Agent question: {question}")

    # get the tool calls from the initial response
    response = await llm.ainvoke(messages)
    logger.info(f"[request_id={request_id}] === TOOL CALLS ===")
    logger.info(f"[request_id={request_id}] Tool calls: {response.tool_calls}")

    # no tool calls means the LLM can answer the question without needing any external data
    if not response.tool_calls:
        if response.content:
            yield response.content
        return

    # If there are tool calls, we need to execute them and then feed the results back to the LLM for a final answer
    messages.append(response)
    executed_tools: list[ToolExecution] = []

    # execute the tool calls and feed the results back to the LLM for a final answer
    for tool_call in response.tool_calls:
        tool_args = tool_call["args"]
        tool_name = tool_call["name"]

        logger.debug(f"[request_id={request_id}] Tool args: {tool_args}")
        logger.info(f"[request_id={request_id}] Executing tool: {tool_name}")

        tool_start = time.perf_counter()

        # execute the tool call and handle any exceptions that may occur during execution
        try:
            tool = TOOLS_BY_NAME[tool_name]
            tool_result = await tool.ainvoke(tool_args)
            tool_duration_ms = (time.perf_counter() - tool_start) * 1000
            executed_tool = ToolExecution(
                name=tool_name,
                args=tool_args,
                success=True,
                duration_ms=tool_duration_ms,
                result=tool_result,
            )
            executed_tools.append(executed_tool)

            messages.append(
                ToolMessage(
                    content=safe_serialize_payload(tool_result),
                    tool_call_id=tool_call["id"],
                )
            )
            logger.info(
                f"[request_id={request_id}] Tool success: {tool_name} ({tool_duration_ms:.2f}ms)"
            )
        
        # in case of an exception during tool execution, we log the error and feed it back to the LLM for a final answer
        except Exception as exc:
            tool_duration_ms = (time.perf_counter() - tool_start) * 1000
            executed_tool = ToolExecution(
                name=tool_name,
                args=tool_args,
                success=False,
                duration_ms=tool_duration_ms,
                error=str(exc),
            )
            executed_tools.append(executed_tool)

            messages.append(
                ToolMessage(
                    content=f"Tool execution failed: {str(exc)}",
                    tool_call_id=tool_call["id"],
                )
            )
            logger.error(
                f"[request_id={request_id}] Tool failed: {tool_name} ({tool_duration_ms:.2f}ms) error={str(exc)}"
            )

    # stream the final answer back to the client as it is generated by the LLM
    async for token in _stream_final_answer(llm, messages, request_id, start):
        yield token
