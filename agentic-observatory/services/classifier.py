from agent.models import ClassificationOutput
from clients.openrouter import get_llm
from agent.prompts.classifier import CLASSIFIER_PROMPT
from langchain_core.messages import HumanMessage, SystemMessage


async def classify_question(question: str):
    llm = get_llm()

    structured_llm = llm.with_structured_output(
        ClassificationOutput
    )

    result = await structured_llm.ainvoke(
        [
            SystemMessage(content=CLASSIFIER_PROMPT),
            HumanMessage(content=question),
        ]
    )

    print(result)

    if result is None:
        raise ValueError(
            f"Failed to classify question: {question}"
        )

    return result.classification