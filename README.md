## IDS Alerts MVP

MVP funcional de un IDS con backend FastAPI + SQLite y frontend React/Vite + TypeScript. Incluye generación sintética inspirada en CICIDS2017, stream en vivo vía SSE, filtros avanzados, export CSV y artefactos de QA (Postman + Playwright + dataset de replay).

---

### Arquitectura

| Capa     | Descripción |
|----------|-------------|
| Backend  | `backend/app` con FastAPI, SQLModel y rutas `/alerts`, `/metrics/overview`, `/alerts/export.csv`, `/stream`. Generador sintético (`app/services/generators/synthetic_generator.py`) puebla y emite datos reproducibles. |
| Frontend | React 18 + Vite 7 + TypeScript (`src/`) con Zustand para el store (`src/store/alerts.ts`). La página principal (`src/pages/AlertsPage.tsx`) integra filtros, métricas, serie 24h, tabla paginada, drawer y toggle Live (SSE). |
| QA       | Dataset reproducible `tools/sample_cicids_extract.csv`, Postman (`qa/postman/*`), pruebas UI Playwright (`qa/ui/*`) y guía `README_QA.md`. |

---

### Requisitos
- Python 3.12+ (venv recomendado), Node.js 18+.
- En WSL/Ubuntu: `sudo apt install python3-pip python3.12-venv` antes de crear el entorno.

---

### Backend (FastAPI)
```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- `.env` soporta: `DATABASE_URL`, `ALLOW_ORIGINS`, `INGESTION_MODE` (`SYNTHETIC_SEED`, `REPLAY_CSV`, `LIVE_EMULATION`), `SYNTHETIC_RATE_PER_MIN`, `REPLAY_SPEED`, `STREAM_MODE` (`SSE|WS`), `SYNTHETIC_SEED`.
- Endpoints principales: `/alerts`, `/alerts/{id}`, `/alerts/export.csv`, `/metrics/overview`, `/stream` (SSE), `/health`.
- Tests: `pytest backend/tests`.

---

### Frontend (React/Vite/TS)
```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

- Base URL del API se proxea a `/api` (ver `vite.config.js`).
- Build prod: `npm run build`.
- El toggle “Live ON” abre SSE contra `/api/stream`.

---

### Script unificado
```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
chmod +x start.sh
./start.sh
```

- Si `backend/venv` no existe, se crea y se instalan dependencias (usa `pip --target <site-packages>` si el venv no trae pip). Para forzar reinstalación tras editar `requirements.txt`, elimina `backend/venv/.deps_installed`.
- El backend corre en segundo plano; al presionar `Ctrl+C` en Vite se limpia el proceso de Uvicorn.

**Detener/retomar**  
1. `Ctrl+C` en la terminal que ejecuta `./start.sh`.  
2. Para seguir otro día vuelve a correr `./start.sh` (reuse venv y node_modules automáticos).

---

### Generación sintética y replay
- Seed automático en el arranque (`SYNTHETIC_SEED_COUNT`, por defecto 750) + emisor en vivo (`SYNTHETIC_RATE_PER_MIN`).
- CLI adicional:
  ```bash
  python tools/synthetic_alert_generator.py --mode http --count 500 --seed 42
  python tools/synthetic_alert_generator.py --mode replay --csv tools/sample_cicids_extract.csv --speed 5.0
  python tools/synthetic_alert_generator.py --mode ws   # TODO(stream): habilitar cuando el backend exponga WS
  ```
- Dataset de replay: `tools/sample_cicids_extract.csv` (300 filas representativas).

---

### QA & pruebas automatizadas
- Documentación detallada + matriz de casos en `README_QA.md`.
- Postman: importar `qa/postman/alerts_mvp.postman_collection.json` y usar `{{baseUrl}} = http://localhost:8000`.
- UI (Playwright):
  ```bash
  cd qa/ui
  npm install
  npx playwright test --config=playwright.config.ts
  ```
  Escenarios cubren: carga + drawer (C01), Live toggle (C02) y filtros + export (C03).

---

### Flujo recomendado para QA manual
1. Levantar backend + frontend (`./start.sh` o comandos separados).
2. Sembrar datos adicionales con el generador si se necesita un número concreto (ver README_QA).
3. Verificar API con Postman (GET/POST/export) respetando filtros.
4. Validar UI: filtros, métricas, mini-serie 24h, toggle Live, drawer y export CSV.
5. Documentar resultados usando la matriz CA-1 … CA-5.

---

### Integraciones futuras
- `app/adapters/zeek_adapter.py` deja un stub con `# TODO(zeek)` para ingestión nativa desde logs Zeek.
- `app/adapters/model_adapter.py` incluye `# TODO(model)` para conectar el score real (endpoint/joblib).
- `STREAM_MODE=WS` reservado para futura ruta `/ws/alerts`.

---

### Scripts útiles
| Comando | Descripción |
|---------|-------------|
| `pytest backend/tests` | Tests de API (CRUD, filtros, SSE). |
| `npm run build` | Build del frontend (usa Vite). |
| `python tools/synthetic_alert_generator.py ...` | Generación masiva / replay. |

---

Consulta `README_QA.md` para instrucciones detalladas de validación, matrices de aceptación y ejemplos adicionales. ¡Happy hunting!
