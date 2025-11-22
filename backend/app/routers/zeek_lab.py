from __future__ import annotations

import asyncio
import csv
import io
import uuid
import glob
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field

from ..config import get_settings
from ..dependencies import get_alerts_service, stream_manager
from ..models import AttackTypeEnum
from ..schemas import AlertRead
from ..services.alerts_service import AlertsService
from ..services.model_provider import get_model_adapter
from ..adapters.feature_csv_adapter import FeatureCSVAdapter
from ..services.cicids_converter import convert_cicids_content, looks_like_cicids_raw
from ..services.synthetic_control import (
    get_synthetic_status,
    start_synthetic_emitter,
    stop_synthetic_emitter,
)
from ..adapters.zeek_adapter import ZeekAdapter
from ..adapters.model_adapter import TOP_FEATURES

router = APIRouter(prefix="/zeek-lab", tags=["zeek-lab"])
REFERENCE_DATASET_ID = "__reference__"

DATASET_TYPE_CONN = "conn"
DATASET_TYPE_FEATURES = "features"

REQUIRED_COLUMNS = {
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
}
FEATURE_META_COLUMNS = {
    "Flow ID",
    "Source IP",
    "Source Port",
    "Destination IP",
    "Destination Port",
    "Protocol",
    "Timestamp",
}
FEATURE_LABEL_CANDIDATES = {"Label", "Attack", "cicids_attack", "cicids_label"}
FEATURE_REQUIRED_COLUMNS = set(TOP_FEATURES).union(FEATURE_META_COLUMNS).union(FEATURE_LABEL_CANDIDATES)


class UploadResponse(BaseModel):
    dataset_id: str
    filename: str
    size_bytes: int
    columns: List[str]
    preview: List[Dict[str, str]]


class DatasetPreviewResponse(BaseModel):
    dataset_id: str | None = None
    source: str
    columns: List[str]
    preview: List[Dict[str, str]]


class SimulateRequest(BaseModel):
    dataset_id: str | None = None
    use_default: bool = False
    attack_type: str | None = Field(default=None, description="Ej: BENIGN, DOS, DDOS, BRUTE_FORCE…")
    count: int = Field(default=1, ge=1, le=50)


class SimulateResponse(BaseModel):
    ingested: int
    dataset_id: str | None
    used_default: bool
    attack_type: str | None
    alerts: List[AlertRead]


class CommandRequest(BaseModel):
    command: str = Field(min_length=1, max_length=2000)


class CommandResponse(BaseModel):
    exit_code: int
    mode: str
    stdout: str
    stderr: str


class SyntheticStatusResponse(BaseModel):
    enabled: bool
    rate_per_min: int
    ingestion_mode: str


class SyntheticToggleRequest(BaseModel):
    enable: bool
    rate_per_min: int | None = Field(default=None, ge=1, le=180)


class ForceSyncResponse(BaseModel):
    exit_code: int
    stdout: str
    stderr: str


def _resolve_path(raw_path: str | Path) -> Path:
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
    return path.resolve()


def _latest_csv_in_dir(directory: Path) -> Path:
    candidates = sorted(
        (p for p in directory.glob("*.csv") if p.is_file()),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron CSV en {directory}",
        )
    return candidates[0]


def _latest_csv_from_pattern(patterns: List[str]) -> Path:
    matches: List[Path] = []
    for pattern in patterns:
        matches.extend(Path(p) for p in glob.glob(pattern))
    matches = [p for p in matches if p.exists() and p.is_file()]
    if not matches:
        raise HTTPException(
            status_code=404, detail=f"No se encontraron archivos para el patrón: {patterns[0]}"
        )
    return max(matches, key=lambda item: item.stat().st_mtime)


def _dataset_registry(request: Request) -> Dict[str, Dict[str, str]]:
    if not hasattr(request.app.state, "zeek_datasets"):
        request.app.state.zeek_datasets = {}
    return request.app.state.zeek_datasets


def _detect_delimiter(line: str) -> str:
    if "\t" in line:
        return "\t"
    if ";" in line and line.count(";") > line.count(","):
        return ";"
    return ","


def _normalize_header(raw_header: List[str]) -> List[str]:
    if not raw_header:
        return []
    cleaned: List[str] = []
    start_idx = 1 if raw_header[0].startswith("#fields") else 0
    for column in raw_header[start_idx:]:
        value = column.replace("\ufeff", "").strip()
        value = " ".join(value.split())
        cleaned.append(value)
    return cleaned


