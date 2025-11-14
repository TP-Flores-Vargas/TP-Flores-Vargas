#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

ROOT="/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
SYNC_SCRIPT="$ROOT/sync_zeek_and_simulate.sh"
START_SCRIPT="$ROOT/start.sh"

if [[ ! -f "$SYNC_SCRIPT" ]]; then
  log "No se encontró $SYNC_SCRIPT. ¿Clonaste el repo completo?"
  exit 1
fi

if [[ ! -f "$START_SCRIPT" ]]; then
  log "No se encontró $START_SCRIPT. Ajusta la ruta ROOT si moviste el proyecto."
  exit 1
fi

log "Asegurando que cron esté activo…"
sudo service cron start

log "Sincronizando Zeek → CSV → backend (primer lote)…"
cd "$ROOT"
bash "$SYNC_SCRIPT" || log "Advertencia: sync inicial falló; cron volverá a intentarlo."

log "Levantando backend + frontend (./start.sh)…"
cd "$ROOT"
bash "$START_SCRIPT"
