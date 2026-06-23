import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Paintbrush, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/kiosk/start")({
  component: WelcomeHub,
});

function WelcomeHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
      <div className="text-center mb-12 max-w-lg">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
          Bem-vindo à <span className="text-red-700">MarquesMater</span>
        </h1>
        <p className="text-lg text-gray-500">
          Como podemos ajudar hoje?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => navigate({ to: "/kiosk/paints" })}
          className="group relative bg-white rounded-3xl border-2 border-red-100 shadow-lg hover:shadow-2xl hover:border-red-300 transition-all duration-300 p-8 text-left hover:-translate-y-1"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mb-5 shadow-lg shadow-red-200">
            <Paintbrush className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">
            Casa das Tintas
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Explore tintas, cores, calcule a quantidade certa e encontre o produto ideal para o seu projeto.
          </p>
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm group-hover:gap-3 transition-all">
            <span>Explorar tintas</span>
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-100">
            NEUCE
          </div>
        </button>

        <button
          onClick={() => navigate({ to: "/kiosk/assistant" })}
          className="group relative bg-white rounded-3xl border-2 border-blue-100 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all duration-300 p-8 text-left hover:-translate-y-1"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            Assistente da Loja
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Faça perguntas, peça recomendações de produtos ou obtenha ajuda para resolver problemas.
          </p>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
            <span>Conversar agora</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      <p className="mt-12 text-xs text-gray-400 text-center max-w-md">
        Use o quiosque para explorar o nosso catálogo de tintas NEUCE ou conversar com o assistente virtual.
      </p>
    </div>
  );
}
