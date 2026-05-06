# Scraper færdig og priority matcher bygget

**Dato:** 2026-05-06

## Hvad blev gjort

- Dato-bug i da-dk locale fikset (`Beståelsesdato` label fundet og tilføjet)
- `src/match-priorities.js` bygget — krydser scrape-data mod Excel-prioriteter
- Benjamin Fougt tilføjet med prioriteter AZ-900 (1), AZ-104 (2), AZ-500 (3) direkte i Excel
- Charly Münch tilføjet — transcript-URL modtaget og scraper verificeret
- 8 af 9 konsulenter nu fuldt dækket

## Resultater

Alle prioriterede kurser vises korrekt pr. konsulent med bestået/mangler-status og datoer.
Re-certificeringsadvarsler indenfor 365 dage vises automatisk.

## Ændrede filer

- `src/scrape-transcript.js` — Charly tilføjet, dato-bug fikset
- `src/match-priorities.js` — oprettet
- `plan/konsulenter.md` — Charly og Victor opdateret
- `plan/status.md` — opdateret
- `Uddannelsesoversigt 2025.xlsx` — Benjamins prioriteter indsat
