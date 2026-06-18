import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getOrderByToken } from "@/lib/cart.functions";
import { formatPrice } from "@/lib/format";
import { Package, CheckCircle, Printer } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "@/components/QRCode";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/kiosk/invoice/$token")({
  component: InvoicePage,
});

function InvoicePage() {
  const { token } = Route.useParams();
  const getOrder = useServerFn(getOrderByToken);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", token],
    queryFn: async () => {
      const result = await getOrder({ data: { token } });
      return result;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-gray-800 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">A carregar fatura...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-10">
        <div className="text-center max-w-md">
          <Package className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Fatura não encontrada</h1>
          <p className="text-gray-500 mb-8 text-lg">Esta fatura pode ter expirado ou o link é inválido.</p>
          <Link to="/kiosk/start" className="inline-block bg-gray-800 text-white px-8 py-4 rounded-2xl text-lg font-bold">
            Voltar ao assistente
          </Link>
        </div>
      </div>
    );
  }

  const { order, items } = data;
  return <Receipt order={order} items={items} />;
}

function Receipt({ order, items }: { order: any; items: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showQR, setShowQR] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const invoiceUrl = `${origin}${path}`;
  const date = new Date(order.created_at).toLocaleDateString("pt-PT", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const subtotal = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const total = Number(order.total);
  const tax = total - subtotal;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 sm:py-10 px-4">
      <div ref={ref} className="w-full max-w-md bg-white shadow-lg print:shadow-none">
        <style>{`
          @media print {
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="bg-gray-900 text-white p-6 text-center">
          <CheckCircle className="h-10 w-10 mx-auto mb-2 no-print" />
          <h1 className="text-xl font-black tracking-tight">Fatura Pré-Paga</h1>
          <p className="text-xs text-gray-400 mt-0.5">MarquesMater</p>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex justify-between items-center pb-3 border-b-2 border-dashed border-gray-200">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Fatura</p>
              <p className="font-mono font-bold text-gray-800 tracking-wider">{order.token}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Data</p>
              <p className="text-xs font-semibold text-gray-700">{date}</p>
            </div>
          </div>

          <div className="space-y-0.5 text-[11px] text-gray-500">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-semibold text-gray-800 text-sm">{item.product_name}</p>
                  {item.location && <p className="text-gray-400 mt-0.5">{item.location}</p>}
                  <p className="text-gray-400 mt-0.5">{item.quantity}x {formatPrice(Number(item.price))}</p>
                </div>
                <p className="font-bold text-gray-800 shrink-0">{formatPrice(Number(item.price) * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>IVA</span>
                <span>{formatPrice(tax)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t-2 border-gray-800">
              <span className="font-bold text-gray-800">Total</span>
              <span className="text-2xl font-black text-gray-800">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 text-center">
            <p className="font-bold text-gray-800 text-sm">💳 Por pagar</p>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">
              Apresente esta fatura no balcão da <strong>MarquesMater</strong> e efetue o pagamento.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-3 text-center text-[10px] text-gray-400 space-y-0.5">
          <p><strong>MarquesMater</strong> · R. Sociedade Filarmónica, Ed. Estrada Nova, Louriçal</p>
          <p>Tel: 236 961 569 · Email: loja@marquesmater.pt</p>
          <p className="italic">Documento pré-paga — não equivale a fatura-recibo.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-700 transition shadow-lg"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:border-gray-300 transition shadow"
        >
          {showQR ? "Ocultar QR" : "Telemóvel"}
        </button>
      </div>

      {showQR && (
        <div className="mt-4 no-print animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-3 font-medium">Abra no telemóvel para guardar ou imprimir</p>
            <QRCode url={invoiceUrl} size={160} />
          </div>
        </div>
      )}
    </div>
  );
}
