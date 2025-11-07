#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
REQUIREMENTS_FILE="$BACKEND_DIR/requirements.txt"
DEPS_MARKER="$VENV_DIR/.deps_installed"

pushd "$BACKEND_DIR" >/dev/null

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creando entorno virtual en backend/venv..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

if [[ -x "$VENV_DIR/bin/python" ]]; then
  VENV_PYTHON="$VENV_DIR/bin/python"
elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
else
  echo "No se pudo encontrar el ejecutable de Python dentro del entorno virtual." >&2
  exit 1
fi

SITE_PACKAGES="$("$VENV_PYTHON" - <<'PY'
import sysconfig, sys
sys.stdout.write(sysconfig.get_path("purelib"))
PY
)"

if [[ -z "$SITE_PACKAGES" ]]; then
  echo "No se pudo determinar la carpeta de site-packages del entorno virtual." >&2
  exit 1
fi
mkdir -p "$SITE_PACKAGES"

ensure_deps() {
  echo "Instalando dependencias del backend..."
  if "$VENV_PYTHON" -m pip --version >/dev/null 2>&1; then
    "$VENV_PYTHON" -m pip install --upgrade pip
    "$VENV_PYTHON" -m pip install -r "$REQUIREMENTS_FILE"
  else
    echo "pip no está disponible dentro del venv; usando pip del sistema con --target." >&2
    if ! "$PYTHON_BIN" -m pip --version >/dev/null 2>&1; then
      echo "pip no está instalado en el sistema. Instálalo (ej: sudo apt install python3-pip python3-venv)." >&2
      exit 1
    fi
    "$PYTHON_BIN" -m pip install --target "$SITE_PACKAGES" -r "$REQUIREMENTS_FILE"
  fi
  touch "$DEPS_MARKER"
}

if [[ ! -f "$DEPS_MARKER" ]]; then
  ensure_deps
fi

"$VENV_PYTHON" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
popd >/dev/null

echo "Esperando a que el backend responda /health..."
BACKEND_READY=0
for attempt in {1..30}; do
  if curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi
  sleep 1
done
if [[ $BACKEND_READY -ne 1 ]]; then
  echo "Advertencia: el backend no respondió /health tras 30s; el frontend podría mostrar errores temporales." >&2
fi

cleanup() {
  if ps -p "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID"
  fi
}
trap cleanup EXIT

pushd "$ROOT_DIR" >/dev/null
npm run dev -- --host 0.0.0.0 --port 5173
popd >/dev/null
