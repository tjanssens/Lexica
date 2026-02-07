# Functionele Analyse: Latijn/Grieks Vocabulaire App

## 1. Overzicht

Een mobiele flashcard-applicatie gebaseerd op het SM-2 spaced repetition algoritme voor het leren van Latijn en Grieks vocabulaire. De app richt zich op eenvoud: toon-en-flip interactie met swipe-gestures.

**Technologie stack:**
- Frontend: Angular 17+
- Backend: .NET 8 Web API
- Database: SQL Server of PostgreSQL

---

## 2. Kernfunctionaliteiten

### 2.1 Woorden en Groepen

#### Woorden als centrale entiteit

Woorden vormen de kern van de applicatie. Elk woord krijgt een **nummer** toegewezen door de gebruiker. Dit nummer is uniek binnen een taal en dient als referentie.

| Eigenschap | Type | Beschrijving |
|------------|------|--------------|
| `number` | integer | Gebruikersnummer, uniek per taal (bijv. 1, 2, 3...) |
| `language` | enum | "latin" of "greek" |
| `term` | string | Term in de doeltaal |
| `translation` | string | Nederlandse vertaling |
| `part_of_speech` | string? | Woordsoort (nomen, verbum, etc.) |
| `notes` | string? | Extra context, ezelsbruggetje |

SM-2 voortgang wordt per woord bijgehouden, onafhankelijk van groepen.

#### Groepen als flexibele playlists

Een **groep** is een verzameling verwijzingen naar woorden — vergelijkbaar met een afspeellijst. Eén woord kan in meerdere groepen zitten.

| Eigenschap | Type | Beschrijving |
|------------|------|--------------|
| `name` | string | Naam van de groep |
| `language` | enum | "latin" of "greek" — bepaalt welke woorden toegevoegd kunnen worden |
| `default_direction` | enum | "nl_to_target" of "target_to_nl" |

**Typische groepen:**
- "Week 12" — woorden die deze week geleerd moeten worden
- "Dagelijkse herhaling" — alle woorden voor spaced repetition
- "Vergilius Boek 1" — thematische groep
- "Moeilijke woorden" — handmatig samengestelde selectie

**Richtingskeuze:**
- **NL → Latijn/Grieks**: Gebruiker ziet Nederlands, moet vertaling bedenken
- **Latijn/Grieks → NL**: Gebruiker ziet doeltaal, moet Nederlandse betekenis bedenken

De gebruiker kan bij het starten van een sessie de richting omdraaien, ongeacht de groepsinstelling.

#### Groepen aanmaken

**Methode 1: Handmatig woorden selecteren**
- Selecteer individuele woorden uit de woordenlijst
- Voeg toe aan bestaande of nieuwe groep

**Methode 2: Nummerreeks opgeven**
- Geef een range op: "van nummer X tot nummer Y"
- Alle woorden binnen die range worden toegevoegd
- Voorbeeld: "Voeg woorden 150-200 toe" → maakt groep met 51 woorden

**Methode 3: Bij import**
- Optioneel een groep specificeren bij Excel-import
- Nieuwe woorden worden automatisch aan die groep toegevoegd

---

### 2.2 Woorden Importeren (Excel)

**Verplichte velden:**

| Veld | Type | Beschrijving |
|------|------|--------------|
| `number` | integer | Gebruikersnummer, uniek per taal |
| `term` | string | Term in de doeltaal (Latijn/Grieks) |
| `translation` | string | Nederlandse vertaling |
| `language` | enum | "latin" of "greek" |

**Optionele velden voor gedeeltelijk geleerde woorden:**

| Veld | Type | Default | Beschrijving |
|------|------|---------|--------------|
| `easiness` | float | 2.5 | SM-2 easiness factor (min 1.3) |
| `interval` | integer | 0 | Huidige interval in dagen |
| `repetitions` | integer | 0 | Aantal opeenvolgende correcte antwoorden |
| `due_date` | date | importdatum | Volgende herzieningsdatum |

**Optionele metadata:**

