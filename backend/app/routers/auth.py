from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import get_auth_service, get_current_user
from ..models import User
from ..schemas import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    NotificationSettingsUpdate,
    UserRead,
)
from ..services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)):
    token, user = service.login(payload.username, payload.password)
    return LoginResponse(access_token=token, user=user)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return UserRead.model_validate(user)


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    token, user_read = service.change_password(user, payload.current_password, payload.new_password)
    return ChangePasswordResponse(
        access_token=token,
        user=user_read,
        message="Contraseña actualizada con éxito.",
    )


@router.patch("/me/notifications", response_model=UserRead)
def update_notifications(
    payload: NotificationSettingsUpdate,
    user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    return service.update_notification_settings(
        user,
        notification_email=payload.notification_email,
        notification_enabled=payload.notification_enabled,
    )
