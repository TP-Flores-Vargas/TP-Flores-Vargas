from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd

from ..models import AttackTypeEnum, ModelLabelEnum


TOP_FEATURES: List[str] = [
    "duration",
    "orig_bytes",
    "resp_bytes",
    "orig_pkts",
    "resp_pkts",
    "bytes_total",
    "bytes_ratio",
    "pkts_total",
    "pkts_ratio",
    "proto_tcp",
    "proto_udp",
    "proto_icmp",
    "is_http",
    "is_ssh",
]


CLASS_ID_TO_NAME = {
    0: "BENIGN",
    1: "BOT",
    2: "BRUTE_FORCE",
    3: "DDOS",
    4: "DOS",
    5: "PORTSCAN",
}


CLASS_NAME_TO_ATTACK = {
    "BENIGN": AttackTypeEnum.benign,
    "BOT": AttackTypeEnum.bot,
    "BRUTE_FORCE": AttackTypeEnum.bruteforce,
    "DDOS": AttackTypeEnum.ddos,
    "DOS": AttackTypeEnum.dos,
    "PORTSCAN": AttackTypeEnum.portscan,
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
    """Carga el modelo multiclase entrenado para CICIDS/Zeek y expone predict."""

    def __init__(self, artifact_path: str | Path):
        self.artifact_path = self._resolve_path(artifact_path)
        if not self.artifact_path.exists():
            raise FileNotFoundError(f"Modelo ML no encontrado: {self.artifact_path}")
        loaded = joblib.load(self.artifact_path)
        self.feature_names = TOP_FEATURES.copy()
        if isinstance(loaded, dict):
            estimator = loaded.get("model")
            if estimator is None:
                raise ValueError("El artefacto no contiene la clave 'model'.")
            feature_list = loaded.get("features")
            if feature_list:
                self.feature_names = [str(name) for name in feature_list]
        else:
            estimator = loaded
        if not hasattr(estimator, "predict_proba"):
            raise ValueError("El modelo cargado no implementa predict_proba().")
        self.model = estimator

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

    def _vectorize(self, features: Dict[str, float]):
        row = {name: float(features.get(name, 0.0) or 0.0) for name in self.feature_names}
        return pd.DataFrame([row], columns=self.feature_names)

    def predict(self, features: Dict[str, float]) -> ModelPrediction:
        vector = self._vectorize(features)
        probabilities = self.model.predict_proba(vector)[0]
        predicted_idx = int(np.argmax(probabilities))
        class_name = CLASS_ID_TO_NAME.get(predicted_idx, str(predicted_idx))
        attack_type = CLASS_NAME_TO_ATTACK.get(class_name, AttackTypeEnum.dos)
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
