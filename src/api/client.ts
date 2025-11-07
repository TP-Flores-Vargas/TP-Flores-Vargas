import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "/api";
const defaultTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 20000);

export const apiClient = axios.create({
  baseURL,
  timeout: Number.isNaN(defaultTimeout) ? 20000 : defaultTimeout,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error", error);
    return Promise.reject(error);
  },
);

export const serializeParams = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== "") {
          search.append(key, String(entry));
        }
      });
    } else {
      search.append(key, String(value));
    }
  });
  return search.toString();
};

export const buildQuery = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, String(entry)));
    } else {
      search.append(key, String(value));
    }
  });
  return search;
};
