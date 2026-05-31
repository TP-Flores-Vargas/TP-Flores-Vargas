from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import ConfigDict
from sqlalchemy import JSON, Column, String
from sqlmodel import Field, SQLModel


class SeverityEnum(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class AttackTypeEnum(str, enum.Enum):
    benign = "BENIGN"
    bot = "BOT"
    bruteforce = "BRUTE_FORCE"
    ddos = "DDOS"
    dos = "DOS"
    portscan = "PORTSCAN"


class ProtocolEnum(str, enum.Enum):
    tcp = "TCP"
    udp = "UDP"
    icmp = "ICMP"
    http = "HTTP"
    https = "HTTPS"
    dns = "DNS"
    other = "Other"


class ModelLabelEnum(str, enum.Enum):
    benign = "benign"
    malicious = "malicious"


class UserRoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"
    model_config = ConfigDict(protected_namespaces=())

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True, nullable=False)
    ingested_at: datetime = Field(default_factory=datetime.utcnow, index=True, nullable=False)
    severity: SeverityEnum = Field(index=True, nullable=False)
    attack_type: AttackTypeEnum = Field(index=True, nullable=False)
    src_ip: str = Field(nullable=False, index=True)
    src_port: int = Field(nullable=False)
    dst_ip: str = Field(nullable=False, index=True)
    dst_port: int = Field(nullable=False)
    protocol: ProtocolEnum = Field(nullable=False, index=True)
    rule_id: str = Field(nullable=False, index=True)
    rule_name: str = Field(nullable=False)
    model_score: float = Field(nullable=False)
    model_label: ModelLabelEnum = Field(nullable=False)
    meta: dict | None = Field(default_factory=dict, sa_column=Column(JSON))


class User(SQLModel, table=True):
    __tablename__ = "users"
    model_config = ConfigDict(protected_namespaces=())

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    username: str = Field(sa_column=Column(String(64), unique=True, nullable=False, index=True))
    password_hash: str = Field(nullable=False)
    role: UserRoleEnum = Field(default=UserRoleEnum.user, nullable=False, index=True)
    display_name: str = Field(default="Usuario", nullable=False)
    notification_email: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True, index=True),
    )
    notification_enabled: bool = Field(default=True, nullable=False)
    token_version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