| Veld | Type | Beschrijving |
|------|------|--------------|
| `notes` | string | Extra context, ezelsbruggetje, voorbeeldzin |
| `part_of_speech` | string | Woordsoort (nomen, verbum, etc.) |
| `group` | string | Groepsnaam — woord wordt automatisch aan deze groep toegevoegd |

**Importlogica:**
- Validatie op verplichte velden
- Controle op uniek nummer per taal (foutmelding bij duplicaat)
- Preview voor import met mogelijkheid tot aanpassen
- Update-optie: bestaand woord (zelfde nummer) bijwerken of overslaan

### 2.3 Woorden Handmatig Beheren

**Woord toevoegen:**
- Nummer, term, vertaling invoeren
- Optioneel: woordsoort, notities
- Optioneel: direct aan groep(en) toevoegen

**Woord bewerken:**
- Alle velden aanpasbaar
- Nummer wijzigen (mits nieuw nummer niet bestaat)

**Groepslidmaatschap beheren:**
- Vanuit woord: "Voeg toe aan groep" / "Verwijder uit groep"
- Vanuit groep: selecteer meerdere woorden om toe te voegen/verwijderen
- Snelle selectie via nummerreeks (van-tot)

---

### 2.4 Studiesessie

**Sessie starten:**

Bij het starten van een sessie kiest de gebruiker:
1. Welke groep(en) — meerdere selecteerbaar
2. Richting: NL → doeltaal of doeltaal → NL (toggle)

**Woordselectie-algoritme:**

De dagelijkse selectie volgt deze prioriteit:
1. **Achterstallige woorden**: `due_date < vandaag`, gesorteerd op oudste eerst
2. **Vandaag te herhalen**: `due_date = vandaag`
3. **Nieuwe woorden**: `repetitions = 0`, tot het dagelijks maximum bereikt is

**Sessie-instelling:**

| Instelling | Type | Default | Bereik |
|------------|------|---------|--------|
| `session_size` | integer | 20 | 5-50 |

**Woordselectie bij start:**
1. Eerst achterstallige woorden (`due_date < vandaag`)
2. Dan woorden die vandaag aan de beurt zijn (`due_date = vandaag`)
3. Aanvullen met nieuwe woorden (`repetitions = 0`) tot `session_size` bereikt is

Als er meer achterstallige/due woorden zijn dan `session_size`, worden de oudste eerst getoond.

**Sessieflow:**

```
┌─────────────────────────────────────────────────────┐
│  Start sessie met 20 woorden                        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Toon woord → gebruiker antwoordt                   │
│                                                     │
│  • Gekend/Moeiteloos → woord is klaar voor sessie   │
│  • Niet gekend → woord gaat terug in de stapel      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Nog woorden in stapel?                             │
│                                                     │
│  • Ja → toon volgende woord                         │
│  • Nee → sessie voltooid                            │
└─────────────────────────────────────────────────────┘
```

**Belangrijk:** Een sessie eindigt pas als alle woorden minstens één keer als "gekend" of "moeiteloos" zijn gemarkeerd. Niet-gekende woorden blijven terugkomen tot ze gekend zijn.

**SM-2 update:** Gebeurt bij de *eerste* beoordeling van elk woord. Herhalingen binnen dezelfde sessie tellen niet mee voor SM-2 — die dienen alleen om het woord te leren tijdens de sessie.

---

### 2.5 Kaartinteractie

**Interactieflow:**

```
┌─────────────────────────────┐
│                             │
│         "huis"              │
│                             │
│     [tik om te draaien]     │
│                             │
└─────────────────────────────┘
            │
            ▼ (tik)
┌─────────────────────────────┐
│                             │
│         "domus"             │
│        (nomen, f.)          │
│                             │
│  ← swipe    tap    swipe →  │
│    rood    groen   groen    │
│         swipe ↑             │
│          goud               │
└─────────────────────────────┘
```

**Invoermethoden:**

| Actie | Gesture | Knop | SM-2 q-waarde |
|-------|---------|------|---------------|
| Niet gekend | Swipe links | 🔴 Rood | q = 1 |
| Gekend | Swipe rechts | ✅ Groen | q = 4 |
| Moeiteloos | Swipe omhoog | ⭐ Goud (optioneel zichtbaar) | q = 5 |

