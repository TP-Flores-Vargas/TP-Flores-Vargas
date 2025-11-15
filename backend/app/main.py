from __future__ import annotations

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .adapters.zeek_adapter import ZeekAdapter
from .config import get_settings
from .db import SessionLocal, init_db
from .dependencies import get_alerts_service, stream_manager
from .repositories.alerts_repo import AlertRepository
from .routers import alerts, metrics, stream, zeek_lab
from .services.alerts_service import AlertsService
from .services.generators.synthetic_generator import SyntheticAlertGenerator
from .services.model_provider import get_model_adapter
from .services.synthetic_control import start_synthetic_emitter, stop_synthetic_emitter

settings = get_settings()
app = FastAPI(title="IDS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router)
app.include_router(metrics.router)
app.include_router(stream.router)
app.include_router(zeek_lab.router)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event():
    init_db()
    if not hasattr(app.state, "zeek_datasets"):
        app.state.zeek_datasets = {}
    if not hasattr(app.state, "synthetic_generator"):
        app.state.synthetic_generator = SyntheticAlertGenerator(seed=settings.synthetic_seed)
    app.state.synthetic_rate = getattr(app.state, "synthetic_rate", settings.synthetic_rate_per_min)
    ingestion_mode = settings.ingestion_mode.upper()
    if ingestion_mode.startswith("SYNTHETIC"):
        generator = app.state.synthetic_generator
        with SessionLocal() as session:
            repo = AlertRepository(session)
            service = AlertsService(repo, stream_manager)
            if repo.total() == 0:
                generator.seed_initial(service, settings.synthetic_seed_count)
        if settings.synthetic_autostart and settings.synthetic_rate_per_min > 0:
            await start_synthetic_emitter(
                app,
                stream_manager,
                settings.synthetic_rate_per_min,
                seed=settings.synthetic_seed,
            )
    elif ingestion_mode == "MANUAL":
        # DB freshly initialized; ingestion happens via cron / manual sync.
        pass
    elif ingestion_mode == "ZEEK_CSV":
        if not settings.zeek_conn_path:
            raise RuntimeError("ZEEK_CSV requiere ZEEK_CONN_PATH configurado en .env")
        model_adapter = get_model_adapter(settings.model_path)
        zeek_adapter = ZeekAdapter(settings.zeek_conn_path, model_adapter)
        limit = settings.zeek_seed_limit if settings.zeek_seed_limit > 0 else None
        with SessionLocal() as session:
            repo = AlertRepository(session)
            service = AlertsService(repo, stream_manager)
            created = zeek_adapter.seed_from_csv(service, limit)
            app.state.zeek_ingested = created
    elif ingestion_mode == "TEST_DISABLED":
        # Usado por la suite de tests para evitar side-effects en la BD.
        pass
    else:
        raise RuntimeError(f"Modo de ingesta no soportado: {ingestion_mode}")


@app.on_event("shutdown")
async def shutdown_event():
    await stop_synthetic_emitter(app)
