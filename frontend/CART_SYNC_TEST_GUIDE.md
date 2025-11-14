# 🧪 Guida al Test della Sincronizzazione del Carrello

## Test Checklist Completa

Usa questa guida per verificare che la sincronizzazione bidirezionale del carrello funzioni correttamente.

---

## 🔄 TEST 1: App → Store (Aggiungi Prodotto)

### Steps:
1. **Apri l'app Dermaself** in un browser
2. **Aggiungi un prodotto al carrello** (clicca "Aggiungi al Carrello")
3. **Apri un nuovo tab** e vai su `https://dermaself-demo.myshopify.com/cart`

### ✅ Risultato Atteso:
- Il prodotto aggiunto nell'app **è presente** nel carrello dello store
- La quantità corrisponde
- Gli attributi personalizzati sono presenti (es. `recommended_by_dermaself: true`)

### ❌ Se Fallisce:
- Controlla la console browser per errori
- Verifica che `/api/shopify/cart/ajax` risponda 200 OK
- Verifica che il shop parameter sia corretto nell'URL

---

## 🔄 TEST 2: Store → App (Aggiungi Prodotto)

### Steps:
1. **Apri l'app Dermaself** in un tab del browser
2. **Apri un nuovo tab** e vai su `https://dermaself-demo.myshopify.com/products/[qualche-prodotto]`
3. **Aggiungi il prodotto al carrello** dallo store (clicca "Add to Cart")
4. **Torna sul tab dell'app** (cambia tab)

### ✅ Risultato Atteso:
- **Immediatamente** (entro 1-2 secondi), l'app mostra il nuovo prodotto nel carrello
- L'icona del carrello si aggiorna con il numero corretto di articoli
- Se apri il carrello nell'app, il prodotto è visibile

### ❌ Se Fallisce:
- Verifica che l'evento `focus` venga triggato (guarda la console: "Page focused - refreshing cart")
- Controlla che `refreshCart()` venga chiamato
- Verifica che `/api/shopify/cart/ajax` (GET) risponda con il carrello aggiornato

---

## 🔄 TEST 3: App → Store (Modifica Quantità)

### Steps:
1. **Nell'app**, aggiungi un prodotto al carrello
2. **Nell'app**, modifica la quantità (es. da 1 a 3) usando i bottoni +/-
3. **Apri `/cart` sullo store** in un nuovo tab

### ✅ Risultato Atteso:
- La quantità del prodotto nello store corrisponde a quella nell'app (3)

### ❌ Se Fallisce:
- Verifica che `updateCartItem()` chiami `/api/shopify/cart/ajax` con `operation: 'change'`
- Controlla che il `lineId` sia corretto (deve essere il `key` del line item)

---

## 🔄 TEST 4: Store → App (Modifica Quantità)

### Steps:
1. **Sullo store**, vai su `/cart`
2. **Modifica la quantità** di un prodotto (es. da 1 a 5)
3. **Clicca "Update Cart"** sullo store
4. **Torna sul tab dell'app**

### ✅ Risultato Atteso:
- La quantità nell'app si aggiorna a 5
- Il totale del carrello si aggiorna correttamente

### ❌ Se Fallisce:
- Aspetta 30 secondi (polling) e verifica se si aggiorna
- Controlla la console: "Page focused - refreshing cart" o "Page visible - refreshing cart"

---

## 🔄 TEST 5: App → Store (Rimuovi Prodotto)

### Steps:
1. **Nell'app**, aggiungi alcuni prodotti al carrello
2. **Nell'app**, clicca il bottone "Rimuovi" (icona cestino) su un prodotto
3. **Apri `/cart` sullo store**

### ✅ Risultato Atteso:
- Il prodotto rimosso **non è più presente** nel carrello dello store

### ❌ Se Fallisce:
- Verifica che `removeFromCart()` chiami `/api/shopify/cart/ajax` con `operation: 'change'` e `quantity: 0`
- Controlla che il `lineId` passato sia corretto

---

## 🔄 TEST 6: Store → App (Rimuovi Prodotto)

### Steps:
1. **Sullo store**, vai su `/cart`
2. **Rimuovi un prodotto** (cambia quantità a 0 o clicca "Remove")
3. **Torna sul tab dell'app**

### ✅ Risultato Atteso:
- Il prodotto rimosso **non è più visibile** nell'app
- L'icona del carrello si aggiorna con il numero corretto

### ❌ Se Fallisce:
- Aspetta 30 secondi per il polling
- Verifica che `refreshCart()` venga chiamato on focus

---

## 🔄 TEST 7: App → Store (Svuota Carrello)

