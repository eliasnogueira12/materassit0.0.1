import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/kiosk/start")({
  component: KioskHome,
});

function KioskHome() {
  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-amber-50 via-white to-orange-50 dark:from-stone-900 dark:via-neutral-900 dark:to-stone-900">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        {/* Logo + tagline */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-stone-800 shadow-lg shadow-amber-200/30 dark:shadow-black/20 mb-6 ring-1 ring-amber-100 dark:ring-stone-700">
            <Logo className="h-12 w-auto" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
            Olá! 👋
          </h1>
          <p className="mt-3 text-lg text-stone-500 dark:text-stone-400 leading-relaxed max-w-md mx-auto">
            O que gostarias de fazer hoje na <span className="font-semibold text-stone-700 dark:text-stone-300">MaterAssist</span>?
          </p>
        </div>

        {/* Two cards */}
        <div className="w-full grid gap-5 animate-[fade-in_0.4s_ease-out]">
          {/* Casa das Tintas */}
          <Link
            to="/kiosk/paints"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/20 dark:via-stone-900 dark:to-amber-950/20 p-1 shadow-lg shadow-rose-200/20 dark:shadow-rose-950/10 hover:shadow-xl hover:shadow-rose-300/20 dark:hover:shadow-rose-900/20 transition-all duration-500 hover:-translate-y-0.5"
          >
            <div className="relative rounded-[calc(1.5rem-4px)] bg-white/70 dark:bg-stone-900/70 backdrop-blur-sm p-6 md:p-8">
              <div className="flex items-start gap-5">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-3xl shadow-md shadow-rose-200/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  🎨
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
                    Casa das Tintas
                  </h2>
                  <p className="mt-2 text-stone-500 dark:text-stone-400 leading-relaxed">
                    Calcula a tinta que precisas, explora cores, descobre o acabamento ideal para cada superfície.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Calculadora", "24 Cores", "Acabamentos"].map((tag) => (
                      <span
                        key={tag}
                        className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-rose-100/60 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 self-center w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-300 group-hover:bg-rose-200 dark:group-hover:bg-rose-800/30 group-hover:translate-x-0.5 transition-all duration-300">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Link>

          {/* Assistente da Loja */}
          <Link
            to="/kiosk/assistant"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-sky-950/20 dark:via-stone-900 dark:to-indigo-950/20 p-1 shadow-lg shadow-sky-200/20 dark:shadow-sky-950/10 hover:shadow-xl hover:shadow-sky-300/20 dark:hover:shadow-sky-900/20 transition-all duration-500 hover:-translate-y-0.5"
          >
            <div className="relative rounded-[calc(1.5rem-4px)] bg-white/70 dark:bg-stone-900/70 backdrop-blur-sm p-6 md:p-8">
              <div className="flex items-start gap-5">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center text-3xl shadow-md shadow-sky-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
                    Assistente da Loja
                  </h2>
                  <p className="mt-2 text-stone-500 dark:text-stone-400 leading-relaxed">
                    Pergunta o que precisas — encontrar produtos, saber preços, pedir ajuda a um funcionário.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Chat Inteligente", "Produtos", "Ajuda"].map((tag) => (
                      <span
                        key={tag}
                        className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-sky-100/60 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 self-center w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-500 dark:text-sky-300 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/30 group-hover:translate-x-0.5 transition-all duration-300">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Subtle footer */}
        <p className="mt-10 text-xs text-stone-400 dark:text-stone-500 text-center animate-fade-in">
          Toca numa opção para começar
        </p>
      </div>
    </div>
  );
}
