# Kør.bat, klippekort-styring og Teams-notifikationer

**Dato:** 2026-05-07

## Hvad blev bygget

### Kør.bat
Batch-fil i roden der kører hele pipelinen i rækkefølge:
1. `scrape-transcript.js` — henter MS Learn data
2. `match-priorities.js` — krydser mod Excel
3. `notify.js` — sender Teams-varsler
4. `generate-dashboard.js` — bygger og åbner dashboard

Afbryder med pause og fejlbesked hvis scraper eller matcher fejler. Notify-fejl stopper ikke kørslen.

### klippekort.json
Ny datafil med:
- `teams.webhook` — Teams incoming webhook URL (skal udfyldes)
- `teams.tonyEmail` — tony.andersen@zentura.dk
- `konsulenter` — navne→email-map (emails er placeholders, skal verificeres)
- `kort` — array med 2 kort (skal udfyldes med aktuelle datoer og indehavere)
- `koe` — rotationskø (sat til alle konsulenter der ikke er i aktuel rotation)

### src/klippekort.js
CLI til klippekort-styring:
- `node src/klippekort.js` — vis status (aktive kort + kø)
- `node src/klippekort.js roter <1|2>` — rotér kort til næste i kø
- `node src/klippekort.js koe list/add/rm` — administrér kø

`roter` sætter start=i dag, slut=+6 mdr, fornyFrist=+5 mdr og sender Teams-aktiveringsbesked med konsulentens prioriterede eksamener.

### src/notify.js
Teams-notifikationer via incoming webhook:
- Klippekort udløber om ≤30 dage → besked til konsulent
- FornyFrist om ≤30 dage → besked til Tony
- Re-cert om ≤90 og ≤30 dage → varsel
- Eksamen pensioneres om ≤90 dage → varsel
- `notify-log.json` forhindrer dubletter (én notifikation pr. tærskel pr. uge)

Eksporterer `sendTeams(webhook, tekst)` — bruges af `klippekort.js roter`.

## Ændrede filer
- `Kør.bat` (ny)
- `klippekort.json` (ny)
- `src/klippekort.js` (ny)
- `src/notify.js` (ny)
- `plan/status.md` (opdateret)

## Næste skridt
- Tony udfylder `klippekort.json` med aktuelle datoer og Teams webhook
- Verificer konsulent-emails
- Vis klippekort-status i HTML-dashboardet
