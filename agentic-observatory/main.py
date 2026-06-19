import json
from data import client
from pathlib import Path
from data.db import init_db
from contextlib import asynccontextmanager
from utils.reports import (
    REPORT_DIR,
    normalize_recipients,
    render_report_html,
    send_email,
)
from datetime import datetime
from pydantic import BaseModel
from utils.response import success_response
from agent import invoke_agent, stream_agent
from data.persistence import persistence_store
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from agent.state import InvestigationRecord, ReportRequest, ReportSendRequest, ToolExecution
from fastapi import Depends, FastAPI, HTTPException, Query, status
from utils.auth import authenticate_user, create_access_token, get_current_user, TokenResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Github Backup Observation Agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://github.mishrashardendu22.is-a.dev", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None


class CreateSessionRequest(BaseModel):
    id: str | None = None
    session_name: str | None = None
    metadata: dict | None = None


class RenameSessionRequest(BaseModel):
    session_name: str


class ConfirmRequest(BaseModel):
    confirm_id: str
    approve: bool


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


@app.post("/auth/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not authenticate_user(form_data.username, form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": form_data.username})
    return TokenResponse(access_token=access_token)


@app.post("/sessions")
async def create_session(request: CreateSessionRequest, current_user: str = Depends(get_current_user)):
    session = await persistence_store.create_session(
        session_id=request.id,
        session_name=request.session_name,
        metadata=request.metadata,
    )
    return success_response(data=session, message="Session created successfully")


@app.get("/sessions")
async def list_sessions(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    sessions = await persistence_store.list_sessions(limit=limit, offset=offset)
    return success_response(data=sessions, message="Sessions list retrieved")


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = await persistence_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return success_response(data=session, message="Session retrieved")


@app.patch("/sessions/{session_id}")
async def rename_session(
    session_id: str,
    request: RenameSessionRequest,
    current_user: str = Depends(get_current_user),
):
    session = await persistence_store.rename_session(session_id, request.session_name)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return success_response(data=session, message="Session renamed successfully")


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: str = Depends(get_current_user)):
    success = await persistence_store.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return success_response(data={"success": True}, message="Session deleted successfully")


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    messages = await persistence_store.get_session_messages(session_id)
    return success_response(data=messages, message="Session messages retrieved")


@app.get("/stats")
async def get_ai_stats():
    stats = await persistence_store.get_ai_dashboard_stats()
    return success_response(data=stats, message="AI Observatory stats retrieved")


@app.get("/chat")
async def chat_get(
    question: str = Query(..., description="Question for the agent"),
    session_id: str | None = Query(None, description="Optional chat session ID"),
    current_user: str = Depends(get_current_user),
):
    if session_id:
        await persistence_store.create_session(session_id=session_id)
        
    agent_response = await invoke_agent(question, session_id=session_id)
    
    user_msg = {"role": "user", "content": question, "created_at": datetime.utcnow().isoformat()}
    assistant_msg = {"role": "assistant", "content": agent_response.answer, "created_at": datetime.utcnow().isoformat()}
    
    investigation = InvestigationRecord(
        request_id=agent_response.request_id,
        session_id=session_id,
        question=agent_response.question,
        answer=agent_response.answer,
        tool_calls=agent_response.tool_calls,
        tool_results=agent_response.tool_results,
        messages=[user_msg, assistant_msg],
        status=agent_response.status,
    )
    await persistence_store.save_investigation(investigation)
    return success_response(
        data=agent_response.dict(),
        message="Chat response",
    )


