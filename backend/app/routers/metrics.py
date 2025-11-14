from fastapi import APIRouter, Depends

from ..dependencies import get_alerts_service
from ..schemas import DashboardMetrics, MetricsOverview
from ..services.alerts_service import AlertsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/overview", response_model=MetricsOverview)
def get_overview(service: AlertsService = Depends(get_alerts_service)):
    return service.metrics_overview()


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(service: AlertsService = Depends(get_alerts_service)):
    return service.dashboard_metrics()
