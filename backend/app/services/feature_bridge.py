from __future__ import annotations

import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Mapping

import joblib
import numpy as np
import pandas as pd

from ..adapters.model_adapter import TOP_FEATURES

MIN_DURATION = 1e-6
HEADER_BYTES_ESTIMATE = 20.0
STD_ESTIMATE_FRACTION = 0.1
EPSILON = 1e-6
HTTP_PORTS = {80, 8080, 8000, 443}
SSH_PORTS = {22}

TOP20_FEATURES: List[str] = [
    "Bwd Packet Length Max",
    "Avg Fwd Segment Size",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Min",
    "PSH Flag Count",
    "Subflow Fwd Packets",
    "Total Length of Bwd Packets",
    "Total Fwd Packets",
    "act_data_pkt_fwd",
    "Fwd Packet Length Min",
    "Idle Min",
    "Bwd Packets/s",
    "Destination Port",
    "min_seg_size_forward",
    "Init_Win_bytes_backward",
    "Bwd Packet Length Std",
    "Avg Bwd Segment Size",
    "Packet Length Mean",
    "Min Packet Length",
    "Bwd Packet Length Mean",
]


@lru_cache
def _feature_artifact_path() -> Path:
    return Path(__file__).resolve().parents[2] / "artifacts" / "CICIDS2017_multiclass_feature_importance_full.csv"


@lru_cache
def cicids_feature_names() -> List[str]:
    path = _feature_artifact_path()
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [row["feature"] for row in reader if row.get("feature")]


@dataclass
class ModelArtifacts:
    """
    Define rutas a scaler y modelo entrenados sobre CICIDS2017 (top-20 features).
    Permite reutilizar instancias sin asumir rutas fijas en el código.
    """

    scaler_path: Path
    model_path: Path

    def load_scaler(self):
        return joblib.load(self.scaler_path)

    def load_model(self):
        return joblib.load(self.model_path)


def load_cicflow_log(path: str | Path) -> pd.DataFrame:
    """
    Lee cicflow.log (TSV de Zeek) en un DataFrame para facilitar el procesamiento.
    """

    df = pd.read_csv(path, sep="\t", comment="#", low_memory=False)
    df.columns = [col.strip() for col in df.columns]
    return df


