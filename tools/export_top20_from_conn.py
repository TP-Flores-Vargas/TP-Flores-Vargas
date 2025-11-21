#!/usr/bin/env python3
"""
Convierte un CSV estilo conn.log (por ejemplo cicids_balanced_conn.csv)
al vector de features que usa el modelo RandomForest actual.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]

from backend.app.adapters.model_adapter import TOP_FEATURES
from backend.app.services.feature_bridge import build_conn_feature_vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extrae las TOP-20 features del modelo a partir de un conn.csv"
    )
    parser.add_argument(
        "--input",
        "-i",
        default="backend/data/default_csv/cicids_balanced_conn.csv",
        help="CSV estilo conn.log (#fields, ts, uid...)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="backend/data/default_csv/cicids_top20_validation.csv",
        help="Ruta del CSV con las features exportadas",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Número de filas a procesar (0 = todas)",
    )
    return parser.parse_args()


def read_conn_rows(path: Path, limit: int | None = None) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        first_line = handle.readline().strip()
        if first_line.startswith("#fields"):
            header = first_line.split(",", 1)[1].split(",")
        else:
            header = first_line.split(",")
            handle.seek(0)
        reader = csv.DictReader(handle, fieldnames=header)
        for idx, row in enumerate(reader):
            rows.append(row)
            if limit and idx + 1 >= limit:
                break
    return rows


def main() -> None:
    args = parse_args()
    src = Path(args.input).expanduser()
    dst = Path(args.output).expanduser()
    if not src.exists():
        raise SystemExit(f"❌ Archivo de entrada no encontrado: {src}")

    limit = args.limit if args.limit and args.limit > 0 else None

    print(f"📥 Leyendo {src} ...")
    rows = read_conn_rows(src, limit=limit)

    if not rows:
        raise SystemExit("❌ El CSV no contiene filas utilizables.")

    print(f"🔁 Procesando {len(rows)} filas y extrayendo las features del modelo...")
    records: List[Dict[str, float | str]] = []
    for row in rows:
        full_vector = build_conn_feature_vector(row)
        record = {name: full_vector.get(name, 0.0) for name in TOP_FEATURES}
        label = row.get("cicids_attack") or row.get("label") or row.get("attack")
        if label is not None:
            record["label"] = label
        records.append(record)

    df = pd.DataFrame(records)
    dst.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(dst, index=False)
    print(f"✅ CSV generado en {dst} (filas: {len(df)})")


if __name__ == "__main__":
    main()
