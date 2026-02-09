# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Build
```bash
dotnet build Lexica.sln
cd src/lexica-frontend && npm run build
```

### EF Core Migrations
```bash
dotnet ef migrations add MigrationName --project src/Lexica.Infrastructure --startup-project src/Lexica.Api
dotnet ef database update --project src/Lexica.Infrastructure --startup-project src/Lexica.Api
```
Database is SQL Server LocalDB (`LexicaDb`). Migrations worden automatisch toegepast in Development (`app.MigrateDatabase()` in Program.cs).

## LAN-modus (testen op smartphone)

Hiermee kun je de app openen op een telefoon die op hetzelfde WiFi-netwerk zit.

```bash
# Terminal 1 — Backend
cd src/Lexica.Api
dotnet run --launch-profile lan

# Terminal 2 — Frontend
cd src/lexica-frontend
npm run start:lan
```

- PC: http://localhost:4303
- Telefoon (zelfde WiFi): http://192.168.1.9:4303
- `environment.lan.ts` zet `apiUrl` op `/api` (relatief pad), Angular proxyt via `proxy.conf.lan.json` naar `localhost:5066`
- HTTPS-redirect is uitgeschakeld in Development

## Architectuur

### Backend — Clean Architecture (.NET 9.0)

```
Lexica.Api            → Controllers, Program.cs (DI, auth, CORS, migrations)
Lexica.Core           → Entities, Enums, Services (domeinlogica)
Lexica.Infrastructure → AppDbContext, EF Migrations, Excel import/export
Lexica.Shared         → DTOs (gedeeld tussen lagen)
```

**Controllers** (`src/Lexica.Api/Controllers/`):
- `AuthController` — Registratie, login, Google Sign-In (JWT tokens)
- `WordsController` — CRUD voor woorden
- `GroupsController` — CRUD voor groepen, woorden toevoegen/verwijderen
- `SessionsController` — Studiesessies met SM-2 spaced repetition
- `StatsController` — Statistieken, weekoverzicht, achievements
- `ImportController` — Excel import met preview en bevestiging

**Domeinmodel** (`src/Lexica.Core/Entities/`):
- `ApplicationUser` (extends IdentityUser\<Guid>) — XP, Level, Streak, SessionSize
- `Word` — Woord met SM-2 velden (Easiness, Interval, Repetitions, DueDate)
- `Group` — Woordgroep met taal en standaard richting
- `GroupWord` — Many-to-many koppeltabel
- `ReviewLog`, `Achievement`

**Enums** (`src/Lexica.Core/Enums/`): `Language` (Greek, Latin), `Direction` (NlToTarget, TargetToNl), `ReviewResult` (Unknown, Known, Easy)

**Authenticatie**: JWT Bearer tokens + Google Sign-In. Token wordt 7 dagen bewaard. Config in `appsettings.json`.

### Frontend — Angular 17 (Standalone Components)

```
src/lexica-frontend/src/app/
├── core/          → auth.service, api.service, auth.guard, auth.interceptor
├── features/      → auth/, words/, groups/, session/, home/, import/
├── shared/        → word-item, group-item (herbruikbare componenten)
└── app.routes.ts  → Lazy-loaded routes met authGuard
```

**Kernservices** (`src/lexica-frontend/src/app/core/services/`):
- `api.service.ts` — Gecentraliseerde HTTP-service voor alle API-calls
- `auth.service.ts` — Auth state management, token opslag in localStorage

**API-URL configuratie**: Gecentraliseerd in `src/lexica-frontend/src/environments/environment.ts`. Alle services importeren `environment.apiUrl`.

**Routes** (`app.routes.ts`): Publiek: `/login`, `/register`. Beschermd (authGuard): `/`, `/words`, `/groups`, `/session`, `/import`. Alle feature-componenten zijn lazy-loaded.

### Belangrijk patroon
- Alle API-calls gaan via `ApiService` — voeg nieuwe endpoints daar toe, niet in individuele componenten
- `AuthInterceptor` voegt automatisch de JWT Bearer token toe aan alle requests
- Elke controller gebruikt `User.FindFirst(ClaimTypes.NameIdentifier)` voor de huidige gebruiker
- SM-2 algoritme zit in `Sm2Service` (`src/Lexica.Core/Services/Sm2Service.cs`)
- Excel import/export via ClosedXML in `src/Lexica.Infrastructure/Services/`
