"""
TravelFi Chatbot Client - Alternative to Telegram
Provides a native web-based chat interface with all TravelFi functionality
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import os

from app.config import Config
from app.models.models import UserProfile, Message, IntentType
from app.services.storage import storage
from app.services.ai_service import ai_service
from app.services.travel_agents import travel_orchestrator
from app.services.user_characterizer import load_insights, extract_insights_from_text
import secrets
import string
import datetime as dt
import psycopg
import smtplib
from email.message import EmailMessage
from app.services.group_manager import group_manager
from app.services.payment_service import payment_service
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatSession:
    """Represents a chat session with a user"""
    
    def __init__(self, session_id: str, user_id: int, websocket: WebSocket):
        self.session_id = session_id
        self.user_id = user_id
        self.websocket = websocket
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.is_active = True
    
    async def send_message(self, message: Dict[str, Any]):
        """Send message to client"""
        try:
            await self.websocket.send_text(json.dumps(message))
            self.last_activity = datetime.now()
        except Exception as e:
            logger.error(f"Error sending message to session {self.session_id}: {e}")
            self.is_active = False
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now()

class ConnectionManager:
    """Manages WebSocket connections and chat sessions"""
    
    def __init__(self):
        self.active_connections: Dict[str, ChatSession] = {}
        self.user_sessions: Dict[int, str] = {}  # user_id -> session_id
    
    async def connect(self, websocket: WebSocket, session_id: str, user_id: int):
        """Accept WebSocket connection and create session"""
        await websocket.accept()
        
        # Close existing session for this user if any
        if user_id in self.user_sessions:
            old_session_id = self.user_sessions[user_id]
            if old_session_id in self.active_connections:
                old_session = self.active_connections[old_session_id]
                old_session.is_active = False
                del self.active_connections[old_session_id]
        
        # Create new session
        session = ChatSession(session_id, user_id, websocket)
        self.active_connections[session_id] = session
        self.user_sessions[user_id] = session_id
        
        logger.info(f"User {user_id} connected with session {session_id}")
        return session
    
    def disconnect(self, session_id: str):
        """Remove session on disconnect"""
        if session_id in self.active_connections:
            session = self.active_connections[session_id]
            if session.user_id in self.user_sessions:
                del self.user_sessions[session.user_id]
            del self.active_connections[session_id]
            logger.info(f"Session {session_id} disconnected")
    
    async def send_personal_message(self, user_id: int, message: Dict[str, Any]):
        """Send message to specific user"""
        if user_id in self.user_sessions:
            session_id = self.user_sessions[user_id]
            if session_id in self.active_connections:
                session = self.active_connections[session_id]
                await session.send_message(message)
                return True
        return False
    
    async def broadcast_to_group(self, user_ids: List[int], message: Dict[str, Any]):
        """Send message to multiple users (group chat)"""
        sent_count = 0
        for user_id in user_ids:
            if await self.send_personal_message(user_id, message):
                sent_count += 1
        return sent_count

# Global connection manager
manager = ConnectionManager()

# FastAPI app for chatbot client
chatbot_app = FastAPI(title="TravelFi Chatbot Client")

# Cache last suggestions per user for follow-up recommendations
LAST_SUGGESTION: Dict[int, Any] = {}

# OpenAI client for recommendation calls
_oa_client: Optional[OpenAI] = None
def _get_client() -> OpenAI:
    global _oa_client
    if _oa_client is None:
        _oa_client = OpenAI(api_key=Config.OPENAI_API_KEY)
    return _oa_client

# Ensure absolute data dirs exist (based on Config)
os.makedirs(Config.DATA_DIR, exist_ok=True)
os.makedirs(Config.USERS_DIR, exist_ok=True)
os.makedirs(Config.CONVERSATIONS_DIR, exist_ok=True)
os.makedirs(os.path.join(Config.DATA_DIR, "groups"), exist_ok=True)
os.makedirs(os.path.join(Config.DATA_DIR, "bookings"), exist_ok=True)
os.makedirs(os.path.join(Config.DATA_DIR, "insights"), exist_ok=True)
os.makedirs(Config.LOGS_DIR, exist_ok=True)

# Create static and templates directories (local to backend runtime)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/images", exist_ok=True)

# Mount static files
chatbot_app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

class ChatMessage(BaseModel):
    """Chat message model"""
    message: str
    user_id: Optional[int] = None
    username: Optional[str] = None
    message_type: str = "text"  # text, command, system
    timestamp: Optional[datetime] = None

class UserSession(BaseModel):
    """User session model"""
    user_id: int
    username: str
    first_name: str
    last_name: Optional[str] = None

@chatbot_app.get("/", response_class=HTMLResponse)
async def chatbot_home(request: Request):
    """Main chatbot interface"""
    return templates.TemplateResponse("chatbot.html", {"request": request})

@chatbot_app.get("/login", response_class=HTMLResponse) 
async def login_page(request: Request):
    """User login/registration page"""
    return templates.TemplateResponse("login.html", {"request": request})

def _hash_password(password: str, salt: bytes | None = None, iterations: int = 200_000) -> tuple[str, str, int]:
    import hashlib
    if salt is None:
        salt = secrets.token_bytes(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return pwd_hash.hex(), salt.hex(), iterations

def _gen_code(n: int = 6) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(n))

def _send_verification_email(to_email: str, username: str, code: str) -> None:
    if not (Config.SMTP_HOST and Config.SMTP_USER and Config.SMTP_PASS):
        logger.info(f"[AUTH] SMTP not configured. Code for {to_email}: {code}")
        return
    subject = "Your TravelFi verification code"
    body = (
        f"Hi {username},\n\n"
        f"Your verification code is: {code}\n\n"
        f"This code will expire in 15 minutes.\n\n"
        f"Thanks,\nTravelFi"
    )
    msg = EmailMessage()
    msg["From"] = Config.SMTP_FROM or Config.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(Config.SMTP_USER, Config.SMTP_PASS)
        server.send_message(msg)
    logger.info(f"[AUTH] Verification email sent to {to_email}")

@chatbot_app.post("/api/auth/register")
async def auth_register(payload: Dict[str, Any]):
    if not Config.DB_DSN:
        raise HTTPException(status_code=500, detail="DB not configured")
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()
    if not username or not email or not password:
        return {"success": False, "error": "username, email, password required"}
    pwd_hash, salt, iters = _hash_password(password)
    code = _gen_code()
    expires = dt.datetime.utcnow() + dt.timedelta(minutes=15)
    try:
        with psycopg.connect(Config.DB_DSN) as conn:
            with conn.transaction():
                user_id = None
                cur = conn.execute("SELECT id FROM public.users WHERE username=%s OR email=%s", (username, email))
                row = cur.fetchone()
                if row:
                    user_id = row[0]
                    conn.execute("UPDATE public.users SET password_hash=%s, password_salt=%s, verified=FALSE WHERE id=%s",
                                 (pwd_hash, salt, user_id))
                else:
                    cur = conn.execute(
                        "INSERT INTO public.users (username,email,password_hash,password_salt,verified) VALUES (%s,%s,%s,%s,FALSE) RETURNING id",
                        (username, email, pwd_hash, salt)
                    )
                    user_id = cur.fetchone()[0]
                conn.execute(
                    "INSERT INTO public.email_verification_codes (user_id, code, sent_to, expires_at) VALUES (%s,%s,%s,%s)",
                    (user_id, code, email, expires)
                )
        try:
            _send_verification_email(email, username, code)
        except Exception as mail_err:
            logger.warning(f"[AUTH] Failed to send email, logging code. err={mail_err}")
            logger.info(f"[AUTH] Verification code for {email}: {code}")
        return {"success": True}
    except Exception as e:
        logger.error(f"[AUTH] register error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@chatbot_app.post("/api/auth/verify")
async def auth_verify(payload: Dict[str, Any]):
    if not Config.DB_DSN:
        raise HTTPException(status_code=500, detail="DB not configured")
    username = (payload.get("username") or "").strip()
    code = (payload.get("code") or "").strip()
    if not username or not code:
        return {"success": False, "error": "username and code required"}
    try:
        with psycopg.connect(Config.DB_DSN) as conn:
            with conn.transaction():
                cur = conn.execute("SELECT id, verified FROM public.users WHERE username=%s", (username,))
                row = cur.fetchone()
                if not row:
                    return {"success": False, "error": "User not found"}
                user_id = row[0]
                cur = conn.execute(
                    "SELECT id, expires_at, consumed_at FROM public.email_verification_codes WHERE user_id=%s AND code=%s ORDER BY id DESC LIMIT 1",
                    (user_id, code)
                )
                vr = cur.fetchone()
                if not vr:
                    return {"success": False, "error": "Invalid code"}
                if vr[2] is not None:
                    return {"success": False, "error": "Code already used"}
                if dt.datetime.utcnow() > vr[1].replace(tzinfo=None):
                    return {"success": False, "error": "Code expired"}
                conn.execute("UPDATE public.users SET verified=TRUE WHERE id=%s", (user_id,))
                conn.execute("UPDATE public.email_verification_codes SET consumed_at=NOW() WHERE id=%s", (vr[0],))
        # Create local profile if missing
        profile = storage.load_user_profile(user_id)
        if profile is None:
            profile = UserProfile(user_id=user_id, username=username, first_name=username, last_name="")
            storage.save_user_profile(profile)
        return {"success": True, "user_id": user_id}
    except Exception as e:
        logger.error(f"[AUTH] verify error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed")

@chatbot_app.post("/api/auth/login")
async def auth_login(payload: Dict[str, Any]):
    """Login with email + password against Neon users table."""
    if not Config.DB_DSN:
        raise HTTPException(status_code=500, detail="DB not configured")
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()
    if not email or not password:
        return {"success": False, "error": "email and password required"}
    try:
        with psycopg.connect(Config.DB_DSN) as conn:
            cur = conn.execute("SELECT id, username, password_hash, password_salt, verified FROM public.users WHERE email=%s", (email,))
            row = cur.fetchone()
            if not row:
                return {"success": False, "error": "User not found"}
            user_id, username, pwd_hash, pwd_salt, verified = row
            # PBKDF2 verify
            import hashlib, binascii
            calc = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(pwd_salt), 200_000).hex()
            if calc != pwd_hash:
                return {"success": False, "error": "Invalid credentials"}
            if not verified:
                return {"success": False, "error": "Email not verified"}
        # Ensure local profile exists
        prof = storage.load_user_profile(user_id)
        if prof is None:
            prof = UserProfile(user_id=user_id, username=username, first_name=username)
            storage.save_user_profile(prof)
        return {"success": True, "user_id": user_id, "username": username}
    except Exception as e:
        logger.error(f"[AUTH] login error: {e}")
        return {"success": False, "error": "Login failed"}

@chatbot_app.get("/api/insights/{user_id}")
async def get_user_insights(user_id: int):
    """Return current unstructured insights for the user."""
    try:
        return load_insights(user_id)
    except Exception as e:
        logger.error(f"Insights error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load insights")

@chatbot_app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time chat"""
    session_id = str(uuid.uuid4())
    session = await manager.connect(websocket, session_id, user_id)
    
    # Send welcome message
    welcome_msg = {
        "type": "system",
        "message": "🌍 Welcome to TravelFi! I'm your AI travel assistant. How can I help you plan your next adventure?",
        "timestamp": datetime.now().isoformat()
    }
    await session.send_message(welcome_msg)
    
    try:
        while session.is_active:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            session.update_activity()
            
            # Process the message
            await process_chat_message(session, message_data)
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(session_id)