### Steps:
1. **Nell'app**, aggiungi alcuni prodotti al carrello
2. **Nell'app**, clicca "Svuota Carrello"
3. **Conferma** l'azione nel popup
4. **Attendi** il completamento (vedi spinner)
5. **Apri `/cart` sullo store**

### ✅ Risultato Atteso:
- Il carrello dello store è **completamente vuoto**
- Messaggio: "Your cart is currently empty"

### ❌ Se Fallisce:
- Verifica che `clearCart()` chiami `/api/shopify/cart/ajax` con `operation: 'clear'`
- Controlla la risposta dell'API (deve essere 200 OK)

---

## 🔄 TEST 8: Store → App (Svuota Carrello)

### Steps:
1. **Sullo store**, vai su `/cart`
2. **Rimuovi tutti i prodotti** uno per uno (o usa un bottone "Clear Cart" se disponibile)
3. **Torna sul tab dell'app**

### ✅ Risultato Atteso:
- L'app mostra "Il tuo carrello è vuoto"
- L'icona del carrello mostra 0 articoli

### ❌ Se Fallisce:
- Aspetta 30 secondi per il polling
- Verifica l'evento focus

---

## 🔄 TEST 9: Polling Automatico (30 secondi)

### Steps:
1. **Apri l'app** in un tab
2. **In un altro tab**, aggiungi/rimuovi prodotti dal carrello dello store
3. **NON tornare** sul tab dell'app
4. **Attendi 30 secondi**
5. **Dopo 30 secondi**, guarda il tab dell'app (senza cliccare)

### ✅ Risultato Atteso:
- L'app si sincronizza automaticamente dopo 30 secondi
- Puoi vedere l'icona del carrello aggiornarsi

### ❌ Se Fallisce:
- Controlla la console: dovrebbe loggare richieste a `/api/shopify/cart/ajax` ogni 30s
- Verifica che l'intervallo non sia stato cancellato

---

## 🔄 TEST 10: Checkout Flow

### Steps:
1. **Nell'app**, aggiungi alcuni prodotti al carrello
2. **Nell'app**, clicca "Procedi al Checkout"
3. **Verifica** che vieni reindirizzato al checkout di Shopify
4. **Verifica** che i prodotti nel checkout corrispondano a quelli nell'app

### ✅ Risultato Atteso:
- Redirect a `https://dermaself-demo.myshopify.com/cart/c/[cart-id]?key=[key]` o `/checkout`
- Tutti i prodotti aggiunti nell'app sono presenti nel checkout
- Le quantità sono corrette

### ❌ Se Fallisce:
- Verifica che `proceedToCheckout()` usi `state.cart.checkoutUrl`
- Controlla che il checkoutUrl sia valido

---

## 🔄 TEST 11: Loading States

### Steps:
1. **Nell'app**, fai qualsiasi operazione sul carrello
2. **Osserva** l'interfaccia durante l'operazione

### ✅ Risultato Atteso:
- Spinner/loader visibile durante l'operazione
- Bottoni disabilitati durante l'operazione
- Overlay globale per operazioni pesanti (es. svuota carrello)
- Toast di successo al completamento

### ❌ Se Fallisce:
- Verifica che `dispatch({ type: 'SHOW_GLOBAL_LOADING' })` venga chiamato
- Controlla che `setIsLoading(true)` sia impostato prima delle operazioni

---

## 🔄 TEST 12: Error Handling

### Steps:
1. **Simula un errore**: Disconnetti la rete o modifica il proxy per ritornare un errore
2. **Nell'app**, prova ad aggiungere un prodotto al carrello
3. **Osserva** il comportamento

### ✅ Risultato Atteso:
- Messaggio di errore visibile all'utente (rosso)
- Nessun crash dell'app
- Lo stato del carrello rimane consistente

### ❌ Se Fallisce:
- Verifica che ci sia un `try/catch` in ogni funzione del carrello
- Controlla che `dispatch({ type: 'SET_ERROR' })` venga chiamato

---

## 🔄 TEST 13: Persistenza LocalStorage

### Steps:
1. **Nell'app**, aggiungi prodotti al carrello
2. **Ricarica la pagina** (F5)

### ✅ Risultato Atteso:
- Il carrello è **ancora visibile** dopo il reload
- I prodotti sono gli stessi di prima del reload
- **POI**, dopo il caricamento, il carrello si sincronizza con Shopify (potrebbe cambiare se modificato altrove)

### ❌ Se Fallisce:
- Verifica che ci sia il `useEffect` che salva in localStorage
- Controlla che il `useEffect` di caricamento da localStorage sia presente

---

## 🔄 TEST 14: Multiple Products (Stress Test)