def _looks_like_feature_dataset(columns: List[str]) -> bool:
    normalized = {col.lower() for col in columns}
    feature_names = {name.lower() for name in TOP_FEATURES}
    if not feature_names.issubset(normalized):
        return False
    meta_names = {name.lower() for name in FEATURE_META_COLUMNS}
    if not meta_names.issubset(normalized):
        return False
    label_present = any(candidate.lower() in normalized for candidate in FEATURE_LABEL_CANDIDATES)
    return label_present


def _parse_preview(content: str, limit: int = 5) -> Tuple[List[str], List[Dict[str, str]]]:
    buffer = io.StringIO(content, newline="")
    first_line = buffer.readline()
    if not first_line:
        return [], []
    buffer.seek(0)
    delimiter = _detect_delimiter(first_line)
    reader = csv.reader(buffer, delimiter=delimiter)
    header = _normalize_header(next(reader, []))
    preview: List[Dict[str, str]] = []
    for row in reader:
        if not row:
            continue
        normalized_row = row
        if len(row) > len(header):
            normalized_row = row[: len(header)]
        if len(normalized_row) < len(header):
            continue
        preview.append(dict(zip(header, normalized_row)))
        if len(preview) >= limit:
            break
    return header, preview


def _prepare_dataset_content(
    filename: str, content_bytes: bytes
) -> Tuple[bytes, List[str], List[Dict[str, str]], str]:
    try:
        content_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_text = content_bytes.decode("latin-1")

    columns, preview = _parse_preview(content_text)
    if not columns:
        raise HTTPException(status_code=400, detail="El CSV está vacío o no tiene cabecera")

    # Dataset ya en formato conn.log
    missing = REQUIRED_COLUMNS.difference(columns)
    if not missing:
        return content_bytes, columns, preview, DATASET_TYPE_CONN

    # Dataset con features TOP-20
    if _looks_like_feature_dataset(columns):
        return content_bytes, columns, preview, DATASET_TYPE_FEATURES

    # Dataset crudo CICIDS (Flow ID, Source IP, etc.) → convertir
    should_try_conversion = looks_like_cicids_raw(columns)
    if should_try_conversion:
        dataset_name = Path(filename).stem or "CICIDS"
        try:
            converted_text, _ = convert_cicids_content(
                content_text,
                dataset_name=dataset_name[:50],
                source_name=filename,
            )
        except ValueError as exc:
            if looks_like_cicids_raw(columns):
                raise HTTPException(status_code=400, detail=str(exc)) from exc
        else:
            columns, preview = _parse_preview(converted_text)
            missing_after = REQUIRED_COLUMNS.difference(columns)
            if missing_after:
                raise HTTPException(
                    status_code=400,
                    detail=f"El CSV convertido aún carece de columnas obligatorias: {', '.join(sorted(missing_after))}",
                )
            return converted_text.encode("utf-8"), columns, preview, DATASET_TYPE_CONN

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"El CSV no contiene las columnas obligatorias: {', '.join(sorted(missing))}",
    )


def _validate_columns(columns: List[str], dataset_type: str) -> None:
    if dataset_type == DATASET_TYPE_FEATURES:
        required = set(TOP_FEATURES).union(FEATURE_META_COLUMNS)
        missing = {name for name in required if name not in columns}
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El CSV de features no contiene columnas obligatorias: {', '.join(sorted(missing))}",
            )
        if not any(candidate in columns for candidate in FEATURE_LABEL_CANDIDATES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El CSV de features no incluye una columna de etiqueta (Label/Attack).",
            )
        return

    missing = REQUIRED_COLUMNS.difference(columns)
    if missing:
        missing_features = {name for name in TOP_FEATURES if name not in columns}
        if missing_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "El CSV de features no contiene todas las columnas del modelo "
                    f"(faltan: {', '.join(sorted(missing_features))}). "
                    "Asegúrate de subir el dataset original que incluye Flow ID, IPs, puertos y Timestamp."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El CSV no contiene las columnas obligatorias: {', '.join(sorted(missing))}",
        )


def _attack_type_from_str(value: str | None) -> AttackTypeEnum | None:
    if not value:
        return None
    normalized = value.strip().lower().replace("_", "").replace(" ", "")
    for attack in AttackTypeEnum:
        candidate = attack.value.lower().replace("_", "")
        if candidate == normalized:
            return attack
    raise HTTPException(status_code=400, detail=f"Tipo de alerta desconocido: {value}")


