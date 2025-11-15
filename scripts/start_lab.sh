#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

ROOT="/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
SYNC_SCRIPT="$ROOT/sync_zeek_and_simulate.sh"
START_SCRIPT="$ROOT/start.sh"

if [[ ! -f "$START_SCRIPT" ]]; then
  log "No se encontró $START_SCRIPT. Ajusta la ruta ROOT si moviste el proyecto."
  exit 1
fi

log "Asegurando que cron esté activo…"
sudo service cron start

log "Levantando backend + frontend (./start.sh)…"
cd "$ROOT"

if [[ "${RUN_INITIAL_SYNC:-0}" == "1" ]]; then
  if [[ ! -f "$SYNC_SCRIPT" ]]; then
    log "No se encontró $SYNC_SCRIPT y RUN_INITIAL_SYNC=1. No puedo sincronizar."
    exit 1
  fi

  bash "$START_SCRIPT" &
  START_PID=$!

  log "Esperando a que el backend exponga /health para forzar la primera sincronización…"
  for _ in {1..60}; do
    if curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      READY=1
      break
    fi
    sleep 1
  done
  if [[ "${READY:-0}" -ne 1 ]]; then
    log "Advertencia: el backend no respondió /health tras 60s; omito sync inicial."
  else
    log "Sincronizando Zeek → CSV → backend…"
    bash "$SYNC_SCRIPT" || log "Advertencia: sync inicial falló; cron volverá a intentarlo."
  fi

  wait "$START_PID"
else
  exec "$START_SCRIPT"
fi
