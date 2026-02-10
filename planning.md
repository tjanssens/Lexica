# Projectplanning: Lexica — Latijn/Grieks Vocabulaire App

> Gebaseerd op: `vocab-app-analyse_1.md`

---

## Fasering

Het project is opgedeeld in **6 fasen**, van fundament tot polish. Elke fase levert een werkend geheel op dat kan worden getest.

---

## Fase 1: Project Setup & Fundament

**Doel:** Werkende project-scaffolding met database, authenticatie en CI/CD-basis.

| # | Taak | Technologie | Omschrijving |
|---|------|-------------|--------------|
| 1.1 | Backend project opzetten | .NET 8 Web API | Solution structuur aanmaken: `VocabApp.Api`, `VocabApp.Core`, `VocabApp.Infrastructure`, `VocabApp.Shared` |
| 1.2 | Database opzetten | EF Core + PostgreSQL | Database provider configureren, connection string, migratie-pipeline |
| 1.3 | Datamodel implementeren | EF Core Entities | Entities aanmaken: `User`, `Word`, `Group`, `GroupWord`, `ReviewLog`, `Achievement` |
| 1.4 | Migraties genereren | EF Core Migrations | Eerste migratie met alle tabellen, indexen (uniek: user+language+number), relaties |
| 1.5 | Authenticatie opzetten | ASP.NET Identity / JWT | Registratie, login, JWT-tokens, auth middleware |
| 1.6 | Frontend project opzetten | Angular 17+ (standalone) | `ng new` met standalone components, routing, basis-layout |
| 1.7 | API communicatie basis | Angular HttpClient | `api.service.ts`, `auth.service.ts`, HTTP interceptor voor JWT |
| 1.8 | Login/registratie schermen | Angular | Login en registratie formulieren, token-opslag, auth guard |

**Deliverable:** Gebruiker kan registreren, inloggen en een lege homepage zien. Backend draait met database.

---

## Fase 2: Woordenbeheer (CRUD & Import)

**Doel:** Woorden kunnen toevoegen, bewerken, verwijderen en importeren via Excel.

| # | Taak | Technologie | Omschrijving |
|---|------|-------------|--------------|
| 2.1 | Words API endpoints | .NET 8 | `GET /api/words`, `POST`, `PUT/{id}`, `DELETE/{id}` met filtering op taal |
| 2.2 | Validatie-logica woorden | .NET 8 | Uniek nummer per user+taal, verplichte velden, SM-2 defaults (EF=2.5, interval=0, reps=0) |
| 2.3 | Excel import service | EPPlus / ClosedXML | `ExcelImportService`: parsing, validatie, preview-data genereren, duplicaat-detectie |
| 2.4 | Import API endpoint | .NET 8 | `POST /api/words/import` — upload, validatie, preview-response, confirm-import |
| 2.5 | Woordenlijst scherm | Angular | Overzicht met filters (taal), zoeken, sorteren op nummer. Paginatie of virtual scroll |
| 2.6 | Woord detail/bewerk scherm | Angular | Alle velden bewerken, groepslidmaatschap tonen |
| 2.7 | Woord toevoegen scherm | Angular | Formulier met validatie, optioneel direct aan groep toevoegen |
| 2.8 | Import scherm | Angular | Excel upload, preview-tabel, foutweergave, bevestigingsflow |

**Deliverable:** Gebruiker kan woorden handmatig toevoegen/bewerken en via Excel importeren.

---

## Fase 3: Groepenbeheer

**Doel:** Groepen aanmaken en woorden organiseren in groepen.

| # | Taak | Technologie | Omschrijving |
|---|------|-------------|--------------|
| 3.1 | Groups API endpoints | .NET 8 | `GET /api/groups`, `POST`, `PUT/{id}`, `DELETE/{id}` |
| 3.2 | Groep-woord koppeling API | .NET 8 | `POST /api/groups/{id}/words` (lijst word_ids of nummerreeks), `DELETE /api/groups/{id}/words` |
| 3.3 | Nummerreeks-logica | .NET 8 | Van-tot range parsen, woorden ophalen en koppelen |
| 3.4 | Groepen overzicht scherm | Angular | Lijst van groepen met taal-icoon en woordaantal |
| 3.5 | Groep detail scherm | Angular | Woorden in groep tonen, toevoegen/verwijderen, nummerreeks-invoer |
| 3.6 | Groep aanmaken scherm | Angular | Naam, taal, default richting, optioneel nummerreeks |
| 3.7 | Woord-groep integratie | Angular | Vanuit woord-detail: "toevoegen aan groep" / "verwijderen uit groep" |

