import { apiClient, setStoredAuthToken } from "./client";

export const loginRequest = async (username, password) => {
  const { data } = await apiClient.post("/auth/login", { username, password });
  setStoredAuthToken(data.access_token);
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await apiClient.get("/auth/me");
  return data;
};

export const logoutRequest = async () => {
  setStoredAuthToken(null);
};

export const changePasswordRequest = async (current_password, new_password) => {
  const { data } = await apiClient.post("/auth/change-password", {
    current_password,
    new_password,
  });
  setStoredAuthToken(data.access_token);
  return data;
};

export const updateNotificationSettings = async (notification_email, notification_enabled = true) => {
  const { data } = await apiClient.patch("/auth/me/notifications", {
    notification_email,
    notification_enabled,
  });
  return data;
};
