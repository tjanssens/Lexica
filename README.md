# Lexica

Webapp voor het studeren van vreemde-taalwoorden (Latijn, Grieks) met SM-2 spaced repetition.

## Stack

- **Backend:** .NET 10 (Clean Architecture: Api / Core / Infrastructure / Shared) + EF Core 10 + PostgreSQL (Npgsql) + JWT-auth + Google Sign-In
- **Frontend:** Angular 17 (standalone components, lazy-loaded routes)
- **Tests:** xUnit + EF Core InMemory (`tests/Lexica.Core.Tests`)

## Opstarten

### Backend
```bash
cd src/Lexica.Api
dotnet run --launch-profile https
```
HTTPS op `https://localhost:7105`, HTTP op `http://localhost:5066`. Migraties worden automatisch toegepast in Development.

### Frontend
```bash
cd src/lexica-frontend
npm start
```
Draait op `http://localhost:4303`, proxy'd naar de backend op `http://localhost:5066`.

### LAN-modus (testen op smartphone)

Zie `CLAUDE.md` voor de exacte stappen.

## Lokaal debuggen (Visual Studio + Chrome DevTools)

De aanbevolen flow voor lokaal werken én debuggen:

```powershell
# 1) Start DB en frontend (één commando, opent frontend in nieuw venster)
.\scripts\start-dev.ps1

# 2) Start de backend met F5 in Visual Studio — startup project: Lexica.Api
#    → breakpoints in .cs-bestanden werken meteen.

# 3) Frontend-debuggen: open http://localhost:4303 in Chrome, druk F12.
#    Sources-tab → webpack:// → src → app → zet breakpoints in .ts.
#    Angular's sourcemaps maken stepping en variabele-inspectie volledig werkbaar.
```

Stoppen aan het einde van je werksessie:

```powershell
.\scripts\stop-dev.ps1            # stop DB, data blijft bewaard
.\scripts\stop-dev.ps1 -Reset     # stop DB én wis alle data (verse start)
```

### Database-strategie

Lokaal draait Postgres in Docker (via `docker-compose.dev.yml`):

- **Host:** `localhost:5432`
- **Database:** `lexica`
- **User / password:** `postgres` / `postgres` (matched `appsettings.json`)
- **Persistent volume:** `lexica-pgdata-dev` — overleeft container-herstart
- **Verse DB:** `EF Core` past migraties automatisch toe in Development bij eerste start van de API

Werk je liever zonder Docker? Installeer Postgres rechtstreeks op Windows met dezelfde credentials/poort, of pas `appsettings.json` (of beter: een eigen `appsettings.Development.json`) aan.

### Veelvoorkomende debug-scenario's

| Wat | Hoe |
|---|---|
| Breakpoints in C# (controllers/services) | Visual Studio F5 op `Lexica.Api` |
| Breakpoints in TypeScript | Chrome DevTools → Sources → `webpack://` |
| API-requests volgen | Chrome DevTools → Network-tab → klik op request → Preview/Response |
| DB-inhoud bekijken | Pgadmin, DBeaver of `psql -h localhost -U postgres -d lexica` (password `postgres`) |
| EF-migratie toevoegen | `dotnet ef migrations add Naam --project src/Lexica.Infrastructure --startup-project src/Lexica.Api` |
| Frontend full-reload na proxy-config-wijziging | Stop `npm start` en herstart — proxy.conf wordt alleen bij startup geladen |

## Build & test

```bash
dotnet build Lexica.sln
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
cd src/lexica-frontend && npm run build
```

## Belangrijke features

- Woorden beheren per taal (Latijn / Grieks) met `Number` voor sortering
- **Sets:** groepeer woorden per les, deel publiek, abonneer op andermans sets
- **Eigen kopie van gedeelde set:** fork een gedeelde set tot je eigen onafhankelijke versie (incl. SM-2 progress); splits, voeg samen of verplaats woorden tussen je eigen sets
- Studiesessies met SM-2-algoritme (Snel/Intensief mode)
- Statistieken (XP, level, streak, week/maand-overzicht)
- Excel-import voor bulk-toevoegen van woorden
- PWA-installeerbaar (icon + manifest aanwezig)

## Architectuur kort

Zie `CLAUDE.md` voor controllers, entiteiten, services en frontend-conventies.