def _resolve_dataset_path(
    request: Request, dataset_id: str | None, use_default: bool
) -> Tuple[Path, str | None, bool, str]:
    settings = get_settings()
    if dataset_id == REFERENCE_DATASET_ID:
        reference_path = settings.zeek_reference_dataset
        if not reference_path:
            raise HTTPException(status_code=400, detail="No hay dataset de referencia configurado")
        path = _resolve_path(reference_path)
        if not path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró el dataset de referencia en {path}",
            )
        return path, REFERENCE_DATASET_ID, False, DATASET_TYPE_CONN
    if dataset_id:
        registry = _dataset_registry(request)
        entry = registry.get(dataset_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Dataset no encontrado")
        dataset_type = entry.get("type", DATASET_TYPE_CONN)
        return Path(entry["path"]), dataset_id, False, dataset_type

    target_path_str = settings.zeek_conn_path
    if not use_default and not target_path_str:
        raise HTTPException(status_code=400, detail="Proporciona dataset_id o habilita use_default")
    if not target_path_str:
        raise HTTPException(status_code=400, detail="No hay dataset por defecto configurado")
    # Soportar rutas absolutas, relativas, carpetas o patrones con comodines
    wildcard = any(ch in target_path_str for ch in ("*", "?", "[", "]"))
    if wildcard:
        backend_root = Path(__file__).resolve().parents[2]
        project_root = Path(__file__).resolve().parents[3]
        path = _latest_csv_from_pattern(
            [
                target_path_str,
                str(backend_root / target_path_str),
                str(project_root / target_path_str),
            ]
        )
        return path, None, True, DATASET_TYPE_CONN

    target_path = _resolve_path(target_path_str)
    if target_path.is_dir():
        path = _latest_csv_in_dir(target_path)
    elif target_path.exists():
        path = target_path
    else:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró el archivo por defecto: {target_path}",
        )
    return path, None, True, DATASET_TYPE_CONN


