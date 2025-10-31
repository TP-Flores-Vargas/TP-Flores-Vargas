import { parseJSONBody, sendBadRequest, sendJSON, sendNoContent, sendUnauthorized } from '../utils/http.js';
import {
  authenticate,
  changePassword,
  closeSession,
  createSession,
  getPublicUser,
  listSessionsForUser,
  requireAuth,
  updateNotificationEmail,
} from '../services/authService.js';

export async function handleAuthRoutes(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    return handleLogin(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    return handleLogout(req, res);
  }
  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    return handleMe(req, res);
  }
  if (req.method === 'GET' && url.pathname === '/api/auth/sessions') {
    return handleSessions(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/change-password') {
    return handleChangePassword(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/notification-email') {
    return handleNotificationEmail(req, res);
  }
  return false;
}

async function handleLogin(req, res) {
  try {
    const body = await parseJSONBody(req);
    const { email, password } = body;
    if (!email || !password) {
      return sendBadRequest(res, 'Debe proporcionar email y contraseña.');
    }
    const user = authenticate(email, password);
    if (!user) {
      return sendUnauthorized(res, 'Credenciales inválidas');
    }
    const metadata = {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'desconocido',
    };
    const session = createSession(user, metadata);
    return sendJSON(res, 200, {
      token: session.token,
      session: {
        id: session.sessionId,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        metadata: session.metadata,
      },
      user: getPublicUser(user),
    });
  } catch (error) {
    if (error.message === 'JSON inválido') {
      return sendBadRequest(res, 'Formato JSON inválido');
    }
    throw error;
  }
}

async function handleLogout(req, res) {
  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }
  closeSession(auth.token);
  return sendNoContent(res);
}

async function handleMe(req, res) {
  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }
  return sendJSON(res, 200, { user: getPublicUser(auth.user) });
}

async function handleSessions(req, res) {
  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }
  const sessions = listSessionsForUser(auth.user.id).map((session) => ({
    id: session.sessionId,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    metadata: session.metadata,
    isCurrent: session.token === auth.token,
  }));
  return sendJSON(res, 200, { sessions });
}

async function handleChangePassword(req, res) {
  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }
  try {
    const body = await parseJSONBody(req);
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return sendBadRequest(res, 'Debe proporcionar la contraseña actual y la nueva contraseña.');
    }
    if (String(newPassword).length < 8) {
      return sendBadRequest(res, 'La nueva contraseña debe tener al menos 8 caracteres.');
    }
    const result = changePassword(auth.user.id, currentPassword, newPassword);
    if (!result.success) {
      return sendBadRequest(res, result.message);
    }
    return sendNoContent(res);
  } catch (error) {
    if (error.message === 'JSON inválido') {
      return sendBadRequest(res, 'Formato JSON inválido');
    }
    throw error;
  }
}

async function handleNotificationEmail(req, res) {
  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }
  try {
    const body = await parseJSONBody(req);
    const { email } = body;
    if (!email || !String(email).includes('@')) {
      return sendBadRequest(res, 'Debe ingresar un correo válido.');
    }
    const result = updateNotificationEmail(auth.user.id, email);
    if (!result.success) {
      return sendBadRequest(res, result.message);
    }
    return sendJSON(res, 200, { email: result.email });
  } catch (error) {
    if (error.message === 'JSON inválido') {
      return sendBadRequest(res, 'Formato JSON inválido');
    }
    throw error;
  }
}