async def process_chat_message(session: ChatSession, message_data: Dict[str, Any]):
    """Process incoming chat message"""
    try:
        user_message = message_data.get("message", "").strip()
        if not user_message:
            return
        
        # Load user profile
        user_profile = storage.load_user_profile(session.user_id)
        if not user_profile:
            await session.send_message({
                "type": "error",
                "message": "User profile not found. Please refresh and try again.",
                "timestamp": datetime.now().isoformat()
            })
            return
        
        # Show typing indicator
        await session.send_message({
            "type": "typing",
            "message": "TravelFi is thinking...",
            "timestamp": datetime.now().isoformat()
        })
        
        # Handle commands
        if user_message.startswith('/'):
            await handle_command(session, user_message, user_profile)
            return
        
        # Load conversation history
        conversation_history = storage.get_recent_messages(session.user_id, limit=10)
        
        # Process with AI
        rewritten_query = ai_service.rewrite_query(user_message, conversation_history, user_profile)
        intent = ai_service.classify_intent(rewritten_query, user_profile)
        
        # Save user message
        user_msg = Message(
            message_id=len(conversation_history) + 1,
            user_id=session.user_id,
            text=user_message,
            intent=intent,
            rewritten_query=rewritten_query
        )
        storage.add_message_to_conversation(session.user_id, user_msg)
        # Extract unstructured insights from this user message
        _ = extract_insights_from_text(session.user_id, user_message, rewritten_query)


        # Debug log of processing pipeline
        try:
            os.makedirs(Config.LOGS_DIR, exist_ok=True)
            log_event = {
                "ts": datetime.now().isoformat(),
                "user_id": session.user_id,
                "message": user_message,
                "rewritten_query": rewritten_query,
                "intent": intent.value if hasattr(intent, 'value') else str(intent),
                "stage": "received_user_message"
            }
            with open(os.path.join(Config.LOGS_DIR, f"pipeline_{session.user_id}.log.jsonl"), "a") as lf:
                lf.write(json.dumps(log_event) + "\n")
        except Exception:
            pass
        
        # Generate response based on intent
        response_text = await process_intent(intent, rewritten_query, user_profile, conversation_history, session.user_id)
        
        # Update user preferences based on recent conversation
        await update_user_preferences(session.user_id, conversation_history)
        
        # Send response
        response_msg = {
            "type": "bot",
            "message": response_text,
            "intent": intent.value,
            "rewritten_query": rewritten_query,
            "timestamp": datetime.now().isoformat()
        }
        await session.send_message(response_msg)
        
        # Save bot response
        bot_msg = Message(
            message_id=len(conversation_history) + 2,
            user_id=0,
            text=response_text,
            is_bot=True
        )
        storage.add_message_to_conversation(session.user_id, bot_msg)
        # Log bot response
        try:
            with open(os.path.join(Config.LOGS_DIR, f"pipeline_{session.user_id}.log.jsonl"), "a") as lf:
                lf.write(json.dumps({
                    "ts": datetime.now().isoformat(),
                    "user_id": session.user_id,
                    "stage": "sent_bot_message",
                    "response": response_text
                }) + "\n")
        except Exception:
            pass
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await session.send_message({
            "type": "error", 
            "message": "I'm sorry, I encountered an error processing your request. Please try again.",
            "timestamp": datetime.now().isoformat()
        })

