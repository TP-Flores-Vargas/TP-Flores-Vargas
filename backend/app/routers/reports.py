from datetime import datetime

from fastapi import APIRouter, Depends, Query

from ..dependencies import get_alerts_service
from ..schemas import ReportsSummary
from ..services.alerts_service import AlertsService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=ReportsSummary)
def get_reports_summary(
    from_ts: datetime | None = Query(None),
    to_ts: datetime | None = Query(None),
    service: AlertsService = Depends(get_alerts_service),
):
    return service.reports_summary(from_ts=from_ts, to_ts=to_ts)
