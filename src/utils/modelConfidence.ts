import type { Alert } from "../api/alerts";

type ModelLabel = Alert["model_label"];

const clampScore = (score: number) => Math.min(Math.max(score, 0), 1);

export const getRiskScore = (score: number) => clampScore(score);

export const getBenignConfidence = (score: number) => 1 - clampScore(score);

export const getDisplayConfidence = (score: number, label: ModelLabel) =>
  label === "benign" ? getBenignConfidence(score) : getRiskScore(score);

export const getConfidenceLabel = (label: ModelLabel) =>
  label === "benign" ? "Confianza en benigno" : "Probabilidad de ataque";

export const formatPercent = (value: number, digits = 1) =>
  `${(value * 100).toFixed(digits)}%`;
