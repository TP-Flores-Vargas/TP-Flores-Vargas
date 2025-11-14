from __future__ import annotations

import asyncio
import csv
import io
from datetime import datetime, timedelta
from typing import AsyncGenerator, Dict, Iterable, List

from fastapi import HTTPException, status

import logging
import time

from ..models import Alert
from ..repositories.alerts_repo import AlertRepository
from ..schemas import (
    AlertCreate,
    AlertFilters,
    AlertListResponse,
    AlertRead,
    AttackDistributionEntry,
    DashboardMetrics,
    MetricsOverview,
    TimeSeriesBucket,
)

logger = logging.getLogger(__name__)

class AlertStreamManager:
    def __init__(self) -> None:
        self._subscribers: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()

    async def publish(self, alert: AlertRead) -> None:
        payload = alert.model_dump(mode="json")
        async with self._lock:
            for queue in list(self._subscribers):
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                    queue.put_nowait(payload)

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers.append(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        async with self._lock:
            if queue in self._subscribers:
                self._subscribers.remove(queue)


class AlertsService:
    def __init__(self, repository: AlertRepository, stream_manager: AlertStreamManager):
        self.repository = repository
        self.stream_manager = stream_manager
        self._overview_cache: Dict[str, object] | None = None
        self._dashboard_cache: Dict[str, object] | None = None
        self._cache_ttl = 10.0  # seconds

    def list_alerts(self, filters: AlertFilters) -> AlertListResponse:
        items, total = self.repository.list(filters)
        return AlertListResponse(
            items=[AlertRead.model_validate(item) for item in items],
            total=total,
            page=filters.page,
            page_size=filters.page_size,
        )

    def get_alert(self, alert_id) -> AlertRead:
        alert = self.repository.get(alert_id)
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        return AlertRead.model_validate(alert)

    def create_alert(self, payload: AlertCreate, source: str = "synthetic") -> AlertRead:
        """
        Crea una alerta y, si hay un event loop disponible, la publica en el stream.
        Si se llama desde un contexto síncrono (threadpool), evita romper la API
        y solo loguea la imposibilidad de hacer streaming.
        """
        data = payload.model_copy(deep=True)
        data.meta["source"] = source

        # Guardar en base de datos
        alert = self.repository.create(data)
        alert_read = AlertRead.model_validate(alert)
        self._invalidate_caches()

        # Intentar publicar en streaming solo si hay event loop corriendo
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No hay event loop (ej. llamado desde run_in_threadpool)
            logger.warning(
                "No running event loop; skipping stream publish for alert %s",
                alert_read.id,
            )
        else:
            loop.create_task(self.stream_manager.publish(alert_read))

        return alert_read


    def export_csv(self, filters: AlertFilters) -> Iterable[bytes]:
        header = [
            "id",
            "timestamp",
            "severity",
            "attack_type",
            "src_ip",
            "src_port",
            "dst_ip",
            "dst_port",
            "protocol",
            "rule_id",
            "rule_name",
            "model_score",
            "model_label",
        ]

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(header)
        yield buffer.getvalue().encode()
        buffer.seek(0)
        buffer.truncate(0)

        for alert in self.repository.iter_for_export(filters):
            writer.writerow(
                [
                    str(alert.id),
                    alert.timestamp.isoformat(),
                    alert.severity.value,
                    alert.attack_type.value,
                    alert.src_ip,
                    alert.src_port,
                    alert.dst_ip,
                    alert.dst_port,
                    alert.protocol.value,
                    alert.rule_id,
                    alert.rule_name,
                    f"{alert.model_score:.4f}",
                    alert.model_label.value,
                ]
            )
            yield buffer.getvalue().encode()
            buffer.seek(0)
            buffer.truncate(0)

    def metrics_overview(self) -> MetricsOverview:
        cached = self._get_cached("overview")
        if cached:
            return cached
        window_start = datetime.utcnow() - timedelta(hours=24)
        counts = self.repository.counts_by_severity(since=window_start)
        payload = {
            "Low": counts.get("Low", 0),
            "Medium": counts.get("Medium", 0),
            "High": counts.get("High", 0),
            "Critical": counts.get("Critical", 0),
        }
        series_raw = [
            TimeSeriesBucket(**entry) if not isinstance(entry, TimeSeriesBucket) else entry
            for entry in self.repository.last24h_series()
        ]
        result = MetricsOverview(
            counts_by_severity=payload,
            last24h_series=series_raw,
        )
        self._set_cache("overview", result)
        return result

    def dashboard_metrics(self) -> DashboardMetrics:
        cached = self._get_cached("dashboard")
        if cached:
            return cached
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        total = self.repository.total()
        alerts_today = self.repository.count_since(today_start)
        latest_ts = self.repository.latest_timestamp()
        attack_counts = self.repository.counts_by_attack_type()
        overview = self.metrics_overview()
        distribution = [
            AttackDistributionEntry(attack_type=key, count=value)
            for key, value in sorted(attack_counts.items(), key=lambda item: item[1], reverse=True)
        ]
        result = DashboardMetrics(
            total_alerts=total,
            alerts_today=alerts_today,
            latest_alert_timestamp=latest_ts,
            attack_distribution=distribution,
            severity_last24h=overview.counts_by_severity,
            last24h_series=overview.last24h_series,
        )
        self._set_cache("dashboard", result)
        return result

    async def stream_alerts(self) -> AsyncGenerator[dict, None]:
        queue = await self.stream_manager.subscribe()
        try:
            while True:
                alert = await queue.get()
                yield alert
        finally:
            await self.stream_manager.unsubscribe(queue)

    def _get_cached(self, key: str):
        record = self._overview_cache if key == "overview" else self._dashboard_cache
        if record and record["expires_at"] > time.monotonic():
            return record["data"]
        return None

    def _set_cache(self, key: str, value):
        record = {"data": value, "expires_at": time.monotonic() + self._cache_ttl}
        if key == "overview":
            self._overview_cache = record
        else:
            self._dashboard_cache = record

    def _invalidate_caches(self):
        self._overview_cache = None
        self._dashboard_cache = None
