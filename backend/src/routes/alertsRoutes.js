import { parseJSONBody, sendBadRequest, sendJSON, sendNotFound, sendUnauthorized } from '../utils/http.js';
import { addAlertAction, getAlertById, getDashboardMetrics, getSummary, listAlerts } from '../services/alertsService.js';
import { requireAuth } from '../services/authService.js';
import { createSessionId } from '../utils/security.js';

export async function handleAlertsRoutes(req, res, url) {
  if (!url.pathname.startsWith('/api/alerts')) return false;

  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }

  if (req.method === 'GET' && url.pathname === '/api/alerts') {
    return handleListAlerts(req, res, url);
  }

  if (req.method === 'GET' && url.pathname === '/api/alerts/summary') {
    return sendJSON(res, 200, { summary: getSummary() });
  }

  if (req.method === 'GET' && url.pathname === '/api/alerts/dashboard') {
    return sendJSON(res, 200, getDashboardMetrics());
  }

  const detailMatch = url.pathname.match(/^\/api\/alerts\/([^/]+)$/);
  if (detailMatch && req.method === 'GET') {
    const id = decodeURIComponent(detailMatch[1]);
    const alert = getAlertById(id);
    if (!alert) return sendNotFound(res, 'Alerta no encontrada');
    return sendJSON(res, 200, { alert });
  }

  const actionsMatch = url.pathname.match(/^\/api\/alerts\/([^/]+)\/actions$/);
  if (actionsMatch && req.method === 'POST') {
    const id = decodeURIComponent(actionsMatch[1]);
    try {
      const body = await parseJSONBody(req);
      const { actionType, notes, nextStatus, acknowledged } = body;
      if (!actionType || !notes) {
        return sendBadRequest(res, 'Debe ingresar tipo de acción y notas.');
      }
      const newAction = {
        id: createSessionId(),
        type: actionType,
        notes,
        nextStatus,
        acknowledged,
        createdBy: auth.user.id,
        createdAt: new Date().toISOString(),
      };
      const updated = addAlertAction(id, newAction);
      if (!updated) {
        return sendNotFound(res, 'Alerta no encontrada');
      }
      return sendJSON(res, 201, { alert: updated });
    } catch (error) {
      if (error.message === 'JSON inválido') {
        return sendBadRequest(res, 'Formato JSON inválido');
      }
      throw error;
    }
  }

  return false;
}

function handleListAlerts(req, res, url) {
  const params = Object.fromEntries(url.searchParams.entries());
  const options = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 20,
    severity: params.severity,
    type: params.type,
    status: params.status,
    search: params.search,
    startDate: params.startDate,
    endDate: params.endDate,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
  const result = listAlerts(options);
  return sendJSON(res, 200, result);
}
