import sys
from pathlib import Path

# 1) Aseguramos que la raíz del repo esté en sys.path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.adapters.zeek_adapter import ZeekAdapter
from backend.app.config import Settings
from backend.app.services.model_provider import get_model_adapter

# Ruta del CSV a analizar (usa el que tú quieras comprobar)
DEFAULT_CSV = Path("backend/data/default_csv/cicids_balanced_conn.csv")

target_csv = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else DEFAULT_CSV
limit = int(sys.argv[2]) if len(sys.argv) > 2 else None

print(f"📄 Analizando CSV: {target_csv}")
if limit:
    print(f"🔢 Límite de filas a procesar: {limit}")

# 2) Instanciamos ZeekAdapter igual que en el backend
settings = Settings()
model_adapter = get_model_adapter(settings.model_path)
adapter = ZeekAdapter(target_csv, model_adapter)

pred_counts = {}

print("\n🔍 Recorriendo alertas generadas por ZeekAdapter.iterate_alerts()...\n")

for alert in adapter.iterate_alerts(limit=limit):
    # attack_type es un Enum; usamos .value para verlo como string
    t = alert.attack_type.value
    pred_counts[t] = pred_counts.get(t, 0) + 1

print("📊 Conteo de predicciones del modelo por tipo de ataque:")
if not pred_counts:
    print("  (No se generaron alertas; revisa que el CSV tenga filas válidas)")
else:
    for k, v in sorted(pred_counts.items(), key=lambda x: x[0]):
        print(f"  {k}: {v}")

print("\n✅ Fin del análisis.")
