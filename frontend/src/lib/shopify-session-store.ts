export interface StoredShopifySession {
  shop: string;
  accessToken: string;
  scope: string;
  expiresAt?: Date;
  sessionToken?: string;
}

class InMemorySessionStore {
  private sessions = new Map<string, StoredShopifySession>();
  private states = new Map<string, string>();

  storeSession(session: StoredShopifySession) {
    this.sessions.set(session.shop, session);
  }

  getSession(shop: string) {
    return this.sessions.get(shop);
  }

  deleteSession(shop: string) {
    this.sessions.delete(shop);
  }

  storeState(state: string, shop: string) {
    this.states.set(state, shop);
  }

  consumeState(state: string) {
    const shop = this.states.get(state);
    if (shop) {
      this.states.delete(state);
    }
    return shop;
  }
}

const store = new InMemorySessionStore();

export function storeShopifySession(session: StoredShopifySession) {
  store.storeSession(session);
}

export function getShopifySession(shop: string) {
  return store.getSession(shop);
}

export function deleteShopifySession(shop: string) {
  store.deleteSession(shop);
}

export function storeOAuthState(state: string, shop: string) {
  store.storeState(state, shop);
}

export function consumeOAuthState(state: string) {
  return store.consumeState(state);
}

