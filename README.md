# Georgies Spotify Player

Server-side Spotify API client laag voor een Next.js app.

## Deploy via GitHub Actions

### Benodigde GitHub Secrets

Stel de volgende secrets in bij **Settings → Secrets and variables → Actions**:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY` (private key zonder passphrase)
- `DEPLOY_PORT` (optioneel, standaard 22)
- `DEPLOY_PATH` (optioneel, standaard `/opt/gsplayer`)
- `GHCR_USER` (GitHub username voor registry login op de Pi)
- `GHCR_TOKEN` (PAT met `read:packages`)

Optioneel (als je wilt overschrijven):
- `PORT`
- `LOG_LEVEL`
- `METRICS_ENABLED`
- `CACHE_BACKEND`
- `CACHE_REDIS_URL`
- `CACHE_REDIS_PREFIX`

### Eénmalige setup op de Raspberry Pi

1. Installeer Docker en Docker Compose.
2. Maak de deploy directory aan:
   - `sudo mkdir -p /opt/gsplayer`
3. Zorg dat de deploy user docker mag gebruiken:
   - `sudo usermod -aG docker <deploy-user>`
4. Voeg de GitHub Actions SSH public key toe aan `~/.ssh/authorized_keys`.

### Wat er gebeurt bij elke push naar main

- Build, lint, typecheck en build van de Next.js app.
- Build van de Docker image en push naar GHCR.
- Upload van `docker-compose.yml` naar de Pi.
- Remote deploy via SSH: `docker login`, `docker compose pull`, `docker compose up -d`.


<!-- deploy test -->
