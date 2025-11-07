class ModelAdapter:
    """Stub del modelo ML real."""

    def predict(self, features: dict) -> dict:
        # TODO(model): reemplazar por llamada a endpoint real o carga de artefacto local
        return {"model_score": 0.82, "model_label": "malicious"}
