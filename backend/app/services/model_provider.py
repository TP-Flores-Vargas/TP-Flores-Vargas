from __future__ import annotations

from functools import lru_cache

from ..adapters.model_adapter import ModelAdapter


@lru_cache
def get_model_adapter(path: str) -> ModelAdapter:
    """Carga y reutiliza el artefacto ML, evitando relecturas costosas."""

    return ModelAdapter(path)
