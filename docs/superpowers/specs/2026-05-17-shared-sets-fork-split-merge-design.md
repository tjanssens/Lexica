# Gedeelde sets — eigen kopie, splitsen, samenvoegen, mixen

**Datum:** 2026-05-17
**Status:** Goedgekeurd voor implementatie-planning

## Probleem

Vandaag kunnen gebruikers een set publiek maken en andere gebruikers kunnen zich erop abonneren (read-only). Een geabonneerde gebruiker kan echter:
- de set niet **splitsen** in kleinere delen
- meerdere sets niet **samenvoegen** tot één grotere set
- losse woorden niet **verplaatsen of kopiëren** tussen sets

De `AddWords`-endpoint blokkeert dit expliciet via een check `w.UserId == UserId` — een geabonneerde gebruiker is geen eigenaar van de woorden, dus kan ze niet aan eigen sets toevoegen.

## Oplossingsrichting

**"Fork"-model met expliciete eigen kopie.** De huidige read-only subscription blijft bestaan voor wie alleen wil oefenen. Wie wil aanpassen maakt expliciet een eigen, volledig onafhankelijke kopie van de set. Splits-, samenvoeg- en mix-operaties werken vervolgens alléén op eigen sets.

Verworpen alternatieven (zie brainstorm):
- *Eigen sets mogen verwijzen naar andermans Words* — te complexe rechten en breakage bij delete.
- *Virtuele sets via filterregels* — complex datamodel, grillige UX.
- *Copy-on-Write* — magische UX, complex.

## Concept & UX

Een set kan voor een gebruiker twee statussen hebben:

| Status | Acties |
|---|---|
| **Geabonneerd** (read-only) | Oefenen, eigen SM-2 progress, eigen notities. Géén bewerken/splitsen/samenvoegen. Updates van de eigenaar komen automatisch door. |
| **Eigen kopie** | Volledige controle: woorden bewerken/verwijderen/toevoegen, splitsen, samenvoegen, mixen, opnieuw delen. Géén automatische updates meer van het origineel. |

### Duidelijkheid voor de gebruiker

- **Banner** op detail-pagina van een gedeelde set: *"Dit is een set van [naam]. Maak een eigen kopie om aan te passen, te splitsen of samen te voegen."* met knop **"Maak eigen kopie"**.
- **Label/icoon** in de set-lijst: onderscheid tussen geabonneerde sets en eigen sets (visueel licht maar duidelijk).
- **Promptdialog** wanneer een geabonneerde gebruiker probeert te wijzigen (knop "Splitsen", "Samenvoegen", "Woorden toevoegen"): *"Hiervoor moet je eerst een eigen kopie maken. Doorgaan?"* → maakt kopie en opent die.
- **Herkomst per woord** bij gekopieerde woorden: klein label/tooltip *"Origineel van [naam]"* in de woordenlijst.

## "Maak eigen kopie" — gedrag

Volledige diepe kopie:

1. Nieuwe `Set`-record met `UserId = huidige gebruiker`, alle velden (`Name`, `Language`, `DefaultDirection`, `Description`) overgenomen van het origineel. `IsPublic = false` (nooit standaard automatisch publiek).
2. Voor elk woord uit de bron-set: nieuw `Word`-record met `UserId = huidige gebruiker` en alle velden overgenomen.
3. Nieuwe `SetWord`-koppelingen.
4. **SM-2 progress meenemen**: bestaande `UserWordProgress` voor de huidige gebruiker op de originele Words wordt gekopieerd naar nieuwe `UserWordProgress`-records die naar de nieuwe Word-id verwijzen.
5. **Subscription op het origineel wordt automatisch opgezegd.** Toast: *"Eigen kopie gemaakt — abonnement op origineel is opgezegd."*

### Herkomsttracking

Twee nieuwe (nullable) kolommen op `Word`:
- `SourceWordId Guid?` — verwijst naar het originele Word; nullable, geen FK-cascade (mag dangling worden als origineel verwijderd is).
- `OriginalAuthorDisplayName string?` — **snapshot** van de displayname van de oorspronkelijke auteur op moment van kopiëren. Blijft staan ook als het origineel of de oorspronkelijke gebruiker verdwijnt.

Beide blijven leeg voor woorden die je zelf hebt aangemaakt.

Bij splitsen/samenvoegen/mixen tussen eigen sets blijven `SourceWordId` en `OriginalAuthorDisplayName` ongewijzigd — we hergebruiken bestaande Word-records, alleen `SetWord`-koppelingen verschuiven.

## Splits / samenvoegen / mixen

Alle drie alleen beschikbaar op eigen sets.

### Splitsen — 1 set → 2 sets (woorden verdelen)

- In de woordenlijst van set A: multi-select → actie **"Verplaats naar nieuwe set…"** of **"Kopieer naar nieuwe set…"**.
- Modal: naam (vereist), default-richting (overgenomen van A, aanpasbaar).
- **Verplaats**: `SetWord`-koppelingen worden uit A weggehaald en in nieuwe set B gezet.
- **Kopieer**: nieuwe `SetWord`-koppelingen in set B; A blijft intact.

