import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/kiosk/start")({
  component: KioskHome,
});

function KioskHome() {
  return (
    <div className="min-h-full flex flex-col bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 dark:from-stone-900 dark:via-neutral-900 dark:to-stone-900">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto w-full">
        {/* Logo + tagline */}
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

        {/* Two floating side-by-side cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-[fade-in_0.5s_ease-out]">
          {/* Casa das Tintas */}
          <Link
            to="/kiosk/paints"
            className="group relative flex flex-col items-center text-center p-8 md:p-10 rounded-3xl bg-white dark:bg-stone-800/90 shadow-xl shadow-rose-200/30 dark:shadow-black/20 hover:shadow-2xl hover:shadow-rose-300/40 dark:hover:shadow-rose-900/30 border border-rose-100/50 dark:border-rose-900/20 transition-all duration-500 hover:-translate-y-2"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-4xl shadow-lg shadow-rose-200/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 mb-5">
              🎨
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight mb-3">
              Casa das Tintas
            </h2>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-sm md:text-base max-w-xs">
              Calcula a tinta que precisas, explora cores, descobre o acabamento ideal.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["Calculadora", "24 Cores", "Acabamentos"].map((tag) => (
                <span
                  key={tag}
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-300 group-hover:bg-rose-200 dark:group-hover:bg-rose-800/40 group-hover:translate-x-1 transition-all duration-300 shadow-sm">
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>

          {/* Assistente da Loja */}
          <Link
            to="/kiosk/assistant"
            className="group relative flex flex-col items-center text-center p-8 md:p-10 rounded-3xl bg-white dark:bg-stone-800/90 shadow-xl shadow-sky-200/30 dark:shadow-black/20 hover:shadow-2xl hover:shadow-sky-300/40 dark:hover:shadow-sky-900/30 border border-sky-100/50 dark:border-sky-900/20 transition-all duration-500 hover:-translate-y-2"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center text-4xl shadow-lg shadow-sky-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 mb-5">
              🤖
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight mb-3">
              Assistente da Loja
            </h2>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-sm md:text-base max-w-xs">
              Pergunta o que precisas — encontrar produtos, preços, ou chamar um funcionário.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["Chat Inteligente", "Produtos", "Ajuda"].map((tag) => (
                <span
                  key={tag}
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-sky-100/80 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-500 dark:text-sky-300 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/40 group-hover:translate-x-1 transition-all duration-300 shadow-sm">
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>
        </div>

        {/* Footer hint */}
        <p className="mt-12 text-xs text-stone-400 dark:text-stone-500 text-center animate-fade-in">
          Toca numa opção para começar
        </p>
      </div>
    </div>
  );
}
