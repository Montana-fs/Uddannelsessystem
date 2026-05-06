# Discovery og Puppeteer proof-of-concept

**Dato:** 2026-05-06

## Hvad blev gjort

### Discovery (interview)
Gennemført struktureret interview med Tony om nuværende arbejdsgang, behov og interessenter. Fuldt produktspec dokumenteret i `plan/`.

Nøglefund:
- Tony administrerer ALT manuelt: klippekort-rotation, CV-opdateringer, MS incentives, Excel-vedligehold
- Certificeringer er formelt krav nedfældet i personalehåndbogen
- Certificeringer bruges aktivt i salgsmateriale og MS incentives-beregning (direkte økonomi)
- 2 Readynez klippekort à 1.500 kr./md. i rotation — ~36.000 kr./år
- 8 konsulenter, vokser til ~16

### Tekniske afklaringer
- **Readynez:** ingen API — scraping med Puppeteer
- **MS Learn transcript:** loader 100% via JavaScript — ingen statisk API, kræver Puppeteer
- **Arkitektur:** én Puppeteer-service løser begge scraping-behov
- **Multi-tenant fra dag 1** besluttet

### Transcript-URLs indsamlet
7 af 9 konsulenter registreret i `plan/konsulenter.md`:
- Benjamin Fougt, Kennet Thorsen, Anders Gornitzka, Leon Pedersen, Ricki Mikkelsen, Michael Magnussen, Simon Kaas Hansen
- Charly: afventer link
- August: på skole, tilbage august 2026
- Victor Ladegaard (ny elev): profil fundet, transcript-URL mangler ID

### Puppeteer proof-of-concept bygget
`src/scrape-transcript.js` — henter certificeringer og beståede eksamener fra alle 7 transcript-URLs.

Teknisk udfordring løst: MS Learn bruger forskellige HTML-sektion-IDs afhængigt af locale (en-us vs. da-dk). Scraperen håndterer begge sprogsæt.

**Resultater fra første kørsel:**
| Konsulent | Aktive certs | Beståede eksamener |
|---|---|---|
| Anders Gornitzka | 4 | 4 (AZ-104, MS-900, MS-102, SC-300) |
| Michael Magnussen | 3 | 3 (AZ-900, MS-102, MD-102) |
| Simon Kaas Hansen | 2 | 2 (AZ-305, AZ-104) |
| Ricki Mikkelsen | 5 | 5 (inkl. historiske fra 2010-2023) |
| Leon Pedersen | 2 | 6 (inkl. historiske) |
| Kennet Thorsen | 1 | 1 (AZ-104) |
| Benjamin Fougt | 0 | 0 (profil tom) |

## Ændrede filer

- `plan/projekt.md` — oprettet
- `plan/vision.md` — oprettet
- `plan/features.md` — oprettet
- `plan/teknik.md` — oprettet, løbende opdateret med afklaringer
- `plan/status.md` — oprettet, løbende opdateret
- `plan/fremtid.md` — oprettet
- `plan/konsulenter.md` — oprettet med 7 transcript-URLs og bruger-IDs
- `src/scrape-transcript.js` — Puppeteer POC bygget og verificeret

## Næste skridt

1. Modtag manglende transcript-links (Charly, Victor)
2. Kobl scrape-resultat mod prioriteter fra Excel-arket
3. Byg simpelt dashboard der viser: hvem har hvad, hvad mangler ift. prioriteterne
4. Undersøg MS Partner Center API og incentives-rapporteringsformat
5. Beslut databasevalg og opret Azure-projekt
