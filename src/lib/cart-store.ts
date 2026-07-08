import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Addon {
  name: string;
  price: number;
}

export interface CartItem {
  key: string; // menu_item_id + addons signature
  menu_item_id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  quantity: number;
  addons: Addon[];
  notes?: string;
}

interface CartState {
  items: CartItem[];
  deliveryType: "pickup" | "delivery";
  addItem: (item: Omit<CartItem, "key" | "quantity"> & { quantity?: number }) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, qty: number) => void;
  setDeliveryType: (t: "pickup" | "delivery") => void;
  clear: () => void;
  subtotal: () => number;
  itemCount: () => number;
}

function buildKey(id: string, addons: Addon[]): string {
  return id + "::" + addons.map((a) => a.name).sort().join(",");
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryType: "pickup",
      addItem: (input) => {
        const key = buildKey(input.menu_item_id, input.addons);
        set((s) => {
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + (input.quantity ?? 1) } : i,
              ),
            };
          }
          return {
            items: [
              ...s.items,
              { ...input, key, quantity: input.quantity ?? 1 },
            ],
          };
        });
      },
      removeItem: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      setQuantity: (key, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.key !== key)
            : s.items.map((i) => (i.key === key ? { ...i, quantity: qty } : i)),
        })),
      setDeliveryType: (t) => set({ deliveryType: t }),
      clear: () => set({ items: [] }),
      subtotal: () => {
        const items = get().items;
        return items.reduce((sum, i) => {
          const addons = i.addons.reduce((s, a) => s + a.price, 0);
          return sum + (i.base_price + addons) * i.quantity;
        }, 0);
      },
      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "punique-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : undefined!,
      ),
    },
  ),
);