async def handle_command(session: ChatSession, command: str, user_profile: UserProfile):
    """Handle chat commands"""
    command_lower = command.lower()
    
    if command_lower == "/start":
        response = f"""🌍 Welcome to TravelFi, {user_profile.first_name}!

I'm your AI-powered travel assistant. I can help you with:

✈️ **Flight & Hotel Search** - Find the best deals
🍽️ **Restaurant Recommendations** - Personalized to your taste  
🎯 **Activity Planning** - Discover amazing experiences
💳 **Easy Booking** - One-click reservations
🧠 **Smart Memory** - I learn your preferences over time

Just start chatting with me naturally! Try asking:
• "Find me flights to London next weekend"
• "Where should I eat tonight in Dubai?"
• "Plan a 3-day trip to Paris"

Type /help for more commands."""

    elif command_lower == "/help":
        response = """🤖 **TravelFi Commands**

**Basic Commands:**
• `/start` - Get started with TravelFi
• `/memories` - View your travel profile
• `/forget` - Delete all your data
• `/help` - Show this help message

**What I can do:**
🔍 **Search & Recommendations:**
• "Find flights to Tokyo"
• "Hotels in Barcelona under $150"  
• "Best restaurants near Times Square"
• "Things to do in Rome"

💬 **Natural Conversation:**
Just chat with me naturally! I understand context and remember our previous discussions.

**Example Queries:**
• "Plan a weekend trip to Paris, moderate budget"
• "I'm vegetarian, where should I eat in Dubai?"
• "Find me adventure activities in New Zealand"

Just start chatting - I'm here to help! 🌍✈️"""

    elif command_lower == "/memories":
        prefs = user_profile.preferences
        response = f"""🧠 **Your Travel Profile**

**Dietary & Health:**
• Restrictions: {', '.join(prefs.dietary_restrictions) if prefs.dietary_restrictions else 'None'}
• Allergies: {', '.join(prefs.allergies) if prefs.allergies else 'None'}

**Travel Style:**
• Budget: {prefs.budget_range or 'Not specified'}
• Style: {prefs.travel_style or 'Not specified'}
• Accommodation: {', '.join(prefs.accommodation_type) if prefs.accommodation_type else 'No preference'}

**Food Preferences:**
• Cuisines: {', '.join(prefs.preferred_cuisines) if prefs.preferred_cuisines else 'None specified'}

**Activities:**
• Likes: {', '.join(prefs.activities_liked) if prefs.activities_liked else 'None specified'}
• Dislikes: {', '.join(prefs.activities_disliked) if prefs.activities_disliked else 'None specified'}

**Travel History:**
• Frequent destinations: {', '.join(prefs.frequent_destinations) if prefs.frequent_destinations else 'None yet'}

To update any of this information, just tell me naturally! For example:
"I'm vegetarian" or "Change my budget to luxury" or "Remove seafood allergy"

Type /forget to delete all your data."""

    elif command_lower == "/forget":
        # Send confirmation message with buttons
        response = {
            "type": "confirmation",
            "message": "⚠️ **Are you sure you want to delete all your data?**\n\nThis will permanently remove:\n• Your travel preferences\n• Conversation history\n• Feedback data\n• All stored memories\n\nThis action cannot be undone!",
            "buttons": [
                {"text": "✅ Yes, Delete Everything", "action": "confirm_delete"},
                {"text": "❌ Cancel", "action": "cancel_delete"}
            ],
            "timestamp": datetime.now().isoformat()
        }
        await session.send_message(response)
        return
    
    else:
        response = f"Unknown command: {command}\nType /help to see available commands."
    
    # Send response
    await session.send_message({
        "type": "bot",
        "message": response,
        "timestamp": datetime.now().isoformat()
    })

