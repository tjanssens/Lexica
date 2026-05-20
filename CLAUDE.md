# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Opstarten

### Snelste manier (lokaal dev)
```powershell
.\scripts\start-dev.ps1
```
Start Postgres in Docker en de frontend in een nieuw venster. Backend daarna in Visual Studio met F5 (project: `Lexica.Api`). Zie README.md voor details. Stoppen: `scripts\stop-dev.ps1` (of `-Reset` om de DB ook te wissen).

### Backend (API) handmatig
```bash
cd src/Lexica.Api
dotnet run --launch-profile https
```
- HTTPS: https://localhost:7105
- HTTP: http://localhost:5066

### Frontend (Angular) handmatig
```bash
cd src/lexica-frontend
npm start
```
- URL: http://localhost:4303
- Frontend verwacht de API op http://localhost:5066

### Lokale Postgres (Docker)
```bash
docker compose -f docker-compose.dev.yml up -d
```
Postgres op `localhost:5432`, user/password `postgres/postgres`, db `lexica`. Migraties worden bij API-startup automatisch toegepast.

### Build
```bash
dotnet build Lexica.sln
cd src/lexica-frontend && npm run build
```

### Tests
```bash
dotnet test tests/Lexica.Core.Tests/Lexica.Core.Tests.csproj
```
Tests draaien tegen EF Core InMemory; geen externe database nodig.

### EF Core Migrations
```bash
dotnet ef migrations add MigrationName --project src/Lexica.Infrastructure --startup-project src/Lexica.Api
dotnet ef database update --project src/Lexica.Infrastructure --startup-project src/Lexica.Api
```
Database is PostgreSQL (Npgsql). Connection string staat in `appsettings.json` onder `ConnectionStrings:DefaultConnection`. Migraties worden automatisch toegepast in Development via `db.Database.Migrate()` in `Program.cs`.

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

### Backend — Clean Architecture (.NET 10)

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
- `SetsController` — CRUD voor sets, public set discovery, subscriptions, en **fork/split/merge/move-words** (delegeert naar `SetForkService`)

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

**Routes** (`app.routes.ts`): Publiek: `/login`, `/register`, `/privacy`. Beschermd (authGuard): `/`, `/words`, `/groups`, `/session`, `/import`, `/profile`, `/sets`. Alle feature-componenten zijn lazy-loaded.

### Belangrijk patroon
- Alle API-calls gaan via `ApiService` — voeg nieuwe endpoints daar toe, niet in individuele componenten
- `AuthInterceptor` voegt automatisch de JWT Bearer token toe aan alle requests
- Elke controller gebruikt `User.FindFirst(ClaimTypes.NameIdentifier)` voor de huidige gebruiker
- SM-2 algoritme zit in `Sm2Service` (`src/Lexica.Core/Services/Sm2Service.cs`)
- Fork/split/merge/move-words logica voor sets zit in `SetForkService` (`src/Lexica.Infrastructure/Services/SetForkService.cs`)
- Excel import/export via ClosedXML in `src/Lexica.Infrastructure/Services/`

## Juridische pagina's — Privacy & Gebruiksvoorwaarden

Lexica heeft twee publiek bereikbare juridische pagina's, beide in `src/lexica-frontend/src/app/features/legal/`:

- **Privacyverklaring** — `privacy.component.ts`, route `/privacy`
- **Gebruiksvoorwaarden / Terms of Service** — `terms.component.ts`, route `/terms`

Verwerkingsverantwoordelijke en aanbieder van de dienst: **Mil Janssens** (Groeneweg 29, 2920 Kalmthout). Toepasselijk recht: Belgisch. Bevoegde rechtbank: arrondissement Antwerpen, afdeling Antwerpen.

### BELANGRIJK voor Claude — proactieve melding verplicht

Bij **elke** ontwikkeling die mogelijk de privacyverklaring of de gebruiksvoorwaarden beïnvloedt, **MOET** je dit expliciet melden aan de gebruiker **vóór** de wijziging wordt gecommit, en de betrokken juridische pagina('s) bijwerken.

**Wijzigingen die de privacyverklaring raken:**

- Nieuwe persoonsgegevens verzamelen of opslaan (nieuwe velden op entities, nieuwe upload-mogelijkheden, ...)
- Nieuwe externe diensten/verwerkers toevoegen (Sentry, analytics, e-mailprovider, externe API's, CDN's, ...)
- Cookies of localStorage-gebruik veranderen
- Authenticatie- of identiteitsproviders toevoegen of verwijderen
- Nieuwe manieren waarop gegevens met andere gebruikers gedeeld worden (zoals publieke sets)
- Wijzigingen in bewaartermijnen, back-up-strategie of hostinglocatie
- Geautomatiseerde besluitvorming of profilering toevoegen
- Wijzigingen aan de doelgroep (bv. uitbreiding naar < 13 jarigen)

**Wijzigingen die de gebruiksvoorwaarden raken:**

- Nieuwe functionaliteit die het karakter van de dienst verandert (bv. AI-suggesties, integratie met externe leersystemen, deel-functies naar sociale media)
- Wijzigingen aan het gratis karakter (introductie premium, advertenties, in-app aankopen, donaties met tegenprestatie)
- Veranderingen in hoe gebruikers content delen of de licentie op publieke content (artikel 7 van de ToS)
- Nieuwe verboden of toegestane gebruiken (artikel 5)
- Wijzigingen aan account-regels of leeftijdsgrens (artikel 4)
- Wijzigingen aan beëindigings- of schorsingsbeleid (artikel 11)
- Aanpassingen aan aansprakelijkheidsbeperking (artikel 10)
- Wijziging van aanbieder (Mil Janssens → andere natuurlijke persoon of rechtspersoon)
- Verandering van hostingland of toepasselijk recht (artikel 9 en 14)
- Nieuwe IP-claims door Lexica op gebruikersinhoud (artikel 6 en 8)

**Werkwijze als zo'n wijziging gemaakt wordt:**

1. Wijs de gebruiker **proactief** op de juridische impact voordat de wijziging gecommit wordt — vermeld concreet welke artikels/secties geraakt worden.
2. Pas `privacy.component.ts` en/of `terms.component.ts` aan.
3. Verhoog de versie en update de "Laatste update"-datum onderaan de betreffende pagina(s).
4. Bij ingrijpende wijzigingen aan de ToS: wijs de gebruiker erop dat bestaande gebruikers volgens artikel 13 minstens 30 dagen vooraf op de hoogte gebracht moeten worden.
5. Vermeld de juridische update expliciet in het commit-bericht.
