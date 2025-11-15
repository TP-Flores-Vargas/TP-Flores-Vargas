from fastapi import APIRouter, Depends

from ..dependencies import get_alerts_service
from ..schemas import DashboardMetrics, MetricsOverview, ModelPerformanceMetrics
from ..services.alerts_service import AlertsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/overview", response_model=MetricsOverview)
def get_overview(service: AlertsService = Depends(get_alerts_service)):
    return service.metrics_overview()


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(service: AlertsService = Depends(get_alerts_service)):
    return service.dashboard_metrics()


@router.get("/model-performance", response_model=ModelPerformanceMetrics)
def get_model_performance(
    window_hours: int = 24,
    service: AlertsService = Depends(get_alerts_service),
):
    """
    Devuelve métricas centradas en el desempeño del modelo
    (score promedio, latencia, distribución por tipo de ataque y dataset).
    """
    return service.model_performance_metrics(window_hours=window_hours)
