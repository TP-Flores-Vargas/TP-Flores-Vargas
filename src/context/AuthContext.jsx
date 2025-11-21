import { createContext, useCallback, useMemo, useState } from 'react';

export const AuthContext = createContext(null);

const INITIAL_USERS = {
  admin: { username: 'admin', password: 'admin', role: 'admin', displayName: 'Administrador' },
  user: { username: 'user', password: 'user', role: 'user', displayName: 'Operador' },
};

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUsername, setCurrentUsername] = useState(null);

  const user = useMemo(() => {
    if (!currentUsername) return null;
    const record = users[currentUsername];
    if (!record) return null;
    const { password, ...rest } = record;
    return { ...rest };
  }, [currentUsername, users]);

  const isAuthenticated = Boolean(currentUsername);

  const login = useCallback(
    (username, password) => {
      const trimmed = username.trim();
      const record = users[trimmed];
      if (!record || record.password !== password) {
        return { success: false, message: 'Usuario o contraseña incorrectos.' };
      }
      setCurrentUsername(trimmed);
      return { success: true };
    },
    [users],
  );

  const logout = useCallback(() => {
    setCurrentUsername(null);
  }, []);

  const changePassword = useCallback(
    (currentPassword, newPassword) => {
      if (!currentUsername) {
        return { success: false, message: 'Debes iniciar sesión para cambiar la contraseña.' };
      }
      const record = users[currentUsername];
      if (record.password !== currentPassword) {
        return { success: false, message: 'La contraseña actual no coincide.' };
      }
      setUsers((prev) => ({
        ...prev,
        [currentUsername]: { ...record, password: newPassword },
      }));
      return { success: true, message: 'Contraseña actualizada con éxito.' };
    },
    [currentUsername, users],
  );

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      login,
      logout,
      changePassword,
    }),
    [isAuthenticated, user, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
