#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

REMOTE_USER=${REMOTE_USER:-"ubuntu"}
REMOTE_IP=${REMOTE_IP:-"192.168.23.128"}
SSH_KEY=${SSH_KEY:-"$HOME/.ssh/zeek_vm"}
REMOTE_EXPORT_SCRIPT=${REMOTE_EXPORT_SCRIPT:-"/home/ubuntu/scripts/export_conn_csv.sh"}

LOCAL_PROJECT_ROOT=${LOCAL_PROJECT_ROOT:-"/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"}
LOCAL_TMP_DIR=${LOCAL_TMP_DIR:-"$LOCAL_PROJECT_ROOT/backend/data/default_csv/cloud_sync"}
SYNC_STATE_FILE=${SYNC_STATE_FILE:-"$LOCAL_PROJECT_ROOT/.zeek_sync_state_cloud"}

BACKEND_URL=${BACKEND_URL:-"http://localhost:8000"}
UPLOAD_ENDPOINT="$BACKEND_URL/zeek-lab/upload-dataset"
SIMULATE_ENDPOINT="$BACKEND_URL/zeek-lab/simulate-alert"
SIMULATE_COUNT=${SIMULATE_COUNT:-50}
KEEP_LAST=${KEEP_LAST:-20}

REMOTE="${REMOTE_USER}@${REMOTE_IP}"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10)

mkdir -p "$LOCAL_TMP_DIR"

