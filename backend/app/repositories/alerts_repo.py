from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, Sequence

from sqlalchemy import String, cast, func, literal, select
from sqlmodel import Session

from ..models import Alert, ModelLabelEnum
from ..schemas import AlertCreate, AlertFilters

SORT_MAP = {
    "timestamp": Alert.timestamp.asc(),
    "-timestamp": Alert.timestamp.desc(),
    "severity": Alert.severity.asc(),
    "-severity": Alert.severity.desc(),
    "model_score": Alert.model_score.asc(),
    "-model_score": Alert.model_score.desc(),
}


class AlertRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, payload: AlertCreate) -> Alert:
        alert = Alert(**payload.model_dump())
        self.session.add(alert)
        self.session.commit()
        self.session.refresh(alert)
        return alert

    def get(self, alert_id):
        return self.session.get(Alert, alert_id)

    def _apply_filters(self, stmt, filters: AlertFilters):
        if filters.from_ts:
            stmt = stmt.where(Alert.timestamp >= filters.from_ts)
        if filters.to_ts:
            stmt = stmt.where(Alert.timestamp <= filters.to_ts)
        if filters.severity:
            stmt = stmt.where(Alert.severity.in_(filters.severity))
        if filters.attack_type:
            stmt = stmt.where(Alert.attack_type.in_(filters.attack_type))
        if filters.protocol:
            stmt = stmt.where(Alert.protocol.in_(filters.protocol))
        if filters.query:
            like_query = f"%{filters.query.lower()}%"
            stmt = stmt.where(
                func.lower(Alert.src_ip).like(like_query)
                | func.lower(Alert.dst_ip).like(like_query)
                | func.lower(Alert.rule_name).like(like_query)
                | func.lower(Alert.rule_id).like(like_query)
                | func.lower(cast(Alert.attack_type, String)).like(like_query)
                | func.lower(cast(Alert.severity, String)).like(like_query)
                | func.lower(cast(Alert.protocol, String)).like(like_query)
                | func.lower(cast(Alert.model_label, String)).like(like_query)
                | func.lower(cast(Alert.model_score, String)).like(like_query)
            )
        return stmt

    def _apply_time_window(self, stmt, since: datetime | None, until: datetime | None):
        if since is not None:
            stmt = stmt.where(Alert.timestamp >= since)
        if until is not None:
            stmt = stmt.where(Alert.timestamp <= until)
        return stmt

    def list(self, filters: AlertFilters):
        stmt = select(Alert)
        stmt = self._apply_filters(stmt, filters)
        order_by = SORT_MAP.get(filters.sort, SORT_MAP["-timestamp"])
        stmt = stmt.order_by(order_by)
        count_stmt = self._apply_filters(select(func.count()).select_from(Alert), filters)
        total = self.session.exec(count_stmt).scalar() or 0
        offset = (filters.page - 1) * filters.page_size
        stmt = stmt.offset(offset).limit(filters.page_size)
        items = self.session.exec(stmt).scalars().all()
        return items, total

    def iter_for_export(self, filters: AlertFilters) -> Iterable[Alert]:
        stmt = select(Alert)
        stmt = self._apply_filters(stmt, filters)
        stmt = stmt.order_by(SORT_MAP.get(filters.sort, SORT_MAP["-timestamp"]))
        for alert in self.session.exec(stmt).scalars():
            yield alert

    def counts_by_severity(self, since: datetime | None = None, until: datetime | None = None):
        stmt = select(Alert.severity, func.count()).group_by(Alert.severity)
        stmt = self._apply_time_window(stmt, since, until)
        rows = self.session.exec(stmt).all()
        return {
            (severity.value if hasattr(severity, "value") else severity): count
            for severity, count in rows
        }

    def counts_by_attack_type(self, since: datetime | None = None, until: datetime | None = None):
        stmt = select(Alert.attack_type, func.count()).group_by(Alert.attack_type)
        stmt = self._apply_time_window(stmt, since, until)
        rows = self.session.exec(stmt).all()
        return {
            (attack.value if hasattr(attack, "value") else attack): count
            for attack, count in rows
        }

    def last24h_series(self):
        since = datetime.utcnow() - timedelta(hours=24)
        bind = self.session.get_bind()
        dialect = bind.dialect.name if bind else "sqlite"
        if dialect == "sqlite":
            bucket_expr = func.strftime("%Y-%m-%dT%H:00:00", Alert.timestamp).label("bucket")
        else:
            bucket_expr = func.to_char(
                func.date_trunc("hour", Alert.timestamp),
                literal("YYYY-MM-DD\"T\"HH24:00:00"),
            ).label("bucket")
        stmt = (
            select(
                bucket_expr,
                func.count(),
            )
            .where(Alert.timestamp >= since)
            .group_by("bucket")
            .order_by("bucket")
        )
        rows = self.session.exec(stmt).all()
        counts_map = {bucket: count for bucket, count in rows}
        series = []
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        for offset in range(23, -1, -1):
            bucket_dt = now - timedelta(hours=offset)
            key = bucket_dt.strftime("%Y-%m-%dT%H:00:00")
            bucket = bucket_dt.isoformat()
            series.append({"bucket": bucket, "count": counts_map.get(key, 0)})
        return series

    def total(self) -> int:
        stmt = select(func.count()).select_from(Alert)
        return self.session.exec(stmt).scalar() or 0

    def count_between(self, since: datetime | None = None, until: datetime | None = None) -> int:
        stmt = select(func.count()).select_from(Alert)
        stmt = self._apply_time_window(stmt, since, until)
        return self.session.exec(stmt).scalar() or 0

    def count_since(self, since: datetime) -> int:
        return self.count_between(since, None)

    def top_rules(self, since: datetime | None = None, until: datetime | None = None, limit: int = 5):
        stmt = select(Alert.rule_name, func.count()).group_by(Alert.rule_name)
        stmt = self._apply_time_window(stmt, since, until)
        stmt = stmt.order_by(func.count().desc()).limit(limit)
        return self.session.exec(stmt).all()

    def average_score(self, since: datetime | None = None, until: datetime | None = None) -> float:
        stmt = select(func.avg(Alert.model_score))
        stmt = self._apply_time_window(stmt, since, until)
        result = self.session.exec(stmt).scalar()
        return float(result or 0.0)

    def count_malicious(self, since: datetime | None = None, until: datetime | None = None) -> int:
        stmt = select(func.count()).where(Alert.model_label == ModelLabelEnum.malicious)
        stmt = self._apply_time_window(stmt, since, until)
        return self.session.exec(stmt).scalar() or 0

    def unique_src_ip_count(self, since: datetime | None = None, until: datetime | None = None) -> int:
        stmt = select(func.count(func.distinct(Alert.src_ip)))
        stmt = self._apply_time_window(stmt, since, until)
        return self.session.exec(stmt).scalar() or 0

    def latest_timestamp(self) -> datetime | None:
        return self.session.exec(select(func.max(Alert.timestamp)).select_from(Alert)).scalar()

    def model_performance_metrics(self, since: datetime):
        bind = self.session.get_bind()
        dialect = bind.dialect.name if bind else "sqlite"

        total_stmt = select(func.count()).where(Alert.timestamp >= since)
        total_alerts = self.session.exec(total_stmt).scalar() or 0

        avg_score_stmt = select(func.avg(Alert.model_score)).where(Alert.timestamp >= since)
        avg_score = self.session.exec(avg_score_stmt).scalar() or 0.0

        if dialect == "sqlite":
            latency_expr = (
                (func.julianday(Alert.ingested_at) - func.julianday(Alert.timestamp)) * 86400000.0
            )
        else:
            latency_expr = func.extract("epoch", Alert.ingested_at - Alert.timestamp) * 1000.0

        avg_latency_stmt = select(func.avg(latency_expr)).where(Alert.timestamp >= since)
        avg_latency = self.session.exec(avg_latency_stmt).scalar() or 0.0

        attack_rows = self.session.exec(
            select(Alert.attack_type, func.count(), func.avg(Alert.model_score))
            .where(Alert.timestamp >= since)
            .group_by(Alert.attack_type)
        ).all()
        attack_type_stats = [
            {
                "attack_type": attack.value if hasattr(attack, "value") else attack,
                "count": count,
                "avg_model_score": float(avg or 0.0),
            }
            for attack, count, avg in attack_rows
        ]

        if dialect == "sqlite":
            source_expr = func.json_extract(Alert.meta, "$.dataset_source")
            label_expr = func.json_extract(Alert.meta, "$.dataset_label")
        else:
            source_expr = cast(Alert.meta["dataset_source"], String)
            label_expr = cast(Alert.meta["dataset_label"], String)

        dataset_rows = self.session.exec(
            select(source_expr.label("source"), label_expr.label("label"), func.count())
            .where(Alert.timestamp >= since)
            .group_by(source_expr, label_expr)
        ).all()
        dataset_breakdown = [
            {
                "source": source,
                "label": label,
                "count": count,
            }
            for source, label, count in dataset_rows
        ]

        return {
            "total_alerts": total_alerts,
            "avg_model_score": float(avg_score or 0.0),
            "avg_latency_ms": float(avg_latency or 0.0),
            "attack_type_stats": attack_type_stats,
            "dataset_breakdown": dataset_breakdown,
        }
