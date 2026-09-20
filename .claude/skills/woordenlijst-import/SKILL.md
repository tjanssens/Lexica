---
name: woordenlijst-import
description: Zet een woordenlijst (foto's of scans van een schoolboek, een PDF, of platte tekst) om in een Excel-bestand dat rechtstreeks in Lexica geïmporteerd kan worden via /import. Gebruik dit zodra iemand vraagt om woordjes, vocabulaire, een woordenlijst of een boekpagina "om te zetten naar Excel", "importeerbaar te maken" of "in Lexica te krijgen".
---

# Woordenlijst → Lexica-import

Doel: van ruwe input (foto's van een boekpagina, PDF, getypte lijst) naar één `.xlsx`
die de gebruiker zonder aanpassingen kan uploaden op `/import`.

## Werkwijze

1. **Transcribeer alle rijen** van de aangeleverde pagina's. Neem álles mee:
   substantieven, werkwoorden, adjectieven én uitdrukkingen. Controleer per pagina
   of je even veel rijen hebt als het origineel voor je verdergaat.
2. **Negeer doordruk/spiegelbeeld.** Gescande boekpagina's tonen vaak spiegelend
   de achterzijde. Die woorden horen niet bij de gevraagde pagina's — laat ze weg
   en meld dit kort aan de gebruiker.
3. **Behoud accenten en lidwoorden exact** zoals in het boek (`l'église (f)`,
   `génial(e)`, `malin, maligne`, `Bonne journée !`). De term is de identiteit van
   een woord in Lexica; accenten zijn onderscheidend.
4. **Voorbeeldzin → `notes`.** Staat er een voorbeeldzin bij het woord, zet die in
   de kolom `notes`. Die is zichtbaar bij het woorddetail en helpt bij het leren.
5. **Schrijf een JSON-invoerbestand** in de scratchpad en draai
   `scripts/build_import_xlsx.py` (zie hieronder). Schrijf het `.xlsx` niet in de
   repo — het is gebruikersdata, geen broncode.
6. **Lever het bestand af** met `SendUserFile` en vermeld: aantal rijen, taal en
   de groepsnaam die gebruikt is.

## Kolomformaat (moet exact matchen)

`ExcelImportService` leest de headers op rij 1 en trimt een afsluitende `*`:

| kolom | verplicht | inhoud |
|---|---|---|
| `number` | nee | Enkel informatief — Lexica hernummert bij import per taal. |
| `language*` | ja | `French`, `English`, `Latin`, `Greek` (aliassen: `fr`, `frans`, `en`, `engels`, `la`, `latijn`, `el`, `grieks`). |
| `term*` | ja | Het vreemde woord (bv. Frans). |
| `translation*` | ja | De Nederlandse vertaling. Meerdere vertalingen met komma's. |
| `part_of_speech` | nee | Bv. `substantief`, `werkwoord`, `bijvoeglijk naamwoord`, `uitdrukking`. |
| `notes` | nee | Voorbeeldzin of geheugensteun. |
| `easiness` | nee | SM-2 startwaarde, standaard `2.5`. |
| `interval` | nee | Standaard `0`. |
| `repetitions` | nee | Standaard `0`. |
| `due_date` | nee | `yyyy-MM-dd`, standaard vandaag. |
| `group` | nee | Groepsnaam; bestaat de groep nog niet voor die taal, dan maakt de import ze aan. |

## Goed om te weten over de import

- **Identiteit = (taal, term) zonder hoofdletters/spaties.** Een rij waarvan de
  term al bestaat, wordt als duplicaat gemarkeerd in de preview; de gebruiker
  kiest zelf tussen overslaan of bijwerken.
- **Nummers uit het bestand worden genegeerd** en opnieuw toegekend per taal.
- **Rijen zonder `term` én zonder `translation` worden overgeslagen**, lege
  regels zijn dus onschuldig.
- Eén groep per rij: de import koppelt het woord aan maximaal één groep.

## Script

```bash
python3 .claude/skills/woordenlijst-import/scripts/build_import_xlsx.py \
    <invoer.json> <uitvoer.xlsx>
```

Vereist `openpyxl` (`pip install openpyxl` indien nodig).

Formaat van `invoer.json`:

```json
{
  "language": "French",
  "group": "Trajet 1 - À retenir",
  "words": [
    {
      "term": "le badminton",
      "translation": "(het) badminton",
      "partOfSpeech": "substantief",
      "notes": "Le mercredi, il joue au badminton."
    }
  ]
}
```

`language` en `group` op het hoofdniveau gelden als standaard voor elke rij;
per woord kun je ze overschrijven met `language` / `group`. `partOfSpeech`,
`notes`, `easiness`, `interval`, `repetitions` en `dueDate` zijn optioneel.
Het script stopt met een foutmelding bij een ontbrekende term, vertaling of
onbekende taal, en waarschuwt bij dubbele termen binnen hetzelfde bestand.
