import api from "./api.js";

/**
 * @typedef {{ features: number[] }} PredictRequest
 * @typedef {{ label: string, score: number }} PredictResponse
 */

/**
 * @param {PredictRequest} req
 * @returns {Promise<PredictResponse>}
 */
export async function predict(req) {
  const { data } = await api.post("/predict", req);
  return data;
}
