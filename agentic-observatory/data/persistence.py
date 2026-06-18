from __future__ import annotations

from data.db import (
    ai_tool_calls,
    async_session,
    investigations,
    ai_chat_messages,
    generated_reports,
)
from typing import Any
from datetime import datetime
from utils.logging import logger
from sqlalchemy.exc import SQLAlchemyError
from agent.state import InvestigationRecord
from fastapi.encoders import jsonable_encoder
from sqlalchemy import insert, select, update

class PersistenceError(RuntimeError):
    pass

# This class is responsible for all interactions with the database related to investigations and reports. 
# basically filling the database tables with the data we want to store and also fetching that data when needed.
class InvestigationStore:
    # session factory is passed in the constructor, which allows us to create database sessions when needed.
    # Connection Pool - Creates and reuses DATABASE CONNECTIONS
    # A session is:
    #   - query state
    #   - transaction state
    #   - ORM identity map
    #   - pending changes

    # When the session actually needs to talk to PostgreSQL, it borrows a connection from the pool.
    def __init__(self, session_factory):
        self.session_factory = session_factory

    # This is a helper method to check if the database is configured before performing any operations. 
    # It raises a PersistenceError if the session_factory is not set, 
    # which indicates that the database is not configured. 
    # This method is called at the beginning of each public method to ensure 
    # that we don't attempt to interact with the database if it's not set up.
    async def _check(self):
        if self.session_factory is None:
            raise PersistenceError("Database is not configured. Set DATABASE_URL.")

    # This method saves an investigation record to the database. 
    async def save_investigation(self, record: InvestigationRecord) -> dict[str, Any]:
        await self._check()
        payload = jsonable_encoder(record)
        try:
            async with self.session_factory() as session:
                await session.execute(
                    insert(investigations).values(
                        request_id=payload["request_id"],
                        session_id=payload.get("session_id"),
                        question=payload["question"],
                        answer=payload.get("answer"),
                        tool_calls=payload.get("tool_calls", []),
                        tool_results=payload.get("tool_results", []),
                        status=payload.get("status", "completed"),
                        error=payload.get("error"),
                        created_at=payload["created_at"],
                        updated_at=payload["updated_at"],
                    )
                )

                tool_calls = payload.get("tool_calls", []) or []
                for tool_call in tool_calls:
                    await session.execute(
                        insert(ai_tool_calls).values(
                            request_id=payload["request_id"],
                            name=tool_call.get("name"),
                            args=tool_call.get("args"),
                            result=tool_call.get("result"),
                            success=tool_call.get("success", False),
                            duration_ms=tool_call.get("duration_ms"),
                            error=tool_call.get("error"),
                            created_at=datetime.utcnow(),
                        )
                    )

                messages = payload.get("messages", []) or []
                for message in messages:
                    if not message:
                        continue
                    await session.execute(
                        insert(ai_chat_messages).values(
                            request_id=payload["request_id"],
                            session_id=payload.get("session_id"),
                            role=message.get("role"),
                            content=message.get("content"),
                            created_at=message.get("created_at", datetime.utcnow()),
                        )
                    )

                await session.commit()
        except SQLAlchemyError as exc:
            logger.error(f"[request_id={record.request_id}] Failed to save investigation: {exc}")
            raise PersistenceError(str(exc)) from exc

        return payload

    async def get_investigation(self, request_id: str) -> dict[str, Any] | None:
        await self._check()
        async with self.session_factory() as session:
            result = await session.execute(
                select(investigations).where(investigations.c.request_id == request_id)
            )
            row = result.mappings().first()
            return dict(row) if row else None

    async def list_investigations(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        await self._check()
        async with self.session_factory() as session:
            result = await session.execute(
                select(investigations)
                .order_by(investigations.c.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            return [dict(row) for row in result.mappings().all()]

    async def get_report(self, report_id: str) -> dict[str, Any] | None:
        await self._check()
        async with self.session_factory() as session:
            result = await session.execute(
                select(generated_reports).where(generated_reports.c.id == report_id)
            )
            row = result.mappings().first()
            return dict(row) if row else None

    async def save_report(
        self,
        subject: str,
        report_type: str,
        recipients: list[str],
        status: str = "generated",
        pdf_path: str | None = None,
        content_html: str | None = None,
        error_message: str | None = None,
        content_markdown: str | None = None,
    ) -> dict[str, Any]:
        await self._check()
        now = datetime.utcnow()
        async with self.session_factory() as session:
            result = await session.execute(
                insert(generated_reports)
                .values(
                    report_type=report_type,
                    subject=subject,
                    recipients=recipients,
                    content_html=content_html,
                    content_markdown=content_markdown,
                    pdf_path=pdf_path,
                    status=status,
                    error_message=error_message,
                    generated_at=now,
                    created_at=now,
                )
                .returning(generated_reports)
            )
            await session.commit()
            row = result.mappings().first()
            return dict(row) if row else {}

    async def update_report_status(
        self,
        report_id: str,
        status: str,
        sent_at: datetime | None = None,
        error_message: str | None = None,
        pdf_path: str | None = None,
    ) -> dict[str, Any]:
        await self._check()
        values = {"status": status}
        if sent_at is not None:
            values["sent_at"] = sent_at
        if error_message is not None:
            values["error_message"] = error_message
        if pdf_path is not None:
            values["pdf_path"] = pdf_path

        async with self.session_factory() as session:
            result = await session.execute(
                update(generated_reports)
                .where(generated_reports.c.id == report_id)
                .values(**values)
                .returning(generated_reports)
            )
            await session.commit()
            row = result.mappings().first()
            return dict(row) if row else {}


persistence_store = InvestigationStore(async_session)