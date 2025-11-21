from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, MutableSequence, Optional, Sequence, Tuple

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
    20: "ftp",
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
    "dst_ip": ("Destination IP", "Dst IP", "DestinationIP", "dst_ip", " Destination IP"),
    "dst_port": ("Destination Port", "Dst Port", "Destination Port Number", "dst_port", " Destination Port"),
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
    candidate = raw.replace("T", " ").strip()
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
    try:
        dt = datetime.fromisoformat(candidate.replace("/", "-"))
        return dt.timestamp()
    except ValueError:
        return None


def _normalize_protocol(raw: str) -> Tuple[str, str]:
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
    if lowered in {"http", "https", "dns"}:
        mapped = "tcp" if lowered != "dns" else "udp"
        num = PROTO_NAME_TO_NUM.get(mapped, "6")
        return mapped, str(num)
    return lowered or "tcp", "6"


def _guess_service(port: int) -> str:
    return SERVICE_BY_PORT.get(port, "-")


def _normalize_label(raw: str) -> Tuple[str, str]:
    clean = raw.replace("\u2013", "-").replace("\u2014", "-") if raw else ""
    clean = clean.replace("�", " ")
    normalized = " ".join(clean.split())
    upper = normalized.upper()
    class_name = LABEL_TO_CLASS.get(upper, normalized)
    return normalized, class_name


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


def looks_like_cicids_raw(columns: Sequence[str]) -> bool:
    header = _normalize_header(columns)
    missing = _missing_columns(header)
    return not missing


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


def _detect_delimiter(line: str) -> str:
    if "\t" in line:
        return "\t"
    if ";" in line and line.count(";") > line.count(","):
        return ";"
    return ","


def convert_cicids_content(
    content: str,
    *,
    dataset_name: str,
    source_name: str,
) -> Tuple[str, Dict[str, int]]:
    buffer = io.StringIO(content, newline="")
    first_line = buffer.readline()
    if not first_line:
        raise ValueError("El CSV está vacío")
    delimiter = _detect_delimiter(first_line)
    buffer.seek(0)
    reader = csv.reader(buffer, delimiter=delimiter)
    try:
        raw_header = next(reader)
    except StopIteration:
        raise ValueError("El CSV está vacío")

    header = _normalize_header(raw_header)
    missing = _missing_columns(header)
    if missing:
        raise ValueError(f"El CSV no contiene las columnas mínimas requeridas ({', '.join(missing)})")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["#fields", *OUTPUT_COLUMNS])

    stats = {"written": 0, "skipped": 0}

    for row in reader:
        if not row:
            continue
        if len(row) < len(header):
            padded: MutableSequence[str] = list(row) + [""] * (len(header) - len(row))
        else:
            padded = list(row[: len(header)])
        converted = _convert_row(dict(zip(header, padded)), dataset_name=dataset_name, source_file=source_name)
        if converted is None:
            stats["skipped"] += 1
            continue
        writer.writerow(converted)
        stats["written"] += 1

    return output.getvalue(), stats
