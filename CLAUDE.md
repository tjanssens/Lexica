# Lexica - Development Notes

## Opstarten

### Backend (API)
```bash
cd src/Lexica.Api
dotnet run --launch-profile https
```
- HTTPS: https://localhost:7105
- HTTP: http://localhost:5066

### Frontend (Angular)
```bash
cd src/lexica-frontend
npm start
```
- URL: http://localhost:4303
- Frontend verwacht de API op http://localhost:5066

## LAN-modus (testen op smartphone)

Hiermee kun je de app openen op een telefoon die op hetzelfde WiFi-netwerk zit.

### Starten
```bash
# Terminal 1 — Backend
cd src/Lexica.Api
dotnet run --launch-profile lan

# Terminal 2 — Frontend
cd src/lexica-frontend
npm run start:lan
```

### Openen
- PC: http://localhost:4303
- Telefoon (zelfde WiFi): http://192.168.1.9:4303

### Hoe het werkt
- `environment.lan.ts` zet `apiUrl` op `/api` (relatief pad)
- Angular dev server proxyt `/api/*` requests naar `localhost:5066` via `proxy.conf.lan.json`
- De telefoon bereikt alleen poort 4303 — poort 5066 hoeft niet open te staan in de firewall
- Het `lan` launch profile luistert op `0.0.0.0:5066` (bereikbaar voor de proxy)
- Angular serveert op `0.0.0.0` via `--host 0.0.0.0`
- HTTPS-redirect is uitgeschakeld in Development (geen cert-problemen op mobiel)

## Architectuur

### API-URL configuratie
De API-URL staat gecentraliseerd in `src/lexica-frontend/src/environments/environment.ts`. Alle services importeren `environment.apiUrl` in plaats van een hardcoded URL.
