import { helpContent } from '../data/help.js';
import { requireAuth } from '../services/authService.js';
import { sendJSON, sendUnauthorized } from '../utils/http.js';

export function handleHelpRoutes(req, res, url) {
  if (url.pathname !== '/api/help' || req.method !== 'GET') return false;

  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }

  return sendJSON(res, 200, helpContent);
}
