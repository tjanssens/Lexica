# Zorgt dat de Lexica dev-dependencies draaien voordat de API start.
# Wordt automatisch aangeroepen door Lexica.Api.csproj bij een F5/Build vanuit Visual Studio.
#
# Idempotent:
#   - Postgres-container al up?  -> niets doen
#   - Frontend op poort 4303 al actief?  -> niets doen
#
# Uitschakelen voor 1 sessie: $env:LEXICA_SKIP_DEV_DEPS = "true"

$ErrorActionPreference = 'Continue'

$repoRoot = Split-Path -Parent $PSScriptRoot

# Docker bin in PATH duwen (voor verse VS-sessies waar PATH nog niet up-to-date is)
$dockerBin = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'
if ((Test-Path $dockerBin) -and ($env:PATH -notlike "*$dockerBin*")) {
    $env:PATH = "$dockerBin;$env:PATH"
}

function Test-DockerAvailable {
    try {
        $null = & docker version --format '{{.Server.Version}}' 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

# 1. Postgres
if (-not (Test-DockerAvailable)) {
    Write-Host "[dev-deps] Docker engine niet bereikbaar - sla Postgres-stap over." -ForegroundColor Yellow
} else {
    $dbRunning = & docker ps --filter "name=lexica-db-dev" --filter "status=running" --format "{{.Names}}" 2>$null
    if ([string]::IsNullOrWhiteSpace($dbRunning)) {
        Write-Host "[dev-deps] Postgres-container start..." -ForegroundColor Cyan
        $compose = Join-Path $repoRoot 'docker-compose.dev.yml'
        & docker compose -f $compose up -d | Out-Null

        # Kort wachten op healthy (max 30s) zodat EF Migrate() bij API-startup niet faalt
        for ($i = 1; $i -le 15; $i++) {
            $status = & docker inspect --format '{{.State.Health.Status}}' lexica-db-dev 2>$null
            if ($status -eq 'healthy') {
                Write-Host "[dev-deps] Postgres healthy." -ForegroundColor Green
                break
            }
            Start-Sleep -Seconds 2
        }
    }
}

# 2. Frontend op poort 4303
$frontendUp = $false
try {
    $conn = Get-NetTCPConnection -LocalPort 4303 -State Listen -ErrorAction Stop
    if ($conn) { $frontendUp = $true }
} catch {
    $frontendUp = $false
}

if (-not $frontendUp) {
    Write-Host "[dev-deps] Frontend start in apart venster (poort 4303)..." -ForegroundColor Cyan
    $frontendDir = Join-Path $repoRoot 'src\lexica-frontend'
    Start-Process -FilePath 'powershell' -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location '$frontendDir'; Write-Host '=== Lexica frontend ===' -ForegroundColor Magenta; npm start"
    ) | Out-Null
}

exit 0
