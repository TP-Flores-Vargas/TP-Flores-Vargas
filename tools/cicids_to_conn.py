#!/usr/bin/env python3
"""Convert CICIDS2017 CSVs into Zeek-style conn.csv files.

The CICIDS2017 dataset (MachineLearningCVE) contiene métricas de flujo y etiquetas
por ataque. Este script las normaliza al esquema del laboratorio Zeek (campos ts,
uid, id.orig_*, proto, duration, etc.) para que puedan reutilizarse dentro de la
vista /zeek-lab y así validar el modelo entrenado.
"""

from __future__ import annotations

import argparse
import csv
import glob
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence


TIMESTAMP_FORMATS: Sequence[str] = (
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
)

PROTO_NUM_TO_NAME = {1: "icmp", 6: "tcp", 17: "udp"}
PROTO_NAME_TO_NUM = {value: key for key, value in PROTO_NUM_TO_NAME.items()}
SERVICE_BY_PORT = {
    20: "ftp",  # data
    21: "ftp",
    22: "ssh",
    23: "telnet",
    25: "smtp",
    53: "dns",
    67: "dhcp",
    68: "dhcp",
    80: "http",
    110: "pop3",
    123: "ntp",
    135: "msrpc",
    137: "netbios",
    139: "netbios",
    143: "imap",
    389: "ldap",
    443: "https",
    445: "smb",
    465: "smtp",
    587: "smtp",
    993: "imap",
    995: "pop3",
    1433: "mssql",
    1521: "oracle",
    2049: "nfs",
    3306: "mysql",
    3389: "rdp",
    5060: "sip",
    5432: "postgres",
    5900: "vnc",
    5985: "wsman",
    8080: "http-alt",
    8443: "https",
}


COLUMN_CANDIDATES: Dict[str, Sequence[str]] = {
    "timestamp": ("Timestamp", "timestamp", "Flow Timestamp"),
    "src_ip": ("Source IP", "Src IP", "src_ip"),
    "src_port": ("Source Port", "Src Port", "src_port"),
    "dst_ip": ("Destination IP", "Dst IP", "DestinationIP", "dst_ip"),
    "dst_port": ("Destination Port", "Dst Port", "Destination Port Number", "dst_port"),
    "protocol": ("Protocol", "Protocol Name", "protocol"),
    "flow_duration": ("Flow Duration", "Flow_Duration"),
    "orig_pkts": ("Total Fwd Packets", "Tot Fwd Pkts", "Fwd Packet Count"),
    "resp_pkts": ("Total Backward Packets", "Tot Bwd Pkts", "Bwd Packet Count"),
    "orig_bytes": (
        "Total Length of Fwd Packets",
        "TotLen Fwd Pkts",
        "Fwd Packet Length Total",
    ),
    "resp_bytes": (
        "Total Length of Bwd Packets",
        "TotLen Bwd Pkts",
        "Bwd Packet Length Total",
    ),
    "label": ("Label", "Attack", "Attack Label"),
    "flow_id": ("Flow ID", "FlowID"),
}

ESSENTIAL_COLUMNS: Sequence[str] = ("timestamp", "src_ip", "src_port", "dst_ip", "dst_port", "protocol")


LABEL_TO_CLASS = {
    "BENIGN": "BENIGN",
    "BOT": "Bot",
    "DDOS": "DDoS",
    "PORTSCAN": "Port Scan",
    "PORT SCAN": "Port Scan",
    "HEARTBLEED": "Heartbleed",
    "INFILTRATION": "Infiltration",
    "FTP-PATATOR": "Brute Force",
    "SSH-PATATOR": "Brute Force",
    "BRUTE FORCE": "Brute Force",
    "SCANNING": "Port Scan",
    "DOS HULK": "DoS",
    "DOS GOLDENEYE": "DoS",
    "DOS SLOWLORIS": "DoS",
    "DOS SLOWHTTPTEST": "DoS",
    "DOS SLOWHTTP": "DoS",
    "WEB ATTACK - BRUTE FORCE": "Web Attack",
    "WEB ATTACK - XSS": "Web Attack",
    "WEB ATTACK - SQL INJECTION": "Web Attack",
    "WEB ATTACK BRUTE FORCE": "Web Attack",
    "WEB ATTACK XSS": "Web Attack",
    "WEB ATTACK SQL INJECTION": "Web Attack",
}


OUTPUT_COLUMNS: Sequence[str] = (
    "ts",
    "uid",
    "id.orig_h",
    "id.orig_p",
    "id.resp_h",
    "id.resp_p",
    "proto",
    "service",
    "duration",
    "orig_bytes",
    "resp_bytes",
    "conn_state",
    "local_orig",
    "local_resp",
    "missed_bytes",
    "history",
    "orig_pkts",
    "orig_ip_bytes",
    "resp_pkts",
    "resp_ip_bytes",
    "tunnel_parents",
    "ip_proto",
    "cicids_label",
    "cicids_attack",
    "flow_id",
    "source_file",
    "dataset_name",
)


