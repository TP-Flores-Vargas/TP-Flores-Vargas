import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Vite proxy -> FastAPI :8000
  timeout: 15000,
});

export default api;