def _heuristic_recommend_from_last(intent: IntentType, user_profile: UserProfile, user_id: int) -> Optional[str]:
    suggestion = LAST_SUGGESTION.get(user_id)
    if not suggestion:
        return None
    prefs = user_profile.preferences if user_profile else None
    if intent == IntentType.FLIGHT_SEARCH and suggestion.flights:
        flights = suggestion.flights
        def duration_minutes(d: str) -> int:
            import re
            m = re.findall(r"(\d+)h\s*(\d+)m", d)
            if m:
                h, m2 = m[0]
                return int(h) * 60 + int(m2)
            return 99999
        if prefs and prefs.budget_range == 'luxury':
            recommended = max(flights, key=lambda f: (f.price, -duration_minutes(f.duration)))
            reason = "You prefer luxury; prioritizing premium-priced, shorter itineraries."
        else:
            recommended = min(flights, key=lambda f: (f.price, duration_minutes(f.duration)))
            reason = "Optimizing for best value and shorter duration."
        return (
            f"Here’s my recommendation:\n\n"
            f"• Airline: {recommended.airline}\n"
            f"• Price: ${recommended.price:.2f} {recommended.currency}\n"
            f"• Time: {recommended.departure_time} → {recommended.arrival_time} ({recommended.duration})\n"
            f"• Link: {recommended.booking_link}\n\nWhy: {reason}"
        )
    if intent == IntentType.HOTEL_SEARCH and getattr(suggestion, 'hotels', None):
        hotels = suggestion.hotels
        # Simple heuristic: budget -> lowest price, luxury -> highest rating then price, moderate -> best rating/price
        if prefs and prefs.budget_range == 'luxury':
            recommended = max(hotels, key=lambda h: (h.rating, h.price_per_night))
            reason = "You prefer luxury; prioritizing top-rated properties and premium rooms."
        elif prefs and prefs.budget_range == 'budget':
            recommended = min(hotels, key=lambda h: h.price_per_night)
            reason = "You prefer budget; choosing the most affordable option that still looks solid."
        else:
            # value score = rating divided by price
            def value_score(h):
                try:
                    return (h.rating or 0) / max(h.price_per_night or 1, 1)
                except Exception:
                    return 0
            recommended = max(hotels, key=value_score)
            reason = "Optimizing for best value (rating vs price)."
        return (
            f"Here’s my recommendation:\n\n"
            f"• Hotel: {recommended.name} (⭐ {recommended.rating})\n"
            f"• Price: ${recommended.price_per_night:.2f} {recommended.currency} per night\n"
            f"• Location: {recommended.location}\n"
            f"• Amenities: {', '.join(recommended.amenities[:5]) if recommended.amenities else '—'}\n"
            f"• Link: {recommended.booking_link}\n\nWhy: {reason}"
        )
    return None

def _llm_recommend_from_last(intent: IntentType, user_profile: UserProfile, user_id: int, user_message: str) -> Optional[str]:
    suggestion = LAST_SUGGESTION.get(user_id)
    if not suggestion:
        return None
    prefs = user_profile.preferences if user_profile else None

    if intent == IntentType.FLIGHT_SEARCH and getattr(suggestion, 'flights', None):
        flights_payload = [
            {
                "airline": f.airline,
                "price": f.price,
                "currency": f.currency,
                "duration": f.duration,
                "departure_time": f.departure_time,
                "arrival_time": f.arrival_time,
                "stops": f.stops,
                "booking_link": f.booking_link,
            } for f in suggestion.flights
        ]
        profile_payload = {
            "budget_preference": (prefs.budget_range if prefs else None),
            "loyalty_programs": [],
            "airport_preference": None,
            "seat_preference": None,
        }
        system_prompt = (
            "You are TravelFi’s Flight Recommender, an expert travel assistant.\n"
            "From a set of flight options and user preferences, recommend the single best option (plus 1 strong alternative if helpful) and explain briefly.\n"
            "If key info is missing, ask ONE concise clarifying question.\n"
            "Output concise markdown with three sections: Data (top 3 bullets), Insights (2-4 bullets), Recommendation (one bold sentence).\n"
            "After the markdown, output a single JSON line: {\"selected_index\": <0-based>, \"reason_short\": \"<=120 chars\"}."
        )
        user_block = (
            f"user_message: {user_message}\n\n"
            f"flight_options: {json.dumps(flights_payload)}\n\n"
            f"user_profile: {json.dumps(profile_payload)}"
        )
        try:
            client = _get_client()
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_block},
                ],
                temperature=0.3,
                max_tokens=600,
            )
            rec_text = resp.choices[0].message.content or ""
            try:
                with open(os.path.join(Config.LOGS_DIR, f"recommend_{user_id}.log.jsonl"), "a") as lf:
                    lf.write(json.dumps({
                        "ts": datetime.now().isoformat(),
                        "user_id": user_id,
                        "type": "flight",
                        "selected_from": len(flights_payload),
                        "prompt_msg": user_message,
                    }) + "\n")
            except Exception:
                pass
            return rec_text.strip()
        except Exception as e:
            logger.warning(f"LLM flight recommendation failed, falling back. err={e}")
            return _heuristic_recommend_from_last(intent, user_profile, user_id)

    if intent == IntentType.HOTEL_SEARCH and getattr(suggestion, 'hotels', None):
        hotels_payload = [
            {
                "name": h.name,
                "rating": h.rating,
                "price_per_night": h.price_per_night,
                "currency": h.currency,
                "location": h.location,
                "amenities": (h.amenities[:8] if isinstance(h.amenities, list) else []),
                "booking_link": h.booking_link,
            } for h in suggestion.hotels
        ]
        profile_payload = {
            "budget_preference": (prefs.budget_range if prefs else None),
            "accommodation_type": (prefs.accommodation_type if (prefs and prefs.accommodation_type) else []),
            "travel_style": (prefs.travel_style if prefs else None),
        }
        system_prompt = (
            "You are TravelFi’s Hotel Recommender, an expert hotel concierge.\n"
            "From a set of hotel options and user preferences, recommend the single best option (plus 1 strong alternative if helpful) and explain briefly.\n"
            "Consider rating, value vs price, location fit, and amenities.\n"
            "If key info is missing (e.g., budget range, neighborhood), ask ONE concise clarifying question.\n"
            "Output concise markdown with three sections: Data (top 3 bullets), Insights (2-4 bullets), Recommendation (one bold sentence).\n"
            "After the markdown, output a single JSON line: {\"selected_index\": <0-based>, \"reason_short\": \"<=120 chars\"}."
        )
        user_block = (
            f"user_message: {user_message}\n\n"
            f"hotel_options: {json.dumps(hotels_payload)}\n\n"
            f"user_profile: {json.dumps(profile_payload)}"
        )
        try:
            client = _get_client()
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_block},
                ],
                temperature=0.3,
                max_tokens=700,
            )
            rec_text = resp.choices[0].message.content or ""
            try:
                with open(os.path.join(Config.LOGS_DIR, f"recommend_{user_id}.log.jsonl"), "a") as lf:
                    lf.write(json.dumps({
                        "ts": datetime.now().isoformat(),
                        "user_id": user_id,
                        "type": "hotel",
                        "selected_from": len(hotels_payload),
                        "prompt_msg": user_message,
                    }) + "\n")
            except Exception:
                pass
            return rec_text.strip()
        except Exception as e:
            logger.warning(f"LLM hotel recommendation failed, falling back. err={e}")
            return _heuristic_recommend_from_last(intent, user_profile, user_id)

    return _heuristic_recommend_from_last(intent, user_profile, user_id)

