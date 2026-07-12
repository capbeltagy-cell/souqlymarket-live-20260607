// Client-side multi-company cart backed by localStorage.
// Cart is intentionally kept off the server — checkout materialises real
// orders through the existing createOrderFromListing server fn per line.

export type CartItem = {
  listing_id: string;
  company_id: string | null;
  title: string;
  image?: string | null;
  price: number;
  currency: string;
  quantity: number;
};

const KEY = "souqly.cart.v1";
const EVT = "souqly:cart:changed";

function safeRead(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as CartItem[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* noop */
  }
}

export function getCart(): CartItem[] {
  return safeRead();
}

export function addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  const items = safeRead();
  const existing = items.find((i) => i.listing_id === item.listing_id);
  const qty = item.quantity ?? 1;
  if (existing) existing.quantity += qty;
  else items.push({ ...item, quantity: qty });
  safeWrite(items);
}

export function updateQty(listing_id: string, quantity: number) {
  const items = safeRead()
    .map((i) => (i.listing_id === listing_id ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);
  safeWrite(items);
}

export function removeFromCart(listing_id: string) {
  safeWrite(safeRead().filter((i) => i.listing_id !== listing_id));
}

export function clearCart() {
  safeWrite([]);
}

export function cartCount(): number {
  return safeRead().reduce((s, i) => s + i.quantity, 0);
}

export function subscribeCart(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
