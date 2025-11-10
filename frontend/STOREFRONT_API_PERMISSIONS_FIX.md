# Fix 401 Unauthorized - Storefront API Cart Operations

## Il Problema

Ricevi `401 UNAUTHORIZED` quando provi a creare o modificare il carrello usando la Storefront API.

**Causa**: Il token Storefront (`SHOPIFY_STOREFRONT_ACCESS_TOKEN`) non ha i permessi necessari per operare sul carrello.

---

## Soluzione: Abilita i Permessi nel Canale Headless

### Passo 1: Apri le Impostazioni del Canale Headless

1. Vai su **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Clicca su **Headless** (il canale che hai creato per generare lo Storefront token)
3. Clicca su **Manage**

### Passo 2: Modifica i Permessi della Storefront API

1. Scorri fino alla sezione **Storefront API access scopes** o **Storefront API permissions**
2. Clicca sull'icona **Edit** (matita ✏️)
3. **Assicurati che siano abilitati questi permessi**:

   #### Permessi Richiesti per Cart/Checkout:
   - ✅ `unauthenticated_read_product_listings` - Lettura prodotti
   - ✅ `unauthenticated_write_checkouts` - Creazione/modifica checkout
   - ✅ `unauthenticated_read_checkouts` - Lettura checkout
   - ✅ `unauthenticated_read_customers` - (Opzionale) Se serve leggere info cliente
   - ✅ `unauthenticated_write_customers` - (Opzionale) Se serve creare clienti

   > **Nota**: Le operazioni sul carrello (`cartCreate`, `cartLinesAdd`, ecc.) sono sotto `unauthenticated_write_checkouts`!

4. **Salva** le modifiche

### Passo 3: Rigenera il Token Storefront

⚠️ **IMPORTANTE**: I permessi vengono "bloccati" nel token al momento della generazione. Devi rigenerare il token!

1. Nella stessa pagina **Headless → Manage**
2. Vai alla sezione **Storefront API access token**
3. Clicca su **Create new private access token** o **Regenerate token**
4. Copia il nuovo token (inizia con `shpat_...`)

### Passo 4: Aggiorna le Variabili d'Ambiente

#### Su Azure Static Web Apps:
1. Vai su **Azure Portal** → La tua Static Web App
2. **Configuration** → **Application settings**
3. Trova `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
4. Clicca **Edit** e incolla il nuovo token
5. **Save** → Attendi il restart automatico (~30 secondi)

#### In locale (`.env.local`):
```bash
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_NUOVO_TOKEN_QUI
```

### Passo 5: Testa di Nuovo

1. Ricarica l'app (o attendi il restart di Azure)
2. Vai su `/shopify-test` oppure `/cart-test`
3. Prova a creare un carrello

---

## Verifica dei Permessi via API (Opzionale)

Se vuoi verificare quali permessi ha il token attuale, puoi fare una query GraphQL:

```graphql
query {
  shop {
    name
  }
}
```

- Se restituisce `401 UNAUTHORIZED` → il token è sbagliato o scaduto
- Se restituisce `shop { name: "..." }` → il token funziona, ma questa query è solo Admin API (non Storefront)

Per la Storefront API, usa invece:

```graphql
query {
  products(first: 1) {
    edges {
      node {
        id
        title
      }
    }
  }
}
```

---

## Checklist Finale

- [ ] Ho abilitato `unauthenticated_write_checkouts` nel canale Headless
- [ ] Ho abilitato `unauthenticated_read_checkouts` nel canale Headless
- [ ] Ho abilitato `unauthenticated_read_product_listings` nel canale Headless
- [ ] Ho rigenerato il token Storefront dopo aver cambiato i permessi
- [ ] Ho aggiornato `SHOPIFY_STOREFRONT_ACCESS_TOKEN` su Azure
- [ ] Ho fatto restart dell'app (o atteso il restart automatico)
- [ ] `/api/shopify/cart/test` restituisce `success: true`

---

## Risoluzione Problemi

### Errore: "Storefront API access scopes non visibile"
Se non vedi la sezione permessi:
1. Assicurati di essere nel canale **Headless** (non nell'app custom)
2. Prova a creare un nuovo canale Headless se quello attuale è corrotto

### Errore: "401 persiste anche dopo aver rigenerato il token"
1. Verifica che il token copiato sia completo (nessuno spazio o a capo)
2. Verifica che il token inizi con `shpat_` (Storefront) e NON `shpat_` (Admin)
3. Controlla i log di Azure per vedere se la variabile è caricata correttamente
4. Prova a fare un hard refresh dell'app (Ctrl+Shift+R)

### Errore: "shop parameter is required"
Questo è un altro errore. Assicurati che la query string `?shop=dermaself-demo.myshopify.com` sia presente nell'URL.

---

## Riferimenti Shopify

- [Storefront API Scopes](https://shopify.dev/docs/api/usage/access-scopes#unauthenticated-access-scopes)
- [Cart API](https://shopify.dev/docs/api/storefront/2024-01/mutations/cartCreate)
- [Headless Sales Channel](https://shopify.dev/docs/custom-storefronts/building-with-the-storefront-api/getting-started#step-1-enable-storefront-api-access)

