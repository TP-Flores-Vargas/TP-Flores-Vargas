from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime

from fastapi import HTTPException, status

from ..config import get_settings
from ..models import User, UserRoleEnum
from ..repositories.users_repo import UserRepository
from ..schemas import UserRead

PASSWORD_ALGO = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 390000


class AuthService:
    def __init__(self, repository: UserRepository):
        self.repository = repository
        self.settings = get_settings()

    def ensure_default_users(self) -> None:
        defaults = (
            (
                self.settings.seed_admin_username.strip(),
                self.settings.seed_admin_password,
                UserRoleEnum.admin,
                self.settings.seed_admin_display_name,
            ),
            (
                self.settings.seed_user_username.strip(),
                self.settings.seed_user_password,
                UserRoleEnum.user,
                self.settings.seed_user_display_name,
            ),
        )
        for username, password, role, display_name in defaults:
            if not username:
                continue
            if self.repository.get_by_username(username):
                continue
            self.repository.create(
                username=username,
                password_hash=self.hash_password(password),
                role=role,
                display_name=display_name,
            )

    def login(self, username: str, password: str) -> tuple[str, UserRead]:
        self.ensure_default_users()
        trimmed = username.strip()
        user = self.repository.get_by_username(trimmed)
        if not user or not self.verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario o contraseña incorrectos.",
            )
        token = self.create_access_token(user)
        return token, UserRead.model_validate(user)

    def current_user(self, token: str) -> User:
        self.ensure_default_users()
        payload = self._decode_token(token)
        username = payload.get("sub")
        version = int(payload.get("ver", 0))
        user = self.repository.get_by_username(username)
        if not user or user.token_version != version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión ya no es válida.",
            )
        return user

    def change_password(self, user: User, current_password: str, new_password: str) -> tuple[str, UserRead]:
        if not self.verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña actual no coincide.",
            )
        updated = self.repository.update_password(user, self.hash_password(new_password))
        token = self.create_access_token(updated)
        return token, UserRead.model_validate(updated)

    def update_notification_settings(
        self,
        user: User,
        *,
        notification_email: str | None,
        notification_enabled: bool,
    ) -> UserRead:
        normalized_email = (notification_email or "").strip() or None
        if normalized_email is None:
            notification_enabled = False
        updated = self.repository.update_notification_settings(
            user,
            notification_email=normalized_email,
            notification_enabled=notification_enabled,
        )
        return UserRead.model_validate(updated)

    def create_access_token(self, user: User) -> str:
        expires_at = int(time.time()) + max(1, self.settings.auth_token_ttl_hours) * 3600
        payload = {
            "sub": user.username,
            "ver": user.token_version,
            "exp": expires_at,
        }
        return self._encode_token(payload)

    @staticmethod
    def hash_password(password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            PASSWORD_ITERATIONS,
        )
        encoded = base64.urlsafe_b64encode(digest).decode("ascii")
        return f"{PASSWORD_ALGO}${PASSWORD_ITERATIONS}${salt}${encoded}"

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        try:
            algorithm, iterations_raw, salt, stored = password_hash.split("$", 3)
        except ValueError:
            return False
        if algorithm != PASSWORD_ALGO:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            int(iterations_raw),
        )
        candidate = base64.urlsafe_b64encode(digest).decode("ascii")
        return hmac.compare_digest(candidate, stored)

    def _encode_token(self, payload: dict[str, object]) -> str:
        encoded_payload = self._b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        signature = hmac.new(
            self.settings.auth_secret.encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        return f"{encoded_payload}.{self._b64_encode(signature)}"

    def _decode_token(self, token: str) -> dict[str, object]:
        try:
            encoded_payload, encoded_signature = token.split(".", 1)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
            ) from exc

        expected_signature = hmac.new(
            self.settings.auth_secret.encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        signature = self._b64_decode(encoded_signature)
        if not hmac.compare_digest(signature, expected_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
            )

        try:
            payload = json.loads(self._b64_decode(encoded_payload).decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
            ) from exc
        if int(payload.get("exp", 0)) < int(time.time()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión expiró.",
            )
        return payload

    @staticmethod
    def _b64_encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

    @staticmethod
    def _b64_decode(data: str) -> bytes:
        padding = "=" * (-len(data) % 4)
        return base64.urlsafe_b64decode(f"{data}{padding}".encode("ascii"))
