# 🔄 Sincronizzazione Bidirezionale del Carrello

## Panoramica

Questa documentazione spiega come l'app Dermaself è **fully integrated** con lo store Shopify, permettendo una sincronizzazione bidirezionale completa del carrello tra:
- **App Dermaself** ↔️ **Store Shopify**

## ✅ Funzionalità Implementate

### 1. **Dall'App → Store Shopify**

Tutte le operazioni eseguite nell'app si sincronizzano immediatamente con lo store:

| Azione | Endpoint | Sincronizzazione |
|--------|----------|------------------|
| ➕ Aggiungi prodotto | `POST /api/shopify/cart/ajax` (operation: add) | ✅ Immediata |
| 🔄 Modifica quantità | `POST /api/shopify/cart/ajax` (operation: change) | ✅ Immediata |
| ❌ Rimuovi prodotto | `POST /api/shopify/cart/ajax` (operation: change, qty: 0) | ✅ Immediata |
| 🗑️ Svuota carrello | `POST /api/shopify/cart/ajax` (operation: clear) | ✅ Immediata |

**Come Funziona:**
```typescript
// Esempio: Aggiunta prodotto
await fetch(`/api/shopify/cart/ajax?shop=${shop}`, {
  method: 'POST',
  body: JSON.stringify({
    operation: 'add',
    items: [{ id: variantId, quantity: 1, properties: {...} }]
  })
});
// → Il backend chiama Shopify Cart Ajax API /cart/add.js
// → Lo store Shopify si aggiorna immediatamente
```

### 2. **Store Shopify → App Dermaself**

Quando modifichi il carrello direttamente sullo store Shopify, l'app si sincronizza automaticamente tramite **4 meccanismi**:

#### 🔄 Meccanismo 1: Polling Automatico (ogni 30 secondi)
```typescript
useEffect(() => {
  const intervalId = setInterval(() => {
    refreshCart(); // Fetcha il carrello da Shopify
  }, 30000);
  return () => clearInterval(intervalId);
}, [refreshCart]);
```

**Scenario:**
1. Utente aggiunge prodotto sullo store: `/cart?add=123456:1`
2. Dopo max 30 secondi, l'app fetcha il carrello aggiornato
3. L'UI si aggiorna con il nuovo prodotto

#### 👁️ Meccanismo 2: Refresh on Focus (quando l'utente torna sulla tab)
```typescript
useEffect(() => {
  const handleFocus = () => {
    refreshCart();
  };
  
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      refreshCart();
    }
  };

  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}, [refreshCart]);
```

**Scenario:**
1. Utente ha l'app aperta in un tab
2. Apre un nuovo tab e va su `/cart` dello store Shopify
3. Modifica il carrello (aggiunge/rimuove prodotti)
4. Torna sul tab dell'app
5. **Immediatamente** l'app si sincronizza con il carrello aggiornato

#### 🚀 Meccanismo 3: App Bridge Events (per app embedded)
```typescript
useEffect(() => {
  const app = getAppBridge();
  if (!app) return;
  
  const unsubscribe = app.subscribe(AppBridgeCart.Action.UPDATE, () => {
    refreshCart();
  });
}, [refreshCart]);
```

**Scenario:**
- Se l'app è embedded in Shopify Admin
- Shopify notifica automaticamente l'app quando il carrello cambia
- L'app si sincronizza immediatamente

#### 📨 Meccanismo 4: PostMessage Events (per comunicazione custom)
```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'CART_UPDATE_SUCCESS' || 
        event.data.type === 'CART_DATA') {
      const cart = transformAjaxCartToCart(event.data.payload.cart);
      dispatch({ type: 'SET_CART', payload: cart });
    }
  };
  
  window.addEventListener('message', handleMessage);
}, []);
```

**Scenario:**
- Se hai script Liquid personalizzati nel tema che inviano messaggi all'app
- L'app riceve notifiche in tempo reale

---

## 🛠️ Implementazione Tecnica

### CartContext.tsx - Core della Sincronizzazione

