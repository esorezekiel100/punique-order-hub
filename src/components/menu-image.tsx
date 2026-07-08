import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed } from "lucide-react";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function MenuImage({ src, alt, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!src) { setUrl(null); return; }
    if (src.startsWith("http")) { setUrl(src); return; }
    supabase.storage.from("menu-images").createSignedUrl(src, 60 * 60 * 24 * 7)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [src]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-gradient-warm text-primary-foreground/70 ${className ?? ""}`}>
        <UtensilsCrossed className="h-10 w-10 opacity-60" />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}