### Samenvoegen — N sets → 1 set (woorden bundelen)

- In de set-lijst: multi-select sets → actie **"Voeg samen tot nieuwe set…"**.
- Vereiste: alle geselecteerde sets hebben dezelfde `Language`.
- Modal: naam (vereist), default-richting (default: van de eerste geselecteerde set, aanpasbaar), checkbox *"Originele sets verwijderen"* (**default uit**).
- Nieuwe set bevat de unie van `SetWord`-koppelingen; duplicaat-woorden ontdedupliceerd op `WordId`.

### Mixen — woorden van set A naar set B

- Multi-select in woordenlijst → **"Verplaats naar set…"** of **"Kopieer naar set…"** met set-picker (alleen eigen sets in dezelfde taal).
- **Verplaats**: `SetWord` weghalen uit A, toevoegen aan B (skip als al in B).
- **Kopieer**: `SetWord` toevoegen aan B (skip als al in B); A blijft ongewijzigd.

## Datamodel

### Wijzigingen op `Word`
```
SourceWordId               Guid?    // nullable, geen FK-cascade
OriginalAuthorDisplayName  string?  // snapshot bij kopiëren
```

Eén EF-migratie. Geen wijzigingen aan `Set`, `SetWord`, `SetSubscription`, `UserWordProgress`.

## Backend-endpoints (op `SetsController`)

Nieuwe endpoints:

| Endpoint | Body | Gedrag |
|---|---|---|
| `POST /api/sets/{id}/copy` | – | Diepe kopie van set (incl. Words + progress); zegt subscription op; geeft nieuwe `SetDto` terug. Vereist: huidige gebruiker is geabonneerd óf set is publiek. |
| `POST /api/sets/{id}/split` | `{ name, wordIds, mode: "move" \| "copy" }` | Maakt nieuwe set met die woorden; bij `move` verwijdert ze ook uit bron. Vereist: eigenaar. |
| `POST /api/sets/merge` | `{ name, setIds, deleteOriginals: bool }` | Maakt nieuwe set met unie; vereist gelijke `Language`. Vereist: eigenaar van alle setIds. |
| `POST /api/sets/move-words` | `{ fromSetId, toSetId, wordIds, mode: "move" \| "copy" }` | Verplaatst/kopieert woorden tussen eigen sets. Vereist: eigenaar van beide; gelijke `Language`. |

Bestaande endpoints (`AddWords`, `RemoveWords`, `Update`, `Delete`) blijven ongewijzigd — die werken al alleen op eigen sets.

### Foutgevallen / validatie

- `copy` op set waar je geen toegang toe hebt → `404`.
- `copy` op je eigen set → `400` ("Je bent al eigenaar van deze set.").
- `split` / `merge` / `move-words` op een set die niet van jou is → `403`.
- `merge` of `move-words` over verschillende `Language`s → `400` ("Sets moeten dezelfde taal hebben.").
- Lege `wordIds` of `setIds` → `400`.

## Frontend-impact

### Componenten

- **`set-list.component.ts`**: visueel label voor "eigen" vs "geabonneerd"; multi-select-modus + actie "Voeg samen…".
- **`set-detail.component.ts`**: banner + knop "Maak eigen kopie" voor geabonneerde sets; multi-select op woordenlijst + acties "Verplaatsen/Kopiëren naar (nieuwe) set…"; "Origineel van [naam]"-tooltip per woord wanneer `OriginalAuthorDisplayName` aanwezig.
- **Promptdialog-component** (herbruikbaar): "Voor deze actie moet je eerst een eigen kopie maken. Doorgaan?".

### API-service

`api.service.ts` krijgt methodes voor de vier nieuwe endpoints.

### DTO-aanpassingen (`Lexica.Shared/DTOs/`)

- `WordDto` krijgt `OriginalAuthorDisplayName string?` (voor herkomst-label).
- `SetDto` blijft ongewijzigd (`IsOwner` bestaat al).
- Nieuwe request-DTOs: `SplitSetRequest`, `MergeSetsRequest`, `MoveWordsRequest`.

## Out of scope (YAGNI)

Bewust niet in deze iteratie:
- "Synchroniseer mijn kopie met origineel" — eenrichtingsverkeer is genoeg voor MVP.
- Granulaire rechten (read-write delen) — blijft binair: lezen óf eigen kopie.
- Virtuele/dynamische sets met filterregels.
- Notificaties aan oorspronkelijke auteur bij kopie/fork.
- Diff-tool tussen kopie en origineel.

## Testen

Unit-/integratietests dekken minimaal:
- Diepe kopie maakt nieuwe `Word`-records, kopieert `UserWordProgress`, zegt subscription op.
- `SourceWordId` en `OriginalAuthorDisplayName` correct gevuld bij kopie, leeg bij eigen woorden.
- Splits (move) verwijdert `SetWord` uit bron; split (copy) niet.
- Samenvoegen ontdedupliceert duplicaten; weigert verschillende talen.
- Mix (move/copy) tussen eigen sets; weigert tussen verschillende talen of niet-eigen sets.
- Autorisatie: niet-eigenaar krijgt 403 op `split`/`merge`/`move-words`.
