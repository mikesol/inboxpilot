from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # OpenAI
    openai_api_key: str

    # Clerk Auth
    clerk_secret_key: str
    clerk_authorized_parties: list[str] = ["http://localhost:3000"]

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # SMTP / Email
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    from_email: str = "noreply@inboxpilot.local"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
