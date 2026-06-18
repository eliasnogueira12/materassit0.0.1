import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, MessageSquareText, Send, Sparkles } from "lucide-react";
import { logHistory, getStoredCustomer } from "@/lib/customer";

export function SatisfactionSurvey({ orderId, onClose }: { orderId?: string; onClose?: () => void }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [foundProduct, setFoundProduct] = useState<boolean | null>(null);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSending(true);
    try {
      const customer = getStoredCustomer();
      if (customer?.id) {
        await logHistory(customer.id, "satisfaction", {
          rating,
          found_product: foundProduct,
          assistant_helpful: helpful,
          notes: notes.trim() || null,
          order_id: orderId ?? null,
        });
      }
      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-6 text-center animate-fade-in">
        <div className="h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="text-lg font-bold text-emerald-800">Obrigado pelo seu feedback!</p>
        <p className="text-sm text-emerald-600 mt-1">A sua opinião ajuda-nos a melhorar.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 animate-fade-in">
      <h3 className="text-lg font-bold text-gray-800 mb-1">Como foi a sua experiência?</h3>
      <p className="text-sm text-gray-500 mb-5">Ajude-nos a melhorar o MaterAssist.</p>

      {/* Rating stars */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Classificação</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Found product */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Encontrou o que procurava?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setFoundProduct(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              foundProduct === true
                ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <ThumbsUp className="h-4 w-4" /> Sim
          </button>
          <button
            onClick={() => setFoundProduct(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              foundProduct === false
                ? "bg-red-50 border-red-400 text-red-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <ThumbsDown className="h-4 w-4" /> Não
          </button>
        </div>
      </div>

      {/* Assistant helpful */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">O assistente foi útil?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setHelpful(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              helpful === true
                ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <ThumbsUp className="h-4 w-4" /> Sim
          </button>
          <button
            onClick={() => setHelpful(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              helpful === false
                ? "bg-red-50 border-red-400 text-red-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <ThumbsDown className="h-4 w-4" /> Não
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Alguma sugestão?</p>
        <div className="relative">
          <MessageSquareText className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Partilhe a sua opinião..."
            rows={3}
            className="w-full rounded-xl border-2 border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || sending}
        className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-gray-700 transition disabled:opacity-50"
      >
        {sending ? (
          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {sending ? "A enviar..." : "Enviar feedback"}
      </button>
    </div>
  );
}
