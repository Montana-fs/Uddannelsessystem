# Status

**Sidst opdateret:** 2026-05-06

## Hvad virker

### Puppeteer scraper (`src/scrape-transcript.js`)
- Henter aktive certificeringer og beståede eksamener fra MS Learn transcript-URLs
- Understøtter både engelsk (en-us) og dansk (da-dk) locale inkl. korrekte datoer
- 8 af 9 konsulenter dækket — August tilbage aug. 2026

### Priority matcher (`src/match-priorities.js`)
- Læser prioriteter fra `Uddannelsesoversigt 2025.xlsx`
- Krydser mod MS Learn-data og viser hvad der mangler pr. konsulent
- Viser re-certificeringsadvarsler indenfor 365 dage

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
| Charly Münch | ✓ | Tom profil |
| Victor Ladegaard | ⏳ | Transcript-ID mangler |
| August | 🏫 | På skole, tilbage aug. 2026 |

### Re-certificeringer der haster
| Konsulent | Dage tilbage | Dato | Certificering |
|---|---|---|---|
| Ricki Mikkelsen | 75 | 2026-07-21 | Windows Server Hybrid Administrator Associate |
| Simon Kaas Hansen | 93 | 2026-08-08 | Azure Solutions Architect Expert |
| Michael Magnussen | 94 | 2026-08-09 | Endpoint Administrator Associate |

## Hvad er i gang

- Dashboard under opbygning

## Næste skridt

1. HTML-dashboard med visuelt overblik
2. Modtag transcript-link fra Victor
3. Undersøg MS Partner Center API og incentives-format
4. Beslut database og opret Azure-projekt