**SM-2 effecten:**

| Resultaat | Interval | Easiness | Repetitions |
|-----------|----------|----------|-------------|
| Niet gekend (q=1) | reset naar 1 | -0.20 (min 1.3) | reset naar 0 |
| Gekend (q=4) | ×EF (of 1/6) | +0.10 | +1 |
| Moeiteloos (q=5) | ×EF (of 1/6) | +0.15 | +1 |

---

### 2.6 Instellingen

| Categorie | Instelling | Beschrijving |
|-----------|------------|--------------|
| **Sessie** | Sessiegrootte | Aantal woorden per sessie (default 20) |
| **Weergave** | Kaart animatie | Flip-animatie aan/uit |
| | Toon woordsoort | Op achterkant van kaart |
| | Toon notities | Op achterkant van kaart |
| | Swipe hints | Visuele indicatie van swipe-richtingen |
| **Data** | Exporteren | Volledige woordenlijst met voortgang als Excel |
| | Reset voortgang | Per groep of volledig |

---

## 3. Gamification

De gamification is thematisch aangepast per taal:
- **Latijn** → Romeins thema
- **Grieks** → Grieks thema

Als de gebruiker beide talen gebruikt, worden statistieken gecombineerd maar worden thema's getoond op basis van de actieve sessie of de taal met de meeste activiteit.

### 3.1 Streak-systeem

**Daily Streak:**
- Teller van opeenvolgende dagen met minstens één voltooide sessie
- Visueel: 
  - Latijn: lauwerkrans met vlammen 🔥
  - Grieks: Olympische vlam 🏛️
- Streak-freeze: één gemiste dag per week toegestaan (moet verdiend worden)

**Mijlpalen:** 7, 30, 100, 365 dagen met bijbehorende badges

### 3.2 XP en Levels

**XP verdienen:**

| Actie | XP |
|-------|-----|
| Woord gekend | 10 |
| Woord moeiteloos | 15 |
| Woord gekend (was lastig, lage EF) | 15 |
| Woord niet gekend | 2 (voor de moeite) |
| Sessie voltooid | 50 bonus |
| Perfecte sessie (alles eerste keer gekend) | 25 bonus |

**Level-progressie:**

| Level | XP per level | Latijn (Romeins) | Grieks |
|-------|--------------|------------------|--------|
| 1-10 | 500 | Tiro (rekruut) | Μαθητής (leerling) |
| 11-20 | 1000 | Legionarius | Φοιτητής (student) |
| 21-30 | 2000 | Centurio | Σοφιστής (sofist) |
| 31-40 | 3500 | Tribunus | Φιλόσοφος (filosoof) |
| 41-50 | 5000 | Legatus | Σοφός (wijze) |
| 51+ | 7500 | Consul | Σωκράτης (Socrates) |

### 3.3 Mastery per Groep

Woorden doorlopen fasen op basis van hun SM-2 status:

| Fase | Criterium | Latijn | Grieks |
|------|-----------|--------|--------|
| Nieuw | repetitions = 0 | ⚪ Incognitus | ⚪ Ἄγνωστος |
| Leerling | repetitions 1-2 | 🟡 Discens | 🟡 Μανθάνων |
| Bekend | repetitions 3-5, EF > 2.0 | 🟢 Notus | 🟢 Γνωστός |
| Gemeesterd | repetitions > 5, EF > 2.3, interval > 21 | ⭐ Perfectus | ⭐ Τέλειος |

Per groep toon je een voortgangsbalk met deze verdeling.

### 3.4 Achievements (Badges)

| Badge | Voorwaarde | Latijn | Grieks |
|-------|------------|--------|--------|
| Eerste stappen | 10 woorden geleerd | Primus Passus | Πρῶτα Βήματα |
| 100 woorden | 100 woorden gemeesterd | Centurio Verborum | Ἑκατόνταρχος |
| 1000 woorden | 1000 woorden gemeesterd | Mille Verba | Χίλιοι Λόγοι |
| Perfectionist | 10 perfecte sessies | Perfectus | Ἀκριβής |
| Comeback | Streak hersteld na freeze | Redux | Ἐπάνοδος |
| Nachtbraker | Sessie na 23:00 | Noctua (uil) | Γλαύξ (uil) |
| Ochtendmens | Sessie voor 07:00 | Aurora | Ἠώς |
| 30 dagen | 30-daagse streak | Marcus Aurelius | Πλάτων (Plato) |
| 100 dagen | 100-daagse streak | Cicero | Ἀριστοτέλης (Aristoteles) |

