from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://ids:ids@localhost:5432/ids"  # default local Postgres
    )
    allow_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    ingestion_mode: str = "MANUAL"
    synthetic_seed_count: int = 200
    synthetic_seed: int = 42
    synthetic_rate_per_min: int = 5
    synthetic_autostart: bool = False
    replay_speed: float = 1.0
    stream_mode: str = "SSE"
    model_path: str = "artifacts/rf_cicids2017_zeek_multiclass_v3.pkl"
    zeek_conn_path: str | None = "data/default_csv/conn_latest.csv"
    zeek_seed_limit: int = 500
    zeek_upload_dir: str = "./tmp/zeek_uploads"
    zeek_reference_dataset: str = "data/default_csv/attacks_reference.csv"
    zeek_sync_script: str | None = "../sync_zeek_and_simulate.sh"
    kali_ssh_host: str | None = None
    kali_ssh_user: str | None = None
    kali_ssh_port: int = 22
    kali_ssh_key_path: str | None = None
    kali_command_timeout: int = 30
    kali_allow_local_fallback: bool = True
    db_pool_size: int = 20
    db_max_overflow: int = 40
    db_pool_timeout: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=("settings_",),
    )

    @field_validator("allow_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
