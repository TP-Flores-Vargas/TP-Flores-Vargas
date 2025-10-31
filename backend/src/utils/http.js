import { StringDecoder } from 'node:string_decoder';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export function sendJSON(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload ?? {});
  res.writeHead(statusCode, { ...DEFAULT_HEADERS, ...extraHeaders });
  res.end(body);
}

export function sendNoContent(res) {
  res.writeHead(204, DEFAULT_HEADERS);
  res.end();
}

export function sendUnauthorized(res, message = 'No autorizado') {
  sendJSON(res, 401, { error: message });
}

export function sendForbidden(res, message = 'Acceso denegado') {
  sendJSON(res, 403, { error: message });
}

export function sendBadRequest(res, message = 'Solicitud inválida', details) {
  const payload = { error: message };
  if (details) payload.details = details;
  sendJSON(res, 400, payload);
}

export function sendNotFound(res, message = 'No encontrado') {
  sendJSON(res, 404, { error: message });
}

export function sendInternalError(res, error) {
  console.error('[API] Error inesperado:', error);
  sendJSON(res, 500, { error: 'Error interno del servidor' });
}

export async function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (chunk) => {
      buffer += decoder.write(chunk);
    });

    req.on('end', () => {
      buffer += decoder.end();
      if (!buffer) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(buffer);
        resolve(parsed);
      } catch (error) {
        reject(new Error('JSON inválido'));
      }
    });

    req.on('error', (error) => reject(error));
  });
}

export function sendCORS(res) {
  res.writeHead(204, DEFAULT_HEADERS);
  res.end();
}