```typescript
// 1. Refresh Cart Function (fetcha il carrello da Shopify)
const refreshCart = useCallback(async () => {
  try {
    const shop = getShopifyDomain();
    const response = await fetch(`/api/shopify/cart/ajax?shop=${encodeURIComponent(shop)}`);
    const ajaxCart = await response.json();
    const transformedCart = transformAjaxCartToCart(ajaxCart);
    dispatch({ type: 'SET_CART', payload: transformedCart });
  } catch (error) {
    console.error('Failed to refresh cart:', error);
  }
}, []);

// 2. Add to Cart (sincronizza con Shopify)
const addToCart = async (variantId: string, quantity: number) => {
  const response = await fetch(`/api/shopify/cart/ajax?shop=${shop}`, {
    method: 'POST',
    body: JSON.stringify({
      operation: 'add',
      items: [{ id: numericVariantId, quantity, properties }]
    })
  });
  const ajaxCart = await response.json();
  const transformedCart = transformAjaxCartToCart(ajaxCart);
  dispatch({ type: 'SET_CART', payload: transformedCart });
};

// 3. Update Cart Item (sincronizza con Shopify)
const updateCartItem = async (lineId: string, quantity: number) => {
  const response = await fetch(`/api/shopify/cart/ajax?shop=${shop}`, {
    method: 'POST',
    body: JSON.stringify({
      operation: 'change',
      id: lineId,
      quantity: quantity
    })
  });
  const ajaxCart = await response.json();
  const transformedCart = transformAjaxCartToCart(ajaxCart);
  dispatch({ type: 'SET_CART', payload: transformedCart });
};

// 4. Remove from Cart (sincronizza con Shopify)
const removeFromCart = async (lineId: string) => {
  const response = await fetch(`/api/shopify/cart/ajax?shop=${shop}`, {
    method: 'POST',
    body: JSON.stringify({
      operation: 'change',
      id: lineId,
      quantity: 0  // Quantity 0 = remove
    })
  });
  const ajaxCart = await response.json();
  const transformedCart = transformAjaxCartToCart(ajaxCart);
  dispatch({ type: 'SET_CART', payload: transformedCart });
};

// 5. Clear Cart (sincronizza con Shopify)
const clearCart = async () => {
  const response = await fetch(`/api/shopify/cart/ajax?shop=${shop}`, {
    method: 'POST',
    body: JSON.stringify({
      operation: 'clear'
    })
  });
  dispatch({ type: 'CLEAR_CART' });
};
```

### Backend Proxy (evita CORS)

**File:** `frontend/src/app/api/shopify/cart/ajax/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { operation, ...data } = body; // add, change, clear
  
  const shopUrl = `https://${session.shop}`;
  const endpoint = `${shopUrl}/cart/${operation}.js`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: operation !== 'clear' ? JSON.stringify(data) : undefined
  });
  
  return NextResponse.json(await response.json());
}
```

---

## 🧪 Test di Sincronizzazione

### Scenario 1: Aggiungi Prodotto dall'App → Verifica su Store

1. **Nell'App**: Clicca "Aggiungi al Carrello" su un prodotto
2. **Verifica**: Apri `https://your-store.myshopify.com/cart`
3. **Risultato**: ✅ Il prodotto è presente nel carrello dello store

### Scenario 2: Modifica Carrello su Store → Verifica nell'App

1. **Sullo Store**: Vai su `/cart` e modifica quantità/rimuovi prodotti
2. **Nell'App**: 
   - **Opzione A**: Aspetta 30 secondi (polling)
   - **Opzione B**: Cambia tab e torna sull'app (focus)
3. **Risultato**: ✅ L'app mostra il carrello aggiornato

### Scenario 3: Svuota Carrello dall'App → Verifica su Store

1. **Nell'App**: Clicca "Svuota Carrello" e conferma
2. **Verifica**: Apri `/cart` sullo store
3. **Risultato**: ✅ Il carrello è vuoto

### Scenario 4: Aggiungi su Store → Torna sull'App

1. **Sullo Store**: Aggiungi prodotti via `/cart/add.js` o `/products/handle`
2. **Nell'App**: Cambia tab (torna sull'app)
3. **Risultato**: ✅ L'app mostra i nuovi prodotti immediatamente

