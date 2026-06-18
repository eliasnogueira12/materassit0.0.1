import { useRef, useState, useCallback } from "react";
import { X, Move, Trash2, ImageOff } from "lucide-react";

interface SceneProduct {
  id: string;
  name: string;
  image_url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function RoomScene({
  open,
  onClose,
  products,
}: {
  open: boolean;
  onClose: () => void;
  products: { id: string; name: string; image_url: string | null }[];
}) {
  const [sceneItems, setSceneItems] = useState<SceneProduct[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, itemStartX: 0, itemStartY: 0 });

  function addToScene(p: { id: string; name: string; image_url: string | null }) {
    if (sceneItems.find((s) => s.id === p.id)) return;
    setSceneItems((prev) => [
      ...prev,
      {
        ...p,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 40,
        width: 25,
        height: 35,
      },
    ]);
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      setDragging(id);
      const item = sceneItems.find((s) => s.id === id);
      if (!item) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        itemStartX: item.x,
        itemStartY: item.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [sceneItems],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = ((e.clientX - dragRef.current.startX) / (e.currentTarget as HTMLElement).offsetWidth) * 100;
      const dy = ((e.clientY - dragRef.current.startY) / (e.currentTarget as HTMLElement).offsetHeight) * 100;
      setSceneItems((prev) =>
        prev.map((s) =>
          s.id === dragging
            ? { ...s, x: Math.max(0, Math.min(100 - s.width, dragRef.current.itemStartX + dx)), y: Math.max(0, Math.min(100 - s.height, dragRef.current.itemStartY + dy)) }
            : s,
        ),
      );
    },
    [dragging],
  );

  function handlePointerUp() {
    setDragging(null);
  }

  function removeFromScene(id: string) {
    setSceneItems((prev) => prev.filter((s) => s.id !== id));
  }

  if (!open) return null;

  const availableToAdd = products.filter((p) => !sceneItems.find((s) => s.id === p.id));

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Move className="h-5 w-5 text-accent" />
          Sala Virtual
        </h2>
        <div className="flex items-center gap-3">
          {availableToAdd.length > 0 && (
            <div className="flex gap-1">
              {availableToAdd.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToScene(p)}
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-accent/20 transition overflow-hidden border border-border"
                  title={`Adicionar ${p.name}`}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4 mx-auto mt-3 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-100 via-background to-gray-50"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-amber-50/60 to-transparent" style={{ perspective: "800px" }} />

        {sceneItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-4">
              <Move className="h-16 w-16 mx-auto opacity-30" />
              <p className="text-xl font-medium">Sala vazia</p>
              <p className="max-w-md">Clique nos ícones dos produtos no topo para os adicionar à sala.</p>
              <p className="text-sm">Arraste os produtos para os posicionar.</p>
            </div>
          </div>
        )}

        {sceneItems.map((item) => (
          <div
            key={item.id}
            className={`absolute rounded-xl overflow-hidden shadow-2xl border-2 border-white/80 bg-card cursor-grab transition-shadow hover:shadow-3xl ${dragging === item.id ? "shadow-accent/40 scale-105 z-10" : "z-0"}`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.width}%`,
              height: `${item.height}%`,
              transform: `rotateY(${(item.x - 50) * 0.3}deg)`,
              transformStyle: "preserve-3d",
            }}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
          >
            <button
              onClick={() => removeFromScene(item.id)}
              className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition opacity-0 hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-2" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
              <p className="text-white text-xs font-semibold truncate">{item.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
