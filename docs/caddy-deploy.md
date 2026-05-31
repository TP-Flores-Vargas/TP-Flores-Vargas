# Despliegue HTTPS con Caddy

## DNS previo

En Name.com configura ambos registros:

- `A` para `@` -> `178.128.156.224`
- `A` para `www` -> `178.128.156.224`

## Variables mínimas en el droplet

```bash
export AUTH_SECRET='cambia-esto-por-un-secreto-largo'
export INGESTION_MODE='SYNTHETIC_SEED'
export SYNTHETIC_SEED_COUNT='300'
export SYNTHETIC_AUTOSTART='true'
export SYNTHETIC_RATE_PER_MIN='4'
export STREAM_MODE='SSE'
export CADDY_HOSTS='edunids.app, www.edunids.app'
```

## Comandos

Desde `~/TP-Flores-Vargas`:

```bash
docker compose down
docker compose -f docker-compose.public.yml up -d --build
docker compose -f docker-compose.public.yml ps
docker compose -f docker-compose.public.yml logs caddy --tail 100
```

## Resultado esperado

- `https://edunids.app`
- `https://www.edunids.app`

El backend queda accesible solo a través del proxy del frontend en `/api`.

## Firewall

En DigitalOcean deja abiertos:

- `80/tcp`
- `443/tcp`
- `22/tcp`