log "Ejecutando export_conn_csv.sh en la VM Zeek..."
RAW_OUTPUT=$(ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail; bash '$REMOTE_EXPORT_SCRIPT'")
log "Salida remota:"
echo "$RAW_OUTPUT"

CSV_PATH=$(printf '%s\n' "$RAW_OUTPUT" | tail -n 1 | tr -d '\r')
if [[ -z "$CSV_PATH" ]]; then
  log "❌ No se recibió ruta de CSV. Abortando."
  exit 1
fi

ssh "${SSH_OPTS[@]}" "$REMOTE" "[ -f '$CSV_PATH' ]" || {
  log "❌ El archivo $CSV_PATH no existe en la VM."
  exit 1
}

LOCAL_CSV_PATH="$LOCAL_TMP_DIR/$(basename "$CSV_PATH")"
log "Copiando CSV al host → $LOCAL_CSV_PATH"
scp "${SSH_OPTS[@]}" "$REMOTE:$CSV_PATH" "$LOCAL_CSV_PATH"

LAST_TS=""
LAST_UIDS=""
if [[ -f "$SYNC_STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$SYNC_STATE_FILE" || true
fi

DEDUP_CSV_PATH="${LOCAL_CSV_PATH%.csv}_delta.csv"
log "Filtrando filas ya procesadas (checkpoint ts=${LAST_TS:-N/A})..."
FILTER_OUTPUT=$(
  LOCAL_IN="$LOCAL_CSV_PATH" \
  LOCAL_OUT="$DEDUP_CSV_PATH" \
  LAST_TS_VALUE="${LAST_TS:-}" \
  LAST_UIDS_VALUE="${LAST_UIDS:-}" \
  python3 <<'PY'
import csv
import os
from pathlib import Path

in_path = Path(os.environ["LOCAL_IN"])
out_path = Path(os.environ["LOCAL_OUT"])
last_ts_raw = os.environ.get("LAST_TS_VALUE") or ""
last_uids_raw = os.environ.get("LAST_UIDS_VALUE") or ""
last_ts = float(last_ts_raw) if last_ts_raw else None
last_uids = {uid for uid in last_uids_raw.split(",") if uid}

with in_path.open("r", encoding="utf-8", newline="") as fin:
    reader = csv.reader(fin)
    try:
        header = next(reader)
    except StopIteration:
        print("0||")
        raise SystemExit
    if "ts" not in header or "uid" not in header:
        raise SystemExit("CSV sin columnas 'ts' o 'uid'.")
    ts_idx = header.index("ts")
    uid_idx = header.index("uid")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fout = out_path.open("w", encoding="utf-8", newline="")
    writer = csv.writer(fout)
    writer.writerow(header)

    new_rows = 0
    max_ts = None
    uids_at_max = set()

    for row in reader:
        if len(row) <= max(ts_idx, uid_idx):
            continue
        try:
            ts_value = float(row[ts_idx])
        except (TypeError, ValueError):
            continue
        uid_value = row[uid_idx]
        include = False
        if last_ts is None:
            include = True
        elif ts_value > last_ts:
            include = True
        elif ts_value == last_ts and uid_value not in last_uids:
            include = True
        if include:
            writer.writerow(row)
            new_rows += 1
            if max_ts is None or ts_value > max_ts:
                max_ts = ts_value
                uids_at_max = {uid_value}
            elif ts_value == max_ts:
                uids_at_max.add(uid_value)

    fout.close()

    if new_rows == 0:
        out_path.unlink(missing_ok=True)
        print("0||")
    else:
        uids_serialized = ",".join(sorted(uids_at_max))
        print(f"{new_rows}|{max_ts}|{uids_serialized}")
PY
)

IFS='|' read -r NEW_ROWS MAX_TS LATEST_UIDS <<<"$FILTER_OUTPUT"
if [[ -z "$NEW_ROWS" ]]; then
  log "❌ Error al deduplicar; salida inesperada."
  exit 1
fi

if (( NEW_ROWS == 0 )); then
  log "No se detectaron filas nuevas; se omite la subida."
  exit 0
fi

{
  printf 'LAST_TS=%s\n' "$MAX_TS"
  printf 'LAST_UIDS=%s\n' "$LATEST_UIDS"
} >"$SYNC_STATE_FILE"

UPLOAD_RESPONSE=$(mktemp)
SIM_RESPONSE=$(mktemp)
trap 'rm -f "$UPLOAD_RESPONSE" "$SIM_RESPONSE"' EXIT

log "Subiendo delta CSV al backend cloud..."
HTTP_UPLOAD=$(curl -sS -o "$UPLOAD_RESPONSE" -w "%{http_code}" \
  -X POST "$UPLOAD_ENDPOINT" \
  -F "file=@$DEDUP_CSV_PATH;type=text/csv")

if [[ ! "$HTTP_UPLOAD" =~ ^20[01]$ ]]; then
  log "❌ Falló upload-dataset (HTTP $HTTP_UPLOAD)."
  cat "$UPLOAD_RESPONSE"
  exit 1
fi

DATASET_ID=$(python3 <<'PY' "$UPLOAD_RESPONSE"
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
print(payload.get("dataset_id", ""))
PY
)

if [[ -z "$DATASET_ID" ]]; then
  log "❌ No se recibió dataset_id desde upload-dataset."
  cat "$UPLOAD_RESPONSE"
  exit 1
fi

log "Dataset subido con ID $DATASET_ID. Generando alertas..."
HTTP_SIM=$(curl -sS -o "$SIM_RESPONSE" -w "%{http_code}" \
  -X POST "$SIMULATE_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"dataset_id\": \"$DATASET_ID\", \"count\": $SIMULATE_COUNT}")

if [[ "$HTTP_SIM" =~ ^20[01]$ ]]; then
  log "✅ Simulación OK (HTTP $HTTP_SIM)."
else
  log "⚠️ Error al simular (HTTP $HTTP_SIM)."
  cat "$SIM_RESPONSE"
  exit 1
fi

find "$LOCAL_TMP_DIR" -type f \( -name "conn_*.csv" -o -name "conn_*_delta.csv" \) \
  -printf "%T@ %p\n" | sort -n | head -n -"${KEEP_LAST}" | cut -d' ' -f2- | xargs -r rm -f

log "🟢 Sincronización hacia backend cloud completada."