---

## 📊 Diagramma di Flusso

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                              │
└──────────────────────────────────────────────────────────────────┘
           │                                    │
           │                                    │
    ┌──────▼──────┐                     ┌──────▼──────┐
    │  DALL'APP   │                     │ DALLO STORE │
    │  (React)    │                     │  (Liquid)   │
    └──────┬──────┘                     └──────┬──────┘
           │                                    │
           │ 1. Call /api/shopify/cart/ajax    │ 1. Modifica diretta
           │    con operation: add/change/clear │    /cart, /cart/add.js
           │                                    │
           ▼                                    ▼
    ┌─────────────────────────────────────────────────────┐
    │         BACKEND PROXY (Next.js API Route)            │
    │  /api/shopify/cart/ajax                              │
    │  → Chiama Shopify Cart Ajax API                      │
    │  → Ritorna carrello aggiornato                       │
    └──────────────────┬──────────────────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────────────────┐
    │          SHOPIFY CART AJAX API                       │
    │  /cart/add.js, /cart/change.js, /cart/clear.js      │
    │  /cart.js (GET per fetch)                            │
    └──────────────────┬──────────────────────────────────┘
                       │
                       │ ✅ SINGLE SOURCE OF TRUTH
                       │
                       ▼
    ┌─────────────────────────────────────────────────────┐
    │           SHOPIFY CART (Database)                    │
    │  Carrello persistente dello store                    │
    └──────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       │                               │
       ▼                               ▼
┌──────────────┐              ┌──────────────┐
│   APP SYNC   │              │  STORE VIEW  │
│  (4 methods) │              │   /cart      │
│              │              │   /checkout  │
│ 1. Polling   │              └──────────────┘
│ 2. Focus     │
│ 3. AppBridge │
│ 4. PostMsg   │
└──────────────┘
```

---

## 🔐 Sicurezza e Autenticazione

### Backend Validation

Ogni richiesta al proxy viene validata:

```typescript
// 1. Validazione shop parameter
if (!validateShopParameter(shop)) {
  return NextResponse.json({ error: 'Invalid shop' }, { status: 400 });
}

// 2. Verifica autenticazione
const session = getShopifySession(shop);
if (!session) {
  return NextResponse.json({ error: 'Shop not authenticated' }, { status: 401 });
}

// 3. Validazione operation
const validOperations = ['add', 'change', 'clear'];
if (!validOperations.includes(operation)) {
  return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
}
```

---

## 🚀 Performance & Ottimizzazioni

### 1. **Debouncing delle operazioni**
```typescript
// Previene chiamate multiple rapide
const now = Date.now();
if (now - lastSuccessModalTime > 2000) {
  // Esegui operazione
}
```

### 2. **Caching locale (localStorage)**
```typescript
// Salva carrello in localStorage per persistenza
useEffect(() => {
  if (state.cart) {
    localStorage.setItem('shopify-cart', JSON.stringify(state.cart));
  }
}, [state.cart]);
```

### 3. **Loading states granulari**
```typescript
// Loading globale per operazioni pesanti
dispatch({ type: 'SHOW_GLOBAL_LOADING' });

// Loading locale per operazioni specifiche
dispatch({ type: 'SET_LOADING', payload: true });
```

### 4. **Polling intelligente (30 secondi)**
```typescript
// Non troppo frequente (costa requests)
// Non troppo lento (esperienza utente)
const intervalId = setInterval(() => refreshCart(), 30000);
```

---

## 🐛 Troubleshooting

### Problema: L'app non si sincronizza quando modifico il carrello sullo store

**Soluzioni:**
1. ✅ Verifica che il polling sia attivo (ogni 30 secondi)
2. ✅ Prova a cambiare tab e tornare sull'app (trigger focus event)
3. ✅ Controlla la console per errori di rete
4. ✅ Verifica che `/api/shopify/cart/ajax` risponda correttamente

### Problema: CORS errors quando aggiungo al carrello

**Soluzione:**
✅ Tutte le chiamate devono passare tramite il proxy `/api/shopify/cart/ajax`
❌ **MAI** chiamare direttamente `https://your-store.myshopify.com/cart/add.js` dal frontend

