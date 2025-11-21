#!/usr/bin/env python3
"""
CLI para leer cicflow.log y obtener las predicciones del modelo en tiempo real.

Permite ejecutar validaciones rápidas cuando se generan flujos desde Zeek,
por ejemplo durante pruebas de ataque desde Kali. Por defecto procesa todas
las filas existentes y se detiene, pero puede seguir en modo seguimiento
(`--follow`) para comportarse como un `tail -f` con inferencias en vivo.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Dict, Iterator, List

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.adapters.model_adapter import ModelAdapter
from backend.app.config import Settings
from backend.app.services.feature_bridge import map_cicflow_row_to_features


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aplica el modelo CICIDS sobre cicflow.log (Zeek)"
    )
    parser.add_argument(
        "--log",
        default="/home/ubuntu/cicflow-logs/current/cicflow.log",
        help="Ruta al cicflow.log que genera Zeek",
    )
    parser.add_argument(
        "--model-path",
        default=None,
        help="Ruta al artefacto ML (.pkl). Por defecto usa backend/app config.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Número máximo de filas a procesar (0 = todas las disponibles)",
    )
    parser.add_argument(
        "--follow",
        action="store_true",
        help="Mantiene el proceso vivo esperando filas nuevas (tail -f)",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Con --follow, ignora las filas presentes al iniciar y solo procesa nuevas",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Intervalo de refresco (segundos) al seguir el archivo",
    )
    parser.add_argument(
        "--print-probs",
        action="store_true",
        help="Muestra el vector completo de probabilidades por clase",
    )
    return parser.parse_args()


def _yield_rows(
    log_path: Path,
    follow: bool,
    skip_existing: bool,
    sleep: float,
) -> Iterator[Dict[str, str]]:
    if not log_path.exists():
        raise FileNotFoundError(f"No existe el log: {log_path}")

    header: List[str] | None = None

    def parse_data_line(line: str) -> Dict[str, str] | None:
        nonlocal header
        if not header:
            return None
        values = line.rstrip("\n").split("\t")
        if len(values) != len(header):
            return None
        return dict(zip(header, values))

    with log_path.open("r", encoding="utf-8", errors="replace") as handle:
        # Primer recorrido (contenido existente)
        for raw_line in handle:
            if raw_line.startswith("#fields"):
                header = raw_line.strip().split("\t")[1:]
                continue
            if raw_line.startswith("#"):
                continue
            row = parse_data_line(raw_line)
            if row and not skip_existing:
                yield row

        if not follow:
            return

        skip_existing = False  # a partir de aquí procesamos todo

        while True:
            raw_line = handle.readline()
            if not raw_line:
                time.sleep(max(0.1, sleep))
                continue
            if raw_line.startswith("#fields"):
                header = raw_line.strip().split("\t")[1:]
                continue
            if raw_line.startswith("#"):
                continue
            row = parse_data_line(raw_line)
            if row:
                yield row


def _format_endpoint(row: Dict[str, str]) -> str:
    return f"{row.get('id.orig_h')}:{row.get('id.orig_p')} -> {row.get('id.resp_h')}:{row.get('id.resp_p')}"


def main() -> int:
    args = parse_args()
    settings = Settings()
    model_path = args.model_path or settings.model_path
    model = ModelAdapter(model_path)

    log_path = Path(args.log).expanduser()
    limiter = args.limit if args.limit and args.limit > 0 else None

    counts: Dict[str, int] = {}
    processed = 0

    try:
        for row in _yield_rows(
            log_path=log_path,
            follow=args.follow,
            skip_existing=args.skip_existing,
            sleep=args.sleep,
        ):
            features = map_cicflow_row_to_features(row)
            prediction = model.predict(features)
            class_name = prediction.class_name
            counts[class_name] = counts.get(class_name, 0) + 1
            processed += 1

            ts = row.get("ts", "?")
            uid = row.get("uid", "NA")
            endpoints = _format_endpoint(row)
            print(
                f"[{ts}] uid={uid} {endpoints} → {class_name} "
                f"(score={prediction.model_score:.3f})"
            )
            if args.print_probs:
                print("   probs=", json.dumps(prediction.probabilities))

            if limiter and not args.follow and processed >= limiter:
                break
    except KeyboardInterrupt:
        print("\nInterrumpido por el usuario.")

    if counts and not args.follow:
        print("\nResumen de predicciones:")
        for class_name, total in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
            print(f"  {class_name}: {total}")

    if processed == 0:
        print("⚠️  No se procesaron filas. Verifica que el log contenga datos.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
