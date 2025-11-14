#!/usr/bin/env bash
set -e

# 🔐 Datos de la VM de Zeek
REMOTE_USER="ubuntu"
REMOTE_IP="192.168.23.128"
SSH_KEY="/home/ubuntu/.ssh/kali_vm"   # la misma que usas para Kali (ajusta si es otra)

# 📂 Rutas remotas y locales
REMOTE_SCRIPT="/home/ubuntu/scripts/export_conn_csv.sh"
REMOTE_EXPORT_DIR="/home/ubuntu/prueba_logs/export"
LOCAL_DIR="/mnt/d/Desarrollo Tesis/TP-Flores-Vargas/backend/data/default_csv"

mkdir -p "$LOCAL_DIR"

echo "🚀 Ejecutando export_conn_csv.sh en la VM de Zeek..."
ssh -i "$SSH_KEY" ${REMOTE_USER}@${REMOTE_IP} "bash $REMOTE_SCRIPT"

echo "📥 Trayendo CSVs a $LOCAL_DIR..."
scp -i "$SSH_KEY" ${REMOTE_USER}@${REMOTE_IP}:${REMOTE_EXPORT_DIR}/conn_*.csv "$LOCAL_DIR/"

echo "✅ Listo. CSVs disponibles en:"
ls -l "$LOCAL_DIR"
