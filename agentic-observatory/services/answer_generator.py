import json
from clients.openrouter import get_llm
from agent.prompts.answer import ANSWER_PROMPT
from langchain_core.messages import HumanMessage, SystemMessage

async def generate_answer(question: str,data: dict ) -> str:
    llm = get_llm()

    response = await llm.ainvoke(
        [
            SystemMessage(content=ANSWER_PROMPT),
            HumanMessage(
                content=f"""
                    Question:
                    {question}

                    Telemetry:
                    {json.dumps(data, indent=2)}
                """
            ),
        ]
    )

    return response.content