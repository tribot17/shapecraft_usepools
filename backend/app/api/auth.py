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


class EmailVerificationCode(BaseModel):
    code: str


@router.post("/signup")
def signup(req: SignUpRequest, db: Session = Depends(get_db)):
    # If already verified user exists, block
    existing = db.query(User).filter(User.email == req.email).first()
    if existing and existing.verified_at:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Generate and store verification code tied to email + hashed password
    hashed = pwd_ctx.hash(req.password)
    code = "123456"  # TODO: replace with secure random
    db.execute(
        text(
            """
            INSERT INTO public.email_verification_codes (email, password_hash, code)
            VALUES (:email, :password_hash, :code)
            """
        ),
        {"email": req.email, "password_hash": hashed, "code": code},
    )
    db.commit()

    # Try sending email if SMTP configured; otherwise return dev_code for now
    error = send_verification_email(req.email, code)
    response = {"message": "Verification code sent"}
    if error or not is_email_configured():
        response["dev_code"] = code
        if error:
            response["email_error"] = "Failed to send email"
    return response


@router.post("/verify")
def verify(req: VerifyRequest, db: Session = Depends(get_db)):
    # Fetch the latest unconsumed, unexpired code for this email
    row = db.execute(
        text(
            """
            SELECT id, password_hash FROM public.email_verification_codes
            WHERE lower(email) = lower(:email)
              AND code = :code
              AND consumed_at IS NULL
              AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"email": req.email, "code": req.code},
    ).first()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    # Create the user now if they don't exist, mark verified
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        user = User(email=req.email, password_hash=row[1])
        db.add(user)
        db.flush()
    user.verified_at = datetime.utcnow()
    db.execute(text("UPDATE public.email_verification_codes SET consumed_at = now(), user_id = :uid WHERE id = :id"), {"uid": str(user.user_id), "id": row[0]})
    db.commit()
    return {"message": "Email verified"}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_ctx.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.verified_at:
        raise HTTPException(status_code=403, detail="Email not verified")
    return {"message": "Login successful", "user_id": str(user.user_id)}


@router.post("/wallet")
def save_wallet(req: WalletRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.wallet_address = req.address
    db.commit()
    return {"message": "Wallet saved"}


# Tables are managed in Neon via migrations/sql; do not auto-create here


