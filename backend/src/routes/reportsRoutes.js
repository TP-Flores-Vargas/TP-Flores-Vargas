import { parseJSONBody, sendBadRequest, sendJSON, sendUnauthorized } from '../utils/http.js';
import { buildReportDocument, buildReportSummary } from '../services/reportsService.js';
import { requireAuth } from '../services/authService.js';

export async function handleReportsRoutes(req, res, url) {
  if (!url.pathname.startsWith('/api/reports')) return false;

  const auth = requireAuth(req);
  if (!auth) {
    return sendUnauthorized(res, 'Sesión no válida');
  }

  if (req.method === 'GET' && url.pathname === '/api/reports/summary') {
    const days = Number(url.searchParams.get('days')) || 7;
    const summary = buildReportSummary(days);
    return sendJSON(res, 200, { summary });
  }

  if (req.method === 'POST' && url.pathname === '/api/reports/basic') {
    try {
      const body = await parseJSONBody(req);
      const days = Number(body.days) || 7;
      const summary = buildReportSummary(days);
      const document = buildReportDocument(summary);
      const encoded = Buffer.from(document, 'utf-8').toString('base64');
      return sendJSON(res, 200, {
        summary,
        document: {
          mimeType: 'text/plain',
          encoding: 'base64',
          content: encoded,
          filename: `reporte-alertas-${new Date().toISOString().slice(0, 10)}.txt`,
          note: 'Contenido generado en texto plano listo para transformarse en PDF desde el frontend.',
        },
      });
    } catch (error) {
      if (error.message === 'JSON inválido') {
        return sendBadRequest(res, 'Formato JSON inválido');
      }
      throw error;
    }
  }

  return false;
}
