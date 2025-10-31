import { createServer } from 'node:http';
import { dispatchRequest } from './routes/index.js';
import { sendInternalError } from './utils/http.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = createServer(async (req, res) => {
  try {
    await dispatchRequest(req, res);
  } catch (error) {
    sendInternalError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`Servidor API IDS escuchando en http://localhost:${PORT}`);
});
