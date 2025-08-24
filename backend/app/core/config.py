from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # CORS / App
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "https://shapecraft-usepools.vercel.app"
    ]
    PROJECT_NAME: str = "Scooby - NFT Companion API"

    # OpenSea
    OPENSEA_API_KEY: str | None = None
    OPENSEA_BASE_URL: str = "https://api.opensea.io/api/v2"

    # OpenAI
    OPENAI_API_KEY: str | None = None

    # Database
    DATABASE_URL: str | None = None

    # SMTP (optional). If set, verification emails will be sent.
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USER: str | None = None
    SMTP_PASS: str | None = None
    SMTP_FROM: str | None = None


settings = Settings()


