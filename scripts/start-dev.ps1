# Start lokale ontwikkelomgeving voor Lexica.
#
# Wat dit script doet:
#   1. Start de Postgres-container (docker-compose.dev.yml)
#   2. Wacht tot de DB healthy is
#   3. Opent de frontend in een nieuw PowerShell-venster (npm start)
#
# De backend (Lexica.Api) start je zelf met F5 in Visual Studio — dan werken
# breakpoints. Wil je de backend tóch via dotnet starten zonder debugger,
# geef dan -IncludeBackend mee.

[CmdletBinding()]
param(
    [switch]$IncludeBackend
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "[Lexica] Postgres-container starten..." -ForegroundColor Cyan
docker compose -f (Join-Path $root 'docker-compose.dev.yml') up -d

Write-Host "[Lexica] Wachten tot DB healthy is..." -ForegroundColor Cyan
$maxAttempts = 30
for ($i = 1; $i -le $maxAttempts; $i++) {
    $status = docker inspect --format '{{.State.Health.Status}}' lexica-db-dev 2>$null
    if ($status -eq 'healthy') {
        Write-Host "[Lexica] DB is klaar." -ForegroundColor Green
        break
    }
    if ($i -eq $maxAttempts) {
        Write-Warning "DB werd niet healthy binnen $maxAttempts pogingen. Controleer 'docker logs lexica-db-dev'."
        exit 1
    }
    Start-Sleep -Seconds 2
}

$frontendDir = Join-Path $root 'src\lexica-frontend'
Write-Host "[Lexica] Frontend (Angular) starten in nieuw venster..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$frontendDir'; Write-Host '=== Lexica frontend ===' -ForegroundColor Magenta; npm start"
)

if ($IncludeBackend) {
    $apiDir = Join-Path $root 'src\Lexica.Api'
    Write-Host "[Lexica] Backend (API) starten in nieuw venster (zonder debugger)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$apiDir'; Write-Host '=== Lexica API ===' -ForegroundColor Magenta; dotnet run --launch-profile https"
    )
} else {
    Write-Host ""
    Write-Host "[Lexica] Start nu de backend met F5 in Visual Studio (project: Lexica.Api)" -ForegroundColor Yellow
    Write-Host "         Of voeg -IncludeBackend toe aan dit script om hem zonder debugger te starten." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[Lexica] Klaar." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:4303"
Write-Host "  Backend:  http://localhost:5066 (HTTP)  /  https://localhost:7105 (HTTPS)"
Write-Host "  DB:       localhost:5432  (user: postgres  /  password: postgres  /  db: lexica)"
Write-Host ""
Write-Host "Stoppen: scripts\stop-dev.ps1" -ForegroundColor DarkGray
