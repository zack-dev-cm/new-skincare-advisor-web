# Azure Static Web Apps - Fix Completo per Embed-Fast

## Problema Originale

La pagina `/embed-fast` restituiva 404 e non funzionava con query parameters su Azure Static Web Apps.

## Modifiche Implementate

### 1. `frontend/staticwebapp.config.json`
Configurazione corretta per Next.js su Azure Static Web Apps:

```json
{
  "routes": [
    {
      "route": "/_next/static/*",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/_next/*", "/favicon.ico", "/images/*", "*.{css,js,json,png,gif,ico,jpg,jpeg,svg,woff,woff2,ttf,eot}"]
  },
  "globalHeaders": {
    "Permissions-Policy": "camera=*, microphone=*, geolocation=*",
    "X-Frame-Options": "ALLOWALL"
  },
  "mimeTypes": {
    ".js": "text/javascript",
    ".json": "application/json"
  }
}
```

**Punti chiave:**
- ✅ `navigationFallback.exclude` esclude tutti i file `/_next/*` dal reindirizzamento
- ✅ `globalHeaders` imposta le permission per camera e iframe
- ✅ `mimeTypes` assicura che i file JS abbiano il content-type corretto

### 2. `frontend/next.config.js`
Rimossa la configurazione `output` per permettere ad Azure di auto-detect:

```javascript
const nextConfig = {
  // Let Azure Static Web Apps auto-detect Next.js configuration
  // No explicit output mode - Azure will handle it
  
  outputFileTracingRoot: path.join(__dirname, '..'),
  compress: true,
  trailingSlash: false,
  
  webpack: (config, { isServer }) => {
    // ... configurazione webpack esistente
  }
};
```

**Perché questa scelta:**
- Azure Static Web Apps ha supporto nativo per Next.js
- L'auto-detection permette di usare API routes
- Non serve export statico che eliminerebbe le API

### 3. `.github/workflows/azure-static-web-apps-proud-sand-065a1dc03.yml`
Configurazione output vuota per auto-detection:

```yaml
app_location: "./frontend"
api_location: ""
output_location: "" # Empty for Next.js - Azure auto-detects
```

### 4. `frontend/src/app/embed-fast/page.tsx`
La pagina legge già i query parameters:

```typescript
const urlParams = new URLSearchParams(window.location.search);
const shop = urlParams.get('shop');
const locale = urlParams.get('locale');
const currency = urlParams.get('currency');

if (shop || locale || currency) {
  setStoreData({ shop, locale, currency });
  console.log('Store data from URL params:', { shop, locale, currency });
}
```

## Deployment

### Commit e Push

```bash
git add .
git commit -m "Fix: Azure Static Web Apps configuration for Next.js with API routes"
git push origin develop-neutral-demo
```

Il deployment partirà automaticamente tramite GitHub Actions.

### Verifica Deployment