### Steps:
1. **Nell'app**, aggiungi 10+ prodotti al carrello
2. **Modifica** le quantità di alcuni
3. **Rimuovi** alcuni prodotti
4. **Verifica** sul carrello dello store

### ✅ Risultato Atteso:
- Tutte le operazioni si sincronizzano correttamente
- Nessun ritardo percepibile
- L'interfaccia rimane responsive

### ❌ Se Fallisce:
- Potrebbe essere un problema di performance
- Verifica che non ci siano loop infiniti di refresh

---

## 🔄 TEST 15: Alternative Products (RoutineProductCard)

### Steps:
1. **Nell'app**, vai sulla pagina dei risultati della routine
2. **Espandi** le alternative di un prodotto
3. **Aggiungi** un'alternativa al carrello
4. **Verifica** che l'icona del carrello si aggiorni
5. **Verifica** sul carrello dello store

### ✅ Risultato Atteso:
- L'alternativa viene aggiunta al carrello
- Gli attributi custom indicano `recommendation_type: skin_analysis_alternative`
- Il carrello dello store si aggiorna

### ❌ Se Fallisce:
- Verifica che `RoutineProductCard` usi `addToCart()` dal CartContext
- Controlla che passi i custom attributes corretti

---

## 📊 Tabella Riepilogativa

| # | Test | Direzione | Trigger | Tempo Atteso | Status |
|---|------|-----------|---------|--------------|--------|
| 1 | Aggiungi prodotto | App → Store | Immediato | < 1s | ⬜ |
| 2 | Aggiungi prodotto | Store → App | Focus | < 2s | ⬜ |
| 3 | Modifica quantità | App → Store | Immediato | < 1s | ⬜ |
| 4 | Modifica quantità | Store → App | Focus | < 2s | ⬜ |
| 5 | Rimuovi prodotto | App → Store | Immediato | < 1s | ⬜ |
| 6 | Rimuovi prodotto | Store → App | Focus | < 2s | ⬜ |
| 7 | Svuota carrello | App → Store | Immediato | < 1s | ⬜ |
| 8 | Svuota carrello | Store → App | Focus | < 2s | ⬜ |
| 9 | Polling automatico | Store → App | 30s | 30s | ⬜ |
| 10 | Checkout flow | App → Store | Immediato | < 1s | ⬜ |
| 11 | Loading states | App | - | - | ⬜ |
| 12 | Error handling | App | - | - | ⬜ |
| 13 | LocalStorage | App | Page reload | < 1s | ⬜ |
| 14 | Stress test | Both | - | < 2s | ⬜ |
| 15 | Alternatives | App → Store | Immediato | < 1s | ⬜ |

---

## 🐛 Debug Tools

### Console Commands

Apri la console del browser (F12) e usa questi comandi per debugging:

```javascript
// 1. Verifica stato del carrello
console.log(localStorage.getItem('shopify-cart'));

// 2. Forza refresh del carrello
// (trova l'istanza del CartContext e chiama refreshCart)

// 3. Verifica eventi di focus
window.addEventListener('focus', () => console.log('FOCUS EVENT'));
document.addEventListener('visibilitychange', () => console.log('VISIBILITY CHANGE'));

// 4. Simula chiamata API
fetch('/api/shopify/cart/ajax?shop=dermaself-demo.myshopify.com')
  .then(r => r.json())
  .then(console.log);

// 5. Verifica polling
// Guarda la console per log ogni 30 secondi
```

### Network Tab

1. Apri **DevTools** (F12)
2. Vai su **Network**
3. Filtra per `/api/shopify/cart/ajax`
4. Osserva le richieste:
   - **GET** = refresh cart
   - **POST** con `operation: add` = add to cart
   - **POST** con `operation: change` = update/remove
   - **POST** con `operation: clear` = clear cart

---

## ✅ Criteri di Successo

L'integrazione è considerata **completa e funzionante** se:

- ✅ Tutti i 15 test passano
- ✅ Nessun errore nella console
- ✅ Sincronizzazione bidirezionale < 2 secondi (con focus)
- ✅ Polling funziona correttamente (30 secondi)
- ✅ Loading states e error handling funzionano
- ✅ Checkout flow completo funziona
- ✅ Nessun CORS error
- ✅ Nessun crash o loop infinito

---

## 📞 Supporto

Se alcuni test falliscono:

1. **Controlla la console** per errori specifici
2. **Verifica il network tab** per richieste fallite
3. **Consulta** `CART_SYNC_BIDIRECTIONAL.md` per troubleshooting
4. **Controlla** `CORS_FIX_AND_PROXY.md` per problemi CORS
5. **Rivedi** i file modificati: `CartContext.tsx`, `Cart.tsx`

---

**Buon Testing! 🚀**

