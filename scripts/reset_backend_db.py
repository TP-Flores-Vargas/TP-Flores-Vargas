#!/usr/bin/env python3
"""Utility to reset the backend database (SQLite or Postgres)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy.engine import make_url
from sqlmodel import SQLModel


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
DB_PATH = BACKEND_DIR / "alerts.db"


def main() -> None:
    if os.name == "nt":
        candidates = ["python.exe", "python"]
        base = BACKEND_DIR / "venv" / "Scripts"
    else:
        candidates = ["python", "python3"]
        base = BACKEND_DIR / "venv" / "bin"

    venv_python = None
    for name in candidates:
        candidate = base / name
        if candidate.exists():
            venv_python = candidate
            break

    if venv_python:
        current = Path(sys.executable).resolve()
        if current != venv_python.resolve():
            os.execv(str(venv_python), [str(venv_python), str(Path(__file__).resolve())])
    else:
        raise SystemExit(
            "El entorno backend/venv no existe. Ejecuta ./start.sh para generarlo "
            "antes de correr scripts/reset_backend_db.py."
        )

    sys.path.insert(0, str(BACKEND_DIR))
    os.chdir(BACKEND_DIR)
    try:
        from app.db import engine, init_db
    except Exception as exc:  # pragma: no cover - defensive
        raise SystemExit(f"ERROR: no se pudo importar app.db: {exc}") from exc

    url = make_url(str(engine.url))
    if url.drivername.startswith("sqlite"):
        if DB_PATH.exists():
            DB_PATH.unlink()
        init_db()
        print(f"Base SQLite regenerada en {DB_PATH}")
    else:
        SQLModel.metadata.drop_all(engine)
        init_db()
        print(f"Base {url.drivername} reinicializada en {url.host}:{url.port}/{url.database}")


if __name__ == "__main__":
    main()
