# 🔧 Fix Rapido 401 UNAUTHORIZED - Cart API

## 🎯 TL;DR

Il tuo `SHOPIFY_STOREFRONT_ACCESS_TOKEN` **NON ha i permessi per gestire il carrello**.

---

## ✅ Soluzione in 3 Passi

### 1️⃣ Abilita i Permessi sul Canale Headless

**Shopify Admin → Settings → Apps and sales channels → Headless → Manage**

Nella sezione **Storefront API access scopes**, clicca **Edit** (✏️) e abilita:

- ✅ `unauthenticated_read_product_listings`
- ✅ `unauthenticated_write_checkouts` ← **QUESTO È FONDAMENTALE PER IL CART**
- ✅ `unauthenticated_read_checkouts`

**Salva** le modifiche.

---

### 2️⃣ Rigenera il Token

⚠️ **I permessi vengono bloccati al momento della creazione del token!**

Nella stessa pagina **Headless → Manage**:
1. Vai alla sezione **Storefront API access token**
2. Clicca **Create new private access token**
3. Copia il nuovo token (inizia con `shpat_...`)

---

### 3️⃣ Aggiorna la Variabile su Azure

**Azure Portal → Static Web App → Configuration → Application settings**

1. Trova `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
2. Clicca **Edit**
3. Incolla il **nuovo token**
4. **Save**
5. Attendi il restart automatico (~30 secondi)

---

## 🧪 Testa

Ricarica l'app e vai su:

```
https://salmon-sea-09f275703.3.azurestaticapps.net/shopify-test?shop=dermaself-demo.myshopify.com
```

Clicca su **"Test Shopify Cart API Connection"**

✅ **Dovrebbe restituire**: `success: true, message: "Storefront API connection successful"`

Poi prova ad aggiungere un prodotto al carrello.

---

## ❌ Se Ancora Non Funziona

### Verifica 1: Il Token è Storefront?
Il token deve iniziare con `shpat_` (Storefront), NON `shpat_` (Admin).

### Verifica 2: Il Token è Completo?
Copia/incolla senza spazi, a capo o caratteri nascosti.

### Verifica 3: Azure Ha Caricato la Variabile?
Vai su **Azure Portal → Configuration** e verifica che `SHOPIFY_STOREFRONT_ACCESS_TOKEN` sia impostato correttamente.

### Verifica 4: L'App è stata Restartata?
Dopo aver salvato le variabili, Azure impiega ~30 secondi per restartare l'app. Attendi e poi riprova.

---

## 📚 Dettagli Tecnici

### Perché `unauthenticated_write_checkouts`?

In Shopify, le operazioni sul carrello (`cartCreate`, `cartLinesAdd`, ecc.) fanno parte del flusso di **checkout**. Per questo motivo, il permesso si chiama `write_checkouts` anche se stai solo creando un carrello.

### Differenza tra Admin API e Storefront API

- **Admin API**: Usa `X-Shopify-Access-Token` con un token OAuth (`shpat_...`). Gestisce ordini, prodotti, clienti, ecc.
- **Storefront API**: Usa `X-Shopify-Storefront-Access-Token` con un token pubblico (`shpat_...`). Gestisce carrelli, checkout, catalogo prodotti per i clienti.

La tua app usa **entrambe**:
- Admin API per gestire prodotti e ordini (dopo OAuth)
- Storefront API per creare/modificare carrelli (con token pubblico)

---

## 🆘 Contatti

Se il problema persiste, controlla:
1. I log di Azure (Portal → Log stream)
2. La console del browser (F12) per eventuali errori JavaScript
3. La documentazione Shopify: https://shopify.dev/docs/api/storefront

