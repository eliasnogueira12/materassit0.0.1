import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, markOrderPaid, getOrderByToken } from "@/lib/cart.functions";
import { formatPrice } from "@/lib/format";
import {
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Package,
  Eye,
  ArrowLeft,
  ShoppingBag,
  MapPin,
  Printer,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-blue-100 text-blue-700" },
  invoice_issued: { label: "Por Pagar", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

function AdminOrders() {
  const [searchToken, setSearchToken] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const list = useServerFn(listOrders);
  const markPaid = useServerFn(markOrderPaid);
  const getDetail = useServerFn(getOrderByToken);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "orders", searchToken, filterStatus],
    queryFn: async () => {
      const result = await list({
        data: {
          token: searchToken || undefined,
          status: (filterStatus || undefined) as "active" | "invoice_issued" | "paid" | "cancelled" | undefined,
          limit: 50,
          offset: 0,
        },
      });
      return result;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "order-detail", selectedToken],
    enabled: !!selectedToken,
    queryFn: async () => {
      if (!selectedToken) return null;
      return getDetail({ data: { token: selectedToken } });
    },
  });

  async function handleMarkPaid(orderId: string) {
    await markPaid({ data: { orderId } });
    refetch();
  }

  if (selectedToken) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedToken(null)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à lista
        </button>

        {detailLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : detail ? (
          <div className="bg-card border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary">Fatura #{detail.order.token}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(detail.order.created_at).toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${STATUS_LABEL[detail.order.status]?.color || ""}`}
              >
                {STATUS_LABEL[detail.order.status]?.label || detail.order.status}
              </span>
            </div>

            <div className="space-y-3">
              {detail.items.map((item: { id: string; product_name: string; quantity: number; price: number; location: string | null }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatPrice(Number(item.price))}
                      {item.location && ` — ${item.location}`}
                    </p>
                  </div>
                  <p className="font-bold">{formatPrice(Number(item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="border-t-2 mt-4 pt-4 flex justify-between items-center">
              <span className="text-lg text-muted-foreground">Total</span>
              <span className="text-3xl font-black">{formatPrice(Number(detail.order.total))}</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => window.print()}
                className="kiosk-btn bg-card border px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
              {detail.order.status === "invoice_issued" && (
                <button
                  onClick={() => handleMarkPaid(detail.order.id)}
                  className="kiosk-btn bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition"
                >
                  <CheckCircle className="h-5 w-5" /> Marcar como Pago
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">Fatura não encontrada.</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Faturas</h1>
          <p className="text-muted-foreground">
            Consulte e valide faturas pré-pagas emitidas no quiosque.
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            value={searchToken}
            onChange={(e) => setSearchToken(e.target.value)}
            placeholder="Pesquisar por número da fatura..."
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-background text-lg focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-12 px-4 rounded-xl border border-input bg-background text-base focus:border-accent outline-none"
        >
          <option value="">Todos os estados</option>
          <option value="invoice_issued">Por Pagar</option>
          <option value="paid">Pagos</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : !data || data.orders.length === 0 ? (
        <div className="bg-card border-2 border-dashed rounded-2xl p-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-xl font-medium">Nenhuma fatura encontrada</p>
          <p className="text-muted-foreground mt-2">
            {searchToken
              ? "Tente outro número de fatura."
              : "Ainda não foram emitidas faturas no quiosque."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.orders.map((order: { id: string; token: string; status: string; total: number; created_at: string }) => {
            const st = STATUS_LABEL[order.status] || {
              label: order.status,
              color: "bg-muted text-muted-foreground",
            };
            return (
              <button
                key={order.id}
                onClick={() => setSelectedToken(order.token)}
                className="w-full bg-card border rounded-2xl p-5 flex items-center justify-between hover:border-accent transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-primary">#{order.token}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-PT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black">{formatPrice(Number(order.total))}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${st.color}`}>
                    {st.label}
                  </span>
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
