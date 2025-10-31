import { sendNotFound } from '../utils/http.js';
import { handleAuthRoutes } from './authRoutes.js';
import { handleAlertsRoutes } from './alertsRoutes.js';
import { handleHelpRoutes } from './helpRoutes.js';
import { handleReportsRoutes } from './reportsRoutes.js';

export async function dispatchRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    });
    res.end();
    return;
  }

  const handled =
    (await handleAuthRoutes(req, res, url)) ||
    (await handleAlertsRoutes(req, res, url)) ||
    handleHelpRoutes(req, res, url) ||
    (await handleReportsRoutes(req, res, url));

  if (!handled) {
    sendNotFound(res, 'Ruta no disponible');
  }
}
