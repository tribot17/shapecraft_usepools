import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Config:
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    
    # Stripe Configuration
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    
    # Travel APIs
    AMADEUS_API_KEY = os.getenv("AMADEUS_API_KEY", "")
    AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET", "")
    DUFFEL_API_TOKEN = os.getenv("DUFFEL_API_TOKEN", "")
    
    # Server Configuration
    SERVER_HOST = os.getenv("SERVER_HOST", "localhost")
    SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
    WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
    
    # Development
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    
    # Database (Neon)
    DB_DSN = os.getenv("DATABASE_CONNECTION", "")
    
    # SMTP (Email)
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
    
    # Paths (absolute) – keep all data under project_root/data consistently
    # Project root (three levels up from this file)
    _BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    DATA_DIR = os.path.join(_BASE_DIR, "data")
    USERS_DIR = os.path.join(DATA_DIR, "users")
    CONVERSATIONS_DIR = os.path.join(DATA_DIR, "conversations")
    LOGS_DIR = os.path.join(DATA_DIR, "logs")
