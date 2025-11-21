from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional

from ..models import AttackTypeEnum, ProtocolEnum, SeverityEnum
from ..schemas import AlertCreate
from ..services.generators.synthetic_generator import SEVERITY_FLOOR, SEVERITY_WEIGHT
from ..services.cicids_converter import LABEL_TO_CLASS
from .model_adapter import ModelAdapter, ModelPrediction, TOP_FEATURES

TIMESTAMP_FORMATS: List[str] = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%m/%d/%Y %H:%M:%S",
    "%m/%d/%Y %H:%M",
    "%m/%d/%Y %I:%M:%S %p",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y %I:%M:%S %p",
]

LABEL_COLUMNS = ("Label", "Attack", "cicids_attack", "cicids_label")
TIMESTAMP_COLUMNS = ("Timestamp",)
SRC_IP_COLUMN = "Source IP"
SRC_PORT_COLUMN = "Source Port"
DST_IP_COLUMN = "Destination IP"
DST_PORT_COLUMN = "Destination Port"
PROTOCOL_COLUMN = "Protocol"
FLOW_ID_COLUMN = "Flow ID"


def _detect_delimiter(line: str) -> str:
    if "\t" in line:
        return "\t"
    if ";" in line and line.count(";") > line.count(","):
        return ";"
    return ","


def _normalize_header(raw_header: List[str]) -> List[str]:
    cleaned: List[str] = []
    for column in raw_header:
        value = column.replace("\ufeff", "").strip()
        value = " ".join(value.split())
        cleaned.append(value)
    return cleaned


def _safe_float(value: Optional[str], default: float = 0.0) -> float:
    if value is None:
        return default
    value = value.strip()
    if not value:
        return default
    lowered = value.lower()
    if lowered in {"nan", "inf", "-inf"}:
        return default
    try:
        return float(value)
    except ValueError:
        try:
            return float(value.replace(",", ""))
        except ValueError:
            return default


def _safe_int(value: Optional[str], default: int = 0) -> int:
    return int(_safe_float(value, float(default)))


def _parse_timestamp(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None
    candidate = raw.strip().replace("T", " ")
    try:
        return datetime.fromtimestamp(float(candidate))
    except ValueError:
        pass
    for fmt in TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(candidate, fmt)
        except ValueError:
            continue
    return None


def _map_protocol(raw: Optional[str]) -> ProtocolEnum:
    value = (raw or "").strip().upper()
    if value in {"6", "TCP"}:
        return ProtocolEnum.tcp
    if value in {"17", "UDP"}:
        return ProtocolEnum.udp
    if value in {"1", "ICMP"}:
        return ProtocolEnum.icmp
    if value == "DNS":
        return ProtocolEnum.dns
    if value == "HTTP":
        return ProtocolEnum.http
    if value == "HTTPS":
        return ProtocolEnum.https
    return ProtocolEnum.other


class FeatureCSVAdapter:
    """Lee un CSV que ya contiene las TOP-20 features y genera AlertCreate."""

    def __init__(self, csv_path: str | Path, model_adapter: ModelAdapter):
        self.csv_path = self._resolve_path(csv_path)
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Archivo CSV no encontrado: {self.csv_path}")
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

    def _iter_rows(self) -> Iterator[Dict[str, str]]:
        with self.csv_path.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
            buffer = io.StringIO(handle.read(), newline="")
            first_line = buffer.readline()
            if not first_line:
                return
            buffer.seek(0)
            delimiter = _detect_delimiter(first_line)
            reader = csv.reader(buffer, delimiter=delimiter)
            raw_header = next(reader, None)
            if not raw_header:
                return
            header = _normalize_header(raw_header)
            for row in reader:
                if not row:
                    continue
                normalized = row
                if len(row) > len(header):
                    normalized = row[: len(header)]
                if len(normalized) < len(header):
                    continue
                yield dict(zip(header, normalized))

    def _build_features(self, row: Dict[str, str]) -> Dict[str, float]:
        features: Dict[str, float] = {}
        for name in TOP_FEATURES:
            features[name] = _safe_float(row.get(name), 0.0)
        return features

    def _build_alert(
        self,
        row: Dict[str, str],
        features: Dict[str, float],
        prediction: ModelPrediction,
    ) -> AlertCreate:
        ts_raw = row.get("Timestamp") or row.get("timestamp")
        timestamp = _parse_timestamp(ts_raw) or datetime.utcnow()

        src_ip = row.get("Source IP", "0.0.0.0")
        dst_ip = row.get("Destination IP", "0.0.0.0")
        src_port = _safe_int(row.get("Source Port"), 0)
        dst_port = _safe_int(row.get("Destination Port"), 0)
        protocol = _map_protocol(row.get("Protocol"))

        history_uid = row.get("Flow ID") or uuid.uuid4().hex[:20]

        severity = self._map_severity(prediction.model_score, prediction.attack_type)
        label_raw = self._extract_label(row)

        meta = {
            "feature_row": row,
            "features": features,
            "original_label": label_raw,
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
            rule_id=f"FEATURE-{history_uid}",
            rule_name=f"FeatureDataset {prediction.class_name}",
            model_score=prediction.model_score,
            model_label=prediction.model_label,
            meta=meta,
        )

    def _extract_label(self, row: Dict[str, str]) -> Optional[str]:
        for candidate in LABEL_COLUMNS:
            if candidate in row:
                return row[candidate]
        return None

    def _map_severity(self, score: float, attack_type: AttackTypeEnum) -> SeverityEnum:
        if score >= 0.9 or attack_type in (AttackTypeEnum.infiltration, AttackTypeEnum.other):
            base = SeverityEnum.critical
        elif score >= 0.75 or attack_type in (
            AttackTypeEnum.dos,
            AttackTypeEnum.ddos,
            AttackTypeEnum.bruteforce,
            AttackTypeEnum.bot,
            AttackTypeEnum.xss,
            AttackTypeEnum.sqli,
        ):
            base = SeverityEnum.high
        elif score >= 0.4:
            base = SeverityEnum.medium
        else:
            base = SeverityEnum.low

        floor = SEVERITY_FLOOR.get(attack_type)
        if floor and SEVERITY_WEIGHT[base] < SEVERITY_WEIGHT[floor]:
            return floor
        return base
