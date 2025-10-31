import { users, findUserByEmail, findUserById } from '../data/users.js';
import { createSessionId, createToken, hashPassword, verifyPassword } from '../utils/security.js';

const sessions = new Map();

export function authenticate(email, password) {
  const user = findUserByEmail(email);
  if (!user) return null;
  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) return null;
  return user;
}

export function createSession(user, metadata = {}) {
  const token = createToken();
  const sessionId = createSessionId();
  const now = new Date().toISOString();
  const session = {
    sessionId,
    token,
    userId: user.id,
    email: user.email,
    createdAt: now,
    lastActiveAt: now,
    metadata,
  };
  sessions.set(token, session);
  return session;
}

export function getSessionByToken(token) {
  if (!token) return null;
  return sessions.get(token) || null;
}

export function touchSession(token) {
  const session = sessions.get(token);
  if (session) {
    session.lastActiveAt = new Date().toISOString();
  }
  return session;
}

export function closeSession(token) {
  if (!token) return false;
  return sessions.delete(token);
}

export function listSessionsForUser(userId) {
  return Array.from(sessions.values())
    .filter((session) => session.userId === userId)
    .map((session) => ({ ...session }));
}

export function requireAuth(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    return null;
  }
  const token = String(authHeader).slice(7).trim();
  const session = touchSession(token);
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user) return null;
  return { user, session, token };
}

export function changePassword(userId, currentPassword, newPassword) {
  const user = findUserById(userId);
  if (!user) return { success: false, message: 'Usuario no encontrado' };
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { success: false, message: 'La contraseña actual no es válida' };
  }
  user.passwordHash = hashPassword(newPassword);
  user.lastPasswordChange = new Date().toISOString();
  return { success: true };
}

export function updateNotificationEmail(userId, email) {
  const user = findUserById(userId);
  if (!user) return { success: false, message: 'Usuario no encontrado' };
  user.notificationEmail = email;
  return { success: true, email };
}

export function getPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    notificationEmail: user.notificationEmail,
    lastPasswordChange: user.lastPasswordChange,
    createdAt: user.createdAt,
  };
}

export function getUsers() {
  return users.map((user) => getPublicUser(user));
}
