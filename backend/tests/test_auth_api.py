import os

from sqlmodel import SQLModel, Session, create_engine

os.environ["INGESTION_MODE"] = "TEST_DISABLED"
os.environ["AUTH_SECRET"] = "test-secret"
os.environ["DATABASE_URL"] = "sqlite://"

from app.repositories.users_repo import UserRepository
from app.services.auth_service import AuthService
from app.models import UserRoleEnum

engine = create_engine("sqlite://", connect_args={"check_same_thread": False})


def reset_database():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def test_login_with_default_user_returns_token():
    reset_database()
    with Session(engine) as session:
        service = AuthService(UserRepository(session))
        token, user = service.login("user", "user")

    assert token
    assert user.username == "user"
    assert user.role == UserRoleEnum.user


def test_change_password_persists_and_invalidates_old_password():
    reset_database()
    with Session(engine) as session:
        service = AuthService(UserRepository(session))
        token, user = service.login("user", "user")
        current_user = service.current_user(token)
        refreshed_token, updated_user = service.change_password(current_user, "user", "user-updated")

        assert refreshed_token != token
        assert updated_user.username == "user"

        try:
            service.login("user", "user")
        except Exception:
            pass
        else:
            raise AssertionError("La contraseña anterior siguió siendo válida.")

        second_token, second_user = service.login("user", "user-updated")
        assert second_token
        assert second_user.username == "user"


def test_notification_settings_persist():
    reset_database()
    with Session(engine) as session:
        service = AuthService(UserRepository(session))
        token, _ = service.login("admin", "admin")
        current_user = service.current_user(token)
        updated = service.update_notification_settings(
            current_user,
            notification_email="qa@example.com",
            notification_enabled=True,
        )
        reloaded = service.current_user(token)

    assert updated.notification_email == "qa@example.com"
    assert reloaded.notification_email == "qa@example.com"
