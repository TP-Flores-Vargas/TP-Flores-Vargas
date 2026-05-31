import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import {
  changePasswordRequest,
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  updateNotificationSettings,
} from "../api/auth";
import { getStoredAuthToken, setStoredAuthToken } from "../api/client";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      const token = getStoredAuthToken();
      if (!token) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (active) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("fetchCurrentUser failed", error);
        setStoredAuthToken(null);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const data = await loginRequest(username, password);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error("loginRequest failed", error);
      const message = error?.response?.data?.detail ?? "Usuario o contraseña incorrectos.";
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const data = await changePasswordRequest(currentPassword, newPassword);
      setUser(data.user);
      return { success: true, message: data.message };
    } catch (error) {
      console.error("changePasswordRequest failed", error);
      return {
        success: false,
        message: error?.response?.data?.detail ?? "No se pudo actualizar la contraseña.",
      };
    }
  }, []);

  const saveNotificationSettings = useCallback(async (notificationEmail, notificationEnabled = true) => {
    try {
      const updatedUser = await updateNotificationSettings(notificationEmail, notificationEnabled);
      setUser(updatedUser);
      return { success: true, message: "Correo de notificación guardado." };
    } catch (error) {
      console.error("updateNotificationSettings failed", error);
      return {
        success: false,
        message: error?.response?.data?.detail ?? "No se pudo guardar el correo de notificación.",
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      loading,
      login,
      logout,
      changePassword,
      saveNotificationSettings,
    }),
    [user, loading, login, logout, changePassword, saveNotificationSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
