from __future__ import annotations

import asyncio
import contextlib
from typing import Any

from ..db import SessionLocal
from ..repositories.alerts_repo import AlertRepository
from ..services.alerts_service import AlertsService
from ..services.generators.synthetic_generator import SyntheticAlertGenerator


async def _synthetic_worker(
    generator: SyntheticAlertGenerator,
    rate: int,
    stop_event: asyncio.Event,
    stream_manager,
) -> None:
    with SessionLocal() as session:
        repo = AlertRepository(session)
        service = AlertsService(repo, stream_manager)
        await generator.start_live_emit(service, rate, stop_event)


def get_synthetic_status(app, default_rate: int = 0) -> dict[str, Any]:
    task = getattr(app.state, "synthetic_task", None)
    enabled = bool(task and not task.done())
    rate = getattr(app.state, "synthetic_rate", default_rate)
    return {"enabled": enabled, "rate_per_min": rate or default_rate}


async def start_synthetic_emitter(
    app,
    stream_manager,
    rate_per_min: int,
    seed: int | None = None,
) -> bool:
    if rate_per_min <= 0:
        raise ValueError("rate_per_min debe ser mayor que cero")

    existing_task = getattr(app.state, "synthetic_task", None)
    if existing_task and not existing_task.done():
        if getattr(app.state, "synthetic_rate", None) == rate_per_min:
            return False
        await stop_synthetic_emitter(app)

    generator = getattr(app.state, "synthetic_generator", None)
    if generator is None:
        generator = SyntheticAlertGenerator(seed=seed or 42)
        app.state.synthetic_generator = generator

    stop_event = asyncio.Event()
    task = asyncio.create_task(
        _synthetic_worker(generator, rate_per_min, stop_event, stream_manager)
    )
    app.state.synthetic_stop_event = stop_event
    app.state.synthetic_task = task
    app.state.synthetic_rate = rate_per_min
    return True


async def stop_synthetic_emitter(app) -> bool:
    task = getattr(app.state, "synthetic_task", None)
    if not task:
        return False

    stop_event = getattr(app.state, "synthetic_stop_event", None)
    if stop_event:
        stop_event.set()

    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task

    app.state.synthetic_task = None
    app.state.synthetic_stop_event = None
    return True
