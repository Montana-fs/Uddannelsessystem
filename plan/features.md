# Features

## Kerne-features (MVP)

### Klippekort-styring
- Rotationsplan med aktive og kommende kort pr. konsulent
- Automatisk Teams-besked til konsulent når kort aktiveres: "Dit Readynez-kort er aktivt frem til [dato]. Dine prioriterede kurser er: [liste med prio 1-5]"
- Reminder til Tony 30 dage før "Forny/opsig senest"-dato
- Reminder til konsulent 30 dage før kortets udløb: "X dage tilbage — du har taget Y af Z prioriterede kurser"
- Håndtering af ny konsulent (ind i kø) og afgang (næste i rækken rykker op)

### Certificeringssporing
- Oversigt pr. konsulent: beståede certificeringer, dato, re-certificeringsfrist
- Automatisk detektion af nye certificeringer via Microsoft Learn transcript-URL (konsulenten deler ét link ved opstart)
- Re-certificeringsvarsel til konsulent og Tony 90 og 30 dage før udløb

### MS Learn kursuskatalog-sync
- Ugentlig sync mod Microsoft Learn API
- Automatisk markering af pensionerede eksamener (Retired) i oversigten
- Notifikation til Tony hvis en prioriteret eksamen pensioneres: "AZ-220 er pensioneret — Simons prio 2 skal opdateres"

### Dashboard
- Samlet kompetenceoverblik: hvem har hvad, hvad er i gang, hvad mangler
- Filtrerbart på konsulent, eksamensnummer, status
- Synligt for Tony, salg og COO med Entra ID-login

### MS Incentives-rapport
- Eksportér liste over alle aktive certificeringer i det format Microsoft kræver
- Klar til indsendelse — ingen manuel opsamling

### CV-profil
- Auto-opdateret certificeringsliste pr. konsulent
- Eksporterbar som PDF-sektion til brug i tilbud

### MUS-forberedelse
- Pr. konsulent: hvad er taget siden sidst, hvad er næste prioritet, hvad udløber snart
- Printvenlig oversigt til samtalen

## Sekundære features (post-MVP)

- Readynez-integration: hent kortets faktiske status (forbrugte kurser, resterende) hvis Readynez har API eller web-scraping er muligt
- Prioritets-editor: Tony kan justere 1-5 prioriteringer direkte i systemet uden at åbne Excel
- Budgetrapport: cost per konsulent, cost per certificering, samlet uddannelsesbudget
- Notifikationer via e-mail som alternativ til Teams
- Automatisk indrapportering til Microsoft (hvis API eksisterer)

## Ikke i scope

- LMS-funktionalitet (kursusmateriale, quizzer, læringsforløb)
- Integration med løn- eller HR-systemer
- Support for ikke-Microsoft certificeringer (indtil videre)
