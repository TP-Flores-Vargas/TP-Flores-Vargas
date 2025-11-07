from __future__ import annotations

import asyncio
import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import SessionLocal, init_db
from .dependencies import get_alerts_service, stream_manager
from .repositories.alerts_repo import AlertRepository
from .routers import alerts, metrics, stream
from .services.alerts_service import AlertsService
from .services.generators.synthetic_generator import SyntheticAlertGenerator

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


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


async def _synthetic_worker(generator: SyntheticAlertGenerator, rate: int, stop_event: asyncio.Event):
    with SessionLocal() as session:
        repo = AlertRepository(session)
        service = AlertsService(repo, stream_manager)
        await generator.start_live_emit(service, rate, stop_event)


@app.on_event("startup")
async def startup_event():
    init_db()
    ingestion_mode = settings.ingestion_mode.upper()
    generator = SyntheticAlertGenerator(seed=settings.synthetic_seed)
    app.state.synthetic_generator = generator
    if ingestion_mode.startswith("SYNTHETIC"):
        with SessionLocal() as session:
            repo = AlertRepository(session)
            service = AlertsService(repo, stream_manager)
            if repo.total() == 0:
                generator.seed_initial(service, settings.synthetic_seed_count)
        if settings.synthetic_rate_per_min > 0:
            stop_event = asyncio.Event()
            app.state.synthetic_stop_event = stop_event
            app.state.synthetic_task = asyncio.create_task(
                _synthetic_worker(generator, settings.synthetic_rate_per_min, stop_event)
            )


@app.on_event("shutdown")
async def shutdown_event():
    stop_event: asyncio.Event | None = getattr(app.state, "synthetic_stop_event", None)
    task: asyncio.Task | None = getattr(app.state, "synthetic_task", None)
    if stop_event:
        stop_event.set()
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
