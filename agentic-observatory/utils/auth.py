from __future__ import annotations

from typing import Any
from config import settings
from jose import JWTError, jwt
from pydantic import BaseModel
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class TokenData(BaseModel):
    username: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Authenticate the user id and pass
# return true if authenticated successfully, else false
def authenticate_user(username: str, password: str) -> bool:
    return (
        username == settings.CHAT_USERNAME
        and password == settings.CHAT_PASSWORD
    )

# create a JWT token for the authenticated user
def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    # copy the payload
    to_encode = data.copy()
    
    # expire = datetime.utcnow() + timedelta(minutes=60)
    # add time to current time and set it as the expiry time for the token
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_EXPIRES_MINUTES))

    # update the payload with the expiry time
    to_encode.update({"exp": expire})

    # encode the payload using the secret key and return the token
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

# get the current user from the token, 
# if the token is invalid or expired, it will raise an HTTPException with 401 status code
# login again to get a valid token
async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    # create an exception to raise in case of invalid credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # decode the token using the secret key
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)

    # if there is any error while decoding the token, 
    # it means the token is invalid or expired, so we raise the credentials_exception
    except JWTError:
        raise credentials_exception

    # if the username in the token does not match the expected username, raise an exception
    if token_data.username != settings.CHAT_USERNAME:
        raise credentials_exception

    # if everything is fine, return the username from the token
    return token_data.username
