# Lexica — Home Server Deployment (Docker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lexica volledig zelf hosten op een Windows 11 machine thuis als Docker-containers, met automatische CI/CD vanaf GitHub `main` via een self-hosted runner, en publiek bereikbaar via een bestaande Cloudflare Tunnel.

**Architecture:**
- Docker Desktop op Windows 11 met WSL2-backend draait twee Linux-containers: de Lexica API (.NET 10 + Angular `wwwroot`) en PostgreSQL 16.
- GitHub Actions bouwt de image op `ubuntu-latest` en pusht naar `ghcr.io/tjanssens/lexica`. De self-hosted Windows-runner doet alleen `docker compose pull && up -d`, gevolgd door een healthcheck.
- Cloudflare Tunnel termineert TLS aan de edge en routeert het publieke hostname naar `http://localhost:8080` (de gepubliceerde poort van de API-container).
- Database-migraties draaien automatisch bij API-start via `db.Database.Migrate()` (al aanwezig in `Program.cs`). Volume `pgdata` zorgt voor datapersistentie.

**Tech Stack:** Windows 11 (Pro of Home, ≥ 22H2), PowerShell, WSL2, Docker Desktop, Docker Compose v2, GitHub Container Registry, GitHub Actions self-hosted runner, Cloudflare Tunnel.

---

## Context voor de uitvoerende agent

Je werkt op een Windows 11 machine thuis (gedraagt zich als een home server). De repo is `https://github.com/tjanssens/Lexica` en bevat al een werkende `Dockerfile`, `docker-compose.yml`, `.dockerignore` en `.env.example` in de root (toegevoegd vóór dit plan). De applicatie is .NET 10 + Angular 17 met PostgreSQL 16 als database. Migraties worden automatisch toegepast bij app-start.

**Cloudflare Tunnel:** draait al als Windows-service op deze machine. Je voegt enkel een nieuwe ingress-regel toe; de tunnel zelf hoef je niet te installeren of te authenticeren.

**Aannames:**
- Je hebt lokale admin-rechten en kunt rebooten als WSL2-installatie dat vraagt.
- Server heeft minstens 2 GB vrij RAM en 10 GB vrije schijfruimte.
- Machine draait Windows 11 (Pro of Home, build 22000 / 22H2 of nieuwer voor optimale WSL2-ondersteuning).
- Virtualisatie is enabled in BIOS/UEFI (Intel VT-x / AMD-V). Check via Task Manager → Performance → CPU → "Virtualization: Enabled". Zonder dit werkt WSL2 niet en Docker Desktop weigert te starten.
- Outbound HTTPS naar ghcr.io, github.com, hub.docker.com en mcr.microsoft.com is open.

**Decisions die je zelfstandig mag nemen:**
- Exact pad voor `C:\apps\lexica` (alternatief: andere drive als C: krap zit)
- WSL2-distributie naam (Docker Desktop default is `docker-desktop`)
- GitHub Actions runner versie (gebruik de laatste release)
- Runner service naam (default van runner installer is prima)

**Voorlopige defaults (laten bevestigen door de gebruiker in Taak 1):**
- Publiek hostname: `lexica.jnssns.com` — voorstel, gebruiker bevestigt of geeft alternatief
- App pad: `C:\apps\lexica`
- Runner scope: repo-scoped (alleen `tjanssens/Lexica`)
- Image zichtbaarheid op ghcr.io: **private** (veiliger; vraagt PAT op de server)

**Decisions die je expliciet aan de gebruiker moet voorleggen (Taak 1):**
- Bevestiging van het hostname (default: `lexica.jnssns.com`)
- Naam van de bestaande Cloudflare Tunnel (output van `cloudflared tunnel list`)
- Bevestiging of override van app-pad, runner-scope en image-zichtbaarheid

---

## File Structure

