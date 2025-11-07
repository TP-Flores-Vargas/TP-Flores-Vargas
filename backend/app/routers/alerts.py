from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from ..dependencies import get_alerts_service
from ..models import AttackTypeEnum, ProtocolEnum, SeverityEnum
from ..schemas import AlertCreate, AlertFilters, AlertListResponse, AlertRead
from ..services.alerts_service import AlertsService

router = APIRouter(prefix="/alerts", tags=["alerts"])


def build_filters(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    from_ts: Optional[str] = None,
    to_ts: Optional[str] = None,
    severity: Optional[List[SeverityEnum]] = Query(None),
    attack_type: Optional[List[AttackTypeEnum]] = Query(None),
    protocol: Optional[List[ProtocolEnum]] = Query(None),
    q: Optional[str] = Query(None, alias="query"),
    sort: str = "-timestamp",
) -> AlertFilters:
    from_dt = datetime.fromisoformat(from_ts) if from_ts else None
    to_dt = datetime.fromisoformat(to_ts) if to_ts else None
    return AlertFilters(
        page=page,
        page_size=page_size,
        from_ts=from_dt,
        to_ts=to_dt,
        severity=severity or [],
        attack_type=attack_type or [],
        protocol=protocol or [],
        query=q,
        sort=sort,
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(
    filters: AlertFilters = Depends(build_filters),
    service: AlertsService = Depends(get_alerts_service),
):
    return service.list_alerts(filters)


@router.get("/export.csv")
def export_alerts(
    filters: AlertFilters = Depends(build_filters),
    service: AlertsService = Depends(get_alerts_service),
):
    generator = service.export_csv(filters)
    headers = {"Content-Disposition": "attachment; filename=alerts_export.csv"}
    return StreamingResponse(generator, media_type="text/csv", headers=headers)


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert(alert_id: UUID, service: AlertsService = Depends(get_alerts_service)):
    return service.get_alert(alert_id)


@router.post("", response_model=AlertRead, status_code=201)
def create_alert(payload: AlertCreate, service: AlertsService = Depends(get_alerts_service)):
    return service.create_alert(payload, source="api")
