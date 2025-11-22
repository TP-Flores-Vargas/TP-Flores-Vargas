## IDS Alerts MVP

MVP funcional de un IDS con backend FastAPI + SQLite y frontend React/Vite + TypeScript. Incluye generación sintética inspirada en CICIDS2017, stream en vivo vía SSE, filtros avanzados, export CSV y artefactos de QA (Postman + Playwright + dataset de replay).

---

### Arquitectura

| Capa     | Descripción |
|----------|-------------|
| Backend  | `backend/app` con FastAPI, SQLModel y rutas `/alerts`, `/metrics/overview`, `/alerts/export.csv`, `/stream`. La base ahora vive en **Postgres** (Docker) y se accede vía `DATABASE_URL`. El generador sintético (`app/services/generators/synthetic_generator.py`) puebla y emite datos reproducibles cuando lo activas. |
| Frontend | React 18 + Vite 7 + TypeScript (`src/`) con Zustand para el store (`src/store/alerts.ts`). La página principal (`src/pages/AlertsPage.tsx`) integra filtros, métricas, serie 24h, tabla paginada, drawer y toggle Live (SSE). |
| QA       | Dataset reproducible `tools/sample_cicids_extract.csv`, Postman (`qa/postman/*`), pruebas UI Playwright (`qa/ui/*`) y guía `README_QA.md`. |

---

### Requisitos
- Python 3.12+ (venv recomendado), Node.js 18+.
- En WSL/Ubuntu: `sudo apt install python3-pip python3.12-venv` antes de crear el entorno.
- **Postgres 16+** (se provee un contenedor listo). Levántalo con:
  ```bash
  docker compose up db -d
  docker compose ps db    # confirma que está healthy
  ```
  Las credenciales por defecto son `ids/ids` y la base `ids` (ver `docker-compose.yml`).

---

### Backend (FastAPI)
```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> ⚠️ Asegúrate de que el contenedor `db` esté corriendo antes de levantar el backend (`docker compose up db -d`). El valor por defecto de `DATABASE_URL` (`postgresql+psycopg://ids:ids@localhost:5432/ids`) apunta a ese servicio. Si usas un Postgres propio, ajusta la URL en `backend/.env` o exporta la variable en tu shell.

- `.env` soporta: `DATABASE_URL`, `ALLOW_ORIGINS`, `INGESTION_MODE` (`MANUAL`, `SYNTHETIC_SEED`, `REPLAY_CSV`, `LIVE_EMULATION`, `ZEEK_CSV`), `SYNTHETIC_RATE_PER_MIN`, `SYNTHETIC_AUTOSTART`, `REPLAY_SPEED`, `STREAM_MODE` (`SSE|WS`), `SYNTHETIC_SEED`, `SYNTHETIC_SEED_COUNT`, `MODEL_PATH`, `ZEEK_CONN_PATH`, `ZEEK_SEED_LIMIT`. Ahora el valor por defecto es **`MANUAL`**, por lo que la BD arranca vacía y solo se llena cuando ejecutes `sync_zeek_and_simulate.sh`, el cron o cambies explícitamente a otro modo (p. ej. `INGESTION_MODE=SYNTHETIC_SEED` para regenerar los 200 registros de demo). Para entornos locales usa la URL `postgresql+psycopg://ids:ids@localhost:5432/ids` (el contenedor `db`), y en Docker la URL se convierte en `postgresql+psycopg://ids:ids@db:5432/ids` gracias a `docker-compose.yml`.
- La tabla `alerts` ahora incluye el campo `ingested_at` (se usa para calcular la latencia). `init_db()` detecta si la columna falta y ejecuta el `ALTER TABLE` por ti, asignando el mismo timestamp de la alerta a los registros antiguos. Esto evita errores tipo “column alerts.ingested_at does not exist” después de un pull.
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

> Nota: este script asume que tienes Postgres corriendo en `localhost:5432`. Si usas el contenedor incluido, ejecuta antes `docker compose up db -d`.

- Si `backend/venv` no existe, se crea y se instalan dependencias (usa `pip --target <site-packages>` si el venv no trae pip). Para forzar reinstalación tras editar `requirements.txt`, elimina `backend/venv/.deps_installed`.
- Tras lanzar Uvicorn, el script espera a que `http://127.0.0.1:8000/health` responda antes de iniciar Vite, evitando los timeouts iniciales del frontend.
- El backend corre en segundo plano; al presionar `Ctrl+C` en Vite se limpia el proceso de Uvicorn.

