import { Link } from "@tanstack/react-router";
import { Phone, MapPin, MessageCircle } from "lucide-react";
import { BRAND, LOCATION, WHATSAPP_NUMBER } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-forest text-forest-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-display text-xl font-bold">{BRAND}</div>
          <p className="mt-2 text-sm text-forest-foreground/70">Bayelsa's warmest kitchen. Home-cooked flavour, delivered fast.</p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Explore</div>
          <ul className="space-y-1.5 text-sm text-forest-foreground/80">
            <li><Link to="/menu" className="hover:text-accent">Menu</Link></li>
            <li><Link to="/track" className="hover:text-accent">Track order</Link></li>
            <li><Link to="/auth" className="hover:text-accent">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Contact</div>
          <ul className="space-y-2 text-sm text-forest-foreground/80">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />{LOCATION}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" />0808 316 3956</li>
            <li>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-accent">
                <MessageCircle className="h-4 w-4" />WhatsApp us
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold">Hours</div>
          <p className="text-sm text-forest-foreground/80">Mon – Sun<br />9:00am – 9:00pm</p>
        </div>
      </div>
      <div className="border-t border-forest-foreground/10 px-6 py-4 text-center text-xs text-forest-foreground/60">
        © {new Date().getFullYear()} {BRAND}. Made with love in Yenagoa.
      </div>
    </footer>
  );
}