# Deployment Fix per Embed-Fast 404

## Problema Attuale

Dopo le modifiche al `staticwebapp.config.json`, la pagina `/embed-fast` restituisce 404. Questo è normale perché **le modifiche non sono ancora state deployate**.

## Soluzione: Deploy delle Modifiche

### Opzione 1: Deployment Automatico (se configurato su Azure)

Se hai GitHub Actions o Azure Pipelines configurato:

```bash
# Commit e push delle modifiche
git add .
git commit -m "Fix: Azure Static Web Apps config for Next.js routing with query params"
git push origin develop-neutral-demo
```

Il deployment dovrebbe partire automaticamente.

### Opzione 2: Deployment Manuale

Se non hai CI/CD configurato, devi fare il build e deploy manualmente:

```bash
# 1. Entra nella cartella frontend
cd frontend

# 2. Installa dipendenze (se necessario)
npm install

# 3. Build di produzione
npm run build

# 4. Deploy su Azure Static Web Apps usando Azure CLI
# (richiede Azure CLI installato e autenticato)
az staticwebapp deploy --name <your-app-name> --source ./out
```

## Verifica del Deployment

Dopo il deployment, verifica che tutto funzioni:

### Test 1: Pagina Base
```
https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast
```
✅ Dovrebbe caricare la pagina (non più 404)

### Test 2: Con Query Parameters
```
https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast?shop=dermaself-dev2.myshopify.com&locale=en&currency=EUR
```
✅ Dovrebbe caricare la pagina E i chunks JS
✅ La console dovrebbe mostrare: `Store data from URL params: {shop: "...", locale: "...", currency: "..."}`

### Test 3: Da Shopify Iframe
Usa il tuo codice Shopify esistente:
```javascript
iframe.src = `${baseUrl}?shop=${shop}&locale=${locale}&currency=${currency}`;
```
✅ L'iframe dovrebbe caricarsi senza errori
✅ I parametri dovrebbero essere ricevuti correttamente

## Cosa Ho Modificato

### 1. `frontend/staticwebapp.config.json`
- ✅ Aggiunto `exclude` per evitare che i file `/_next/*` vengano reindirizzati a index.html
- ✅ Aggiunto `mimeTypes` per assicurare che i file .js abbiano il content-type corretto
- ✅ Mantenuti i `globalHeaders` per camera/iframe permissions

### 2. `frontend/src/app/embed-fast/page.tsx`
- ✅ Legge i query parameters (`shop`, `locale`, `currency`) dall'URL
- ✅ Supporta anche postMessage per compatibilità futura
- ✅ Logs nella console per debugging

## Configurazione Finale

### `staticwebapp.config.json`
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

## Codice Shopify (invariato)

Il tuo codice Shopify può rimanere così:

```javascript
const baseUrl = 'https://proud-sand-065a1dc03.2.azurestaticapps.net/embed-fast';
const shop = '{{ shop.permanent_domain }}';
const locale = '{{ request.locale.iso_code }}';
const currency = '{{ shop.currency }}';

const params = new URLSearchParams({ shop, locale, currency });
iframe.src = `${baseUrl}?${params.toString()}`;
```

I parametri saranno letti dalla pagina embed-fast e disponibili tramite:
```javascript
// Nella console della pagina embed-fast
// Dovresti vedere: "Store data from URL params: {shop: "...", locale: "en", currency: "EUR"}"
```

## Troubleshooting

### Se ancora vedi 404 dopo il deployment:

1. **Pulisci la cache del browser**
   ```
   Ctrl + Shift + Delete (Windows)
   Cmd + Shift + Delete (Mac)
   ```
   Oppure apri in modalità incognito

2. **Verifica che il deployment sia completato**
   - Controlla su Azure Portal
   - Verifica i logs di deployment

3. **Verifica il build output**
   Dopo `npm run build`, dovresti vedere:
   ```
   ✓ Generating static pages
   ✓ Finalizing page optimization
   Route (app)                              Size
   ┌ ○ /                                    ...
   ├ ○ /embed-fast                          ...
   └ ○ /embed                               ...
   ```

4. **Controlla i Network logs nel browser**
   - Apri DevTools > Network
   - Ricarica la pagina
   - Verifica che `/embed-fast` restituisca 200 (non 404)
   - Verifica che i chunks `/_next/static/chunks/*.js` restituiscano 200

### Se i parametri non vengono ricevuti:

Controlla la console del browser. Dovresti vedere:
```
🚀 Fast embed: Modal opened immediately, background loading started
Store data from URL params: {shop: "dermaself-dev2.myshopify.com", locale: "en", currency: "EUR"}
```

Se non vedi questo log, i parametri non sono nell'URL. Verifica il codice Shopify.

## Note Importanti

1. **Il 404 attuale è normale** - finché non fai il redeploy, il sito usa ancora la vecchia configurazione
2. **Dopo il deployment** - la pagina dovrebbe funzionare sia con che senza query parameters
3. **I chunk JS** - non dovrebbero più restituire 404 grazie alle exclusions nel navigationFallback
4. **I parametri** - vengono letti automaticamente dall'URL e salvati in `storeData`

## Prossimi Passi

1. ✅ Commit e push delle modifiche
2. ⏳ Attendi il deployment automatico (o fai deployment manuale)
3. ✅ Testa la pagina senza parametri
4. ✅ Testa la pagina con parametri
5. ✅ Testa da Shopify iframe

Una volta completato il deployment, tutto dovrebbe funzionare correttamente!

