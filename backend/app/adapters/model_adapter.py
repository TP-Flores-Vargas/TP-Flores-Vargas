from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np

from ..models import AttackTypeEnum, ModelLabelEnum


TOP_FEATURES: List[str] = [
    "Bwd Packet Length Max",
    "Avg Fwd Segment Size",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Min",
    "PSH Flag Count",
    "Subflow Fwd Packets",
    "Total Length of Bwd Packets",
    "Total Fwd Packets",
    "act_data_pkt_fwd",
    "Fwd Packet Length Min",
    "Idle Min",
    "Bwd Packets/s",
    "Destination Port",
    "min_seg_size_forward",
    "Init_Win_bytes_backward",
    "Bwd Packet Length Std",
    "Avg Bwd Segment Size",
    "Packet Length Mean",
    "Min Packet Length",
    "Bwd Packet Length Mean",
]


CLASS_ID_TO_NAME = {
    0: "BENIGN",
    1: "Bot",
    2: "Brute Force",
    3: "DDoS",
    4: "DoS",
    5: "Heartbleed",
    6: "Infiltration",
    7: "Port Scan",
    8: "Web Attack",
}


CLASS_NAME_TO_ATTACK = {
    "BENIGN": AttackTypeEnum.benign,
    "Bot": AttackTypeEnum.bot,
    "Brute Force": AttackTypeEnum.bruteforce,
    "DDoS": AttackTypeEnum.ddos,
    "DoS": AttackTypeEnum.dos,
    "Heartbleed": AttackTypeEnum.other,
    "Infiltration": AttackTypeEnum.infiltration,
    "Port Scan": AttackTypeEnum.portscan,
    "Web Attack": AttackTypeEnum.xss,
}


@dataclass
class ModelPrediction:
    attack_type: AttackTypeEnum
    model_label: ModelLabelEnum
    model_score: float
    class_index: int
    class_name: str
    probabilities: Dict[str, float]


class ModelAdapter:
    """Carga el RandomForest multiclase entrenado en CIC-IDS2017 y expone predict."""

    def __init__(self, artifact_path: str | Path):
        self.artifact_path = self._resolve_path(artifact_path)
        if not self.artifact_path.exists():
            raise FileNotFoundError(f"Modelo ML no encontrado: {self.artifact_path}")
        self.model = joblib.load(self.artifact_path)
        if not hasattr(self.model, "predict_proba"):
            raise ValueError("El modelo cargado no implementa predict_proba().")

    def _resolve_path(self, raw_path: str | Path) -> Path:
        path = Path(raw_path)
        if path.is_absolute() and path.exists():
            return path

        # 1) relativo al backend/
        backend_root = Path(__file__).resolve().parents[2]
        candidate = backend_root / path
        if candidate.exists():
            return candidate

        # 2) relativo al repo (../..)
        project_root = Path(__file__).resolve().parents[3]
        candidate = project_root / path
        if candidate.exists():
            return candidate

        return path.resolve()

    def _vectorize(self, features: Dict[str, float]) -> np.ndarray:
        ordered = [float(features.get(name, 0.0) or 0.0) for name in TOP_FEATURES]
        return np.asarray([ordered], dtype=float)

    def predict(self, features: Dict[str, float]) -> ModelPrediction:
        vector = self._vectorize(features)
        probabilities = self.model.predict_proba(vector)[0]
        predicted_idx = int(np.argmax(probabilities))
        class_name = CLASS_ID_TO_NAME.get(predicted_idx, str(predicted_idx))
        attack_type = CLASS_NAME_TO_ATTACK.get(class_name, AttackTypeEnum.other)
        prob_map = {
            CLASS_ID_TO_NAME.get(idx, str(idx)): float(prob)
            for idx, prob in enumerate(probabilities)
        }
        benign_prob = prob_map.get("BENIGN", 0.0)
        malicious_prob = float(max(0.0, min(0.999, 1.0 - benign_prob)))
        model_label = (
            ModelLabelEnum.benign if class_name == "BENIGN" else ModelLabelEnum.malicious
        )
        return ModelPrediction(
            attack_type=attack_type,
            model_label=model_label,
            model_score=malicious_prob,
            class_index=predicted_idx,
            class_name=class_name,
            probabilities=prob_map,
        )