async def process_intent(intent: IntentType, query: str, user_profile: UserProfile, 
                        conversation_history: list, user_id: int) -> str:
    """Process user intent and generate response"""
    
    if intent == IntentType.MEMORY_VIEW:
        prefs = user_profile.preferences
        return f"Here's what I remember about you:\n" \
               f"Budget: {prefs.budget_range or 'Not set'}\n" \
               f"Dietary restrictions: {', '.join(prefs.dietary_restrictions) if prefs.dietary_restrictions else 'None'}\n" \
               f"Use /memories for the full view!"
    
    elif intent == IntentType.MEMORY_EDIT:
        return await handle_memory_edit(query, user_profile)
    
    elif intent in [IntentType.FLIGHT_SEARCH, IntentType.HOTEL_SEARCH, 
                   IntentType.RESTAURANT_SEARCH, IntentType.ACTIVITY_SEARCH]:
        ql = (query or '').lower()
        if any(k in ql for k in ["which one", "recommend", "best option", "choose for me"]):
            rec = _llm_recommend_from_last(intent, user_profile, user_id, query)
            if rec:
                return rec
        # Otherwise fetch fresh suggestions and cache for future recommendation
        user_prefs = user_profile.preferences.dict() if user_profile else {}
        travel_suggestion = await travel_orchestrator.get_travel_suggestions(query, user_prefs)
        LAST_SUGGESTION[user_id] = travel_suggestion
        return format_travel_suggestions(travel_suggestion, intent)
    
    elif intent == IntentType.BOOKING:
        return "I'd love to help you book! Please share the specific option you'd like to book, and I'll provide you with the direct booking link."
    
    else:  # SMALL_TALK or other
        return ai_service.generate_response(query, intent, user_profile, conversation_history)

async def handle_memory_edit(query: str, user_profile: UserProfile) -> str:
    """Handle memory editing requests"""
    query_lower = query.lower()
    updates = {}
    
    # Simple pattern matching for common updates
    if "budget" in query_lower:
        if "luxury" in query_lower:
            updates["budget_range"] = "luxury"
        elif "budget" in query_lower:
            updates["budget_range"] = "budget"
        else:
            updates["budget_range"] = "moderate"
    
    if "vegetarian" in query_lower:
        if "remove" not in query_lower:
            current = user_profile.preferences.dietary_restrictions
            if "vegetarian" not in current:
                updates["dietary_restrictions"] = current + ["vegetarian"]
    
    if updates:
        storage.update_user_preferences(user_profile.user_id, updates)
        return f"✅ Updated your preferences: {', '.join(f'{k}={v}' for k, v in updates.items())}"
    
    return "I understand you want to update your preferences. Could you be more specific? For example: 'Change my budget to luxury' or 'I'm vegetarian'"

def format_travel_suggestions(suggestion, intent: IntentType) -> str:
    """Format travel suggestions for display"""
    response_parts = []
    
    if intent == IntentType.FLIGHT_SEARCH and suggestion.flights:
        response_parts.append("✈️ **Flight Options:**")
        for i, flight in enumerate(suggestion.flights[:3], 1):
            response_parts.append(
                f"{i}. **{flight.airline}** - ${flight.price}\n"
                f"   🕐 {flight.departure_time} → {flight.arrival_time} ({flight.duration})\n"
                f"   🔗 [Book Now]({flight.booking_link})"
            )
    
    if intent == IntentType.HOTEL_SEARCH and suggestion.hotels:
        response_parts.append("🏨 **Hotel Options:**")
        for i, hotel in enumerate(suggestion.hotels[:3], 1):
            response_parts.append(
                f"{i}. **{hotel.name}** ⭐ {hotel.rating}\n"
                f"   💰 ${hotel.price_per_night}/night in {hotel.location}\n"
                f"   🏷️ {', '.join(hotel.amenities[:3])}\n"
                f"   🔗 [Book Now]({hotel.booking_link})"
            )
    
    if intent == IntentType.RESTAURANT_SEARCH and suggestion.restaurants:
        response_parts.append("🍽️ **Restaurant Recommendations:**")
        for i, restaurant in enumerate(suggestion.restaurants[:3], 1):
            response_parts.append(
                f"{i}. **{restaurant.name}** ⭐ {restaurant.rating}\n"
                f"   🍴 {restaurant.cuisine} • {restaurant.price_range}\n"
                f"   📍 {restaurant.location}\n"
                f"   {restaurant.description}"
            )
            if restaurant.booking_link:
                response_parts[-1] += f"\n   🔗 [Reserve Table]({restaurant.booking_link})"
    
    if intent == IntentType.ACTIVITY_SEARCH and suggestion.activities:
        response_parts.append("🎯 **Activity Suggestions:**")
        for i, activity in enumerate(suggestion.activities[:3], 1):
            response_parts.append(
                f"{i}. **{activity.name}** ⭐ {activity.rating}\n"
                f"   🏷️ {activity.type} • {activity.duration} • ${activity.price}\n"
                f"   📝 {activity.description}\n"
                f"   🔗 [Book Now]({activity.booking_link})"
            )
    
    if suggestion.total_estimated_cost:
        response_parts.append(f"\n💰 **Estimated Total:** ${suggestion.total_estimated_cost:.2f}")
    
    if response_parts:
        response_parts.append("\n💡 *Let me know which option interests you, and I can help you book it!*")
        return "\n\n".join(response_parts)
    else:
        return "I couldn't find specific results for your request. Could you provide more details about what you're looking for?"