1. Vai su [Azure Portal](https://portal.azure.com)
2. Trova la tua Static Web App
3. Vai su "GitHub Actions runs"
4. Aspetta che il deployment sia completato (circa 3-5 minuti)

## Test Post-Deployment

### Test 1: Pagina Base
```
https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast
```
✅ Dovrebbe restituire 200 (non 404)
✅ La pagina dovrebbe caricarsi

### Test 2: Con Query Parameters
```
https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast?shop=dermaself-dev2.myshopify.com&locale=en&currency=EUR
```
✅ Dovrebbe restituire 200 (non 404)
✅ Console dovrebbe mostrare: `Store data from URL params: {shop: "...", locale: "en", currency: "EUR"}`
✅ I chunk JS dovrebbero caricarsi senza 404

### Test 3: Da Shopify Iframe
Il tuo codice Shopify esistente dovrebbe funzionare:

```html
<script>
function openSkinAnalysis() {
    const iframe = document.createElement('iframe');
    const baseUrl = 'https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast';
    const shop = '{{ shop.permanent_domain }}';
    const locale = '{{ request.locale.iso_code }}';
    const currency = '{{ shop.currency }}';
    
    const params = new URLSearchParams({ shop, locale, currency });
    iframe.src = `${baseUrl}?${params.toString()}`;
    
    // ... resto del codice
}
</script>
```

✅ L'iframe dovrebbe caricarsi correttamente
✅ I parametri dovrebbero essere ricevuti
✅ Nessun errore 404 nei chunk JS

## Test Locale (Prima del Deployment)

Per testare in locale prima del deployment:

```bash
cd frontend
npm install
npm run dev
```

Poi apri:
```
http://localhost:3000/embed-fast?shop=test.myshopify.com&locale=en&currency=EUR
```

Nella console dovresti vedere:
```
🚀 Fast embed: Modal opened immediately, background loading started
Store data from URL params: {shop: "test.myshopify.com", locale: "en", currency: "EUR"}
```

## Troubleshooting

### Ancora 404 dopo il deployment?

**1. Pulisci la cache del browser:**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```
O apri in modalità incognito

**2. Verifica che il deployment sia completato:**
- Controlla su GitHub Actions
- Verifica che non ci siano errori nel log di build

**3. Controlla i Network logs:**
- Apri DevTools > Network
- Ricarica la pagina
- Verifica che `/embed-fast` restituisca 200
- Verifica che `/_next/static/chunks/*.js` restituiscano 200

**4. Verifica la configurazione Azure:**
```bash
# Scarica i logs di Azure
az staticwebapp show --name proud-sand-065a1dc03 --query "defaultHostname"
```

### I parametri non vengono ricevuti?

Verifica nella console del browser. Dovresti vedere:
```javascript
Store data from URL params: {shop: "...", locale: "...", currency: "..."}
```

Se non vedi questo log:
1. Verifica che l'URL abbia i query parameters
2. Verifica che non ci siano errori JS nella console
3. Verifica che `URLSearchParams` funzioni nel browser

### Gli chunks JS restituiscono 404?

Questo significa che la configurazione `staticwebapp.config.json` non è stata applicata:
1. Verifica che il file sia nella cartella `frontend/`
2. Verifica che sia stato committato e pushato
3. Aspetta che il deployment sia completato
4. Pulisci la cache del browser

## Configurazione Finale

### File Modificati
- ✅ `frontend/staticwebapp.config.json` - Routing e headers
- ✅ `frontend/next.config.js` - Auto-detection mode
- ✅ `.github/workflows/azure-static-web-apps-proud-sand-065a1dc03.yml` - Output location
- ✅ `frontend/src/app/embed-fast/page.tsx` - Query params support (già presente)

### Nessuna Modifica Richiesta
- ✅ Codice Shopify - funziona come prima
- ✅ API routes - continuano a funzionare
- ✅ Altre pagine - nessun impatto

## Prossimi Passi

1. ✅ Commit e push delle modifiche
2. ⏳ Attendi il deployment (3-5 minuti)
3. ✅ Testa la pagina senza parametri
4. ✅ Testa la pagina con parametri
5. ✅ Testa da Shopify iframe
6. ✅ Verifica che i parametri siano ricevuti correttamente

## Note Importanti

- **Auto-detection:** Azure Static Web Apps detecta automaticamente Next.js e configura il runtime
- **API Routes:** Continuano a funzionare perché non usiamo export statico
- **Query Parameters:** Vengono letti automaticamente dalla pagina embed-fast
- **Cache:** Azure mette cache aggressiva sui file statici, quindi potrebbe servire tempo per vedere gli aggiornamenti

## Supporto

Se dopo queste modifiche continui ad avere problemi:

1. Controlla i logs di deployment su GitHub Actions
2. Verifica i logs su Azure Portal
3. Testa in locale con `npm run dev` per escludere problemi di codice
4. Verifica che tutti i file siano stati committati e pushati

## Risultato Atteso

Dopo il deployment, dovresti poter:
- ✅ Aprire `/embed-fast` senza 404
- ✅ Aprire `/embed-fast?shop=...&locale=...&currency=...` senza 404
- ✅ Vedere i chunk JS caricarsi correttamente
- ✅ Ricevere i parametri nella pagina
- ✅ Usare l'iframe da Shopify senza problemi

