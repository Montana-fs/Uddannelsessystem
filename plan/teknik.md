# Teknik

**Sidst opdateret:** 2026-05-06
**Status:** Ikke påbegyndt — tekniske valg er foreløbige

## Stack (foreslået)

| Lag | Valg | Begrundelse |
|---|---|---|
| Hosting | Azure Static Web Apps (gratis tier) | MS-partner, Entra ID built-in |
| API | Azure Functions (Node.js) | Gratis tier, skalerer, konsistent med eksisterende kode |
| Scraping | Azure Container Instance med Puppeteer | Kører headless Chrome — henter MS Learn transcripts og Readynez på én gang |
| Database | Azure Cosmos DB eller SQLite via Azure Storage | Skalerer til SaaS, billigt ved lav volumen |
| Auth | Entra ID (Microsoft SSO) | Konsulenter logger ind med Zentura-konto |
| Notifikationer | Microsoft Graph API (Teams-beskeder) | Allerede i M365-licensen |

## Integrationer

| Integration | Formål | Tilgængelighed |
|---|---|---|
| Microsoft Learn API | Kursuskatalog-sync, pensioneringsnotifikationer | Offentlig API |
| Microsoft Learn Transcript | Auto-detektion af beståede eksamener | Kræver Puppeteer — siden loader via JavaScript, ingen statisk API tilgængelig |
| Credly API | Alternativ badge-verifikation | Offentlig API — backup hvis MS Learn scraping fejler |
| Microsoft Graph API | Teams-notifikationer, brugerdata | Via M365-licens |
| Readynez | Kortstatus og forbrugte kurser | Ingen API — login-baseret scraping (Puppeteer) eller manuelt input |
| MS Partner Center API | Incentives-indrapportering | Kræver undersøgelse |

## Åbne spørgsmål

1. ~~Har Readynez en API eller datafeed?~~ **Afklaret 2026-05-06: Ingen API.** Løses med Puppeteer login-scraping.
2. ~~Har MS Learn en statisk transcript-API?~~ **Afklaret 2026-05-06: Nej.** Siden loader via JavaScript — kræver Puppeteer. Begge scraping-behov løses af én Puppeteer-service.
3. Hvilket format kræver Microsoft til incentives-indrapportering? → Tjek Partner Center-dokumentation
4. ~~Single-tenant eller multi-tenant?~~ **Afklaret 2026-05-06: Multi-tenant fra dag 1** — bygges til Zentura, men arkitektur understøtter andre MSP'er fra start.

## Kommandoer

Udfyldes når projekt påbegyndes.
