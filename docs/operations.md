# Lexica — Operations runbook (home server)

## Containers beheren
Alle handmatige commando's vanuit `C:\apps\lexica` (daar staat de compose-kopie en de .env):
- Status: `docker compose ps`
- Logs API: `docker logs lexica-api --tail 100 -f`
- Logs DB: `docker logs lexica-db --tail 100 -f`
- Restart API: `docker compose restart api`
- Volledig herstart: `docker compose down; docker compose --env-file .env up -d --no-build`

## Locatie van bestanden
- App-root: `C:\apps\lexica\` met `.env` en kopie van `docker-compose.yml`
- Runner workspace (door GitHub Actions): `C:\actions-runner\_work\Lexica\Lexica\`
- Image cache: `docker images ghcr.io/tjanssens/lexica`
- Postgres data: Docker named volume `lexica_pgdata`

## Database
- Verbinden in container: `docker exec -it lexica-db psql -U lexica -d lexica`
- Backup: `docker exec lexica-db pg_dump -U lexica -d lexica > lexica-$(Get-Date -Format yyyyMMdd).sql`
- Restore: `Get-Content backup.sql | docker exec -i lexica-db psql -U lexica -d lexica`
- Data volume: `docker volume inspect lexica_pgdata`

## Deploy handmatig forceren
- Via GitHub UI → Actions → "Build and Deploy to Home Server" → Run workflow.
- Of via gh CLI: `gh workflow run deploy.yml --repo tjanssens/Lexica`

## Cloudflare Tunnel
- Config locatie: `%USERPROFILE%\.cloudflared\config.yml` of `C:\ProgramData\cloudflared\config.yml`
- Logs: `Get-EventLog -LogName Application -Source Cloudflared -Newest 50`
- Restart: `Restart-Service Cloudflared`

## Rollback naar vorige image
1. Bekijk beschikbare tags: `docker images ghcr.io/tjanssens/lexica`
2. `cd C:\apps\lexica`
3. Bewerk `.env`: zet `LEXICA_IMAGE=ghcr.io/tjanssens/lexica:<oudere-sha>`
4. `docker compose --env-file .env up -d --no-build`

## Self-hosted runner
- Service: `actions.runner.tjanssens-Lexica.home-server` (Windows-service, draait als `.\claude`)
- Status: `Get-Service actions.runner.* | Format-Table Name, Status`
- Logs: `C:\actions-runner\_diag\`
- Werd handmatig geïnstalleerd via `sc.exe create` omdat runner v2.334+ geen `svc.cmd` meer heeft. Bij upgrade van de runner: deconfigure (`config.cmd remove`), download nieuwe versie, registreer opnieuw, en check of de service nog actief is.
- Vereiste: `claude` heeft "Log on as a service"-recht (al toegekend) en zit in `docker-users`.

## Secret rotation
- Runner registratie-token verloopt; nieuwe via `gh api -X POST "repos/tjanssens/Lexica/actions/runners/registration-token"`
- GHCR PAT (`ghp_…`) verloopt elke 12 maanden — kalender-reminder zetten. Refresh:
  1. Maak nieuwe classic PAT met scope `read:packages` op github.com/settings/tokens/new
  2. Werk auth-entry bij in `$env:USERPROFILE\.docker\config.json` → `auths.\"ghcr.io\".auth` = base64(`tjanssens:<nieuwe-token>`)
- Postgres-wachtwoord roteren:
  1. `docker exec -it lexica-db psql -U lexica -d lexica -c "ALTER USER lexica WITH PASSWORD '<nieuw>';"`
  2. Bewerk `C:\apps\lexica\.env` → `DB_PASSWORD=<nieuw>`
  3. `cd C:\apps\lexica; docker compose --env-file .env up -d --no-build`
