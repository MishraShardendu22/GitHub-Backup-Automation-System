from data import client
from fastapi import FastAPI
from pydantic import BaseModel
from agent import invoke_agent
from utils import success_response

app = FastAPI(
    title="Github Backup Observation Agent",
    version="1.0.0",
)

class ChatRequest(BaseModel):
    question: str

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

@app.post("/chat")
async def chat(request: ChatRequest):
    return await invoke_agent(
        request.question
    )