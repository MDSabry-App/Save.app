from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import re

app = FastAPI()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class EncryptedData(BaseModel):
    data: str
    iv: str

    @validator('data')
    def base64_check(cls, v):
        if not re.match(r'^[A-Za-z0-9+/=]+$', v):
            raise ValueError('Data must be valid Base64 encoded')
        return v

    @validator('iv')
    def iv_base64_check(cls, v):
        if not re.match(r'^[A-Za-z0-9+/=]+$', v):
            raise ValueError('IV must be valid Base64 encoded')
        return v

class HealthResponse(BaseModel):
    status: str
    timestamp: str
