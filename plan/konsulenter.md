# Konsulenter — MS Learn data

Bruges til Puppeteer-scraping af certificeringer og badges.
Transcript-URL deles af konsulenten én gang og er herefter permanent.

| Konsulent | MS Learn brugernavn | Bruger-ID | Transcript-URL |
|---|---|---|---|
| Benjamin Fougt | BenjaminF-1313 | 4f10137c-e790-4306-86b8-bc47c1341aa5 | https://learn.microsoft.com/en-us/users/benjaminf-1313/transcript/vmp9rsmxxz94pzr |
| Kennet Thorsen | KennetThorsen-5382 | 25f4237b-8ff8-4fe5-81bd-2a206948ecbe | https://learn.microsoft.com/en-us/users/kennetthorsen-5382/transcript/vj552syooqpjmxe |
| Anders Gornitzka | AndersMajlandGornitzka-6219 | 09f71e43-e87c-4b6f-9f13-f934ae614cab | https://learn.microsoft.com/en-us/users/andersmajlandgornitzka-6219/transcript/vp16tr992qkyg3v |
| Simon Kaas Hansen | SimonKaasHansen-7131 | 8fcb6700-9795-4287-9386-8c4fbc206e5f | https://learn.microsoft.com/da-dk/users/simonkaashansen-7131/transcript/d8189h499wyggle |
| Ricki Mikkelsen | RickiM-2768 | 6019fdbb-b816-4e1c-af0a-df7be5328c0e | https://learn.microsoft.com/da-dk/users/rickim-2768/transcript/vjwg5hyooqmpykq |
| Leon Pedersen | LeonPedersen-6163 | bfec143b-26c3-421e-90a7-48df7168c0d6 | https://learn.microsoft.com/da-dk/users/leonpedersen-6163/transcript/d9r3pagppq05nnq |
| Michael Magnussen | MichaelMagnussen-3499 | 13683cea-6819-4a3f-869e-dc3054ec0486 | https://learn.microsoft.com/en-us/users/michaelmagnussen-3499/transcript/d484t688o2qjx0v |
| Charly Münch | CharlyMunch-5729 | 8d371dbc-9a52-4b9d-8c36-9bc27926be34 | https://learn.microsoft.com/da-dk/users/charlymunch-5729/transcript/dzmgmaj008qx5je |
| August | — | — | På skole — tilbage august 2026 |
| Victor Ladegaard | VictorLadegaard-1788 | 6fa6cc99-4d3f-42db-81fc-12e18e7903bc | Transcript-URL mangler ID — afventer komplet link |

## Scraping-noter

- Siden loader 100% via JavaScript — kræver Puppeteer
- `?tab=credentials-tab` viser certificeringer, default tab viser badges/moduler
- Begge tabs skal scrapers for fuld datadækning
- Scraping køres dagligt via Azure Container Instance
- Ingen login nødvendigt — transcript-URL er offentlig delt link
