from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..core.database import get_db, engine
from ..models.models import Base, User
from sqlalchemy import select, func, text
from ..services.email_service import send_verification_email, is_email_configured


router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class WalletRequest(BaseModel):
    email: EmailStr
    address: str


class WalletLoginRequest(BaseModel):
    address: str


class EmailVerificationCode(BaseModel):
    code: str


@router.post("/signup")
def signup(_: SignUpRequest):
    # Email/password sign-up is disabled in wallet-only mode
    raise HTTPException(status_code=405, detail="Email signup disabled")


@router.post("/verify")
def verify(_: VerifyRequest):
    raise HTTPException(status_code=405, detail="Email verification disabled")


@router.post("/login")
def login(_: LoginRequest):
    raise HTTPException(status_code=405, detail="Email login disabled")


@router.post("/wallet")
def save_wallet(_: WalletRequest):
    raise HTTPException(status_code=405, detail="Legacy wallet save disabled")


@router.post("/wallet-login")
def wallet_login(req: WalletLoginRequest, db: Session = Depends(get_db)):
    """Create or fetch a minimal user by wallet address and return user_id.

    This supports wallet-only auth.
    """
    normalized = req.address.strip().lower()
    user = db.query(User).filter(User.wallet_address == normalized).first()
    if user:
        return {"user_id": str(user.user_id)}

    # If no user exists, create a minimal record with just wallet_address
    user = User(wallet_address=normalized)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": str(user.user_id)}


# Tables are managed in Neon via migrations/sql; do not auto-create here


