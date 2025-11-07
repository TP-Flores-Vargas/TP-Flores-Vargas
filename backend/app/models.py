from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class SeverityEnum(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class AttackTypeEnum(str, enum.Enum):
    benign = "Benign"
    dos = "DoS"
    ddos = "DDoS"
    portscan = "PortScan"
    bruteforce = "BruteForce"
    xss = "XSS"
    sqli = "SQLi"
    bot = "Bot"
    infiltration = "Infiltration"
    other = "Other"


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


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True, nullable=False)
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
