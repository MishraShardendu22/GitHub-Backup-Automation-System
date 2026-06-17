from pydantic import BaseModel
from agent.investigation_types import InvestigationType

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

class ClassificationOutput(BaseModel):
    classification: InvestigationType
