import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

type Props = { url: string; size?: number };

export default function QRCode({ url, size = 160 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvas.current) {
      QRCodeLib.toCanvas(canvas.current, url, { width: size, margin: 2 });
    }
  }, [url, size]);

  return <canvas ref={canvas} width={size} height={size} className="rounded-xl" />;
}