def map_cicflow_row_to_features(row: Mapping[str, float]) -> Dict[str, float]:
    """
    Mapea una fila proveniente de cicflow.log al vector de 20 features
    exacto que espera el RandomForest entrenado en CICIDS2017.
    """

    def _get(name: str, default: float = 0.0) -> float:
        value = row.get(name, default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    mapped = {
        "Bwd Packet Length Max": _get("bwd_pkt_len_max"),
        "Avg Fwd Segment Size": _get("avg_fwd_seg_size"),
        "Fwd Packet Length Mean": _get("fwd_pkt_len_mean"),
        "Bwd Packet Length Min": _get("bwd_pkt_len_min"),
        "PSH Flag Count": _get("psh_flag_count"),
        "Subflow Fwd Packets": _get("subflow_fwd_pkts", _get("total_fwd_pkts")),
        "Total Length of Bwd Packets": _get("total_bwd_len"),
        "Total Fwd Packets": _get("total_fwd_pkts"),
        "act_data_pkt_fwd": _get("act_data_pkt_fwd"),
        "Fwd Packet Length Min": _get("fwd_pkt_len_min"),
        "Idle Min": _get("idle_min"),
        "Bwd Packets/s": _get("bwd_pkts_per_sec"),
        "Destination Port": _get("id_resp_p", _get("dst_port")),
        "min_seg_size_forward": _get("min_seg_size_forward", _get("avg_fwd_seg_size")),
        "Init_Win_bytes_backward": _get("init_win_bytes_bwd"),
        "Bwd Packet Length Std": _get("bwd_pkt_len_std"),
        "Avg Bwd Segment Size": _get("avg_bwd_seg_size"),
        "Packet Length Mean": _get("pkt_len_mean"),
        "Min Packet Length": _get("min_pkt_len"),
        "Bwd Packet Length Mean": _get("bwd_pkt_len_mean"),
    }
    return {name: mapped.get(name, 0.0) for name in TOP20_FEATURES}


def vectorize_features(features: Dict[str, float]) -> np.ndarray:
    ordered = [float(features.get(name, 0.0)) for name in TOP20_FEATURES]
    return np.asarray([ordered], dtype=float)


def predict_from_cicflow_row(
    row: Mapping[str, float],
    artifacts: ModelArtifacts,
) -> Dict[str, object]:
    """
    Convierte una fila de cicflow.log a vector top-20, aplica scaler + modelo
    y devuelve etiqueta/puntajes listos para integrarse a un backend.
    """

    features = map_cicflow_row_to_features(row)
    vector = vectorize_features(features)

    scaler = artifacts.load_scaler()
    model = artifacts.load_model()

    scaled = scaler.transform(vector)
    probabilities = model.predict_proba(scaled)[0]
    predicted_idx = int(np.argmax(probabilities))
    predicted_label = model.classes_[predicted_idx]

    return {
        "predicted_label": str(predicted_label),
        "predicted_proba": float(probabilities[predicted_idx]),
        "probabilities": {str(cls): float(prob) for cls, prob in zip(model.classes_, probabilities)},
        "features_vector": vector[0].tolist(),
    }


def _safe_float(value: str | None, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        value = value.strip()
    except AttributeError:
        return default
    if not value or value == "-":
        return default
    try:
        return float(value)
    except ValueError:
        try:
            return float(value.replace(",", ""))
        except ValueError:
            return default


def _has_value(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped == "-":
            return False
    return True


def _get_number(row: Mapping[str, str], *names: str, default: float = 0.0) -> float:
    for name in names:
        if not _has_value(row.get(name)):
            continue
        raw = row.get(name)
        return _safe_float(raw, default)
    return default


def _per_packet(total_bytes: float, packets: float) -> float:
    if packets <= 0:
        return total_bytes
    return total_bytes / packets


def _approx_std(value: float) -> float:
    if value <= 0:
        return 0.0
    return value * STD_ESTIMATE_FRACTION


def build_conn_feature_vector(row: Mapping[str, str]) -> Dict[str, float]:
    """Construye el vector de features usado por el modelo basado en conn.log."""

    duration = max(_get_number(row, "duration"), 0.0)
    orig_bytes = max(_get_number(row, "orig_bytes", "orig_ip_bytes"), 0.0)
    resp_bytes = max(_get_number(row, "resp_bytes", "resp_ip_bytes"), 0.0)
    orig_pkts = max(_get_number(row, "orig_pkts"), 0.0)
    resp_pkts = max(_get_number(row, "resp_pkts"), 0.0)

    bytes_total = orig_bytes + resp_bytes
    pkts_total = orig_pkts + resp_pkts

    bytes_ratio = orig_bytes / max(resp_bytes, EPSILON)
    pkts_ratio = orig_pkts / max(resp_pkts, EPSILON)

    proto = (row.get("proto") or "").strip().upper()
    service = (row.get("service") or "").strip().lower()
    dst_port = int(_get_number(row, "id.resp_p", "resp_p", default=0.0))

    is_http = 1.0 if (service in {"http", "http-alt", "https"} or dst_port in HTTP_PORTS) else 0.0
    is_ssh = 1.0 if (service == "ssh" or dst_port in SSH_PORTS) else 0.0

    vector = {
        "duration": duration,
        "orig_bytes": orig_bytes,
        "resp_bytes": resp_bytes,
        "orig_pkts": orig_pkts,
        "resp_pkts": resp_pkts,
        "bytes_total": bytes_total,
        "bytes_ratio": bytes_ratio,
        "pkts_total": pkts_total,
        "pkts_ratio": pkts_ratio,
        "proto_tcp": 1.0 if proto == "TCP" else 0.0,
        "proto_udp": 1.0 if proto == "UDP" else 0.0,
        "proto_icmp": 1.0 if proto == "ICMP" else 0.0,
        "is_http": is_http,
        "is_ssh": is_ssh,
    }

    # Garantizamos que el orden y presencia coincidan con TOP_FEATURES
    return {name: float(vector.get(name, 0.0)) for name in TOP_FEATURES}


# Compatibilidad hacia atrás: algunos scripts seguían importando este nombre.
build_cicids_feature_vector = build_conn_feature_vector


def build_cicids_full_feature_vector(row: Dict[str, str]) -> Dict[str, float]:
    """
    Construye un diccionario con las 78 características originales de CICIDS2017.
    Algunas métricas se derivan de los campos disponibles en Zeek y el resto usan
    heurísticas o valores por defecto para mantener estable el modelo original.
    """

    features: Dict[str, float] = {name: 0.0 for name in cicids_feature_names()}

    def set_feature(name: str, value: float) -> None:
        features[name] = float(value)

    duration = max(_safe_float(row.get("duration")), MIN_DURATION)
    orig_pkts = max(_safe_float(row.get("orig_pkts")), 0.0)
    resp_pkts = max(_safe_float(row.get("resp_pkts")), 0.0)
    orig_bytes = max(_safe_float(row.get("orig_bytes")), 0.0)
    resp_bytes = max(_safe_float(row.get("resp_bytes")), 0.0)
    orig_ip_bytes = max(_safe_float(row.get("orig_ip_bytes"), orig_bytes), orig_bytes)
    resp_ip_bytes = max(_safe_float(row.get("resp_ip_bytes"), resp_bytes), resp_bytes)

    total_pkts = orig_pkts + resp_pkts
    total_bytes = orig_ip_bytes + resp_ip_bytes

    fwd_mean = _per_packet(orig_ip_bytes, orig_pkts)
    bwd_mean = _per_packet(resp_ip_bytes, resp_pkts)
    avg_pkt_length = _per_packet(total_bytes, total_pkts)
    max_pkt_length = max(fwd_mean, bwd_mean, avg_pkt_length)
    min_pkt_length = min(value for value in (fwd_mean, bwd_mean, avg_pkt_length) if value > 0) if any(
        value > 0 for value in (fwd_mean, bwd_mean, avg_pkt_length)
    ) else 0.0

    pkt_rate = total_pkts / duration if duration > 0 else total_pkts
    fwd_pkts_s = orig_pkts / duration if duration > 0 else orig_pkts
    bwd_pkts_s = resp_pkts / duration if duration > 0 else resp_pkts
    flow_bytes_s = total_bytes / duration if duration > 0 else total_bytes

    avg_iat_total = duration / max(total_pkts, 1.0)
    fwd_iat_mean = duration / max(orig_pkts, 1.0)
    bwd_iat_mean = duration / max(resp_pkts, 1.0)

    history = row.get("history", "") or ""
    syn_flags = history.count("S") + history.count("s")
    fin_flags = history.count("F") + history.count("f")
    rst_flags = history.count("R") + history.count("r")
    ack_flags = history.count("A") + history.count("a")
    urg_flags = history.count("U") + history.count("u")
    psh_flags = history.count("P") + history.count("p")
    ece_flags = history.count("E") + history.count("e")

    down_up_ratio = resp_ip_bytes / orig_ip_bytes if orig_ip_bytes > 0 else resp_ip_bytes

    idle_time = max(duration - min(duration, total_pkts * 0.001), 0.0)
    active_time = duration - idle_time

    set_feature("Flow Duration", duration)
    set_feature("Total Fwd Packets", orig_pkts)
    set_feature("Total Backward Packets", resp_pkts)
    set_feature("Total Length of Fwd Packets", orig_ip_bytes)
    set_feature("Total Length of Bwd Packets", resp_ip_bytes)
    set_feature("Avg Fwd Segment Size", fwd_mean)
    set_feature("Avg Bwd Segment Size", bwd_mean)
    set_feature("Fwd Packet Length Mean", fwd_mean)
    set_feature("Bwd Packet Length Mean", bwd_mean)
    set_feature("Fwd Packet Length Min", fwd_mean if fwd_mean else avg_pkt_length)
    set_feature("Fwd Packet Length Max", max(fwd_mean, avg_pkt_length))
    set_feature("Bwd Packet Length Max", max(bwd_mean, resp_ip_bytes / max(resp_pkts, 1.0)))
    set_feature("Bwd Packet Length Min", bwd_mean if bwd_mean else avg_pkt_length)
    set_feature("Bwd Packet Length Std", _approx_std(bwd_mean))
    set_feature("Fwd Packet Length Std", _approx_std(fwd_mean))
    set_feature("Packet Length Mean", avg_pkt_length)
    set_feature("Average Packet Size", avg_pkt_length)
    set_feature("Max Packet Length", max_pkt_length)
    set_feature("Min Packet Length", min_pkt_length)
    set_feature("Packet Length Std", _approx_std(avg_pkt_length))
    set_feature("Packet Length Variance", _approx_std(avg_pkt_length) ** 2)
    set_feature("Flow Packets/s", pkt_rate)
    set_feature("Flow Bytes/s", flow_bytes_s)
    set_feature("Fwd Packets/s", fwd_pkts_s)
    set_feature("Bwd Packets/s", bwd_pkts_s)
    set_feature("Subflow Fwd Packets", orig_pkts)
    set_feature("Subflow Bwd Packets", resp_pkts)
    set_feature("Subflow Fwd Bytes", orig_ip_bytes)
    set_feature("Subflow Bwd Bytes", resp_ip_bytes)
    set_feature("Fwd PSH Flags", history.count("P"))
    set_feature("Bwd PSH Flags", history.count("p"))
    set_feature("PSH Flag Count", psh_flags)
    set_feature("ACK Flag Count", ack_flags)
    set_feature("URG Flag Count", urg_flags)
    set_feature("SYN Flag Count", syn_flags)
    set_feature("FIN Flag Count", fin_flags)
    set_feature("RST Flag Count", rst_flags)
    set_feature("ECE Flag Count", ece_flags)
    set_feature("act_data_pkt_fwd", max(orig_pkts - history.count("P") - syn_flags, 0.0))
    set_feature("min_seg_size_forward", fwd_mean)
    set_feature("Destination Port", _safe_float(row.get("id.resp_p")))
    set_feature("Init_Win_bytes_backward", resp_bytes or resp_ip_bytes)
    set_feature("Init_Win_bytes_forward", orig_bytes or orig_ip_bytes)
    set_feature("Fwd Header Length", orig_pkts * HEADER_BYTES_ESTIMATE)
    set_feature("Fwd Header Length.1", orig_pkts * HEADER_BYTES_ESTIMATE)
    set_feature("Bwd Header Length", resp_pkts * HEADER_BYTES_ESTIMATE)
    set_feature("Down/Up Ratio", down_up_ratio)
    set_feature("Flow IAT Mean", avg_iat_total)
    set_feature("Flow IAT Max", avg_iat_total)
    set_feature("Flow IAT Min", avg_iat_total)
    set_feature("Flow IAT Std", _approx_std(avg_iat_total))
    set_feature("Fwd IAT Mean", fwd_iat_mean)
    set_feature("Fwd IAT Max", fwd_iat_mean)
    set_feature("Fwd IAT Min", fwd_iat_mean)
    set_feature("Fwd IAT Std", _approx_std(fwd_iat_mean))
    set_feature("Fwd IAT Total", duration)
    set_feature("Bwd IAT Mean", bwd_iat_mean)
    set_feature("Bwd IAT Max", bwd_iat_mean)
    set_feature("Bwd IAT Min", bwd_iat_mean)
    set_feature("Bwd IAT Std", _approx_std(bwd_iat_mean))
    set_feature("Bwd IAT Total", duration)
    set_feature("Flow IAT Mean", avg_iat_total)
    set_feature("Idle Mean", idle_time)
    set_feature("Idle Min", idle_time * 0.8 if idle_time else 0.0)
    set_feature("Idle Max", idle_time * 1.2 if idle_time else 0.0)
    set_feature("Idle Std", _approx_std(idle_time))
    set_feature("Active Mean", active_time)
    set_feature("Active Min", active_time * 0.8 if active_time else 0.0)
    set_feature("Active Max", active_time * 1.2 if active_time else 0.0)
    set_feature("Active Std", _approx_std(active_time))
    set_feature("Flow Bytes/s", flow_bytes_s)
    set_feature("Average Packet Size", avg_pkt_length)
    set_feature("Bwd Packets/s", bwd_pkts_s)
    set_feature("Fwd Packets/s", fwd_pkts_s)
    set_feature("Subflow Bwd Bytes", resp_ip_bytes)
    set_feature("Subflow Fwd Bytes", orig_ip_bytes)
    set_feature("Bwd Avg Bytes/Bulk", 0.0)
    set_feature("Bwd Avg Packets/Bulk", 0.0)
    set_feature("Bwd Avg Bulk Rate", 0.0)
    set_feature("Fwd Avg Bytes/Bulk", 0.0)
    set_feature("Fwd Avg Packets/Bulk", 0.0)
    set_feature("Fwd Avg Bulk Rate", 0.0)
    set_feature("Bwd URG Flags", history.count("u"))
    set_feature("Fwd URG Flags", history.count("U"))
    set_feature("Flow Packets/s", pkt_rate)
    set_feature("Flow Bytes/s", flow_bytes_s)

    return features
