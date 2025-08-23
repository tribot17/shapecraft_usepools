from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .config import settings


def _resolve_database_url() -> str:
    # Prefer explicit Neon env var, then generic DATABASE_URL
    url = os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        # Allow settings to carry it if provided there
        url = getattr(settings, "DATABASE_URL", None)
    if not url:
        raise RuntimeError(
            "DATABASE_URL/NEON_DATABASE_URL is not set. Please add it to your .env"
        )
    # Ensure psycopg driver is used if not specified
    if url.startswith("postgresql://") and "://" in url and "+" not in url.split("://", 1)[0]:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = _resolve_database_url()

# Neon requires TLS; typical connection strings already include sslmode=require,
# but add it if missing
connect_args: dict[str, str] = {}
if "sslmode=" not in DATABASE_URL:
    connect_args["sslmode"] = "require"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

 