**Reeds in de repo aanwezig** (door eerdere setup-sessie):
- `Dockerfile` — multi-stage build: Angular (Node 20) → .NET publish (SDK 10) → runtime (aspnet 10) met Angular `wwwroot`
- `docker-compose.yml` — `api` (image+build) + `db` (postgres:16-alpine) + named volume `pgdata` + healthcheck
- `.dockerignore`
- `.env.example`
- `.gitignore` — bevat al `.env`

**Wijzigingen in deze setup:**
- Modify: `.github/workflows/deploy.yml` — volledig vervangen door build-en-push + deploy job

**Op de server, buiten de repo:**
- `C:\apps\lexica\.env` — secrets (DB-wachtwoord, JWT-key, image tag), niet in git
- `C:\apps\lexica\docker-compose.yml` — kopie uit de repo (gemaakt door de workflow), zodat je vanuit deze map handmatige compose-acties kunt doen
- `C:\actions-runner\` — GitHub Actions self-hosted runner
- Cloudflare Tunnel config: `C:\Users\<gebruiker>\.cloudflared\config.yml` of `C:\ProgramData\cloudflared\config.yml`

---

## Taak 1: Inventaris & gebruikersvragen

**Files:** geen wijzigingen.

- [ ] **Step 1: Verifieer Windows 11 versie, admin-rechten, RAM en virtualisatie**

```powershell
[Environment]::OSVersion
(Get-CimInstance Win32_OperatingSystem).Caption
whoami /groups | Select-String "S-1-5-32-544"
[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
(Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled
```
Expected: Windows 11 build ≥ 22000, gebruiker in Administrators-groep (SID `S-1-5-32-544`), ≥ 2 GB RAM, `VirtualizationFirmwareEnabled` = True. Als virtualisatie False is: vraag de gebruiker om in BIOS/UEFI `Intel VT-x` / `AMD-V` aan te zetten en te rebooten voor je verder gaat.

- [ ] **Step 2: Controleer welke prereqs al aanwezig zijn**

```powershell
Get-Command docker -ErrorAction SilentlyContinue
Get-Command wsl -ErrorAction SilentlyContinue
Get-Command git -ErrorAction SilentlyContinue
Get-Service "actions.runner.*" -ErrorAction SilentlyContinue
Get-Service Cloudflared -ErrorAction SilentlyContinue
wsl --status 2>$null
```
Noteer wat al bestaat — sla de bijbehorende install-stap over. Als WSL2 al actief is, kan Taak 2 grotendeels worden overgeslagen.

- [ ] **Step 3: Bevestig defaults en vraag de tunnel-naam**

Toon de gebruiker de voorlopige defaults uit de "Context" sectie en vraag of er aanpassingen nodig zijn:
1. **Hostname:** `lexica.jnssns.com` — akkoord of ander hostname?
2. **App pad:** `C:\apps\lexica` — akkoord of andere schijf?
3. **Runner scope:** repo-scoped (alleen `tjanssens/Lexica`) — akkoord of breder?
4. **Image zichtbaarheid op ghcr.io:** private — akkoord of public (geen PAT nodig)?
5. **Tunnel naam:** geef de output van `cloudflared tunnel list` zodat ik weet welke tunnel ik moet aanpassen.

Bewaar de uiteindelijke antwoorden — gebruik ze in volgende taken. Als de gebruiker een ander hostname kiest, vervang `lexica.jnssns.com` overal in de rest van het plan (Taak 8 ingress, Taak 9 verificatie).

---

## Taak 2: WSL2 + Docker Desktop installeren

**Files:** geen.

- [ ] **Step 1: Schakel WSL2 + VirtualMachinePlatform features in**

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```
Expected: beide features Enabled. Als een reboot wordt gevraagd: voer hem uit voor je verder gaat.

- [ ] **Step 2: Update WSL2 kernel en zet als default**

```powershell
wsl --update
wsl --set-default-version 2
```
Expected: kernel package geïnstalleerd, default version 2.

- [ ] **Step 3: Installeer Docker Desktop**

```powershell
winget install --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements --silent
```
Als winget faalt: download en run direct:
```powershell
$installer = "$env:TEMP\Docker Desktop Installer.exe"
Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $installer
Start-Process -FilePath $installer -ArgumentList "install","--quiet","--accept-license","--backend=wsl-2" -Wait
```
Expected: installer eindigt zonder fout. Reboot als gevraagd.

- [ ] **Step 4: Start Docker en verifieer**

Docker Desktop moet één keer interactief opstarten om EULA te accepteren en de WSL2-distributie te initialiseren. Vraag de gebruiker dit te doen via Start-menu, of probeer:
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```
Wacht tot de service draait (~1 minuut):
```powershell
$tries = 30
while ($tries -gt 0) {
    docker info --format "{{.ServerVersion}}" 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 5
    $tries--
}
docker run --rm hello-world
```
Expected: `hello-world` container draait succesvol.

- [ ] **Step 5: Stel Docker Desktop in op autostart bij boot**

Open Docker Desktop → Settings → General → "Start Docker Desktop when you sign in to your computer": aanvinken. Op een Windows 11 machine die altijd ingelogd blijft (kiosk/home-server stijl): zet ook Power Options zo dat de machine niet uit slaapstand gaat zonder login. Als de machine vaak uitgelogd is: maak een Task Scheduler taak die bij Windows-start het Docker Desktop exe start onder de hoofdgebruiker (`At startup` trigger, action `"C:\Program Files\Docker\Docker\Docker Desktop.exe"`, "Run only when user is logged on" uitvinken + "Run with highest privileges" aanvinken).

---

## Taak 3: App directory + secrets op de server

**Files (op server, buiten repo):**
- Create: `C:\apps\lexica\.env`

- [ ] **Step 1: Maak directory**

```powershell
$appRoot = "C:\apps\lexica"   # of pad uit Taak 1 stap 3
New-Item -ItemType Directory -Force -Path $appRoot
```

- [ ] **Step 2: Genereer sterke secrets**

```powershell
function New-Secret { param([int]$Length = 32)
    # Alphanumeriek + veilige symbolen. Geen $ (Docker Compose-interpolatie),
    # geen ; : / \ ' " (connection-string / shell escapes).
    $chars = (48..57) + (65..90) + (97..122) + (33,35,37,42,43,45,61,63,64)  # ! # % * + - = ? @
    -join ($chars | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}
$dbPassword = New-Secret -Length 24
$jwtKey = New-Secret -Length 48
```

Toon beide aan de gebruiker en vraag te bewaren in een password manager. Geen kopie in plain text laten staan op de server buiten `.env`.

- [ ] **Step 3: Schrijf het .env bestand**

```powershell
$envContent = "DB_PASSWORD=$dbPassword`nJWT_KEY=$jwtKey`nLEXICA_IMAGE=ghcr.io/tjanssens/lexica:latest`n"

# UTF-8 zonder BOM (Docker Compose accepteert geen BOM)
[System.IO.File]::WriteAllText("$appRoot\.env", $envContent, (New-Object System.Text.UTF8Encoding $false))

# Beperk lees-rechten tot Administrators + SYSTEM
$acl = Get-Acl "$appRoot\.env"
$acl.SetAccessRuleProtection($true, $false)
$rules = @(
    New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\Administrators", "FullControl", "Allow"),
    New-Object System.Security.AccessControl.FileSystemAccessRule("NT AUTHORITY\SYSTEM", "FullControl", "Allow")
)
$rules | ForEach-Object { $acl.AddAccessRule($_) }
Set-Acl -Path "$appRoot\.env" -AclObject $acl
```
Expected: `Get-Content $appRoot\.env` toont drie regels met de juiste waarden. `Get-Acl` toont alleen Administrators + SYSTEM.

---

## Taak 4: GitHub Container Registry login op de server

**Files:** geen.

Deze stap is **alleen nodig als de gebruiker in Taak 1 stap 3 koos voor "private image"**. Voor public skip je deze taak.

- [ ] **Step 1: Vraag de gebruiker een Personal Access Token aan te maken**

Vraag te navigeren naar GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic):
- Naam: `home-server-ghcr-pull`
- Scope: alleen `read:packages`
- Verloopt: 1 jaar (noteer in een agenda om te roteren)

De gebruiker plakt de token in jouw prompt.

- [ ] **Step 2: Login docker op ghcr.io**

```powershell
$token = Read-Host -AsSecureString "Plak PAT"
$plain = [System.Net.NetworkCredential]::new("", $token).Password
$plain | docker login ghcr.io -u tjanssens --password-stdin
```
Expected: `Login Succeeded`. Credentials staan nu in `%USERPROFILE%\.docker\config.json`.

- [ ] **Step 3: Test pull**

Skip deze stap tot na de eerste workflow-run (de image bestaat nog niet). Voeg een notitie toe aan de runbook (Taak 7 stap 2).

---

## Taak 5: GitHub Actions self-hosted runner installeren

**Files:** geen.

- [ ] **Step 1: Haal een registratie-token op**

Optie A — via gh CLI (vereist `gh auth login` met scope `repo`):
```powershell
gh api -X POST "repos/tjanssens/Lexica/actions/runners/registration-token" --jq .token
```

Optie B — vraag de gebruiker om in GitHub naar **Settings → Actions → Runners → New self-hosted runner → Windows x64** te gaan en de token uit het commando te kopiëren.

- [ ] **Step 2: Download en pak de runner uit**

Check de laatste versie op `https://github.com/actions/runner/releases`. Op moment van schrijven: 2.319.x.

```powershell
New-Item -ItemType Directory -Force -Path C:\actions-runner | Out-Null
Set-Location C:\actions-runner
$version = "2.319.1"
Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v$version/actions-runner-win-x64-$version.zip" -OutFile actions-runner.zip
Expand-Archive -Path actions-runner.zip -DestinationPath . -Force
Remove-Item actions-runner.zip
```

- [ ] **Step 3: Configureer de runner**

```powershell
Set-Location C:\actions-runner
.\config.cmd --unattended `
    --url https://github.com/tjanssens/Lexica `
    --token <REGISTRATION_TOKEN> `
    --name "home-server" `
    --labels "self-hosted,Windows,X64,lexica" `
    --work "_work"
```
Expected: `Settings Saved.` en `Connected to GitHub`.

- [ ] **Step 4: Installeer als Windows-service**

```powershell
.\svc.cmd install
.\svc.cmd start
Get-Service "actions.runner.*"
```
Expected: service `actions.runner.tjanssens-Lexica.home-server` met status Running.

- [ ] **Step 5: Verifieer in GitHub**

Vraag de gebruiker te controleren op **GitHub → Settings → Actions → Runners** dat `home-server` als **Idle** verschijnt.

---

## Taak 6: GitHub workflow herschrijven

**Files:**
- Modify: `.github/workflows/deploy.yml`

Dit is de enige repo-wijziging in dit plan. Doe het op een feature branch, push, en laat de gebruiker de PR mergen — dan triggert hij meteen de eerste deploy.

- [ ] **Step 1: Vervang `.github/workflows/deploy.yml` volledig**

```yaml
name: Build and Deploy to Home Server

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  IMAGE_NAME: ghcr.io/${{ github.repository_owner }}/lexica

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: ${{ steps.meta.outputs.tag }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to ghcr.io
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Compute tags
        id: meta
        run: |
          SHORT_SHA=$(echo "${{ github.sha }}" | cut -c1-7)
          echo "tag=${SHORT_SHA}" >> "$GITHUB_OUTPUT"
          {
            echo "tags<<EOF"
            echo "${{ env.IMAGE_NAME }}:latest"
            echo "${{ env.IMAGE_NAME }}:${SHORT_SHA}"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64

  deploy:
    needs: build-push
    runs-on: [self-hosted, Windows, X64, lexica]
    steps:
      - name: Checkout (voor compose file)
        uses: actions/checkout@v4

      - name: Set image tag in environment
        shell: pwsh
        run: |
          $env:LEXICA_IMAGE = "${{ env.IMAGE_NAME }}:${{ needs.build-push.outputs.image-tag }}"
          Add-Content -Path $env:GITHUB_ENV -Value "LEXICA_IMAGE=$env:LEXICA_IMAGE"

      - name: Pull image
        shell: pwsh
        env:
          LEXICA_IMAGE: ${{ env.LEXICA_IMAGE }}
        run: |
          docker pull $env:LEXICA_IMAGE
          if ($LASTEXITCODE -ne 0) { throw "docker pull failed" }

      - name: Deploy with compose
        shell: pwsh
        env:
          LEXICA_IMAGE: ${{ env.LEXICA_IMAGE }}
        run: |
          $appRoot = "C:\apps\lexica"
          $envFile = Join-Path $appRoot ".env"

          # Kopieer de compose-file naar de app-root voor handmatige acties (restart, rollback)
          Copy-Item docker-compose.yml -Destination $appRoot -Force

          # Overschrijf LEXICA_IMAGE in .env zodat compose dezelfde tag gebruikt bij toekomstige `up`
          $existing = Get-Content $envFile | Where-Object { -not $_.StartsWith("LEXICA_IMAGE=") }
          $new = $existing + "LEXICA_IMAGE=$env:LEXICA_IMAGE"
          $content = ($new -join "`n") + "`n"
          [System.IO.File]::WriteAllText($envFile, $content, (New-Object System.Text.UTF8Encoding $false))

          docker compose --env-file $envFile -f (Join-Path $appRoot "docker-compose.yml") up -d --no-build --remove-orphans
          if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

      - name: Health check
        shell: pwsh
        run: |
          $maxAttempts = 24
          for ($i = 1; $i -le $maxAttempts; $i++) {
            try {
              $r = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 5
              if ($r.StatusCode -lt 500) { Write-Host "Healthy (HTTP $($r.StatusCode))"; exit 0 }
            } catch { Write-Host "Attempt $i/$maxAttempts not ready: $($_.Exception.Message)" }
            Start-Sleep -Seconds 5
          }
          docker logs lexica-api --tail 100
          docker logs lexica-db --tail 50
          throw "Service did not become healthy within $($maxAttempts * 5) seconds"

      - name: Cleanup oude images (behoud 5 meest recente)
        shell: pwsh
        if: success()
        run: |
          $images = docker images "${{ env.IMAGE_NAME }}" --format "{{.ID}} {{.CreatedAt}}" | Sort-Object -Descending | Select-Object -Skip 5
          foreach ($line in $images) {
            $id = ($line -split " ")[0]
            docker rmi -f $id 2>$null
          }
```

- [ ] **Step 2: Commit en push op een feature branch — nog niet mergen**

```powershell
Set-Location C:\Users\tom\repos\Lexica   # of waar de repo staat
git checkout -b deploy/home-server-docker
git add .github/workflows/deploy.yml
git commit -m "ci: deploy via ghcr.io + self-hosted Windows runner"
git push -u origin deploy/home-server-docker
```

De PR wordt pas gemerged in Taak 9. Dan gaat de eerste deploy lopen.

---

## Taak 7: Operations runbook + smoketest compose file

**Files:**
- Create: `docs/operations.md`

De deploy-step uit Taak 6 kopieert `docker-compose.yml` automatisch naar `C:\apps\lexica\`. Het runbook gebruikt dat pad voor handmatige acties.

- [ ] **Step 1: Schrijf operations runbook**

Plaats in `docs/operations.md`:

```markdown
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

## Secret rotation
- Runner registratie-token verloopt; nieuwe via `gh api -X POST "repos/tjanssens/Lexica/actions/runners/registration-token"`
- GHCR PAT verloopt elke 12 maanden — kalender-reminder zetten
- Postgres-wachtwoord roteren:
  1. `docker exec -it lexica-db psql -U lexica -d lexica -c "ALTER USER lexica WITH PASSWORD '<nieuw>';"`
  2. Bewerk `C:\apps\lexica\.env` → `DB_PASSWORD=<nieuw>`
  3. `cd C:\apps\lexica; docker compose --env-file .env up -d --no-build`
```

- [ ] **Step 2: Voeg `docs/operations.md` toe aan dezelfde feature branch**

```powershell
git add docs/operations.md
git commit -m "docs: operations runbook for Docker deployment"
git push
```

---

## Taak 8: Cloudflare Tunnel ingress-regel toevoegen

**Files:** wijziging in `config.yml` van de bestaande tunnel — geen repo-wijziging.

- [ ] **Step 1: Vind de actieve tunnel config**

```powershell
cloudflared tunnel list
# Noteer welke tunnel matched met de naam uit Taak 1 stap 3.

$candidates = @(
    "$env:USERPROFILE\.cloudflared\config.yml",
    "C:\ProgramData\cloudflared\config.yml",
    "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml"
)
$configPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
Write-Host "Config gevonden op: $configPath"
Get-Content $configPath
```

- [ ] **Step 2: Voeg ingress-regel toe**

Open `$configPath` en voeg `lexica.jnssns.com` toe **vóór** de catch-all `http_status:404` regel:

```yaml
ingress:
  - hostname: lexica.jnssns.com
    service: http://localhost:8080
  # ... bestaande regels blijven ...
  - service: http_status:404
```

Houd YAML-indentatie consistent met de bestaande regels (meestal 2 spaces).

- [ ] **Step 3: Maak de DNS-route aan**

```powershell
cloudflared tunnel route dns <TUNNEL_NAAM> lexica.jnssns.com
# Voorbeeld: cloudflared tunnel route dns home lexica.jnssns.com
```
Expected: `Added CNAME ... which will route to this tunnel`. Als de DNS al bestaat: `--overwrite-dns` toevoegen na bevestiging gebruiker.

- [ ] **Step 4: Herstart cloudflared en verifieer**

```powershell
$svc = Get-Service -Name "*loudflared*" | Select-Object -First 1
if (-not $svc) { throw "Cloudflared service niet gevonden" }
Restart-Service -Name $svc.Name
Start-Sleep -Seconds 3
Get-Service -Name $svc.Name
Get-WinEvent -ProviderName Cloudflared -MaxEvents 10 -ErrorAction SilentlyContinue | Format-Table TimeCreated, LevelDisplayName, Message -Wrap
```
Expected: Service Running. Als de cloudflared service niet naar Windows Event Log logt, check stdout-logs via Docker Desktop / cloudflared logs zoals geconfigureerd op deze server.

---

## Taak 9: End-to-end verificatie

**Files:** geen.

- [ ] **Step 1: Verwijder verouderde Azure GitHub secrets**

```powershell
gh secret delete AZURE_CREDENTIALS --repo tjanssens/Lexica
gh secret delete AZURE_WEBAPP_PUBLISH_PROFILE --repo tjanssens/Lexica
```
Expected: beide secrets verwijderd. Bevestig met `gh secret list --repo tjanssens/Lexica` — er zou nu geen Azure-secret meer mogen staan. (Geen nieuwe secret nodig: DB-wachtwoord zit in `.env` op de server, niet in GitHub.)

- [ ] **Step 2: Merge de feature branch naar `main`**

```powershell
gh pr create --base main --head deploy/home-server-docker `
    --title "Deploy via ghcr.io + self-hosted runner" `
    --body "Vervangt Azure deploy. Zie docs/operations.md."
# Vraag de gebruiker om review en merge via UI, of als zelf-merge OK is:
gh pr merge --merge
```
De merge triggert automatisch de workflow.

- [ ] **Step 3: Volg de workflow-run**

```powershell
gh run watch --repo tjanssens/Lexica
```
Expected: `build-push` job groen (image staat op `ghcr.io/tjanssens/lexica:latest` + sha-tag), daarna `deploy` job groen inclusief healthcheck.

Bij falen van `build-push`: lees GitHub Actions log. Bij falen van `deploy` op de server:
```powershell
docker logs lexica-api --tail 200
docker logs lexica-db --tail 200
docker compose ps
```

- [ ] **Step 4: Test lokaal op de server**

```powershell
Invoke-WebRequest "http://localhost:8080/" -UseBasicParsing | Select-Object StatusCode, Headers
```
Expected: HTTP 200 met Angular index.html.

- [ ] **Step 5: Test publiek via Cloudflare**

```powershell
Invoke-WebRequest "https://lexica.jnssns.com/" -UseBasicParsing | Select-Object StatusCode, Headers
```
Expected: HTTP 200; response headers bevatten `cf-ray` (van Cloudflare).

- [ ] **Step 6: Test een API endpoint (auth controller geeft 400 op leeg lichaam)**

```powershell
Invoke-WebRequest "https://lexica.jnssns.com/api/auth/login" `
    -Method Post -ContentType "application/json" `
    -Body '{"email":"x","password":"y"}' `
    -UseBasicParsing -SkipHttpErrorCheck `
    | Select-Object StatusCode
```
Expected: HTTP 400 of 401 (geen 502/504 — dat betekent dat de tunnel niet bij de container raakt).

- [ ] **Step 7: Verifieer dat migraties hebben gedraaid**

```powershell
$dbPwd = (Select-String -Path C:\apps\lexica\.env -Pattern "^DB_PASSWORD=").Line.Split("=",2)[1]
$env:PGPASSWORD = $dbPwd
docker exec -e PGPASSWORD=$dbPwd lexica-db psql -U lexica -d lexica -c "\dt"
Remove-Item Env:\PGPASSWORD
```
Expected: tabellen `__EFMigrationsHistory`, `AspNetUsers`, `ReviewLogs`, `Sets`, `Words`, etc. (lowercase namen in Postgres)

- [ ] **Step 8: Sluit af met statusrapport aan de gebruiker**

Rapporteer:
- ✅ Containers draaien: output `docker compose ps`
- ✅ Publiek bereikbaar op `https://lexica.jnssns.com`
- ✅ Database connected: aantal tabellen
- ✅ Volgende deploy gebeurt automatisch bij elke push naar `main`
- Eventuele waarschuwingen of restpunten

---

## Open vraagstukken voor later

Geen blocker voor deze setup, wel om over na te denken:

- **Backups:** Postgres backups zijn nog niet automatisch. Voorstel: dagelijkse Task Scheduler taak die `docker exec lexica-db pg_dump ...` naar een gemount folder schrijft en die nadien naar een externe locatie kopieert.
- **Monitoring & alerting:** geen alert bij container-crash. Suggesties: Uptime Kuma in een derde container, of Cloudflare Healthchecks (gratis).
- **Resource limits:** `docker-compose.yml` heeft nog geen `mem_limit` / `cpus`. Tip: voeg toe als de server ook andere workloads draait.
- **HTTPS achter Cloudflare Tunnel:** `Program.cs` heeft `app.UseHttpsRedirection()` voor non-Development environments. Compose draait nu in `Development` om redirect-loops te vermijden. Voor echte productie: code-aanpassing — `ForwardedHeaders`-middleware activeren en daarna `Production` env zetten.
- **Image cleanup:** workflow houdt laatste 5 images aan. Dangling layers worden niet automatisch geprund — `docker system prune -a -f --filter "until=720h"` als wekelijkse Task Scheduler taak helpt.
- **Secret rotation:** zie runbook. Zet kalender-reminders voor GHCR PAT (12 mnd) en runner-token. Postgres-wachtwoord roteren: stop API, `ALTER USER lexica WITH PASSWORD '...';` in psql, update `.env`, `docker compose up -d`.