**Detener/retomar**  
1. `Ctrl+C` en la terminal que ejecuta `./start.sh`.  
2. Para seguir otro día vuelve a correr `./start.sh` (reuse venv y node_modules automáticos).

> Si querés levantar todo el laboratorio (cron + sync + backend/frontend) sin pasos manuales, usá `scripts/start_lab.sh` tal como se explica en la sección **Arranque rápido tras reinicios**.

---

### Métricas y ayuda contextual

- **Desempeño del modelo**: el dashboard incluye el panel `ModelPerformancePanel` (consulta `/metrics/model-performance`) con tooltips que explican cada indicador (alertas modeladas, confianza media, latencia). Los valores provienen del backend (promedio, breakdown por dataset y tipo de ataque) y ya funcionan tanto con SQLite como con Postgres gracias a los casts de JSON.
- **Marco de severidad**: Low/Medium/High/Critical se alinean ahora con el framework de NIST SP 800-61 + los rangos CVSS v3.1 (CVSS <4, 4-6.9, 7-8.9, ≥9). Toda tarjeta o badge de severidad muestra en hover por qué cae en ese nivel y ejemplos de ataques (DDoS, BruteForce, etc.), y el popover “¿Cómo clasifica el modelo?” expone el criterio usado para cada tipo de ataque.
- **Ayuda contextual**: Dashboard, Alertas, Reportes y la vista de Pruebas/Zeek incorporan tooltips accesibles (`HelpCircleIcon`) que describen cada métrica, filtro y flujo (p. ej. cómo usar el dataset sincronizado o qué representa “Alertas Hoy”). Esto reduce la carga cognitiva en demos o cuando se incorpora un nuevo analista. Además, hay popovers (“¿Cómo clasifica el modelo?”) que muestran el criterio exacto que sigue el modelo para mapear cada tipo de ataque (PortScan, SQLi, Bot, etc.) a una severidad concreta.

---

### Reinicializar la base de datos del backend
Siempre que quieras comenzar completamente en limpio (p.ej. tras un pull grande o antes de una demo) ejecuta:

```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
backend/venv/bin/python scripts/reset_backend_db.py
```

Este script detecta el motor configurado en `DATABASE_URL`: si es SQLite elimina `backend/alerts.db` y recrea la tabla; si es Postgres (el caso normal) ejecuta un `drop_all()/create_all()` para dejarla vacía. La base queda lista para que cron, los botones de la UI o tus scripts vuelvan a poblarla. Necesita que el entorno `backend/venv` exista (se crea automáticamente la primera vez que corrés `./start.sh`); si todavía no lo hiciste, ejecuta `./start.sh` antes de llamar al script para que se instalen `sqlalchemy` y las demás dependencias.

---

### Generación sintética y replay
- Seed automático en el arranque (`SYNTHETIC_SEED_COUNT`, por defecto 200) + emisor en vivo (`SYNTHETIC_RATE_PER_MIN`, por defecto 5).
- CLI adicional:
  ```bash
  python tools/synthetic_alert_generator.py --mode http --count 500 --seed 42
  python tools/synthetic_alert_generator.py --mode replay --csv tools/sample_cicids_extract.csv --speed 5.0
  python tools/synthetic_alert_generator.py --mode ws   # TODO(stream): habilitar cuando el backend exponga WS
  ```
- Dataset de replay: `tools/sample_cicids_extract.csv` (300 filas representativas).

### Ingesta desde Zeek + modelo CICIDS
- Habilita `INGESTION_MODE=ZEEK_CSV` en `backend/.env` para poblar la BD a partir de un `conn.log` exportado a CSV.
- Variables soporte:
  - `MODEL_PATH` → ruta al artefacto `rf_cicids2017_zeek_multiclass_v3.pkl` (por defecto `artifacts/rf_cicids2017_zeek_multiclass_v3.pkl` dentro de `backend/`).
  - `ZEEK_CONN_PATH` → archivo por defecto que usará el simulador (por defecto `backend/data/default_csv/conn_latest.csv`; el script automático mantiene un symlink/archivo siempre actualizado). También puedes apuntarlo a cualquier CSV en formato Zeek `conn` con cabecera `#fields,...`.
  - `ZEEK_SEED_LIMIT` → número máximo de filas a ingerir (>=1). Usa `0` u omite para leer todo el archivo.
