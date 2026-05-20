# Stop de lokale ontwikkel-DB.
#
# Frontend- en backend-vensters sluit je zelf (Ctrl+C in elk venster).
# Met -Reset wist dit script ook het volume (alle DB-data weg).

[CmdletBinding()]
param(
    [switch]$Reset
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $root 'docker-compose.dev.yml'

if ($Reset) {
    Write-Host "[Lexica] DB-container stoppen EN volume wissen..." -ForegroundColor Yellow
    docker compose -f $compose down -v
    Write-Host "[Lexica] Volume gewist. Volgende start = lege DB met verse migraties." -ForegroundColor Green
} else {
    Write-Host "[Lexica] DB-container stoppen (data blijft bewaard)..." -ForegroundColor Cyan
    docker compose -f $compose down
    Write-Host "[Lexica] Gestopt. Data blijft bewaard in volume 'lexica-pgdata-dev'." -ForegroundColor Green
}