### 3.5 Weekoverzicht

Elke zondag (of maandag) een samenvatting:
- Woorden gereviewed deze week
- Nieuwe woorden geleerd
- Nauwkeurigheid (% eerste keer gekend)
- Vergelijking met vorige week
- Voorspelling: "Over 30 dagen beheers je naar schatting X woorden"

Visueel thema past zich aan per taal:
- Latijn: perkament-stijl, Romeinse iconen
- Grieks: marmer-stijl, Griekse zuilen en iconen

---

## 4. Datamodel

```
User
├── id: guid
├── email: string
├── settings: UserSettings
├── stats: UserStats (xp, level, streak, streak_freeze_available)
└── achievements: Achievement[]

Word
├── id: guid
├── user_id: guid
├── number: integer (uniek per user + language)
├── language: "latin" | "greek"
├── term: string (Latijn/Grieks)
├── translation: string (Nederlands)
├── part_of_speech: string?
├── notes: string?
├── easiness: float (default 2.5)
├── interval: integer (default 0)
├── repetitions: integer (default 0)
├── due_date: date
├── last_reviewed: datetime?
├── times_reviewed: integer
└── created_at: datetime

Group
├── id: guid
├── user_id: guid
├── name: string
├── language: "latin" | "greek"
├── default_direction: "nl_to_target" | "target_to_nl"
└── created_at: datetime

GroupWord (many-to-many koppeltabel)
├── group_id: guid
├── word_id: guid
└── added_at: datetime

ReviewLog (voor analytics)
├── id: guid
├── word_id: guid
├── reviewed_at: datetime
├── direction: "nl_to_target" | "target_to_nl"
├── result: "unknown" | "known" | "easy"
├── easiness_before: float
├── easiness_after: float
└── interval_after: integer

Achievement
├── id: guid
├── user_id: guid
├── type: string
├── unlocked_at: datetime
```

**Belangrijke relaties:**
- Een **woord** kan in meerdere **groepen** zitten (many-to-many via GroupWord)
- SM-2 voortgang zit op het **woord**, niet op de groep-woord-relatie
- Nummer is uniek per gebruiker + taal combinatie

---

## 5. Schermen

1. **Home**: Dagelijkse voortgang, streak, beschikbare sessies per groep
2. **Sessie starten**: Groep(en) selecteren, richting kiezen
3. **Sessie**: Flashcard interface met swipe
4. **Sessie voltooid**: Samenvatting, XP verdiend, streak update
5. **Woordenlijst**: Alle woorden (gefilterd op taal), zoeken, sorteren op nummer
6. **Woord detail**: Bewerken, groepslidmaatschap beheren, statistieken
7. **Woord toevoegen**: Nieuw woord aanmaken
8. **Groepen overzicht**: Lijst van groepen met mastery-indicatie
9. **Groep detail**: Woorden in groep, statistieken, woorden toevoegen/verwijderen
10. **Groep aanmaken**: Naam, taal, optioneel nummerreeks opgeven
11. **Importeren**: Excel upload met preview
12. **Statistieken**: Grafieken, achievements, weekoverzicht
13. **Instellingen**: Alle configuratie-opties

---

## 6. Technische Architectuur

### 6.1 Backend (.NET 8)

```
src/
├── VocabApp.Api/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── GroupsController.cs
│   │   ├── WordsController.cs
│   │   ├── SessionsController.cs
│   │   ├── StatsController.cs
│   │   └── ImportController.cs
│   ├── Program.cs
│   └── appsettings.json
├── VocabApp.Core/
│   ├── Entities/
│   ├── Interfaces/
│   └── Services/
│       └── Sm2Service.cs
├── VocabApp.Infrastructure/
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── Repositories/
│   └── Services/
│       └── ExcelImportService.cs
└── VocabApp.Shared/
    └── DTOs/
```

