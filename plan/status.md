# Status

**Sidst opdateret:** 2026-05-06

## Hvad virker

### Puppeteer scraper (`src/scrape-transcript.js`)
- Henter aktive certificeringer og beståede eksamener fra MS Learn transcript-URLs
- Understøtter både engelsk (en-us) og dansk (da-dk) locale inkl. korrekte datoer
- 8 af 10 konsulenter med data — Victor mangler transcript-ID, August på skole

### Priority matcher (`src/match-priorities.js`)
- Læser prioriteter fra `Uddannelsesoversigt 2025.xlsx`
- Krydser mod MS Learn-data og viser hvad der mangler pr. konsulent
- Viser re-certificeringsadvarsler indenfor 365 dage

### Katalog-check (`src/sync-catalog.js`)
- Henter MS Learn pensioneringsside og finder pensionerede eksamener i Excel
- Viser erstatningseksamen hvor kendt (AZ-500→SC-500, AZ-204→AI-200)
- Gemmer `catalog-check.json`

### HTML Dashboard (`src/generate-dashboard.js`)
- Mørkt navy-tema, server på port 3738
- Pensioneringsadvarsler øverst med erstatningsinformation
- Re-certificeringstidslinje farvekodet (rød/gul)
- Konsulentkorter med progressbar og prioritetsliste
- `⏰ Nd`-badge på pensionerede prioritetseksamener
- Sidebar-filtrering: Alle / Re-cert snart / Prios på plads

### Konsulent transcript-status

| Konsulent | MS Learn URL | Certificeringer |
|---|---|---|
| Anders Gornitzka | ✓ | 4 aktive (AZ-104, SC-300, MS-102, MS-900) |
| Michael Magnussen | ✓ | 3 aktive (MD-102, MS-102, AZ-900) |
| Simon Kaas Hansen | ✓ | 2 aktive (AZ-305, AZ-104) |
| Ricki Mikkelsen | ✓ | 1 aktiv (AZ-801) |
| Leon Pedersen | ✓ | 2 aktive (AZ-104, AZ-801) |
| Kennet Thorsen | ✓ | 1 aktiv (AZ-104) |
| Benjamin Fougt | ✓ | Tom profil — nyansat |
| Charly Munch | ✓ | Tom profil |
| Victor Ladegaard | ⏳ | Transcript-ID mangler |
| August | 🏫 | På skole, tilbage aug. 2026 |

### Re-certificeringer der haster
| Konsulent | Dage tilbage | Dato | Certificering |
|---|---|---|---|
| Ricki Mikkelsen | 75 | 2026-07-21 | Windows Server Hybrid Administrator Associate |
| Simon Kaas Hansen | 93 | 2026-08-08 | Azure Solutions Architect Expert |
| Michael Magnussen | 94 | 2026-08-09 | Endpoint Administrator Associate |

### Eksamener der pensioneres (i Excel)
| Eksamen | Dage tilbage | Erstatning |
|---|---|---|
| AZ-204 | 85 | AI-200 |
| AZ-500 | 116 | SC-500 |
| AZ-800 | 146 | Ingen |
| AZ-801 | 146 | Ingen |

## Hvad er i gang

- Intet aktivt.

## Næste skridt

1. Skaffe Victor Ladegaard transcript-URL
2. Overveje om AZ-800/AZ-801 skal ud af Excel (ingen erstatning annonceret)
3. Opdater Excel: AZ-500 → SC-500 og AZ-204 → AI-200 for relevante konsulenter
4. `Kør.bat` — ét dobbeltklik der kører scraper → priority matcher → dashboard i rækkefølge
5. MS Partner Center API og incentives-integration
6. GitHub repo: https://github.com/Montana-fs/Uddannelsessystem