def _clean(value: Optional[str]) -> str:
    if value is None:
        return ""
    cleaned = value.replace("\ufeff", "").strip()
    return cleaned


def _first(row: Dict[str, str], keys: Sequence[str]) -> str:
    for key in keys:
        if key in row:
            value = _clean(row[key])
            if value:
                return value
    return ""


def _to_float(value: str, default: float = 0.0) -> float:
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


def _to_int(value: str, default: int = 0) -> int:
    return int(_to_float(value, float(default)))


def _parse_timestamp(raw: str) -> Optional[float]:
    if not raw:
        return None
    candidate = raw.replace("T", " ").replace("/", "/").strip()
    try:
        return float(candidate)
    except ValueError:
        pass
    for fmt in TIMESTAMP_FORMATS:
        try:
            dt = datetime.strptime(candidate, fmt)
            return dt.timestamp()
        except ValueError:
            continue
    # Como fallback, intentar interpretar los primeros 19 caracteres
    try:
        dt = datetime.fromisoformat(candidate.replace("/", "-"))
        return dt.timestamp()
    except ValueError:
        return None


def _normalize_protocol(raw: str) -> tuple[str, str]:
    if not raw:
        return "tcp", "6"
    cleaned = raw.strip()
    if cleaned.isdigit():
        num = int(cleaned)
        name = PROTO_NUM_TO_NAME.get(num, cleaned.lower())
        return name, str(num)
    lowered = cleaned.lower()
    if lowered in PROTO_NAME_TO_NUM:
        return lowered, str(PROTO_NAME_TO_NUM[lowered])
    if lowered in {"tcp", "udp", "icmp"}:
        return lowered, str(PROTO_NAME_TO_NUM.get(lowered, "0"))
    # Para protocolos de aplicación asumimos TCP
    if lowered in {"http", "https", "dns"}:
        mapped = "tcp" if lowered != "dns" else "udp"
        num = PROTO_NAME_TO_NUM.get(mapped, "6")
        return mapped, str(num)
    return lowered or "tcp", "6"


def _guess_service(port: int) -> str:
    return SERVICE_BY_PORT.get(port, "-")


def _normalize_label(raw: str) -> tuple[str, str]:
    clean = raw.replace("\u2013", "-").replace("\u2014", "-") if raw else ""
    clean = clean.replace("�", " ")
    normalized = " ".join(clean.split())
    upper = normalized.upper()
    class_name = LABEL_TO_CLASS.get(upper, normalized)
    return normalized, class_name


def _resolve_input_paths(target: Path) -> List[Path]:
    if target.is_file():
        return [target]
    if target.is_dir():
        return sorted(p for p in target.rglob("*.csv") if p.is_file())
    pattern = str(target)
    if any(ch in pattern for ch in "*?[]"):
        return [Path(match) for match in glob.glob(pattern)]
    raise FileNotFoundError(f"No se encontró la ruta de entrada: {target}")


def _normalize_header(raw_header: Sequence[str]) -> List[str]:
    normalized: List[str] = []
    for column in raw_header:
        cleaned = column.replace("\ufeff", "").strip()
        cleaned = " ".join(cleaned.split())
        normalized.append(cleaned)
    return normalized


def _missing_columns(header: Sequence[str]) -> List[str]:
    available = set(header)
    missing: List[str] = []
    for key in ESSENTIAL_COLUMNS:
        candidates = COLUMN_CANDIDATES.get(key, ())
        if not any(candidate in available for candidate in candidates):
            missing.append(key)
    return missing


def _iter_rows(paths: Iterable[Path]) -> Iterator[tuple[Path, Dict[str, str]]]:
    for path in paths:
        with path.open("r", encoding="utf-8", newline="", errors="ignore") as handle:
            reader = csv.reader(handle)
            try:
                raw_header = next(reader)
            except StopIteration:
                continue
            header = _normalize_header(raw_header)
            missing = _missing_columns(header)
            if missing:
                print(
                    f"⚠️  {path.name}: faltan columnas obligatorias ({', '.join(missing)}). "
                    "Usa la versión completa del dataset con Flow ID, Source/Destination IP, puertos y Timestamp.",
                    file=sys.stderr,
                )
                continue
            for row in reader:
                if not row:
                    continue
                if len(row) < len(header):
                    row = row + [""] * (len(header) - len(row))
                if len(row) > len(header):
                    row = row[: len(header)]
                yield path, dict(zip(header, row))


