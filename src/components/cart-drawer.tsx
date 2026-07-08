import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import { MenuImage } from "@/components/menu-image";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const subtotal = useCart((s) => s.subtotal());
  const count = useCart((s) => s.itemCount());
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2 border-primary/30">
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your basket</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Your basket is empty.</p>
            <Button asChild variant="secondary" onClick={() => setOpen(false)}>
              <Link to="/menu">Browse menu</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-2">
              <ul className="space-y-3">
                {items.map((i) => {
                  const linePrice = (i.base_price + i.addons.reduce((s, a) => s + a.price, 0)) * i.quantity;
                  return (
                    <li key={i.key} className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-card">
                      <MenuImage src={i.image_url} alt={i.name} className="h-16 w-16 shrink-0 rounded-md object-cover" />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold leading-tight">{i.name}</p>
                            {i.addons.length > 0 && (
                              <p className="text-xs text-muted-foreground">+ {i.addons.map((a) => a.name).join(", ")}</p>
                            )}
                            <p className="text-sm font-medium text-primary">{formatNaira(linePrice)}</p>
                          </div>
                          <button className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(i.key)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center gap-2 pt-2">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQuantity(i.key, i.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="min-w-6 text-center text-sm font-semibold">{i.quantity}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQuantity(i.key, i.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-display text-xl font-semibold">{formatNaira(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Delivery fee is calculated at checkout.</p>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => { setOpen(false); navigate({ to: "/checkout" }); }}
              >
                Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CartCloseButton() {
  return <X className="h-4 w-4" />;
}