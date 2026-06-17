# basically get the env variables from .env file and make them available as settings
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GO_BACKEND_URL: str

    OPENROUTER_MODEL: str
    OPENROUTER_API_KEY: str

    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

settings = Settings()