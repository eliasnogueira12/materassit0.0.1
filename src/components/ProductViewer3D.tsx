import { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, ImageOff } from "lucide-react";

export function ProductViewer3D({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const rotX = useRef(0);
  const rotY = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const velocityX = useRef(0);
  const velocityY = useRef(0);
  const rafId = useRef(0);
  const isHovering = useRef(false);

  const animate = useCallback(() => {
    if (!autoRotate && !isDragging.current && !isHovering.current) {
      rotX.current += (targetX.current - rotX.current) * 0.1;
      rotY.current += (targetY.current - rotY.current) * 0.1;
    } else if (isDragging.current) {
      velocityX.current *= 0.92;
      velocityY.current *= 0.92;
      rotY.current += velocityX.current;
      rotX.current += velocityY.current;
    } else {
      velocityX.current *= 0.95;
      velocityY.current *= 0.95;
      rotY.current += velocityX.current;
      rotX.current += velocityY.current;
    }

    if (autoRotate && !isDragging.current && !isHovering.current) {
      rotY.current += 0.3;
    }

    rotX.current = Math.max(-30, Math.min(30, rotX.current));

    if (cardRef.current) {
      cardRef.current.style.transform = `rotateX(${rotX.current}deg) rotateY(${rotY.current}deg) scale(${zoom})`;
    }
    if (containerRef.current) {
      const shine = containerRef.current.querySelector(".shine") as HTMLElement;
      if (shine) {
        const x = ((rotY.current + 30) / 60) * 100;
        const y = ((rotX.current + 20) / 40) * 100;
        shine.style.background = `radial-gradient(ellipse at ${x}% ${y}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;
      }
    }

    rafId.current = requestAnimationFrame(animate);
  }, [autoRotate, zoom]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [animate]);

  function handlePointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    autoRotate && setAutoRotate(false);
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    velocityX.current = 0;
    velocityY.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    velocityX.current = dx * 0.5;
    velocityY.current = dy * -0.5;
    rotY.current += velocityX.current;
    rotX.current += velocityY.current;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  }

  function handlePointerUp() {
    isDragging.current = false;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(3, z - e.deltaY * 0.001)));
  }

  function resetView() {
    rotX.current = 0;
    rotY.current = 0;
    velocityX.current = 0;
    velocityY.current = 0;
    setZoom(1);
    setAutoRotate(true);
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${fullscreen ? "fixed inset-0 z-50 bg-black/90" : "aspect-square rounded-2xl bg-gradient-to-br from-muted to-muted/50"}`}
    >
      <div
        ref={cardRef}
        className="w-full h-full"
        style={{ transformStyle: "preserve-3d", perspective: "1200px", cursor: "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onMouseEnter={() => { isHovering.current = true; autoRotate && setAutoRotate(false); }}
        onMouseLeave={() => { isHovering.current = false; }}
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
              className={`w-full h-full object-contain p-4 md:p-8 select-none pointer-events-none ${loaded ? "opacity-100" : "opacity-0"}`}
              draggable={false}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-24 w-24" />
          </div>
        )}
        <div className="shine absolute inset-0 pointer-events-none" />
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
        <button onClick={resetView} className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm" title="Repor vista">
          <RotateCw className="h-4 w-4" />
        </button>
        <button onClick={() => setFullscreen(!fullscreen)} className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm" title={fullscreen ? "Sair" : "Ecrã inteiro"}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
