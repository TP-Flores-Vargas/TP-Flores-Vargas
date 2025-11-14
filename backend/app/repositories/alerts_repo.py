from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, Sequence

from sqlalchemy import String, cast, func, select
from sqlmodel import Session

from ..models import Alert
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
                | func.lower(Alert.attack_type).like(like_query)
                | func.lower(Alert.severity).like(like_query)
                | func.lower(Alert.protocol).like(like_query)
                | func.lower(Alert.model_label).like(like_query)
                | func.lower(cast(Alert.model_score, String)).like(like_query)
            )
        return stmt

    def list(self, filters: AlertFilters):
        stmt = select(Alert)
        stmt = self._apply_filters(stmt, filters)
        order_by = SORT_MAP.get(filters.sort, SORT_MAP["-timestamp"])
        stmt = stmt.order_by(order_by)
        count_stmt = self._apply_filters(select(func.count()).select_from(Alert), filters)
        total = self.session.exec(count_stmt).scalar()
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

    def counts_by_severity(self, since: datetime | None = None):
        stmt = select(Alert.severity, func.count()).group_by(Alert.severity)
        if since is not None:
            stmt = stmt.where(Alert.timestamp >= since)
        rows = self.session.exec(stmt).all()
        return {
            (severity.value if hasattr(severity, "value") else severity): count
            for severity, count in rows
        }

    def counts_by_attack_type(self, since: datetime | None = None):
        stmt = select(Alert.attack_type, func.count()).group_by(Alert.attack_type)
        if since is not None:
            stmt = stmt.where(Alert.timestamp >= since)
        rows = self.session.exec(stmt).all()
        return {
            (attack.value if hasattr(attack, "value") else attack): count
            for attack, count in rows
        }

    def last24h_series(self):
        since = datetime.utcnow() - timedelta(hours=24)
        stmt = (
            select(
                func.strftime("%Y-%m-%dT%H:00:00", Alert.timestamp).label("bucket"),
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

    def count_since(self, since: datetime) -> int:
        stmt = select(func.count()).select_from(Alert).where(Alert.timestamp >= since)
        return self.session.exec(stmt).scalar() or 0

    def latest_timestamp(self) -> datetime | None:
        return self.session.exec(select(func.max(Alert.timestamp)).select_from(Alert)).scalar()