- **Bridge de características y Zeek híbrido:** ejecuta `scripts/cicflow_stats.zeek` junto a Zeek para producir `cicflow.log` con métricas inspiradas en CICFlowMeter (promedios, std, conteos PSH, idle, etc.) alineadas a las TOP-20 features del RF. El módulo `backend/app/services/feature_bridge.py` puede leer ese log, mapear cada fila al vector exacto del modelo, aplicar el scaler (`ModelArtifacts`) y exponer `predict_from_cicflow_row`. Puedes reutilizarlo desde tareas batch (pandas) o dentro del backend cuando quieras validar flujo por flujo.
- Laboratorio Web: la pestaña **Pruebas / Integración Zeek** (frontend) consume los nuevos endpoints de FastAPI para:
  - Subir CSVs (`POST /zeek-lab/upload-dataset`) y obtener vista previa/validación (`GET /zeek-lab/dataset-preview`).
  - Simular alertas aplicando el modelo real (`POST /zeek-lab/simulate-alert`).
  - Ejecutar comandos en la sonda Kali vía SSH o fallback local (`POST /zeek-lab/execute-command`).
  - Activar o detener el generador sintético en caliente (`GET/POST /zeek-lab/synthetic-*`).
  - Forzar una sincronización inmediata sin esperar al cron (`POST /zeek-lab/force-sync`, botón “Forzar carga automática”).
- **Modo manual:** si prefieres validar datasets específicos, copia el CSV deseado a `backend/data/default_csv/`, usa el botón “Usar dataset por defecto” en la pestaña y luego pulsa “Simular alerta”.
- El adaptador calcula las **top-20 features** del pipeline (ver `CICIDS2017_multiclass_feature_importance_full.csv`) a partir de los campos de Zeek y llama al RandomForest para obtener `model_score`, la etiqueta multiclase y la severidad.
- Cada alerta conserva en `meta` el registro Zeek original, las features derivadas y las probabilidades completas del modelo.
- El panel **Desempeño del modelo** (frontend) consulta `GET /metrics/model-performance` y resume, para la ventana seleccionada, cuántas alertas generó el modelo, su confianza promedio, la latencia Zeek→alerta y la distribución por tipo de ataque/dataset. Cada métrica incluye tooltips para reducir la carga cognitiva y explicar por qué es relevante.

Variables adicionales relacionadas:

| Variable | Descripción |
|----------|-------------|
| `ZEEK_UPLOAD_DIR` | Carpeta (relativa a `backend/`) donde se guardan los CSV subidos desde el frontend. |
| `KALI_SSH_HOST`, `KALI_SSH_USER`, `KALI_SSH_KEY_PATH`, `KALI_SSH_PORT` | Credenciales para ejecutar comandos remotos desde `/zeek-lab/execute-command`. |
| `KALI_COMMAND_TIMEOUT` | Tiempo máximo (s) antes de abortar un comando SSH. |
| `KALI_ALLOW_LOCAL_FALLBACK` | Si es `true`, los comandos se ejecutan con `bash -lc` cuando no hay credenciales SSH (útil para desarrollo local). |
| `ZEEK_SYNC_SCRIPT` | Ruta al script de sincronización (por defecto `../sync_zeek_and_simulate.sh`). Se usa tanto por cron como por el botón “Forzar carga automática” de la UI. |

> **SSH sin contraseña (Kali o Zeek)**
> 1. En la máquina host: `ssh-keygen -t ed25519 -f ~/.ssh/<alias_vm> -C "<alias_vm>"`.
> 2. Copia la clave pública: `ssh-copy-id -i ~/.ssh/<alias_vm>.pub usuario@IP_VM`.
> 3. En `backend/.env` apunta `KALI_SSH_KEY_PATH` (o un script) a la clave privada (`/home/<tu_usuario>/.ssh/<alias_vm>`).
> 4. Reinicia `./start.sh`. Desde la UI los comandos aparecerán como `mode ssh`.

#### Validar contra el dataset original (CICIDS2017)
Para reutilizar las mismas filas que entrenaron el modelo se agregó `tools/cicids_to_conn.py`, que convierte los CSV de **MachineLearningCVE/CICIDS2017** al formato `conn*.csv` que consume Zeek:

1. Descarga el dataset desde [UNB](https://www.unb.ca/cic/datasets/ids-2017.html) o desde Kaggle y descomprímelo (ej. `~/datasets/MachineLearningCVE`).
2. Ejecuta el conversor apuntando a la carpeta (o a un CSV puntual):
   ```bash
   python3 tools/cicids_to_conn.py \
     --input "~/datasets/MachineLearningCVE" \
     --output backend/data/default_csv/cicids2017_reference.csv \
     --dataset-name CICIDS2017_FULL --overwrite
   ```
   - Usa `--limit 50000` si querés generar una muestra reducida.
   - El script es *streaming* (no carga todo en memoria), agrega columnas `cicids_label` y `cicids_attack`, y normaliza timestamp/IP/puertos/protocolo para cumplir con los requisitos del laboratorio (`ts`, `uid`, `id.orig_*`, `duration`, `orig/resp_bytes`, etc.).
3. Actualiza `.env` con `ZEEK_REFERENCE_DATASET=backend/data/default_csv/cicids2017_reference.csv` (o apunta `ZEEK_CONN_PATH` a ese mismo archivo) y reinicia el backend.
4. En la pestaña **Pruebas / Integración Zeek** elige “Dataset de referencia” y pulsa “Simular alerta” para comparar las predicciones del modelo contra las etiquetas originales (`cicids_label`).

El parámetro `--input` acepta archivos individuales, carpetas completas o patrones glob (`data/CICIDS2017/*.csv`). También imprime un conteo del número de filas convertidas/omitidas para que puedas verificar que todo el dataset quedó cubierto.

#### Flujo sugerido para una VM Zeek remota
Si Zeek corre en otra VM (por ejemplo Ubuntu 24.04 en `192.168.23.128`), instala Zeek + ZeekControl (el método `zeekctl`) para que realmente escuche en una interfaz y genere `/opt/zeek/logs/current/conn.log`. Asegúrate de:

1. Instalar `zeek` y `zeekctl` (paquetes oficiales o compilado).
2. Configurar `/opt/zeek/etc/node.cfg` y `networks.cfg`, especificando la interfaz (ej. `interface=eth0`).
3. Inicializar con `sudo /opt/zeek/bin/zeekctl deploy` y verificar `zeekctl status`.
4. (Opcional) Crear un servicio systemd para que Zeek arranque con la VM.

Con ZeekControl activo, puedes replicar el pipeline con estos pasos:

1. **Conversión de `conn.log` → CSV dentro de la VM Zeek**
   ```bash
   mkdir -p /home/ubuntu/scripts /home/ubuntu/prueba_logs/export

   cat >/home/ubuntu/scripts/zeek_log_to_csv.py <<'PY'
   #!/usr/bin/env python3
   import sys, csv, os
   if len(sys.argv) != 3:
       print("Uso: zeek_log_to_csv.py <input_log> <output_csv>")
       sys.exit(1)
   in_path, out_path = sys.argv[1], sys.argv[2]
   if not os.path.isfile(in_path):
       print(f"❌ No se encontró el archivo de entrada: {in_path}")
       sys.exit(1)
   separator = "\t"
   fields = None
   with open(in_path, "r", encoding="utf-8", errors="replace") as fin, \
        open(out_path, "w", newline="", encoding="utf-8") as fout:
       writer = None
       for line in fin:
           line = line.rstrip("\n")
           if line.startswith("#"):
               if line.startswith("#fields"):
                   parts = line.split()
                   fields = parts[1:]
                   writer = csv.writer(fout)
                   writer.writerow(fields)
               continue
           if not line.strip() or writer is None:
               continue
           cols = line.split(separator)
           writer.writerow(cols)
   print("✅ Conversión Zeek log → CSV terminada.")
   PY

   chmod +x /home/ubuntu/scripts/zeek_log_to_csv.py
   ```

   ```bash
   cat >/home/ubuntu/scripts/export_conn_csv.sh <<'SH'
   #!/usr/bin/env bash
   set -e
   LOG_FILE="/home/ubuntu/prueba_logs/conn.log"
   OUT_DIR="/home/ubuntu/prueba_logs/export"
   mkdir -p "$OUT_DIR"
   TS=$(date +%Y%m%d_%H%M%S)
   OUT="$OUT_DIR/conn_${TS}.csv"
   if [ ! -f "$LOG_FILE" ]; then
       echo "❌ No se encontró $LOG_FILE"
       exit 1
   fi
   echo "📥 Leyendo: $LOG_FILE"
   echo "📤 Generando CSV: $OUT"
   python3 /home/ubuntu/scripts/zeek_log_to_csv.py "$LOG_FILE" "$OUT"
   echo "$OUT"
   SH

   chmod +x /home/ubuntu/scripts/export_conn_csv.sh
   ```

   Ejecuta `/home/ubuntu/scripts/export_conn_csv.sh` y deberías obtener archivos `conn_<timestamp>.csv` en `/home/ubuntu/prueba_logs/export/`.

2. **Copiar los CSV al host (WSL/Windows/Linux donde corre FastAPI)**
   - Prepara una clave SSH (por ejemplo `~/.ssh/zeek_vm`) y copia la pública a `ubuntu@192.168.23.128` (`ssh-copy-id -i ~/.ssh/zeek_vm.pub ubuntu@192.168.23.128`).
   - Crea un script en tu host (`sync_zeek_csv.sh`) que:
     1. Ejecuta remotamente `/home/ubuntu/scripts/export_conn_csv.sh`.
     2. Trae los CSV nuevos mediante `scp` hacia `backend/data/default_csv/`.
   - Puedes ejecutarlo manualmente cuando necesites nuevos datos o automatizarlo con cron.

3. **Actualizar `ZEEK_CONN_PATH`**
   - Apunta a alguno de los `conn_<timestamp>.csv` copiados en `backend/data/default_csv`.
   - Desde la pestaña “Pruebas / Zeek” usa “Usar dataset por defecto” y luego “Simular alerta” para verificar que el modelo procese las capturas recién exportadas.

Con este flujo, cada vez que levantes el proyecto en nuevas VMs basta con repetir la configuración de claves SSH, scripts y rutas (`LOG_FILE`, `OUT_DIR`, `ZEEK_CONN_PATH`) para volver a integrar Zeek sin tocar el resto del backend/frontend.

#### Automatizar la sincronización (opcional)

Puedes dejar la captura corriendo en segundo plano para que las alertas se creen sin intervención manual:

1. **En la VM Zeek:** crea un cron (o timer) que ejecute `export_conn_csv.sh` periódicamente (ej. cada minuto) y deje los CSV en `/home/ubuntu/prueba_logs/export`.
2. **En el host (WSL):** crea `sync_zeek_csv.sh` (ajusta rutas/IP/clave):
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   REMOTE="ubuntu@192.168.23.128"
   SSH_KEY="$HOME/.ssh/zeek_vm"
   DEST="$(pwd)/backend/data/default_csv"
   mkdir -p "$DEST"

   # Ejecuta la exportación en la VM y captura la ruta del CSV generado
   CSV_PATH=$(ssh -i "$SSH_KEY" "$REMOTE" '/home/ubuntu/scripts/export_conn_csv.sh')
   echo "CSV remoto: $CSV_PATH"

   # Trae el archivo al host
   scp -i "$SSH_KEY" "$REMOTE:$CSV_PATH" "$DEST/"

   # Opcional: dispara la simulación automáticamente
   curl -s -X POST http://localhost:8000/zeek-lab/simulate-alert \
        -H "Content-Type: application/json" \
        -d '{"use_default": true, "count": 10}' >/dev/null
   ```
3. **Programar el script:** añade un cron en tu host (ej. cada 2 minutos):
   ```
   */2 * * * * /ruta/al/repo/sync_zeek_csv.sh >> /tmp/sync_zeek.log 2>&1
   ```
4. Cuando copies el repo en otra computadora:
   - Repite la creación de la clave SSH (`ssh-keygen` + `ssh-copy-id`).
   - Ajusta IP/usuario/rutas en `sync_zeek_csv.sh` y en `.env`.
   - Ejecuta `./start.sh` y verifica la pestaña “Pruebas / Zeek”.

Así conviven dos modos: el automático (cron + script) que genera alertas en segundo plano y el manual (botones de la UI) para validar datasets específicos o ejecutar comandos ad-hoc en cada VM.

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
Con este setup (Zeek escuchando de verdad + scripts automáticos), las alertas se generan sin intervención manual. La pestaña **Pruebas / Zeek** queda disponible para validar datasets, subir CSV personalizados o ejecutar comandos ad-hoc en Kali.

### Operación del laboratorio (WSL + Zeek + Kali)

| Entorno | Rol | Notas |
|---------|-----|-------|
| WSL / Host (`Mapachurro`) | Guarda el repo `TP-Flores-Vargas`, corre FastAPI/Vite, cron y scripts | Ruta base: `/mnt/d/Desarrollo Tesis/TP-Flores-Vargas` |
| VM Zeek (Ubuntu 24.04 · `192.168.23.128`) | Corre Zeek/ZeekControl y produce `conn.log` | Zeek instalado en `/usr/local/zeek` |
| VM Kali (`192.168.23.129`) | Genera el tráfico de prueba (nmap, curl, etc.) | La UI puede ejecutar comandos SSH contra esta VM |

#### 1. Conectarse a la VM Zeek
```bash
# desde WSL/host
ssh -i ~/.ssh/zeek_vm ubuntu@192.168.23.128
# prompt esperado: ubuntu@ubuntuserverids:~$
```

#### 2. Comandos útiles en la VM Zeek
- **Estado de Zeek**  
  ```bash
  sudo /usr/local/zeek/bin/zeekctl status
  ```
  Debe mostrar `running`. Si dice `stopped`, Zeek no está capturando.

- **Arrancar Zeek tras un reboot**  
  ```bash
  cd /usr/local/zeek/bin
  sudo ./zeekctl deploy
  sudo ./zeekctl status
  ```

- **Detener Zeek**  
  ```bash
  cd /usr/local/zeek/bin
  sudo ./zeekctl stop
  sudo ./zeekctl status
  ```

- **Ver el log en vivo**  
  ```bash
  tail -f /usr/local/zeek/logs/current/conn.log
  ```
  Mientras hagas ping/nmap desde Kali deberían aparecer líneas nuevas; si no hay movimiento, Zeek no está capturando o está detenido.

- **Exportar manualmente el `conn.log` a CSV**  
  ```bash
  bash /home/ubuntu/scripts/export_conn_csv.sh
  ```
  La última línea del output es la ruta `conn_YYYYMMDD_HHMMSS.csv` generada.

#### 3. Comandos útiles en WSL / Host
Ruta base:
```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
```

- **Forzar el pipeline Zeek → CSV → backend (sin esperar cron)**  
  ```bash
  ./sync_zeek_and_simulate.sh
  ```
  Hace SSH a la VM Zeek, copia el CSV a `backend/data/default_csv/`, actualiza `conn_latest.csv`, invoca `POST /zeek-lab/simulate-alert` y limpia archivos viejos.

- **Levantar el backend**  
  ```bash
  cd backend
  source venv/bin/activate
  ./start.sh
  # o uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
  Swagger: `http://localhost:8000/docs`.  
  Test rápido:
  ```bash
  curl -X POST http://localhost:8000/zeek-lab/simulate-alert \
       -H "Content-Type: application/json" \
       -d '{"use_default": true, "count": 10}'
  ```

- **Ver qué CSV está usando el backend**  
  ```bash
  ls -l backend/data/default_csv/
  ls -l backend/data/default_csv/conn_latest.csv
  ```

#### 4. Cron en WSL
- Ver tareas:
  ```bash
  crontab -l
  ```
  Ejemplo actual (cada 1 min):
  ```
  * * * * * /mnt/d/Desarrollo\ Tesis/TP-Flores-Vargas/sync_zeek_and_simulate.sh >> /tmp/sync_zeek.log 2>&1
  ```
- Editar:
  ```bash
  crontab -e
  ```
  Usa `*/2` para 2 minutos, `*/5` para 5, etc.
- Asegurarse de que cron corre:
  ```bash
  sudo service cron status
  sudo service cron start   # si no estaba activo
  ```
- Log del script:
  ```bash
  tail -f /tmp/sync_zeek.log
  ```
- Desactivar cron:
  ```bash
  crontab -r             # elimina todo
  # o edita con crontab -e y comenta la línea
  ```
- Cadencia aproximada de **30 segundos**:
  ```
  * * * * * /mnt/d/Desarrollo\ Tesis/TP-Flores-Vargas/sync_zeek_and_simulate.sh >> /tmp/sync_zeek.log 2>&1
  * * * * * sleep 30 && /mnt/d/Desarrollo\ Tesis/TP-Flores-Vargas/sync_zeek_and_simulate.sh >> /tmp/sync_zeek.log 2>&1
  ```
  La primera entrada corre al segundo 0 y la segunda al segundo 30 de cada minuto. Para frecuencias menores considera un servicio `systemd` o un pipeline de streaming.

#### 5. Después de reiniciar VMs / host
- **VM Zeek**: `ssh …`, `cd /usr/local/zeek/bin`, `sudo ./zeekctl deploy`, `sudo ./zeekctl status`, opcional `tail -f /usr/local/zeek/logs/current/conn.log`.
- **WSL/Host**: verificar cron (`sudo service cron status`), iniciar backend (`./start.sh`), opcionalmente ejecutar `./sync_zeek_and_simulate.sh` para forzar el primer ciclo.

#### 6. Tráfico de prueba desde Kali (192.168.23.129)
```bash
ping 192.168.23.128
nmap 192.168.23.128
curl http://192.168.23.128
```
Cada vez que generes tráfico y corra `sync_zeek_and_simulate.sh` (por cron o manual), el pipeline completo hará:
```
Kali → Zeek (conn.log) → CSV export → WSL → FastAPI → Dashboard de alertas
```

### Arranque rápido tras reinicios
0. **Levanta Postgres local (si no está corriendo)**
   ```bash
   cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
   docker compose up db -d
   docker compose ps db   # confirma que está healthy
   ```
1. **Arranca Zeek en la VM Ubuntu (`192.168.23.128`)**
   ```bash
   ssh -i ~/.ssh/zeek_vm ubuntu@192.168.23.128 <<'EOF'
   cd /usr/local/zeek/bin
   sudo ./zeekctl deploy
   sudo ./zeekctl status
   EOF
   ```
2. **(Opcional) Genera tráfico desde Kali (`192.168.23.129`)** con `ping`, `nmap`, etc.
3. **En WSL / host ejecuta el script maestro**
   ```bash
   cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas"
   chmod +x scripts/start_lab.sh   # solo la primera vez
   scripts/start_lab.sh
   ```
   El script arranca `cron` (pidiéndote la contraseña `sudo` si no estaba activo) y delega en `./start.sh` para levantar FastAPI + Vite. Para forzar un ciclo inmediato de ingestión puedes ejecutar manualmente `./sync_zeek_and_simulate.sh` en otra terminal o invocar `RUN_INITIAL_SYNC=1 scripts/start_lab.sh` (el script espera a que `/health` esté disponible y luego dispara el sync). Recuerda que Postgres debe seguir corriendo (`docker compose ps db`).

#### ¿Reinicié todo o cambié de máquina?
- **WSL/host nuevo**:
  1. Clona el repo y entra al directorio.
  2. `docker compose up db -d` para levantar Postgres.
  3. Crea el venv e instala dependencias:
     ```bash
     cd backend
     python3 -m venv venv
     source venv/bin/activate
     pip install -r requirements.txt
     ```
  4. Inicializa la base:
     ```bash
     backend/venv/bin/python scripts/reset_backend_db.py
     ```
  5. Ejecuta `scripts/start_lab.sh` y listo.
- **Solo reinicié las VMs (Zeek/Kali)**:
  1. Verifica que Postgres sigue arriba (`docker compose ps db`); si no, `docker compose up db -d`.
  2. Arranca Zeek (paso 1), genera tráfico si quieres y vuelve a correr `scripts/start_lab.sh`.
- **Quiero empezar limpio antes de una demo**:
  1. `backend/venv/bin/python scripts/reset_backend_db.py` (deja la base vacía, sea SQLite o Postgres).
  2. `scripts/start_lab.sh` (usa `RUN_INITIAL_SYNC=1` si querés el primer lote al instante).
  3. Deja cron corriendo o usa el botón “Forzar carga automática”.
- **Cambio de máquina/VM**:
  - Copia el repo.
  - Repite los pasos de “WSL/host nuevo”.
  - Si cambiaste de IPs/usuarios, actualiza `backend/.env` y los scripts (`sync_zeek_and_simulate.sh`, `sync_zeek_csv.sh`) con las nuevas direcciones/llaves SSH.