async def update_user_preferences(user_id: int, conversation_history: list):
    """Extract and update user preferences from conversation"""
    try:
        # Get recent messages for preference extraction
        recent_messages = [msg for msg in conversation_history if not msg.is_bot][-5:]
        
        if recent_messages:
            extracted_prefs = ai_service.extract_preferences_from_conversation(recent_messages)
            
            if extracted_prefs:
                storage.update_user_preferences(user_id, extracted_prefs)
    except Exception as e:
        logger.error(f"Error updating user preferences: {e}")

@chatbot_app.post("/api/action")
async def handle_action(request: Request):
    """Handle button actions and confirmations"""
    try:
        data = await request.json()
        action = data.get("action")
        user_id = data.get("user_id")
        
        if action == "confirm_delete":
            success = storage.delete_user_profile(user_id)
            if success:
                return {"success": True, "message": "✅ All your data has been permanently deleted. Thanks for using TravelFi!"}
            else:
                return {"success": False, "message": "❌ There was an error deleting your data. Please try again."}
        
        elif action == "cancel_delete":
            return {"success": True, "message": "✅ Cancelled. Your data is safe!"}
        
        return {"success": False, "message": "Unknown action"}
        
    except Exception as e:
        logger.error(f"Action handling error: {e}")
        return {"success": False, "message": "Error processing action"}

@chatbot_app.on_event("startup")
async def startup_event():
    """Initialize chatbot application"""
    logger.info("🤖 TravelFi Chatbot Client starting...")
    
    # Create HTML templates
    create_chatbot_templates()
    create_chatbot_assets()

def create_chatbot_templates():
    """Create HTML templates for the chatbot interface"""
    
    # Main chatbot interface
    chatbot_html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TravelFi - AI Travel Assistant</title>
    <link rel="stylesheet" href="/static/css/chatbot.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="chat-container">
        <!-- Header -->
        <div class="chat-header">
            <div class="header-content">
                <div class="bot-avatar">
                    <i class="fas fa-plane"></i>
                </div>
                <div class="bot-info">
                    <h2>TravelFi Assistant</h2>
                    <span class="status" id="connectionStatus">Connecting...</span>
                </div>
                <div class="header-actions">
                    <button class="btn-icon" onclick="showUserProfile()" title="My Profile">
                        <i class="fas fa-user"></i>
                    </button>
                    <button class="btn-icon" onclick="toggleInsights()" title="Insights Panel">
                        <i class="fas fa-lightbulb"></i>
                    </button>
                    <button class="btn-icon" onclick="showSettings()" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Messages Area -->
        <div class="messages-container" id="messagesContainer">
            <!-- Messages will be added here dynamically -->
        </div>

        <!-- Typing Indicator -->
        <div class="typing-indicator" id="typingIndicator" style="display: none;">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">TravelFi is typing...</span>
        </div>

        <!-- Input Area -->
        <div class="input-container">
            <div class="input-wrapper">
                <button class="btn-icon" onclick="showQuickActions()" title="Quick Actions">
                    <i class="fas fa-plus"></i>
                </button>
                <input type="text" id="messageInput" placeholder="Ask me anything about travel..." 
                       onkeypress="handleKeyPress(event)" autocomplete="off">
                <button class="btn-send" onclick="sendMessage()" id="sendButton">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Insights Side Panel -->
    <div class="insights-panel collapsed" id="insightsPanel">
        <div class="insights-header">
            <h3>Profile Insights</h3>
            <button class="btn-close" onclick="toggleInsights()">&times;</button>
        </div>
        <div class="insights-body" id="insightsBody">
            <div class="insights-empty">No insights yet. Start chatting and I'll learn your preferences.</div>
        </div>
    </div>

    <!-- Quick Actions Panel -->
    <div class="quick-actions" id="quickActions" style="display: none;">
        <div class="quick-action" onclick="insertQuickMessage('Find flights to ')">
            <i class="fas fa-plane"></i>
            <span>Find Flights</span>
        </div>
        <div class="quick-action" onclick="insertQuickMessage('Hotels in ')">
            <i class="fas fa-bed"></i>
            <span>Find Hotels</span>
        </div>
        <div class="quick-action" onclick="insertQuickMessage('Restaurants in ')">
            <i class="fas fa-utensils"></i>
            <span>Find Restaurants</span>
        </div>
        <div class="quick-action" onclick="insertQuickMessage('Things to do in ')">
            <i class="fas fa-map-marker-alt"></i>
            <span>Activities</span>
        </div>
        <div class="quick-action" onclick="insertQuickMessage('/memories')">
            <i class="fas fa-brain"></i>
            <span>My Profile</span>
        </div>
        <div class="quick-action" onclick="insertQuickMessage('Plan a trip to ')">
            <i class="fas fa-route"></i>
            <span>Plan Trip</span>
        </div>
    </div>

    <!-- Insights Side Panel -->
    <div class="insights-panel collapsed" id="insightsPanel">
        <div class="insights-header">
            <h3>Profile Insights</h3>
            <button class="btn-close" onclick="toggleInsights()">&times;</button>
        </div>
        <div class="insights-body" id="insightsBody">
            <div class="insights-empty">No insights yet. Start chatting and I'll learn your preferences.</div>
        </div>
    </div>

    <!-- User Profile Modal -->
    <div class="modal" id="profileModal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>My Travel Profile</h3>
                <button class="btn-close" onclick="closeModal('profileModal')">&times;</button>
            </div>
            <div class="modal-body" id="profileContent">
                <!-- Profile content will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Login Modal (shown initially if not logged in) -->
    <div class="modal" id="loginModal" style="display: block;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Welcome to TravelFi</h3>
            </div>
            <div class="modal-body">
                <form id="loginForm" onsubmit="handleLogin(event); return false;">
                    <div class="form-group">
                        <label for="username">Username:</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="firstName">First Name:</label>
                        <input type="text" id="firstName" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName">Last Name:</label>
                        <input type="text" id="lastName">
                    </div>
                    <button type="submit" class="btn-primary">Start Chatting</button>
                </form>
            </div>
        </div>
    </div>

    <script src="/static/js/chatbot.js"></script>