**Deliverable:** Gebruiker kan groepen aanmaken, woorden organiseren via selectie of nummerreeks.

---

## Fase 4: Studiesessie & SM-2 Algoritme

**Doel:** De kernfunctionaliteit — flashcard-sessies met spaced repetition.

| # | Taak | Technologie | Omschrijving |
|---|------|-------------|--------------|
| 4.1 | SM-2 service implementeren | .NET 8 | `Sm2Service.cs`: berekening van nieuw interval, easiness en due_date op basis van q-waarde (1, 4, 5) |
| 4.2 | SM-2 unit tests | xUnit | Uitgebreide tests voor alle scenario's: nieuw woord, reset, progressie, minimum EF |
| 4.3 | Woordselectie-algoritme | .NET 8 | Prioriteitslogica: achterstallig → vandaag due → nieuw. Limiet op `session_size` |
| 4.4 | Session API endpoints | .NET 8 | `GET /api/sessions/next?groupIds=...&direction=...` en `POST /api/sessions/review` |
| 4.5 | ReviewLog opslaan | .NET 8 | Bij elke review: easiness_before, easiness_after, interval_after, result loggen |
| 4.6 | Sessie starten scherm | Angular | Groep(en) selecteren, richting toggle, sessiegrootte instelling |
| 4.7 | Flashcard component | Angular | Kaart met voorkant/achterkant, flip-animatie (CSS 3D transform), term/vertaling/woordsoort/notities |
| 4.8 | Swipe directive | Angular | Touch events: swipe links (niet gekend), rechts (gekend), omhoog (moeiteloos). Threshold 50px |
| 4.9 | Sessie-logica (frontend) | Angular | Stapelbeheer: niet-gekende woorden terug in stapel, sessie eindigt pas als alles gekend. SM-2 update alleen bij eerste beoordeling |
| 4.10 | Sessie voltooid scherm | Angular | Samenvatting: aantal gekend/niet-gekend/moeiteloos, nauwkeurigheid |

**Deliverable:** Volledige studiesessie met flashcards, swipe-gestures en spaced repetition.

---

## Fase 5: Gamification & Statistieken

**Doel:** Motivatie-systeem met XP, levels, streaks, achievements en statistieken.

| # | Taak | Technologie | Omschrijving |
|---|------|-------------|--------------|
| 5.1 | XP-systeem backend | .NET 8 | XP toekennen per review-actie en sessie-voltooiing (zie XP-tabel). Level-berekening |
| 5.2 | Streak-systeem backend | .NET 8 | Dagelijkse streak bijhouden, streak-freeze logica (1 per week, moet verdiend worden) |
| 5.3 | Achievements engine | .NET 8 | Achievement-checks na elke sessie: milestone-detectie (10/100/1000 woorden, streaks, perfecte sessies, tijdstip) |
| 5.4 | Mastery-berekening | .NET 8 | Per woord mastery-fase bepalen (Nieuw → Leerling → Bekend → Gemeesterd) op basis van reps, EF en interval |
| 5.5 | Stats API endpoint | .NET 8 | `GET /api/stats`: XP, level, streak, achievements, mastery per groep, weekoverzicht-data |
| 5.6 | Sessie voltooid: XP & streak | Angular | XP-animatie, level-up notificatie, streak-update op sessie-voltooid scherm |
| 5.7 | Home scherm | Angular | Streak-teller, dagelijkse voortgang, beschikbare sessies per groep, level/XP-balk |
| 5.8 | Statistieken scherm | Angular | Grafieken (woorden per week, nauwkeurigheid), achievements-grid, weekoverzicht |
| 5.9 | Mastery per groep | Angular | Voortgangsbalk per groep: Nieuw/Leerling/Bekend/Gemeesterd verdeling |
| 5.10 | Thema-integratie | Angular | Latijn (Romeins) vs. Grieks thema: termen, iconen, kleuren aanpassen per taal |

