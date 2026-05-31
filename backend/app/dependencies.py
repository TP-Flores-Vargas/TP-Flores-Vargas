from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from .db import get_session
from .models import User
from .repositories.alerts_repo import AlertRepository
from .repositories.users_repo import UserRepository
from .services.alerts_service import AlertStreamManager, AlertsService
from .services.auth_service import AuthService

stream_manager = AlertStreamManager()
bearer_scheme = HTTPBearer(auto_error=False)


def get_alerts_service(session: Session = Depends(get_session)) -> AlertsService:
    repository = AlertRepository(session)
    return AlertsService(repository, stream_manager)


def get_auth_service(session: Session = Depends(get_session)) -> AuthService:
    repository = UserRepository(session)
    service = AuthService(repository)
    service.ensure_default_users()
    return service


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(get_auth_service),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión.",
        )
    return service.current_user(credentials.credentials)
