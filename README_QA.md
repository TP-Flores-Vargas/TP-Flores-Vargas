## QA — IDS Alerts MVP

### 1. Preparación

1. Copiar `.env.example` (si existe) o crear `.env` en la raíz con las claves siguientes (valores por defecto ya funcionan):
   ```
   DATABASE_URL=sqlite:///./alerts.db
   ALLOW_ORIGINS=http://localhost:5173
   INGESTION_MODE=SYNTHETIC_SEED
   SYNTHETIC_RATE_PER_MIN=30
   REPLAY_SPEED=1.0
   STREAM_MODE=SSE
   ```
2. Backend (WSL):
   ```bash
   cd /mnt/d/Desarrollo Tesis/TP-Flores-Vargas/backend
   python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. Frontend:
   ```bash
   cd /mnt/d/Desarrollo Tesis/TP-Flores-Vargas
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

### 2. Seeding y Live Emit

- El backend crea datos sintéticos automáticamente si la tabla está vacía.
- Para forzar un seed específico: `python tools/synthetic_alert_generator.py --mode http --count 1000 --seed 99`.
- Live mode: la app levanta un emisor según `SYNTHETIC_RATE_PER_MIN`.

### 3. Generador externo

```bash
# HTTP masivo
python tools/synthetic_alert_generator.py --mode http --count 500 --seed 42

# Replay CSV (usa tools/sample_cicids_extract.csv)
python tools/synthetic_alert_generator.py --mode replay --csv tools/sample_cicids_extract.csv --speed 5.0

# WS (placeholder)
python tools/synthetic_alert_generator.py --mode ws  # TODO(stream): esperar endpoint WS
```

### 4. Artefactos QA

- **Postman**: importar `qa/postman/alerts_mvp.postman_collection.json`, configurar variable `baseUrl=http://localhost:8000`.
- **UI Tests (Playwright)**:
  ```bash
  cd qa/ui
  npm install
  npx playwright test --config=playwright.config.ts
  ```
  Variables:
  - `UI_BASE_URL` (opcional) apunta ala URL del frontend.

### 5. Criterios de aceptación y matriz

| Caso | Acción | Esperado | Aceptación |
|------|--------|----------|------------|
| CA-1 Seed 1000 | Generar 1000 alerts con `--count 1000` | Tabla lista + paginación | `total == 1000`, sin errores HTTP |
| CA-2 Pico DoS | Emitir 20 DoS en 1 min (`--rate 20`) | Pico visible en serie temporal | Cards y mini serie se actualizan |
| CA-3 Export Filtro | Aplicar filtro PortScan+High y exportar | CSV contiene solo filtrados | Filas CSV == resultado API |
| CA-4 Replay 24h | `--mode replay --speed 10` | Orden temporal correcto | timestamps monotónicos |
| CA-5 Live (SSE) | Toggle Live ON, esperar 30s | ≥1 alerta nueva en UI | UI muestra sin errores |

### 6. Flujo QA resumido

1. Levantar backend/frontend (paso 1).
2. Ejecutar generador según el caso.
3. Validar API con Postman (GET/POST/export).
4. Validar UI con Playwright (tests C01–C03) o manual:
   - C01: cargar tabla, abrir drawer, copiar JSON.
   - C02: activar Live, observar highlight.
   - C03: filtrar + exportar.
5. Registrar resultados (OK/KO) e incidencias asociadas.
