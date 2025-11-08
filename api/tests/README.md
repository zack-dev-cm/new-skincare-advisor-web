# Test di Carico per `api/infer` (k6)

## Requisiti
- k6 installato
  - Windows (choco): `choco install k6`
  - macOS (brew): `brew install k6`
  - Linux: vedi `https://k6.io/docs/get-started/installation/`

## Endpoint e payload
- Endpoint: `https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/infer`
- Payload base in `api/tests/load-test-infer.js` (puoi override via env)

Variabili d’ambiente opzionali:
- `INFER_URL` (URL endpoint)
- `IMAGE_URL` (URL immagine)

## Esecuzione (PowerShell)
Esegui dalla root del repo o dalla cartella `api/tests`:

```powershell
# Dalla root
cd api/tests

# Run con config k6 e override opzionali
$env:INFER_URL="https://new-skincare-advisor-api-fqc8dffvg5ghene2.westeurope-01.azurewebsites.net/api/infer"
$env:IMAGE_URL="https://stdermaselfprdwesteurope.blob.core.windows.net/selfies/uploads/2025-10-31/f9b1f0f9-8c57-4a1e-9bab-53fbe70229e8.jpeg"

k6 run --config k6-config.json load-test-infer.js
```

Output:
- `summary.json` (metrica riepilogo k6)

Note:
- L’endpoint è pubblico (nessuna `x-functions-key`).
- Potresti vedere risposte `429` a causa del rate limit (50/h). Questo è atteso nel test per individuare il comportamento sotto carico.

## Modalità baseline (1 richiesta)  
Serve per catturare il payload “golden” usato nelle comparazioni.

```powershell
cd api/tests
$env:BASELINE_MODE="true"
k6 run load-test-infer.js
# output: summary.json + baseline-response.json
```

## Profilo di carico (confronto)
- 50 Virtual Users costanti per 2 minuti (`constant-vus`)
- 30s di graceful stop per completare le richieste in volo
- Ogni risposta viene confrontata con `baseline-response.json`
- Risultati in `summary.json` e `comparison-results.json`

```powershell
$env:BASELINE_MODE="false"
k6 run --config k6-config.json load-test-infer.js
```

Puoi modificare il profilo aggiornando `options.scenarios.two_minute_load` (quando `BASELINE_MODE` è falso) in `load-test-infer.js`.

## Test E2E Upload → Infer
Questo scenario carica l'immagine via `api/upload-url`, effettua l'`PUT` sul blob e poi invoca `api/infer`. L'immagine sorgente viene scaricata una sola volta all'avvio del test, così ogni iterazione genera un blob nuovo (niente cache lato infer).

Variabili d’ambiente opzionali:
- `UPLOAD_URL` (endpoint upload-url, default `.../api/upload-url`)
- `INFER_URL` e `IMAGE_URL` come sopra
- `UPLOAD_MIME_TYPE` (default `image/jpeg`)

### Modalità baseline
```powershell
cd api/tests
$env:BASELINE_MODE="true"
k6 run load-test-e2e.js
# output: summary.json + baseline-response.json (ottenuta dal flusso completo)
```

### Profilo di carico
```powershell
$env:BASELINE_MODE="false"
k6 run --config k6-config.json load-test-e2e.js
```

Output:
- `summary.json`, `comparison-results.json` (come per il test infer)
- Metriche aggiuntive: `upload_url_duration`, `upload_put_duration`, `e2e_flow_ok`

Note:
- Non serve disattivare la cache in produzione: l’URL del blob cambia a ogni iterazione.
- Se vuoi testare un’altra immagine, imposta `IMAGE_URL` (deve essere pubblicamente accessibile).

## Analisi con Application Insights
Usa le query KQL in `api/tests/application-insights-queries.kql` impostando la finestra temporale del test. Focus:
- `requests`: tempi e codici di risposta di `/api/infer`
- `dependencies`: Redis, Acne/Laxity/Wrinkles, Recommendations
- `traces`: cache hit/miss, eventi Circuit Breaker

Punti chiave da verificare:
- Lentezze di download immagine (`imageUrlToBase64`)
- API esterne più lente (p95/p99)
- Tasso di cache hit/miss
- Impatto delle raccomandazioni
- 429 e 503 sotto carico

## Suggerimenti
- Se vuoi evitare il rate-limit in ambiente di test, valuta di eseguire contro un ambiente con `NODE_ENV=test` lato server (se supportato) o riduci i VUs.
- Puoi esportare i risultati anche in formati aggiuntivi con `handleSummary`.


