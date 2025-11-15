from __future__ import annotations

import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel

from .config import get_settings
from .models import Alert

settings = get_settings()
logger = logging.getLogger(__name__)

if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.database_url,
        connect_args=connect_args,
        poolclass=StaticPool,
    )
else:
    connect_args = {}
    engine = create_engine(
        settings.database_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )
SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_ingested_at_column()


def get_session():
    with SessionLocal() as session:
        yield session


def _ensure_ingested_at_column() -> None:
    inspector = inspect(engine)
    table_name = Alert.__tablename__
    if not inspector.has_table(table_name):
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if "ingested_at" in columns:
        return

    dialect = engine.dialect.name
    with engine.begin() as connection:
        if dialect == "sqlite":
            connection.execute(
                text(
                    f"ALTER TABLE {table_name} ADD COLUMN ingested_at "
                    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                )
            )
        else:
            connection.execute(
                text(
                    f"ALTER TABLE {table_name} ADD COLUMN ingested_at "
                    "TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()"
                )
            )
            connection.execute(
                text(f"ALTER TABLE {table_name} ALTER COLUMN ingested_at SET DEFAULT NOW()")
            )

        connection.execute(
            text(
                f"UPDATE {table_name} "
                "SET ingested_at = COALESCE(ingested_at, timestamp)"
            )
        )
        if dialect != "sqlite":
            connection.execute(
                text(f"ALTER TABLE {table_name} ALTER COLUMN ingested_at SET NOT NULL")
            )
    logger.info("alerts.ingested_at column added on the fly to keep latency metrics consistent")
