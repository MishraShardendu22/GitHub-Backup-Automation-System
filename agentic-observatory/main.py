from fastapi import FastAPI
from services.answer_generator import generate_answer
from utils.response import success_response
from clients.go_backend import GoBackendClient
from services.investigator import investigate
from services.classifier import classify_question

from agent.models import ChatRequest

client = GoBackendClient()

app = FastAPI(
    title="Github Backup Observation Agent",
    version="1.0.0",
)

@app.get("/health")
async def health_check():
    return success_response(
        data={"status": "ok"},
        message="Health check successful",
    )

@app.get("/test-backend")
async def test_backend():
    data = await client.get_dashboard_stats()
    return success_response(data=data)

@app.post("/test-investigation")
async def test_investigation(request: ChatRequest):
    classification = await classify_question(
        request.question
    )

    data = await investigate(classification)
    answer = await generate_answer(
        request.question,
        data,
    )

    return {
        "classification": classification,
        "answer": answer,
        "data": data,
    }

# @app.post("/test-classifier")
# async def test_classifier(request: ChatRequest):
#     classification = await classify_question(question=request.question)

#     return {
#         "classification": classification
#     }

# @app.get("/test-llm")
# async def test_llm():
#     llm = get_llm()
#     response = await llm.ainvoke("What is 2 + 2?")
#     return {"response": response.content}