from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional

from ..models import AttackTypeEnum, ProtocolEnum, SeverityEnum
from ..schemas import AlertCreate
from ..services.alerts_service import AlertsService
from ..services.generators.synthetic_generator import SEVERITY_FLOOR, SEVERITY_WEIGHT
from ..services.feature_bridge import build_conn_feature_vector
from .model_adapter import ModelAdapter, ModelPrediction


def _safe_float(value: Optional[str], default: float = 0.0) -> float:
    try:
        if value is None or value == "" or value == "-":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Optional[str], default: int = 0) -> int:
    return int(_safe_float(value, float(default)))


PROTOCOL_MAP = {
    "TCP": ProtocolEnum.tcp,
    "UDP": ProtocolEnum.udp,
    "ICMP": ProtocolEnum.icmp,
    "HTTP": ProtocolEnum.http,
    "HTTPS": ProtocolEnum.https,
    "DNS": ProtocolEnum.dns,
}


class ZeekAdapter:
    """Lee un CSV estilo `conn.log`, calcula features y emite AlertCreate."""

    def __init__(self, csv_path: str | Path, model_adapter: ModelAdapter):
        self.csv_path = self._resolve_path(csv_path)
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Archivo Zeek no encontrado: {self.csv_path}")
        self.model_adapter = model_adapter

    def _resolve_path(self, raw_path: str | Path) -> Path:
        path = Path(raw_path)
        if path.is_absolute():
            return path
        backend_root = Path(__file__).resolve().parents[2]
        candidate = backend_root / path
        if candidate.exists():
            return candidate
        project_root = Path(__file__).resolve().parents[3]
        candidate = project_root / path
        if candidate.exists():
            return candidate
        return path

    def seed_from_csv(
        self,
        service: AlertsService,
        limit: int | None = None,
        attack_type: AttackTypeEnum | None = None,
    ) -> int:
        created = 0
        for alert in self.iterate_alerts(limit=limit, attack_type=attack_type):
            service.create_alert(alert, source="zeek_csv")
            created += 1
        return created

    def iterate_alerts(
        self,
        limit: int | None = None,
        attack_type: AttackTypeEnum | None = None,
    ) -> Iterator[AlertCreate]:
        emitted = 0
        for row in self._iter_rows():
            features = self._build_features(row)
            prediction = self.model_adapter.predict(features)
            alert = self._build_alert(row, features, prediction)
            if attack_type and alert.attack_type != attack_type:
                continue
            yield alert
            emitted += 1
            if limit and emitted >= limit:
                break

    def _iter_rows(self) -> Iterable[Dict[str, str]]:
        with self.csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            raw_header = next(reader, None)
            if not raw_header:
                return
            header = self._normalize_header(raw_header)
            for row in reader:
                if not row:
                    continue
                if len(row) < len(header):
                    continue
                yield dict(zip(header, row))

    def _normalize_header(self, raw_header: List[str]) -> List[str]:
        if raw_header and raw_header[0].startswith("#fields"):
            return raw_header[1:]
        return raw_header

    def _build_features(self, row: Dict[str, str]) -> Dict[str, float]:
        return build_conn_feature_vector(row)

    def _build_alert(
        self,
        row: Dict[str, str],
        feature_subset: Dict[str, float],
        prediction: ModelPrediction,
    ) -> AlertCreate:
        timestamp = datetime.utcfromtimestamp(_safe_float(row.get("ts")))
        src_ip = row.get("id.orig_h", "0.0.0.0")
        dst_ip = row.get("id.resp_h", "0.0.0.0")
        src_port = _safe_int(row.get("id.orig_p"))
        dst_port = _safe_int(row.get("id.resp_p"))

        proto_raw = (row.get("proto") or "").strip().upper()
        protocol = PROTOCOL_MAP.get(proto_raw, ProtocolEnum.other)

        severity = self._map_severity(prediction.model_score, prediction.attack_type)
        rule_id = f"ZEEK-{row.get('uid', 'NA')}"
        rule_name = f"Zeek {prediction.class_name}"

        meta = {
            "zeek_conn": row,
            "features": feature_subset,
            "model": {
                "probabilities": prediction.probabilities,
                "class_index": prediction.class_index,
            },
        }

        return AlertCreate(
            timestamp=timestamp,
            severity=severity,
            attack_type=prediction.attack_type,
            src_ip=src_ip,
            src_port=src_port,
            dst_ip=dst_ip,
            dst_port=dst_port,
            protocol=protocol,
            rule_id=rule_id,
            rule_name=rule_name,
            model_score=prediction.model_score,
            model_label=prediction.model_label,
            meta=meta,
        )

    def _map_severity(self, score: float, attack_type: AttackTypeEnum) -> SeverityEnum:
        if score >= 0.9:
            base = SeverityEnum.critical
        elif score >= 0.75 or attack_type in (
            AttackTypeEnum.dos,
            AttackTypeEnum.ddos,
            AttackTypeEnum.bruteforce,
            AttackTypeEnum.bot,
        ):
            base = SeverityEnum.high
        elif score >= 0.4 or attack_type == AttackTypeEnum.portscan:
            base = SeverityEnum.medium
        else:
            base = SeverityEnum.low

        floor = SEVERITY_FLOOR.get(attack_type)
        if floor and SEVERITY_WEIGHT[base] < SEVERITY_WEIGHT[floor]:
            return floor
        return base
