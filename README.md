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