@router.post("/upload-dataset", response_model=UploadResponse)
async def upload_dataset(request: Request, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos CSV")
    raw_bytes = await file.read()
    content_bytes, columns, preview, dataset_type = _prepare_dataset_content(file.filename, raw_bytes)
    _validate_columns(columns, dataset_type)

    dataset_id = uuid.uuid4().hex
    settings = get_settings()
    upload_dir = _resolve_path(settings.zeek_upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    target_path = upload_dir / f"{dataset_id}.csv"
    target_path.write_bytes(content_bytes)

    registry = _dataset_registry(request)
    registry[dataset_id] = {"path": str(target_path), "filename": file.filename, "type": dataset_type}

    return UploadResponse(
        dataset_id=dataset_id,
        filename=file.filename,
        size_bytes=len(content_bytes),
        columns=columns,
        preview=preview,
    )


@router.get("/dataset-preview", response_model=DatasetPreviewResponse)
def dataset_preview(
    request: Request,
    dataset_id: str | None = Query(default=None),
    use_default: bool = Query(default=False),
):
    path, resolved_id, used_default, dataset_type = _resolve_dataset_path(request, dataset_id, use_default)
    if not path.exists():
        raise HTTPException(status_code=404, detail="No se encontró el archivo solicitado")
    content_text = path.read_text(encoding="utf-8", errors="ignore")
    columns, preview = _parse_preview(content_text)
    if not columns:
        raise HTTPException(status_code=400, detail="El CSV no contiene filas válidas")
    _validate_columns(columns, dataset_type)
    source = "reference" if resolved_id == REFERENCE_DATASET_ID else ("default" if used_default else "uploaded")
    return DatasetPreviewResponse(
        dataset_id=resolved_id,
        source=source,
        columns=columns,
        preview=preview,
    )


@router.post("/simulate-alert", response_model=SimulateResponse)
def simulate_alert(
    payload: SimulateRequest,
    request: Request,
    service: AlertsService = Depends(get_alerts_service),
):
    path, dataset_id, used_default, dataset_type = _resolve_dataset_path(request, payload.dataset_id, payload.use_default)
    if not path.exists():
        raise HTTPException(status_code=404, detail="El dataset seleccionado no existe")

    attack_type = _attack_type_from_str(payload.attack_type)
    settings = get_settings()
    model_adapter = get_model_adapter(settings.model_path)
    if dataset_type == DATASET_TYPE_FEATURES:
        adapter = FeatureCSVAdapter(path, model_adapter)
    else:
        adapter = ZeekAdapter(path, model_adapter)

    alerts: List[AlertRead] = []
    dataset_label = (
        "Dataset de referencia"
        if dataset_id == REFERENCE_DATASET_ID
        else ("Dataset sincronizado" if used_default else "Dataset personalizado")
    )
    dataset_source = (
        "reference"
        if dataset_id == REFERENCE_DATASET_ID
        else ("default" if used_default else "uploaded")
    )

    for alert_payload in adapter.iterate_alerts(limit=payload.count, attack_type=attack_type):
        alert_payload.meta["dataset_label"] = dataset_label
        alert_payload.meta["dataset_source"] = dataset_source
        if dataset_id:
            alert_payload.meta["dataset_id"] = dataset_id
        alert_created = service.create_alert(alert_payload, source="zeek_simulation")
        alerts.append(alert_created)

    if not alerts:
        detail = "No se encontraron registros que produzcan el tipo solicitado" if attack_type else "No se generaron alertas"
        raise HTTPException(status_code=404, detail=detail)

    return SimulateResponse(
        ingested=len(alerts),
        dataset_id=dataset_id,
        used_default=used_default,
        attack_type=attack_type.value if attack_type else None,
        alerts=alerts,
    )


async def _run_ssh_command(command: str) -> Tuple[int, str, str]:
    settings = get_settings()
    if not all([settings.kali_ssh_host, settings.kali_ssh_user, settings.kali_ssh_key_path]):
        raise HTTPException(status_code=400, detail="Configura KALI_SSH_HOST/USER/KEY_PATH en .env")
    key_path = _resolve_path(settings.kali_ssh_key_path)
    if not key_path.exists():
        raise HTTPException(status_code=400, detail="El archivo de clave SSH no existe")

    ssh_cmd = [
        "ssh",
        "-i",
        str(key_path),
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
    ]
    if settings.kali_ssh_port:
        ssh_cmd.extend(["-p", str(settings.kali_ssh_port)])
    ssh_cmd.append(f"{settings.kali_ssh_user}@{settings.kali_ssh_host}")
    ssh_cmd.append(command)

    process = await asyncio.create_subprocess_exec(
        *ssh_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=max(5, settings.kali_command_timeout),
        )
    except asyncio.TimeoutError as exc:
        process.kill()
        raise HTTPException(status_code=504, detail="El comando SSH excedió el tiempo máximo") from exc

    return process.returncode, stdout.decode(), stderr.decode()


async def _run_local_command(command: str) -> Tuple[int, str, str]:
    process = await asyncio.create_subprocess_exec(
        "bash",
        "-lc",
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    return process.returncode, stdout.decode(), stderr.decode()


@router.post("/execute-command", response_model=CommandResponse)
async def execute_command(payload: CommandRequest):
    command = payload.command.strip()
    if not command:
        raise HTTPException(status_code=400, detail="El comando no puede estar vacío")

    settings = get_settings()
    try:
        if settings.kali_ssh_host and settings.kali_ssh_user and settings.kali_ssh_key_path:
            code, stdout, stderr = await _run_ssh_command(command)
            mode = "ssh"
        elif settings.kali_allow_local_fallback:
            code, stdout, stderr = await _run_local_command(command)
            mode = "local"
        else:
            raise HTTPException(status_code=400, detail="Configura las credenciales SSH para ejecutar comandos")
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensivo
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return CommandResponse(exit_code=code, stdout=stdout, stderr=stderr, mode=mode)


@router.get("/synthetic-status", response_model=SyntheticStatusResponse)
def synthetic_status_endpoint(request: Request):
    settings = get_settings()
    status = get_synthetic_status(request.app, settings.synthetic_rate_per_min)
    return SyntheticStatusResponse(
        enabled=status["enabled"],
        rate_per_min=status["rate_per_min"],
        ingestion_mode=settings.ingestion_mode,
    )


@router.post("/synthetic-toggle", response_model=SyntheticStatusResponse)
async def synthetic_toggle(payload: SyntheticToggleRequest, request: Request):
    settings = get_settings()
    try:
        if payload.enable:
            rate = payload.rate_per_min or settings.synthetic_rate_per_min
            if rate <= 0:
                raise HTTPException(status_code=400, detail="El rate debe ser mayor que cero")
            await start_synthetic_emitter(
                request.app,
                stream_manager,
                rate,
                seed=settings.synthetic_seed,
            )
        else:
            await stop_synthetic_emitter(request.app)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    status = get_synthetic_status(request.app, settings.synthetic_rate_per_min)
    return SyntheticStatusResponse(
        enabled=status["enabled"],
        rate_per_min=status["rate_per_min"],
        ingestion_mode=settings.ingestion_mode,
    )


@router.post("/force-sync", response_model=ForceSyncResponse)
def force_sync():
    settings = get_settings()
    script = settings.zeek_sync_script
    if not script:
        raise HTTPException(status_code=400, detail="Configura ZEEK_SYNC_SCRIPT en el .env")
    script_path = _resolve_path(script)
    if not script_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró el script de sincronización: {script_path}",
        )

    process = subprocess.run(
        ["bash", str(script_path)],
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "exit_code": process.returncode,
                "stdout": process.stdout,
                "stderr": process.stderr,
            },
        )
    return ForceSyncResponse(exit_code=process.returncode, stdout=process.stdout, stderr=process.stderr)
