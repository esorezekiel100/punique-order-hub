import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDishImage } from "@/lib/dish-images";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function MenuImage({ src, alt, className }: Props) {
  const fallback = getDishImage(alt);
  const [url, setUrl] = useState(src?.startsWith("http") ? src : src ? null : fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (!src) { setUrl(fallback); return; }
    if (src.startsWith("http")) { setUrl(src); return; }
    supabase.storage.from("menu-images").createSignedUrl(src, 60 * 60 * 24 * 7)
      .then(({ data }) => setUrl(data?.signedUrl ?? fallback))
      .catch(() => setUrl(fallback));
  }, [fallback, src]);

  return (
    <div className={`relative overflow-hidden bg-muted ${className ?? ""}`}>
      {!loaded && <div className="absolute inset-0 animate-image-shimmer bg-gradient-warm opacity-30" />}
      <img
        src={url ?? fallback}
        alt={alt}
        loading="lazy"
        width={944}
        height={704}
        onLoad={() => setLoaded(true)}
        onError={(event) => {
          if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        }}
        className={`h-full w-full object-cover transition-[opacity,transform] duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}