@app.post("/chat")
async def chat(request: ChatRequest, current_user: str = Depends(get_current_user)):
    if request.session_id:
        await persistence_store.create_session(session_id=request.session_id)
        
    agent_response = await invoke_agent(request.question, session_id=request.session_id)
    
    user_msg = {"role": "user", "content": request.question, "created_at": datetime.utcnow().isoformat()}
    assistant_msg = {"role": "assistant", "content": agent_response.answer, "created_at": datetime.utcnow().isoformat()}
    
    investigation = InvestigationRecord(
        request_id=agent_response.request_id,
        session_id=request.session_id,
        question=request.question,
        answer=agent_response.answer,
        tool_calls=agent_response.tool_calls,
        tool_results=agent_response.tool_results,
        messages=[user_msg, assistant_msg],
        status=agent_response.status,
    )
    await persistence_store.save_investigation(investigation)
    return success_response(
        data=agent_response.dict(),
        message="Chat response",
    )


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, current_user: str = Depends(get_current_user)):
    if request.session_id:
        await persistence_store.create_session(session_id=request.session_id)

    async def event_generator():
        answer_parts = []
        tool_calls = []
        tool_results = []
        request_id = None

        # async generator to stream events from the agent
        async for event_str in stream_agent(request.question, session_id=request.session_id):
            sse_token = event_str.replace("\n", "\ndata: ")
            yield f"data: {sse_token}\n\n"
            try:
                event = json.loads(event_str)
                if event["type"] == "info":
                    request_id = event["request_id"]
                elif event["type"] == "token":
                    answer_parts.append(event["text"])
                elif event["type"] == "tool_end":
                    tool_calls.append(ToolExecution(
                        name=event["name"],
                        success=event["success"],
                        duration_ms=event["duration_ms"],
                        args=event.get("args"),
                        error=event.get("error"),
                        result=event.get("result"),
                    ))
                    tool_results.append(event.get("result") or {})
            except Exception as e:
                logger.error(f"Error parsing stream event: {e}")

        # Save investigation record once stream finishes
        if request_id:
            answer = "".join(answer_parts)
            user_msg = {"role": "user", "content": request.question, "created_at": datetime.utcnow().isoformat()}
            assistant_msg = {"role": "assistant", "content": answer, "created_at": datetime.utcnow().isoformat()}
            investigation = InvestigationRecord(
                request_id=request_id,
                session_id=request.session_id,
                question=request.question,
                answer=answer,
                tool_calls=tool_calls,
                tool_results=tool_results,
                messages=[user_msg, assistant_msg],
                status="completed",
            )
            await persistence_store.save_investigation(investigation)

    # Return a streaming response that streams events to the client
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


@app.post("/chat/confirm")
async def confirm_action(request: ConfirmRequest, current_user: str = Depends(get_current_user)):
    from agent.openrouter import active_confirmations, active_responses
    confirm_id = request.confirm_id
    if confirm_id not in active_confirmations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation ID not found or already processed."
        )
    
    active_responses[confirm_id] = request.approve
    active_confirmations[confirm_id].set()
    return success_response(
        data={"confirm_id": confirm_id, "approved": request.approve},
        message="Confirmation recorded successfully"
    )


@app.get("/investigations")
async def list_investigations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: str = Depends(get_current_user),
):
    records = await persistence_store.list_investigations(limit=limit, offset=offset)
    return success_response(data=records, message="Investigation list retrieved")


@app.get("/investigations/{request_id}")
async def get_investigation(
    request_id: str,
    current_user: str = Depends(get_current_user),
):
    record = await persistence_store.get_investigation(request_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    return success_response(data=record, message="Investigation retrieved")


@app.post("/reports")
async def create_report(
    request: ReportRequest,
    current_user: str = Depends(get_current_user),
):
    recipients = normalize_recipients([str(recipient) for recipient in request.recipients])
    html_content = render_report_html(request.report_type, request.report_data)
    pdf_path = None
    try:
        report = await persistence_store.save_report(
            report_type=request.report_type,
            subject=request.subject,
            recipients=recipients,
            content_html=html_content,
            content_markdown=request.content_markdown,
            status="generated",
        )
        output_dir = Path(REPORT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        if recipients:
            send_email(request.subject, recipients, html_content, attachments=[Path(pdf_path)] if pdf_path else None)
            report = await persistence_store.update_report_status(
                report_id=report["id"],
                status="sent",
                sent_at=datetime.utcnow(),
                pdf_path=pdf_path,
            )
        return success_response(data=report, message="Report generated and sent")
    except Exception as exc:
        return success_response(data=None, message=f"Report creation failed: {str(exc)}")

@app.post("/reports/send")
async def send_saved_report(
    request: ReportSendRequest,
    current_user: str = Depends(get_current_user),
):
    report = await persistence_store.get_report(request.report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if not report.get("recipients"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report has no recipients")
    try:
        send_email(
            report["subject"],
            report["recipients"],
            report["content_html"] or "",
        )
        updated = await persistence_store.update_report_status(
            report_id=request.report_id,
            status="sent",
            sent_at=datetime.utcnow(),
        )
        return success_response(data=updated, message="Report emailed successfully")
    except Exception as exc:
        updated = await persistence_store.update_report_status(
            report_id=request.report_id,
            status="failed",
            error_message=str(exc),
        )
        return success_response(data=updated, message=f"Failed to send report: {str(exc)}")


