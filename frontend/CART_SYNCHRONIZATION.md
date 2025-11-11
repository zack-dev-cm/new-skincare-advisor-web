# Sincronizzazione Carrello con Tema Liquid

## 📚 Linee Guida Shopify

Per le **app embedded** in uno store Shopify, Shopify raccomanda di usare il **Cart Ajax API** (`/cart/add.js`, `/cart/change.js`, `/cart.js`) per gestire il carrello del tema Liquid, invece della Storefront API Cart.

### Perché Ajax Cart API?

1. **Sincronizzazione Automatica**: Il carrello Ajax è condiviso tra il tema Liquid e la tua app
2. **Compatibilità**: Funziona con tutti i temi Shopify senza modifiche
3. **Nessun Conflitto**: Evita carrelli duplicati o non sincronizzati
4. **Performance**: Operazioni più veloci per carrelli embedded

### Documentazione Ufficiale

- [Cart Ajax API Reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [Apps in the Online Store](https://shopify.dev/docs/apps/build/online-store)

---

## 🔧 Modifiche Implementate

### 1. Nuova Funzione Helper: `transformAjaxCartToCart`

Trasforma il formato Ajax Cart API al formato interno dell'app:

```typescript
// Ajax Cart API format (centesimi)
{
  token: "abc123",
  items: [{
    variant_id: 123456,
    quantity: 1,
    final_price: 1550, // €15.50 in centesimi
    properties: { "key": "value" }
  }]
}

// Nostro formato interno (GraphQL-style)
{
  id: "abc123",
  lines: [{
    id: "key123",
    quantity: 1,
    merchandise: {
      id: "gid://shopify/ProductVariant/123456",
      price: {
        amount: "15.50",
        currencyCode: "EUR"
      }
    }
  }]
}
```

### 2. Funzioni Carrello Aggiornate

#### `addToCart()` - Aggiunta prodotti
- **Prima**: Usava Storefront API `cartCreate` mutation
- **Dopo**: Usa `POST /cart/add.js` con ID variante numerica
- **Formato ID**: Converte automaticamente da GraphQL (`gid://...`) a numerico

```typescript
// Chiamata Ajax API
fetch(`${shopifyUrl}/cart/add.js`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{
      id: numericVariantId,  // 123456 invece di gid://shopify/ProductVariant/123456
      quantity: 1,
      properties: {
        'recommended_by_dermaself': 'true'
      }
    }]
  })
})
```

#### `updateCartItem()` - Aggiornamento quantità
- **Prima**: Usava Storefront API `cartLinesUpdate` mutation
- **Dopo**: Usa `POST /cart/change.js`

```typescript
fetch(`${shopifyUrl}/cart/change.js`, {
  method: 'POST',
  body: JSON.stringify({
    id: lineId,        // key del line item
    quantity: newQuantity
  })
})
```

#### `removeFromCart()` - Rimozione prodotti
- **Prima**: Usava Storefront API `cartLinesRemove` mutation
- **Dopo**: Usa `POST /cart/change.js` con `quantity: 0`

```typescript
fetch(`${shopifyUrl}/cart/change.js`, {
  method: 'POST',
  body: JSON.stringify({
    id: lineId,
    quantity: 0  // Rimuove il prodotto
  })
})
```

#### `refreshCart()` - Refresh stato carrello
- **Prima**: Usava Storefront API `cart` query
- **Dopo**: Usa `GET /cart.js`

```typescript
const response = await fetch(`${shopifyUrl}/cart.js`);
const ajaxCart = await response.json();
```

### 3. Gestione Custom Attributes

Le custom attributes ora vengono trasformate in **properties** (formato Ajax API):

```typescript
// Prima (Storefront API)
customAttributes: [
  { key: "gift_wrap", value: "true" }
]

// Dopo (Ajax API)
properties: {
  "gift_wrap": "true",
  "recommended_by_dermaself": "true"
}
```

---

## ✅ Vantaggi della Sincronizzazione

### 1. Carrello Unificato
Quando un utente aggiunge un prodotto dalla tua app, appare immediatamente:
- Nel widget carrello del tema Liquid
- Nella pagina `/cart` del tema
- Nel checkout Shopify

### 2. Compatibilità con Temi
Qualsiasi tema Shopify può leggere automaticamente il carrello:

```liquid
<!-- Nel tema Liquid -->
{% for item in cart.items %}
  <div class="cart-item">
    <h3>{{ item.product_title }}</h3>
    <p>Quantity: {{ item.quantity }}</p>
    <p>Price: {{ item.final_price | money }}</p>
    
    <!-- Custom properties dalla tua app -->
    {% if item.properties.recommended_by_dermaself %}
      <span class="badge">Recommended by DermaSelf</span>
    {% endif %}
  </div>
{% endfor %}
```

### 3. Nessuna Duplicazione
Un solo carrello per sessione, nessun rischio di:
- Carrelli duplicati
- Prodotti persi
- Inconsistenze di stato

---

## 🧪 Come Testare

### Test 1: Aggiunta Prodotto dalla Tua App

1. Apri la tua app embedded nello store Shopify
2. Aggiungi un prodotto al carrello dalla tua UI
3. Vai su `/cart` nel tema Liquid
4. **Verifica**: Il prodotto deve apparire nel carrello del tema

### Test 2: Verifica Properties

1. Aggiungi un prodotto con custom attributes
2. Ispeziona il carrello in Shopify Admin o con `GET /cart.js`
3. **Verifica**: Le properties devono essere presenti:

```json
{
  "items": [{
    "properties": {
      "recommended_by_dermaself": "true"
    }
  }]
}
```

### Test 3: Checkout

1. Aggiungi prodotti dalla tua app
2. Clicca "Proceed to Checkout"
3. **Verifica**: Il checkout deve mostrare tutti i prodotti con quantità corrette

### Test 4: Modifica dal Tema

1. Aggiungi un prodotto dalla tua app
2. Vai su `/cart` e modifica la quantità dal tema Liquid
3. Torna alla tua app
4. **Verifica**: Lo stato del carrello deve essere aggiornato automaticamente

---

## 🔍 Debug e Troubleshooting

### Ispezionare il Carrello

Puoi sempre vedere lo stato del carrello Ajax:

```javascript
// Da console browser
fetch('https://your-store.myshopify.com/cart.js')
  .then(r => r.json())
  .then(cart => console.log(cart));
```

### Errori Comuni

#### 1. Variant ID non valido
```json
{
  "status": 422,
  "message": "Cart Error",
  "description": "The product is already sold out."
}
```
**Soluzione**: Verifica che il variant ID sia numerico e che il prodotto sia disponibile

#### 2. Properties troppo lunghe
```json
{
  "status": 422,
  "message": "Cart Error"
}
```
**Soluzione**: Le properties hanno un limite di 255 caratteri per valore

#### 3. CORS Error
**Soluzione**: Assicurati di chiamare le API dal dominio Shopify dello store

### Logging

Il CartContext include logging automatico per debug:

```typescript
console.log('Cart operation:', {
  action: 'add_to_cart',
  variantId: '123456',
  response: ajaxCart
});
```

---

## 📋 Checklist Migrazione

- [x] Modificato `addToCart()` per usare `/cart/add.js`
- [x] Modificato `updateCartItem()` per usare `/cart/change.js`
- [x] Modificato `removeFromCart()` per usare `/cart/change.js` con quantity 0
- [x] Modificato `refreshCart()` per usare `/cart.js`
- [x] Creato helper `transformAjaxCartToCart()` per conversione formato
- [x] Gestito conversione GraphQL ID → Numeric ID
- [x] Gestito conversione attributes → properties
- [x] Testato su browser con cart sincronizzato
- [ ] Testato checkout end-to-end
- [ ] Verificato su mobile
- [ ] Testato con temi diversi (se applicabile)

---

## 🎯 Prossimi Passi

### 1. Clear Cart
Se necessario, implementare la funzione per svuotare il carrello:

```typescript
const clearCart = async () => {
  await fetch(`${shopifyUrl}/cart/clear.js`, { method: 'POST' });
  dispatch({ type: 'CLEAR_CART' });
};
```

### 2. Cart Notes
Per aggiungere note al carrello (es. istruzioni speciali):

```typescript
await fetch(`${shopifyUrl}/cart/update.js`, {
  method: 'POST',
  body: JSON.stringify({
    note: "Istruzioni speciali per la consegna"
  })
});
```

### 3. Cart Attributes
Per attributi a livello carrello (non per singoli prodotti):

```typescript
await fetch(`${shopifyUrl}/cart/update.js`, {
  method: 'POST',
  body: JSON.stringify({
    attributes: {
      "gift_message": "Buon compleanno!",
      "delivery_date": "2025-12-25"
    }
  })
});
```

---

## 📚 Risorse

- [Cart Ajax API Reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [Apps in the Online Store](https://shopify.dev/docs/apps/build/online-store)
- [Liquid Cart Object](https://shopify.dev/docs/api/liquid/objects/cart)
- [Theme App Extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions)

---

## 🆘 Supporto

Per problemi o domande:
1. Verifica la console browser per errori
2. Ispeziona il payload delle richieste `/cart/*.js`
3. Verifica che lo shop domain sia corretto
4. Controlla che i variant ID siano numerici (non GraphQL ID)

