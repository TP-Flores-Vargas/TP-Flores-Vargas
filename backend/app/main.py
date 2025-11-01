from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="IDS API", version="1.0.0")

# CORS abierto para desarrollo; si uso proxy en Vite, no estorba
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    features: List[float]


class PredictResponse(BaseModel):
    label: str
    score: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # TODO: reemplazar por carga real del modelo (joblib) + preprocesamiento
    s = sum(req.features)
    label = "attack" if s > 1.0 else "normal"
    score = max(0.0, min(s / 100.0, 1.0))
    return PredictResponse(label=label, score=score)
