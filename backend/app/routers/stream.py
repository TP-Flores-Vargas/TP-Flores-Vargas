from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from ..config import get_settings
from ..dependencies import get_alerts_service
from ..services.alerts_service import AlertsService

router = APIRouter(tags=["stream"])


@router.get("/stream")
async def alert_stream(service: AlertsService = Depends(get_alerts_service)):
    settings = get_settings()
    if settings.stream_mode.upper() != "SSE":
        return {"detail": "Stream mode is disabled or not using SSE"}

    async def event_generator():
        async for alert in service.stream_alerts():
            yield {"event": "alert", "data": alert}

    return EventSourceResponse(event_generator())