</body>
</html>'''
    
    # Write template file
    with open("templates/chatbot.html", "w") as f:
        f.write(chatbot_html)

def create_chatbot_assets():
    """Create CSS and JavaScript assets"""
    
    # CSS Styles
    css_content = '''/* TravelFi Chatbot Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    height: 100vh;
    overflow: hidden;
}

.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    box-shadow: 0 0 30px rgba(0,0,0,0.2);
}

/* Header */
.chat-header {
    background: linear-gradient(90deg, #4CAF50, #45a049);
    color: white;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
}

.header-content {
    display: flex;
    align-items: center;
    gap: 15px;
}

.bot-avatar {
    width: 45px;
    height: 45px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.bot-info h2 {
    font-size: 18px;
    margin-bottom: 2px;
}

.status {
    font-size: 12px;
    opacity: 0.8;
}

.status.connected {
    color: #4CAF50;
}

.status.connecting {
    color: #ff9800;
}

.status.disconnected {
    color: #f44336;
}

.header-actions {
    margin-left: auto;
    display: flex;
    gap: 10px;
}

.btn-icon {
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-icon:hover {
    background: rgba(255,255,255,0.2);
}

/* Messages */
.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f9f9f9;
}

.message {
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.message.user {
    flex-direction: row-reverse;
}

.message-avatar {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: white;
    flex-shrink: 0;
}

.message.bot .message-avatar {
    background: #4CAF50;
}

.message.user .message-avatar {
    background: #2196F3;
}

.message.system .message-avatar {
    background: #ff9800;
}

.message-content {
    max-width: 70%;
    background: white;
    padding: 12px 16px;
    border-radius: 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    position: relative;
}

.message.user .message-content {
    background: #2196F3;
    color: white;
}

.message.system .message-content {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
}

.message-text {
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.message-time {
    font-size: 11px;
    opacity: 0.6;
    margin-top: 5px;
}

/* Typing Indicator */
.typing-indicator {
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f5f5f5;
    border-top: 1px solid #eee;
}

.typing-dots {
    display: flex;
    gap: 3px;
}

.typing-dots span {
    width: 6px;
    height: 6px;
    background: #999;
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
}

.typing-text {
    font-size: 13px;
    color: #666;
    font-style: italic;
}

/* Input */
.input-container {
    padding: 15px 20px;
    background: white;
    border-top: 1px solid #eee;
}

.input-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f5f5f5;
    border-radius: 25px;
    padding: 8px 15px;
}

.input-wrapper input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 14px;
    padding: 8px 0;
}

.btn-send {
    background: #4CAF50;
    border: none;
    color: white;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
}

.btn-send:hover {
    background: #45a049;
}

.btn-send:disabled {
    background: #ccc;
    cursor: not-allowed;
}

/* Quick Actions */
.quick-actions {
    position: absolute;
    bottom: 80px;
    left: 20px;
    right: 20px;
    background: white;
    border-radius: 15px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    padding: 15px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    z-index: 1000;
}

.quick-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 15px 10px;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: center;
}

.quick-action:hover {
    background: #f5f5f5;
}

.quick-action i {
    font-size: 24px;
    color: #4CAF50;
}

.quick-action span {
    font-size: 12px;
    color: #666;
    font-weight: 500;
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal-content {
    background: white;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    color: #333;
}

.btn-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
}

.modal-body {
    padding: 20px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
}

.form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
}

.btn-primary {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    width: 100%;
    transition: background-color 0.2s;
}

.btn-primary:hover {
    background: #45a049;
}