**Key endpoints:**

| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| GET | /api/words | Alle woorden van user (filter op taal) |
| POST | /api/words | Nieuw woord aanmaken |
| PUT | /api/words/{id} | Woord bijwerken |
| DELETE | /api/words/{id} | Woord verwijderen |
| POST | /api/words/import | Excel importeren |
| GET | /api/groups | Alle groepen van user |
| POST | /api/groups | Nieuwe groep aanmaken |
| POST | /api/groups/{id}/words | Woorden toevoegen aan groep (lijst van word_ids of nummerreeks) |
| DELETE | /api/groups/{id}/words | Woorden verwijderen uit groep |
| GET | /api/sessions/next | Volgende sessie ophalen (voor geselecteerde groepen) |
| POST | /api/sessions/review | Review resultaat posten |
| GET | /api/stats | Gebruikersstatistieken |

### 6.2 Frontend (Angular 17+)

```
src/app/
├── core/
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   └── session.service.ts
│   ├── guards/
│   └── interceptors/
├── features/
│   ├── home/
│   ├── session/
│   │   ├── components/
│   │   │   └── flashcard/
│   │   │       └── flashcard.component.ts (swipe logic)
│   │   └── session.component.ts
│   ├── groups/
│   ├── import/
│   ├── stats/
│   └── settings/
├── shared/
│   ├── components/
│   └── directives/
│       └── swipe.directive.ts
└── app.component.ts
```

---

## 7. Deployment als Mobiele App

### 7.1 Fase 1: Progressive Web App (PWA)

**Wat:** Een website die zich gedraagt als native app via service workers.

**Voordelen:**
- Geen app store nodig
- Eén codebase voor web én mobiel
- Automatische updates
- Installeerbaar via "Add to Home Screen"
- Offline-ondersteuning
- Snelle time-to-market

**Nadelen:**
- Beperkte toegang tot native features (push notifications op iOS beperkt)
- Geen App Store/Play Store aanwezigheid
- iOS Safari heeft beperkingen

**Implementatie:**
```bash
ng add @angular/pwa
```

---

### 7.2 Fase 2: Migratie naar Capacitor

Wanneer App Store-distributie gewenst is of betere native features nodig zijn.

**Wat:** Wrapper die Angular app verpakt in native WebView met toegang tot native APIs.

**Voordelen:**
- Bestaande Angular-code blijft ongewijzigd
- Volledige App Store/Play Store distributie
- Toegang tot native features (push, haptics, etc.)
- Goede Angular-integratie

**Implementatie:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

**Benodigdheden:**
- macOS + Xcode voor iOS builds
- Android Studio voor Android builds

---

### 7.3 Alternatieven (niet aanbevolen voor dit project)

| Optie | Reden om niet te gebruiken |
|-------|---------------------------|
| NativeScript | Overkill voor flashcard-app, steilere leercurve |
| Electron | Desktop-only, niet relevant voor mobiel onderweg |

---

## 8. Swipe-implementatie (Angular)

Voor de swipe-gestures kun je HammerJS gebruiken of een moderne aanpak met touch events:

```typescript
// swipe.directive.ts
@Directive({ selector: '[appSwipe]' })
export class SwipeDirective {
  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();
  @Output() swipeUp = new EventEmitter<void>();

  private startX = 0;
  private startY = 0;
  private threshold = 50;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    const deltaX = event.changedTouches[0].clientX - this.startX;
    const deltaY = event.changedTouches[0].clientY - this.startY;

    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -this.threshold) {
      this.swipeUp.emit();
    } else if (deltaX > this.threshold) {
      this.swipeRight.emit();
    } else if (deltaX < -this.threshold) {
      this.swipeLeft.emit();
    }
  }
}
```

---

## 9. Toekomstige uitbreidingen

- Audio-uitspraak (TTS of opnames)
- Voorbeeldzinnen uit klassieke teksten
- Sociale features: vergelijk met vrienden
- Widget voor homescreen met woord van de dag
- Cloud sync tussen apparaten