**Deliverable:** Volledig gamification-systeem met visuele feedback en statistieken.

---

## Fase 6: PWA, Polish & Deployment

**Doel:** App klaar voor dagelijks gebruik als PWA, met offline-support en deploy.

| # | Taak | Technologie | Omschrijving |
|---|------|-------------|--------------|
| 6.1 | PWA configuratie | Angular PWA | `ng add @angular/pwa`, service worker, manifest, icons |
| 6.2 | Offline-ondersteuning | Service Worker | Cache-strategie voor statische assets en API-responses. Offline sessie met lokale opslag |
| 6.3 | Instellingen scherm | Angular | Sessiegrootte, kaartanimatie aan/uit, woordsoort/notities tonen, swipe-hints |
| 6.4 | Export functionaliteit | .NET 8 + Angular | Volledige woordenlijst met SM-2 voortgang exporteren als Excel |
| 6.5 | Reset voortgang | .NET 8 + Angular | Per groep of volledig SM-2-data resetten |
| 6.6 | Responsive design & polish | CSS/SCSS | Mobiel-first design, touch-optimalisatie, animaties, loading states |
| 6.7 | Error handling & feedback | Angular | Globale error handler, toast-notificaties, formulier-validatiefeedback |
| 6.8 | Backend deployment | Docker / Azure / VPS | Dockerfile, docker-compose, database migratie bij startup |
| 6.9 | Frontend deployment | Nginx / Azure Static | Build-optimalisatie, CDN, HTTPS |
| 6.10 | End-to-end testen | Playwright / Cypress | Kritieke flows: import, sessie, review, groepenbeheer |

**Deliverable:** Productie-klare PWA die installeerbaar is op telefoon.

---

## Toekomstige Fase (Backlog)

Deze taken vallen buiten de initiële scope maar zijn gedocumenteerd voor later:

| # | Taak | Omschrijving |
|---|------|--------------|
| B.1 | Capacitor-integratie | Native app-wrapper voor App Store / Play Store distributie |
| B.2 | Audio-uitspraak | TTS of opnames voor Latijnse/Griekse termen |
| B.3 | Voorbeeldzinnen | Zinnen uit klassieke teksten koppelen aan woorden |
| B.4 | Sociale features | Vergelijking met vrienden, leaderboards |
| B.5 | Homescreen widget | Woord van de dag widget |
| B.6 | Cloud sync | Synchronisatie tussen meerdere apparaten |

---

## Afhankelijkheden tussen fasen

```
Fase 1 (Setup)
  └──▶ Fase 2 (Woorden CRUD)
        └──▶ Fase 3 (Groepen)
              └──▶ Fase 4 (Sessie & SM-2)  ◀── kernfunctionaliteit
                    └──▶ Fase 5 (Gamification)
                          └──▶ Fase 6 (PWA & Deploy)
```

Fasen zijn sequentieel: elke fase bouwt voort op de vorige. Binnen een fase kunnen backend- en frontend-taken parallel worden opgepakt als er met twee ontwikkelaars wordt gewerkt.

---

## Technische Keuzes Samenvatting

| Aspect | Keuze | Reden |
|--------|-------|-------|
| Backend | .NET 8 Web API | Zoals gespecificeerd in analyse |
| Frontend | Angular 17+ (standalone) | Zoals gespecificeerd in analyse |
| Database | PostgreSQL + EF Core | Open source, goed ondersteund door EF Core |
| Excel import | ClosedXML | Gratis, geen licentiekosten (vs. EPPlus v5+) |
| Authenticatie | JWT Bearer tokens | Standaard voor SPA + API architectuur |
| Deployment fase 1 | PWA | Snelste weg naar mobiel gebruik |
| Testen | xUnit (backend) + Jasmine/Karma (frontend) | Angular en .NET standaard tooling |