/* Responsive */
@media (max-width: 768px) {
    .chat-container {
        height: 100vh;
        border-radius: 0;
    }
    
    .message-content {
        max-width: 85%;
    }
    
    .quick-actions {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* Scrollbar */
.messages-container::-webkit-scrollbar {
    width: 6px;
}

.messages-container::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}'''
    
    # Append Insights CSS to stylesheet
    css_content += '''
/* Insights Panel */
.insights-panel { position: fixed; top: 70px; right: 20px; width: 320px; max-height: calc(100vh - 100px); background: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); border: 1px solid #eee; overflow: hidden; transform: translateX(0); transition: transform 0.25s ease; z-index: 1500; }
.insights-panel.collapsed { transform: translateX(380px); }
.insights-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #f8f9fa; border-bottom: 1px solid #eee; }
.insights-header h3 { font-size: 16px; margin: 0; }
.insights-body { padding: 12px 14px; overflow-y: auto; max-height: calc(100vh - 150px); }
.insights-empty { color: #777; font-size: 14px; }
.trait { border: 1px solid #eee; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
.trait .name { font-weight: 600; color: #333; }
.trait .value { color: #444; }
.trait .confidence { font-size: 12px; color: #777; }
.trait .evidence { margin-top: 6px; font-size: 12px; color: #666; }
'''

    # JavaScript
    js_content = '''// TravelFi Chatbot JavaScript
class TravelFiChat {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.username = null;
        this.isConnected = false;
        this.messageQueue = [];
        
        this.initializeElements();
    }
    
    initializeElements() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.quickActions = document.getElementById('quickActions');
        this.insightsPanel = document.getElementById('insightsPanel');
        this.insightsBody = document.getElementById('insightsBody');
    }
    
    async login(userData) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.userId = result.user_id;
                this.username = userData.username;
                
                // Close login modal
                document.getElementById('loginModal').style.display = 'none';
                
                // Connect to WebSocket
                this.connectWebSocket();
                
                return true;
            } else {
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
            return false;
        }
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.userId}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.updateConnectionStatus('connected');
            
            // Send queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.socket.send(JSON.stringify(message));
            }
            this.refreshInsights();
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
            // Refresh insights after any bot/system message
            if (data.type === 'bot' || data.type === 'system' || data.type === 'confirmation') {
                this.refreshInsights();
            }
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    this.connectWebSocket();
                }
            }, 3000);
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('error');
        };
    }
    
    updateConnectionStatus(status) {
        const statusElement = this.connectionStatus;
        statusElement.className = `status ${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'Online';
                break;
            case 'connecting':
                statusElement.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusElement.textContent = 'Reconnecting...';
                break;
            case 'error':
                statusElement.textContent = 'Connection Error';
                break;
        }
    }
    
    sendMessage(text = null) {
        const message = text || this.messageInput.value.trim();
        if (!message) return;
        
        // Clear input
        if (!text) {
            this.messageInput.value = '';
        }
        
        // Add user message to UI
        this.addMessage('user', message, new Date());
        
        // Send to server
        const messageData = {
            message: message,
            timestamp: new Date().toISOString()
        };
        
        if (this.isConnected) {
            this.socket.send(JSON.stringify(messageData));
        } else {
            this.messageQueue.push(messageData);
        }
        
        // Disable send button temporarily
        this.sendButton.disabled = true;
        setTimeout(() => {
            this.sendButton.disabled = false;
        }, 1000);
    }
    
    handleIncomingMessage(data) {
        switch (data.type) {
            case 'bot':
            case 'system':
                this.hideTypingIndicator();
                this.addMessage(data.type, data.message, new Date(data.timestamp));
                break;
                
            case 'typing':
                this.showTypingIndicator();
                break;
                
            case 'error':
                this.hideTypingIndicator();
                this.addMessage('system', '❌ ' + data.message, new Date(data.timestamp));
                break;
                
            case 'confirmation':
                this.hideTypingIndicator();
                this.addConfirmationMessage(data);
                break;
        }
    }
    
    addMessage(type, text, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (type === 'bot') {
            avatar.innerHTML = '<i class="fas fa-plane"></i>';
        } else if (type === 'user') {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatar.innerHTML = '<i class="fas fa-info-circle"></i>';
        }
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.innerHTML = this.formatMessage(text);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(timestamp);
        
        content.appendChild(textDiv);
        content.appendChild(timeDiv);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addConfirmationMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.innerHTML = this.formatMessage(data.message);
        
        // Add buttons
        if (data.buttons) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.marginTop = '10px';
            buttonsDiv.style.display = 'flex';
            buttonsDiv.style.gap = '10px';
            
            data.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.textContent = button.text;
                btn.style.padding = '8px 16px';
                btn.style.border = 'none';
                btn.style.borderRadius = '5px';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '12px';
                
                if (button.action === 'confirm_delete') {
                    btn.style.background = '#f44336';
                    btn.style.color = 'white';
                } else {
                    btn.style.background = '#4CAF50';
                    btn.style.color = 'white';
                }
                
                btn.onclick = () => this.handleButtonAction(button.action);
                buttonsDiv.appendChild(btn);
            });
            
            content.appendChild(textDiv);
            content.appendChild(buttonsDiv);
        } else {
            content.appendChild(textDiv);
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(new Date(data.timestamp));
        content.appendChild(timeDiv);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    async handleButtonAction(action) {
        try {
            const response = await fetch('/api/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    user_id: this.userId
                })
            });
            
            const result = await response.json();
            this.addMessage('system', result.message, new Date());
            
        } catch (error) {
            console.error('Action error:', error);
            this.addMessage('system', '❌ Error processing action', new Date());
        }
    }
    
    formatMessage(text) {
        // Safe markdown-lite formatting using RegExp constructor to avoid literal parsing issues
        try {
            if (typeof text !== 'string') return '';
            let s = text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            s = s.replace(new RegExp("\\*\\*(.*?)\\*\\*", 'g'), '<strong>$1</strong>');
            s = s.replace(new RegExp("\\*(.*?)\\*", 'g'), '<em>$1</em>');
            s = s.replace(/\n/g, '<br>');
            s = s.replace(new RegExp("\\[([^\\]]+)\\]\\(([^)]+)\\)", 'g'), '<a href="$2" target="_blank">$1</a>');
            return s;
        } catch (e) {
            console.error('[formatMessage] error', e);
            return String(text || '');
        }
    }
    
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    toggleQuickActions() {
        const isVisible = this.quickActions.style.display === 'block';
        this.quickActions.style.display = isVisible ? 'none' : 'block';
    }
    
    insertQuickMessage(text) {
        this.messageInput.value = text;
        this.messageInput.focus();
        this.quickActions.style.display = 'none';
    }

    async refreshInsights() {
        if (!this.userId) return;
        try {
            const res = await fetch(`/api/insights/${this.userId}`);
            const data = await res.json();
            this.renderInsights(data);
        } catch (e) {
            console.warn('Failed to load insights', e);
        }
    }

    renderInsights(data) {
        if (!this.insightsBody) return;
        const traits = (data && data.traits) || {};
        if (Object.keys(traits).length === 0) {
            this.insightsBody.innerHTML = '<div class="insights-empty">No insights yet. Start chatting and I\'ll learn your preferences.</div>';
            return;
        }
        const frag = document.createDocumentFragment();
        Object.entries(traits).forEach(([name, info]) => {
            const box = document.createElement('div');
            box.className = 'trait';
            const value = (info && info.value !== undefined) ? info.value : '';
            const conf = (info && info.confidence !== undefined) ? info.confidence : 0;
            const evid = (info && info.evidence) || [];
            box.innerHTML = `<div class=\"name\">${name}</div>
                             <div class=\"value\">${Array.isArray(value) ? value.join(', ') : value}</div>
                             <div class=\"confidence\">confidence: ${Number(conf).toFixed(2)}</div>
                             <div class=\"evidence\">evidence: ${evid.length} entries</div>`;
            frag.appendChild(box);
        });
        this.insightsBody.innerHTML = '';
        this.insightsBody.appendChild(frag);
    }
}

// Global chat instance
let chat = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    chat = new TravelFiChat();
});

// Event handlers
function handleLogin(event) {
    event.preventDefault();
    const userData = {
        user_id: Math.floor(Math.random() * 1000000),
        username: document.getElementById('username').value,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        password: document.getElementById('password').value
    };
    (async () => {
        try {
            const ok = await chat.login(userData);
            if (!ok) alert('Login failed. Please try again.');
        } catch (e) {
            console.error(e);
            alert('Login error. Please try again.');
        }
    })();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    chat.sendMessage();
}

function showQuickActions() {
    chat.toggleQuickActions();
}

function insertQuickMessage(text) {
    chat.insertQuickMessage(text);
}

function showUserProfile() {
    chat.sendMessage('/memories');
}

function showSettings() {
    alert('Settings panel coming soon!');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close quick actions when clicking outside
document.addEventListener('click', function(event) {
    const quickActions = document.getElementById('quickActions');
    const plusButton = event.target.closest('.btn-icon');
    
    if (quickActions.style.display === 'block' && !quickActions.contains(event.target) && !plusButton) {
        quickActions.style.display = 'none';
    }
});

function toggleInsights() {
    const panel = document.getElementById('insightsPanel');
    panel.classList.toggle('collapsed');
    if (!panel.classList.contains('collapsed') && window.chat && typeof window.chat.refreshInsights === 'function') {
        window.chat.refreshInsights();
    }
}
'''
    
    # Write CSS file
    with open("static/css/chatbot.css", "w") as f:
        f.write(css_content)
    
    # Write JavaScript file  
    with open("static/js/chatbot.js", "w") as f:
        f.write(js_content)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(chatbot_app, host="0.0.0.0", port=8002)
