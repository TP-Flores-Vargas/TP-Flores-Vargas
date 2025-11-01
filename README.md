## Desarrollo local

### Backend (FastAPI en WSL)
```bash
cd "/mnt/d/Desarrollo Tesis/TP-Flores-Vargas/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs: http://localhost:8000/docs

### Frontend (Vite en Windows)
```bash
cd "D:\Desarrollo Tesis\TP-Flores-Vargas"
npm install
npm run dev
```

App: http://localhost:5173/

#### Notas
- El proxy de Vite redirige /api/* → http://localhost:8000/* (sin CORS).
- Reemplazar el mock de /predict por el modelo real (joblib) y preprocesamiento.

## Docker

### Construir y ejecutar (producción)
```bash
docker compose build
docker compose up
```

- Frontend: http://localhost:5173/
- Backend: http://localhost:8000/docs

### Detener y limpiar
```bash
docker compose down
```

### Commit
```bash
git add .
git commit -m "chore: docker setup for fastapi backend and vite frontend"
git push
```
