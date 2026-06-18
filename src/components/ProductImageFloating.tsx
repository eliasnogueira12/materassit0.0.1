import { useState } from "react";
import { ImageOff, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from "lucide-react";

export function ProductImageFloating({
  imageUrl,
  alt,
  promo,
  outOfStock,
}: {
  imageUrl: string | null;
  alt: string;
  promo?: boolean;
  outOfStock?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${
        fullscreen
          ? "fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          : "aspect-square rounded-2xl bg-gradient-to-br from-muted to-muted/50"
      }`}
    >
      <div
        className={`w-full h-full flex items-center justify-center ${
          !fullscreen ? "animate-float" : ""
        }`}
      >
        {imageUrl ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-muted-foreground/20 border-t-accent animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={alt}
              onLoad={() => setLoaded(true)}
              className={`w-full h-full object-contain p-4 md:p-8 select-none pointer-events-none transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-24 w-24" />
          </div>
        )}
      </div>

      {promo && (
        <span className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1.5 rounded-full shadow-lg inline-flex items-center gap-1.5">
          PROMO
        </span>
      )}
      {outOfStock && (
        <span className="absolute top-4 right-4 z-10 bg-foreground/80 text-background text-xs font-bold px-3 py-1.5 rounded-full">
          Sem stock
        </span>
      )}

      <div className={`absolute bottom-4 right-4 z-10 flex gap-1.5 ${fullscreen ? "bottom-6 right-6" : ""}`}>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm" title="Afastar">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm" title="Aproximar">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(1)} className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm" title="Repor vista">
          <RotateCw className="h-4 w-4" />
        </button>
        <button onClick={() => setFullscreen(!fullscreen)} className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm" title={fullscreen ? "Sair" : "Ecrã inteiro"}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
