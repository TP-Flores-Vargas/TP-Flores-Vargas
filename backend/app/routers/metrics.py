from fastapi import APIRouter, Depends

from ..dependencies import get_alerts_service
from ..schemas import MetricsOverview
from ..services.alerts_service import AlertsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/overview", response_model=MetricsOverview)
def get_overview(service: AlertsService = Depends(get_alerts_service)):
    return service.metrics_overview()
