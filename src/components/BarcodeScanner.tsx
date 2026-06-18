import { useEffect, useRef, useState } from "react";
import { Scan, CameraOff, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BarcodeScanner({
  open,
  onDetected,
  onClose,
}: {
  open: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setDetected(null);
      setManual("");
      setError(null);
      return;
    }

    if ("BarcodeDetector" in window) {
      setSupported(true);
      detectorRef.current = new BarcodeDetector({
        formats: [
          "ean_13", "ean_8", "upc_a", "upc_e",
          "code_128", "code_39", "codabar", "itf",
          "qr_code", "data_matrix", "aztec",
        ],
      });
      startCamera();
    } else {
      setSupported(false);
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanLoop();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao aceder à câmara");
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    detectorRef.current = null;
  }

  async function scanLoop() {
    if (!videoRef.current || !detectorRef.current || detected) return;
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        if (code && !detected) {
          setDetected(code);
          return;
        }
      }
    } catch {
      /* frame error, continue */
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  function handleConfirm() {
    const value = detected || manual.trim();
    if (value) {
      onDetected(value);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ler código de barras</DialogTitle>
        </DialogHeader>

        {supported === false ? (
          <div className="text-center py-6 space-y-4">
            <CameraOff className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              O seu navegador não suporta a leitura por câmara.
            </p>
            <p className="text-xs text-muted-foreground">
              Utilize o Chrome num dispositivo móvel para escanear.
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Digite o código de barras..."
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                autoFocus
              />
              <Button className="w-full" onClick={handleConfirm} disabled={!manual.trim()}>
                Confirmar
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6 space-y-4">
            <CameraOff className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-destructive">{error}</p>
            <div className="space-y-2">
              <Input
                placeholder="Digite o código de barras..."
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                autoFocus
              />
              <Button className="w-full" onClick={handleConfirm} disabled={!manual.trim()}>
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 border-2 border-accent rounded-lg m-8 pointer-events-none opacity-50" />
            </div>
            {detected ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Código detetado:</p>
                <p className="text-xl font-mono font-bold text-accent">{detected}</p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                A aproximar o código de barras da câmara...
              </p>
            )}
            <div className="space-y-2">
              <Input
                placeholder="Ou digite manualmente..."
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {supported !== false && (
            <Button onClick={handleConfirm} disabled={!(detected || manual.trim())}>
              <Scan className="h-4 w-4 mr-2" />
              Confirmar código
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
