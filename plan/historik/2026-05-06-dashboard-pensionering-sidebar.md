# Dashboard færdig + pensioneringscheck + sidebar-filtrering

**Dato:** 2026-05-06

## Hvad blev gjort

### sync-catalog.js bygget
- Henter MS Learn pensioneringsside og parser HTML-tabeller med `<td>`-regex
- Finder hvilke eksamener i Excel der pensioneres og hvornår
- Tilføjer kendte erstatningseksamener fra MS Learn kursus-pensioneringsliste
- Gemmer `catalog-check.json` med retiring/alreadyRetired/active

### Pensioneringsadvarsler i dashboard
- Rødt panel øverst med alle pensionerede prioritetseksamener
- Erstatningskode og -navn vises under hvert element (grøn = erstatning, grå = ingen)
- `⏰ Nd`-badge på hver prioriteret eksamenrække i konsulentkortet

### Kendte erstatninger (maj 2026)
| Pensioneres | Erstatning | Dato |
|---|---|---|
| AZ-204 | AI-200 | 31. juli 2026 |
| AZ-500 | SC-500 | 31. august 2026 |
| AZ-800 | Ingen | 30. september 2026 |
| AZ-801 | Ingen | 30. september 2026 |

### Victor og August tilføjet
- Victor Ladegaard: AZ-900 prio 1, AZ-104 prio 2 i Excel (kolonne 13)
- August: AZ-900/AZ-104/MS-900/MS-102/MD-102 i Excel (kolonne 11)
- Begge tilføjet som tomme poster i `scrape-result.json` (ingen transcript URL endnu)

### Sidebar-filtrering
- "Re-cert snart" filtrerer til konsulenter med udløbsadvarsler
- "Prios på plads" filtrerer til konsulenter der har bestået alle prioriteter
- Sektionstitlen opdateres ved filterskift
- "Ingen resultater"-besked hvis filter er tomt

### GitHub
- Repo oprettet: https://github.com/Montana-fs/Uddannelsessystem (privat)
- gh CLI installeret via winget

## Ændrede filer

- `src/sync-catalog.js` — oprettet
- `src/generate-dashboard.js` — pensioneringsadvarsler + sidebar-filtrering
- `src/match-priorities.js` — Victor (kol 13) og August (kol 11) tilføjet
- `src/scrape-transcript.js` — Charly Munch (fikset umlaut)
- `scrape-result.json` — Charly rettet, Victor og August tilføjet
- `catalog-check.json` — genereret

## Næste skridt

1. Skaffe Victor Ladegaard transcript-URL
2. Overveje om AZ-800/AZ-801 skal ud af Excel (ingen erstatning)
3. Opdater Excel: AZ-500 → SC-500 og AZ-204 → AI-200 for relevante konsulenter
4. `Kør.bat` — ét dobbeltklik der kører scraper → priority matcher → dashboard
5. MS Partner Center API og incentives-integration
