from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict

from .models import (
    Alert,
    AttackTypeEnum,
    ModelLabelEnum,
    ProtocolEnum,
    SeverityEnum,
)


class AlertBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: SeverityEnum
    attack_type: AttackTypeEnum
    src_ip: str
    src_port: int
    dst_ip: str
    dst_port: int
    protocol: ProtocolEnum
    rule_id: str
    rule_name: str
    model_score: float
    model_label: ModelLabelEnum
    meta: Dict[str, Any] = Field(default_factory=dict)


class AlertCreate(AlertBase):
    pass


class AlertRead(AlertBase):
    id: uuid.UUID

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    items: List[AlertRead]
    total: int
    page: int
    page_size: int


class AlertFilters(BaseModel):
    page: int = 1
    page_size: int = 25
    from_ts: Optional[datetime] = None
    to_ts: Optional[datetime] = None
    severity: List[SeverityEnum] = Field(default_factory=list)
    attack_type: List[AttackTypeEnum] = Field(default_factory=list)
    protocol: List[ProtocolEnum] = Field(default_factory=list)
    query: Optional[str] = None
    sort: str = "-timestamp"


class SeverityCounts(BaseModel):
    Low: int = 0
    Medium: int = 0
    High: int = 0
    Critical: int = 0


class TimeSeriesBucket(BaseModel):
    bucket: datetime
    count: int


class MetricsOverview(BaseModel):
    counts_by_severity: SeverityCounts
    last24h_series: List[TimeSeriesBucket]
