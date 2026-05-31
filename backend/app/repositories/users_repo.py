from __future__ import annotations

from datetime import datetime

from sqlmodel import Session, select

from ..models import User, UserRoleEnum


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_username(self, username: str) -> User | None:
        statement = select(User).where(User.username == username)
        return self.session.exec(statement).first()

    def list_notification_recipients(self) -> list[User]:
        statement = select(User).where(
            User.notification_enabled.is_(True),
            User.notification_email.is_not(None),
        )
        return list(self.session.exec(statement))

    def create(
        self,
        *,
        username: str,
        password_hash: str,
        role: UserRoleEnum,
        display_name: str,
    ) -> User:
        now = datetime.utcnow()
        user = User(
            username=username,
            password_hash=password_hash,
            role=role,
            display_name=display_name,
            created_at=now,
            updated_at=now,
        )
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def update_password(self, user: User, password_hash: str) -> User:
        user.password_hash = password_hash
        user.token_version += 1
        user.updated_at = datetime.utcnow()
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def update_notification_settings(
        self,
        user: User,
        *,
        notification_email: str | None,
        notification_enabled: bool,
    ) -> User:
        user.notification_email = notification_email
        user.notification_enabled = notification_enabled
        user.updated_at = datetime.utcnow()
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
