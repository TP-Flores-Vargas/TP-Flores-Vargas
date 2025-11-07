#!/usr/bin/env python3
"""
CLI para generar alertas sintéticas vía HTTP y preparar futuros modos WS/replay.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
BACKEND_PATH = ROOT / "backend"
sys.path.append(str(BACKEND_PATH))

from app.services.generators.synthetic_generator import (  # type: ignore  # pylint: disable=wrong-import-position
    SyntheticAlertGenerator,
)


async def mode_http(args):
    generator = SyntheticAlertGenerator(seed=args.seed)
    async with httpx.AsyncClient(base_url=args.base_url, timeout=10) as client:
        for _ in range(args.count):
            alert = generator.generate_alert()
            payload = alert.model_dump(mode="json")
            resp = await client.post("/alerts", json=payload)
            resp.raise_for_status()
            await asyncio.sleep(max(0.01, 60 / args.rate) if args.rate else 0)
    print(f"Enviadas {args.count} alertas vía HTTP → {args.base_url}/alerts")


async def mode_ws(args):
    raise NotImplementedError("TODO(stream): implementar modo WS cuando el backend exponga /ws/alerts")


async def mode_replay(args):
    if not args.csv.exists():
        raise FileNotFoundError(args.csv)
    rows = list(csv.DictReader(args.csv.open()))
    async with httpx.AsyncClient(base_url=args.base_url, timeout=10) as client:
        for row in rows:
            payload = {
                "timestamp": row["timestamp"],
                "severity": row.get("Severity", "Medium"),
                "attack_type": row.get("Label", "Other"),
                "src_ip": row["Source IP"],
                "src_port": int(row.get("Source Port", 0) or 0),
                "dst_ip": row["Destination IP"],
                "dst_port": int(row.get("Destination Port", 0) or 0),
                "protocol": row.get("Protocol", "TCP"),
                "rule_id": row.get("Rule ID", "REPLAY"),
                "rule_name": row.get("Rule Name", "Replay Import"),
                "model_score": float(row.get("Score", 0.6)),
                "model_label": row.get("Model Label", "malicious"),
                "meta": {"source_csv": args.csv.name, "raw_row": row},
            }
            resp = await client.post("/alerts", json=payload)
            resp.raise_for_status()
            await asyncio.sleep(1 / max(1, args.speed))
    print(f"Replay completado: {len(rows)} alertas importadas.")


async def main():
    parser = argparse.ArgumentParser(description="Generador de alertas sintéticas")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--mode", choices=["http", "ws", "replay"], required=True)
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--rate", type=int, default=30, help="Alertas/min en modo http")
    parser.add_argument("--csv", type=Path, default=ROOT / "tools" / "sample_cicids_extract.csv")
    parser.add_argument("--speed", type=float, default=2.0, help="Factor de reproducción para replay")
    args = parser.parse_args()

    if args.mode == "http":
        await mode_http(args)
    elif args.mode == "ws":
        await mode_ws(args)
    elif args.mode == "replay":
        await mode_replay(args)


if __name__ == "__main__":
    asyncio.run(main())
