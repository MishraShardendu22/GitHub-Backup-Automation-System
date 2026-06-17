# Standardized response format for API endpoints
from typing import Any
from fastapi.responses import JSONResponse

def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data,
        },
    )

def error_response(
    message: str = "Something went wrong",
    status_code: int = 500,
):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": None,
        },
    )