### Problema: Il carrello si svuota quando ricarico la pagina

**Causa:** Il carrello non viene caricato all'inizializzazione

**Soluzione:**
```typescript
// Verifica che questo useEffect sia presente in CartContext
useEffect(() => {
  console.log('CartContext mounted - loading initial cart');
  refreshCart();
}, [refreshCart]);
```

### Problema: "No shop domain available"

**Causa:** Il dominio dello shop non è disponibile nel contesto

**Soluzioni:**
1. ✅ Verifica che `?shop=your-store.myshopify.com` sia nell'URL
2. ✅ Controlla che il cookie `ds_shopify_shop` sia impostato
3. ✅ Verifica che `getShopifyDomain()` ritorni un valore valido

---

## 📝 Checklist di Integrazione

- [x] ✅ Aggiungi prodotto dall'app → sincronizza con store
- [x] ✅ Rimuovi prodotto dall'app → sincronizza con store
- [x] ✅ Modifica quantità dall'app → sincronizza con store
- [x] ✅ Svuota carrello dall'app → sincronizza con store
- [x] ✅ Modifica carrello sullo store → app si aggiorna (polling 30s)
- [x] ✅ Modifica carrello sullo store → app si aggiorna (on focus)
- [x] ✅ Modifica carrello sullo store → app si aggiorna (App Bridge)
- [x] ✅ Caricamento iniziale carrello all'avvio app
- [x] ✅ Persistenza carrello in localStorage
- [x] ✅ Loading states per tutte le operazioni
- [x] ✅ Error handling e messaggi all'utente
- [x] ✅ Conferma prima di svuotare carrello
- [x] ✅ Toast di successo per operazioni completate
- [x] ✅ Redirect al checkout funzionante

---

## 🎯 Best Practices

### 1. **Sempre usare il proxy backend**
```typescript
✅ await fetch('/api/shopify/cart/ajax?shop=...')
❌ await fetch('https://store.myshopify.com/cart/add.js')
```

### 2. **Gestire sempre gli errori**
```typescript
try {
  await addToCart(variantId, quantity);
} catch (error) {
  console.error('Failed to add to cart:', error);
  // Mostra messaggio all'utente
}
```

### 3. **Usare loading states**
```typescript
setIsLoading(true);
try {
  await operation();
} finally {
  setIsLoading(false);
}
```

### 4. **Confermare azioni distruttive**
```typescript
if (!confirm('Sei sicuro di voler svuotare il carrello?')) {
  return;
}
await clearCart();
```

### 5. **Log per debugging**
```typescript
console.log('CartContext mounted - loading initial cart');
console.log('Page focused - refreshing cart');
console.log('Page visible - refreshing cart');
```

---

## 📚 File Modificati

| File | Modifiche | Scopo |
|------|-----------|-------|
| `CartContext.tsx` | ✅ `clearCart()` ora async e chiama API | Sincronizza svuotamento con Shopify |
| `CartContext.tsx` | ✅ Polling ogni 30s | Auto-sync con store |
| `CartContext.tsx` | ✅ Refresh on focus | Sync quando utente torna sulla tab |
| `CartContext.tsx` | ✅ Initial cart load | Carica carrello all'avvio |
| `Cart.tsx` | ✅ `handleClearCart()` async | Gestisce svuotamento con conferma |
| `Cart.tsx` | ✅ Loading state per clear | UI feedback durante svuotamento |

---

## 🎉 Risultato Finale

L'app Dermaself è ora **fully integrated** con lo store Shopify:

✅ **Bidirezionale**: Modifiche dall'app o dallo store si sincronizzano automaticamente
✅ **Tempo reale**: Polling + Focus events garantiscono sync rapida
✅ **Affidabile**: Proxy backend evita CORS e gestisce errori
✅ **User-friendly**: Loading states, conferme, toast di successo
✅ **Sicuro**: Validazione backend, autenticazione, error handling

---

**Ultimo Aggiornamento:** 12 Novembre 2025  
**Status:** ✅ Implementato e Testato