def _convert_row(
    row: Dict[str, str],
    *,
    dataset_name: str,
    source_file: str,
) -> Optional[List[str]]:
    raw_ts = _first(row, COLUMN_CANDIDATES["timestamp"])
    ts_value = _parse_timestamp(raw_ts)
    if ts_value is None:
        return None

    src_ip = _first(row, COLUMN_CANDIDATES["src_ip"])
    dst_ip = _first(row, COLUMN_CANDIDATES["dst_ip"])
    src_port_raw = _first(row, COLUMN_CANDIDATES["src_port"])
    dst_port_raw = _first(row, COLUMN_CANDIDATES["dst_port"])
    if not all([src_ip, dst_ip, src_port_raw, dst_port_raw]):
        return None

    try:
        src_port = int(float(src_port_raw))
        dst_port = int(float(dst_port_raw))
    except ValueError:
        return None

    proto_raw = _first(row, COLUMN_CANDIDATES["protocol"])
    proto_name, proto_num = _normalize_protocol(proto_raw)

    duration_raw = _first(row, COLUMN_CANDIDATES["flow_duration"])
    duration = _to_float(duration_raw, 0.0) / 1_000_000 if duration_raw else 0.0

    orig_pkts = _to_int(_first(row, COLUMN_CANDIDATES["orig_pkts"]), 0)
    resp_pkts = _to_int(_first(row, COLUMN_CANDIDATES["resp_pkts"]), 0)
    orig_bytes = _to_float(_first(row, COLUMN_CANDIDATES["orig_bytes"]), 0.0)
    resp_bytes = _to_float(_first(row, COLUMN_CANDIDATES["resp_bytes"]), 0.0)

    conn_state = "S0" if resp_pkts == 0 and resp_bytes == 0 else "SF"
    history = "S" if proto_name == "tcp" else "-"

    cicids_label = _first(row, COLUMN_CANDIDATES["label"])
    normalized_label, attack_class = _normalize_label(cicids_label)
    flow_id = _first(row, COLUMN_CANDIDATES["flow_id"])

    uid = uuid.uuid4().hex[:20]
    service = _guess_service(dst_port)

    return [
        f"{ts_value:.6f}",
        uid,
        src_ip,
        str(src_port),
        dst_ip,
        str(dst_port),
        proto_name,
        service,
        f"{duration:.6f}",
        f"{int(orig_bytes)}",
        f"{int(resp_bytes)}",
        conn_state,
        "T",
        "T",
        "0",
        history,
        str(orig_pkts),
        f"{int(orig_bytes)}",
        str(resp_pkts),
        f"{int(resp_bytes)}",
        "-",
        proto_num,
        normalized_label,
        attack_class,
        flow_id,
        source_file,
        dataset_name,
    ]


def convert_dataset(
    input_target: Path,
    output_path: Path,
    *,
    dataset_name: str,
    limit: Optional[int] = None,
    progress_every: int = 100_000,
) -> dict:
    if output_path.exists():
        raise FileExistsError(f"El archivo de salida {output_path} ya existe. Usa --overwrite si es intencional.")

    paths = _resolve_input_paths(input_target)
    if not paths:
        raise FileNotFoundError(f"No se encontraron CSV en {input_target}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    skipped = 0

    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["#fields", *OUTPUT_COLUMNS])

        for path, row in _iter_rows(paths):
            converted = _convert_row(row, dataset_name=dataset_name, source_file=path.name)
            if converted is None:
                skipped += 1
                continue
            writer.writerow(converted)
            written += 1
            if progress_every and written % progress_every == 0:
                print(f"→ {written:,} filas convertidas...", file=sys.stderr)
            if limit and written >= limit:
                break
        else:
            # only executed if the loop wasn't broken
            pass

    return {"written": written, "skipped": skipped, "inputs": len(paths)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crea un CSV estilo Zeek conn* a partir de CICIDS2017.")
    parser.add_argument("--input", required=True, help="Archivo, carpeta o patrón glob con CSVs de CICIDS2017")
    parser.add_argument("--output", required=True, help="CSV destino (ej. backend/data/default_csv/cicids_reference.csv)")
    parser.add_argument("--dataset-name", default="CICIDS2017", help="Etiqueta que se agregará en la columna dataset_name")
    parser.add_argument("--limit", type=int, default=None, help="Máximo de filas a convertir (omite para usar todas)")
    parser.add_argument("--progress-every", type=int, default=100_000, help="Frecuencia de log en stderr")
    parser.add_argument("--overwrite", action="store_true", help="Permite sobrescribir el archivo de salida")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    if args.overwrite and output_path.exists():
        output_path.unlink()

    stats = convert_dataset(
        input_path,
        output_path,
        dataset_name=args.dataset_name,
        limit=args.limit,
        progress_every=args.progress_every,
    )
    print(
        f"✅ Conversión completada: {stats['written']:,} filas (omitidas: {stats['skipped']:,}) desde {stats['inputs']} archivo(s)."
    )


if __name__ == "__main__":
    main()
