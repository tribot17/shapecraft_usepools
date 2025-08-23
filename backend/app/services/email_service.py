from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from ..core.config import settings


def is_email_configured() -> bool:
    return bool(
        getattr(settings, "SMTP_HOST", None)
        and getattr(settings, "SMTP_PORT", None)
        and getattr(settings, "SMTP_USER", None)
        and getattr(settings, "SMTP_PASS", None)
        and getattr(settings, "SMTP_FROM", None)
    )


def send_verification_email(recipient: str, code: str) -> Optional[str]:
    """Send a simple verification email. Returns error message on failure, None on success.

    Uses SMTP credentials if provided in environment. If not configured, the caller
    should fall back to showing the dev code in the API response.
    """

    if not is_email_configured():
        return "SMTP not configured"

    msg = EmailMessage()
    msg["Subject"] = "Your Scooby verification code"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = recipient
    msg.set_content(f"Your verification code is: {code}\n\nThis code expires in 15 minutes.")

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT)) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
        return None
    except Exception as exc:  # noqa: BLE001 - we want to surface any SMTP failure
        return str(exc)


