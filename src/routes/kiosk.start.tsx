import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useKioskConfig, getKioskLabel, getEnabledPages } from "@/lib/useKioskConfig";
import type { KioskPage } from "@/lib/useKioskConfig";

export const Route = createFileRoute("/kiosk/start")({
  component: KioskHome,
});

const CARDS: {
  page: KioskPage;
  to: string;
  emoji: string;
  gradient: string;
  title: string;
  desc: string;
  tags: string[];
  shadow: string;
  border: string;
}[] = [
  {
    page: "paints",
    to: "/kiosk/paints",
    emoji: "🎨",
    gradient: "from-rose-400 to-amber-400",
    title: "Casa das Tintas",
    desc: "Calcula a tinta que precisas, explora cores, descobre o acabamento ideal.",
    tags: ["Calculadora", "24 Cores", "Acabamentos"],
    shadow: "shadow-rose-200/30 dark:shadow-rose-900/30",
    border: "border-rose-100/50 dark:border-rose-900/20",
  },
  {
    page: "assistant",
    to: "/kiosk/assistant",
    emoji: "🤖",
    gradient: "from-sky-400 to-indigo-400",
    title: "Assistente da Loja",
    desc: "Pergunta o que precisas — encontrar produtos, preços, ou chamar um funcionário.",
    tags: ["Chat Inteligente", "Produtos", "Ajuda"],
    shadow: "shadow-sky-200/30 dark:shadow-sky-900/30",
    border: "border-sky-100/50 dark:border-sky-900/20",
  },
  {
    page: "search",
    to: "/kiosk/search",
    emoji: "🔍",
    gradient: "from-emerald-400 to-teal-400",
    title: "Catálogo",
    desc: "Navega por categorias e encontra o produto que precisas.",
    tags: ["Produtos", "Categorias", "Preços"],
    shadow: "shadow-emerald-200/30 dark:shadow-emerald-900/30",
    border: "border-emerald-100/50 dark:border-emerald-900/20",
  },
  {
    page: "problems",
    to: "/kiosk/problems",
    emoji: "🔧",
    gradient: "from-amber-400 to-orange-400",
    title: "Problemas",
    desc: "Procura soluções para problemas comuns de bricolage e construção.",
    tags: ["Soluções", "Guias", "Passo a passo"],
    shadow: "shadow-amber-200/30 dark:shadow-amber-900/30",
    border: "border-amber-100/50 dark:border-amber-900/20",
  },
];

function KioskHome() {
  const { config, loading } = useKioskConfig();
  const kioskLabel = getKioskLabel();
  const enabledPages = loading
    ? Object.fromEntries(CARDS.map((c) => [c.page, true]))
    : getEnabledPages(config, kioskLabel);
  const visibleCards = CARDS.filter((c) => enabledPages[c.page]);

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 dark:from-stone-900 dark:via-neutral-900 dark:to-stone-900">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto w-full">
        <div className="text-center mb-14 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-stone-800 shadow-xl shadow-amber-200/20 dark:shadow-black/30 mb-6 ring-1 ring-amber-100/50 dark:ring-stone-700/50">
            <Logo className="h-14 w-auto" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
            Olá! 👋
          </h1>
          <p className="mt-3 text-lg text-stone-500 dark:text-stone-400 leading-relaxed max-w-md mx-auto">
            O que gostarias de fazer hoje?
          </p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-[fade-in_0.5s_ease-out]">
          {visibleCards.map((card) => (
            <Link
              key={card.page}
              to={card.to}
              className="group relative flex flex-col items-center text-center p-8 md:p-10 rounded-3xl bg-white dark:bg-stone-800/90 shadow-xl hover:shadow-2xl border transition-all duration-500 hover:-translate-y-2"
              style={{ boxShadow: `var(--tw-shadow, 0 10px 15px -3px rgb(0 0 0 / 0.1))` }}
            >
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-all duration-500 mb-5`}>
                {card.emoji}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight mb-3">
                {card.title}
              </h2>
              <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-sm md:text-base max-w-xs">
                {card.desc}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100/80 dark:bg-stone-900/30 text-stone-600 dark:text-stone-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-900/30 flex items-center justify-center text-stone-500 dark:text-stone-300 group-hover:bg-stone-200 dark:group-hover:bg-stone-800/40 group-hover:translate-x-1 transition-all duration-300 shadow-sm">
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </div>

        {visibleCards.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <p className="text-lg">Nenhuma página ativa neste quiosque.</p>
            <p className="text-sm mt-2">Contacte o administrador.</p>
          </div>
        )}

        <p className="mt-12 text-xs text-stone-400 dark:text-stone-500 text-center animate-fade-in">
          Toca numa opção para começar
        </p>
      </div>
    </div>
  );
}
