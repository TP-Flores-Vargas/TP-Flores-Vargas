from fastapi import Depends
from sqlmodel import Session

from .db import get_session
from .repositories.alerts_repo import AlertRepository
from .services.alerts_service import AlertStreamManager, AlertsService

stream_manager = AlertStreamManager()


def get_alerts_service(session: Session = Depends(get_session)) -> AlertsService:
    repository = AlertRepository(session)
    return AlertsService(repository, stream_manager)
