import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  Paintbrush,
  Ruler,
  Droplets,
  Palette,
  Sparkles,
  ArrowLeft,
  ShoppingCart,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/kiosk/paints")({
  component: PaintsPage,
});

const FINISHES = [
  { id: "mate", label: "Mate", desc: "Sem brilho, aspeto aveludado" },
  { id: "acetinado", label: "Acetinado", desc: "Brilho suave, fácil de limpar" },
  { id: "brilhante", label: "Brilhante", desc: "Alto brilho, super resistente" },
];

const SURFACES = [
  { id: "interior", label: "Parede Interior", icon: "🏠" },
  { id: "exterior", label: "Parede Exterior", icon: "🌳" },
  { id: "madeira", label: "Madeira", icon: "🪵" },
  { id: "metal", label: "Metal", icon: "🔩" },
  { id: "teto", label: "Teto", icon: "⬆️" },
];

const SWATCHES = [
  { name: "Branco Neve", hex: "#f5f5f0" },
  { name: "Cinza Pedra", hex: "#b0b0b0" },
  { name: "Bege Areia", hex: "#e8dcc8" },
  { name: "Azul Sereno", hex: "#7ba7bc" },
  { name: "Verde Campo", hex: "#7a9e7e" },
  { name: "Terracota", hex: "#c4623e" },
  { name: "Rosa Antigo", hex: "#d4a0a0" },
  { name: "Amarelo Sol", hex: "#e8c84a" },
  { name: "Azul Escuro", hex: "#2c4a6e" },
  { name: "Verde Escuro", hex: "#2d5a27" },
  { name: "Vinho", hex: "#6b2f3a" },
  { name: "Preto Carvão", hex: "#2a2a2a" },
];

type Step = "welcome" | "surface" | "finish" | "calculate" | "result";

function PaintsPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [surface, setSurface] = useState("");
  const [finish, setFinish] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [walls, setWalls] = useState("1");
  const [coats, setCoats] = useState("2");
  const [selectedColor, setSelectedColor] = useState("#f5f5f0");
  const [bgColor, setBgColor] = useState("#f5f5f0");
  const colorPreviewRef = useRef<HTMLDivElement>(null);

  const area = (Number(width) || 0) * (Number(height) || 0) * (Number(walls) || 1);
  const coveragePerLiter = surface === "exterior" ? 8 : surface === "madeira" || surface === "metal" ? 10 : 12;
  const totalLiters = area > 0 ? (area * (Number(coats) || 1)) / coveragePerLiter : 0;
  const cans5l = Math.ceil(totalLiters / 5);
  const cans1l = Math.max(0, Math.ceil((totalLiters - cans5l * 5) / 1));

  function handleColorSelect(hex: string) {
    setSelectedColor(hex);
    setBgColor(hex);
    if (colorPreviewRef.current) {
      colorPreviewRef.current.style.backgroundColor = hex;
    }
  }

  function reset() {
    setStep("welcome");
    setSurface("");
    setFinish("");
    setWidth("");
    setHeight("");
    setWalls("1");
    setCoats("2");
    setBgColor(selectedColor);
  }

  return (
    <div
      ref={colorPreviewRef}
      className="min-h-screen transition-colors duration-700 flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/kiosk/start" className="flex items-center gap-2 text-white/80 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-semibold">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            <span className="font-bold">Mundo das Tintas</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["welcome", "surface", "finish", "calculate", "result"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step === s
                      ? "bg-white text-gray-900 shadow-lg scale-110"
                      : ["surface", "finish", "calculate", "result"].indexOf(s) <
                        ["surface", "finish", "calculate", "result"].indexOf(step)
                        ? "bg-white/80 text-gray-900"
                        : "bg-white/20 text-white/60"
                  }`}
                >
                  {["surface", "finish", "calculate", "result"].indexOf(s) <
                  ["surface", "finish", "calculate", "result"].indexOf(step)
                    ? <Check className="h-4 w-4" />
                    : i + 1}
                </div>
                {i < 4 && <div className={`w-8 h-0.5 ${["surface", "finish", "calculate", "result"].indexOf(s) < ["surface", "finish", "calculate", "result"].indexOf(step) ? "bg-white/80" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>

          {/* Welcome Step */}
          {step === "welcome" && (
            <div className="text-center text-white animate-fade-in">
              <div className="text-7xl mb-6">🎨</div>
              <h1 className="text-5xl md:text-6xl font-black mb-4 drop-shadow-lg">
                Encontre a Tinta Perfeita
              </h1>
              <p className="text-xl text-white/80 mb-8 max-w-lg mx-auto">
                Descubra a tinta ideal para o seu projeto, calcule a quantidade certa e explore
                cores — tudo aqui.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: "🎯", title: "Produto Certo", desc: "Guia rápido para escolher a tinta" },
                  { icon: "📐", title: "Calculadora", desc: "Saber exatamente quantos litros" },
                  { icon: "🎨", title: "Explorar Cores", desc: "Visualizar cores no ecrã" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center border border-white/10"
                  >
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="font-bold text-sm">{item.title}</div>
                    <div className="text-xs text-white/60 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep("surface")}
                className="bg-white text-gray-900 font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform"
              >
                Começar <Sparkles className="inline h-5 w-5 ml-2" />
              </button>
            </div>
          )}

          {/* Surface Step */}
          {step === "surface" && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-black text-white text-center mb-2">O que vais pintar?</h2>
              <p className="text-center text-white/60 mb-6">Escolhe a superfície para recomendarmos a tinta certa.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SURFACES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSurface(s.id);
                      setStep("finish");
                    }}
                    className={`p-6 rounded-2xl text-center transition-all duration-200 border-2 ${
                      surface === s.id
                        ? "bg-white text-gray-900 border-white scale-105 shadow-xl"
                        : "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:scale-102"
                    }`}
                  >
                    <div className="text-4xl mb-2">{s.icon}</div>
                    <div className="font-bold">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Finish Step */}
          {step === "finish" && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-black text-white text-center mb-2">Acabamento pretendido?</h2>
              <p className="text-center text-white/60 mb-6">O aspeto final da pintura.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FINISHES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFinish(f.id);
                      setStep("calculate");
                    }}
                    className={`p-6 rounded-2xl text-center transition-all duration-200 border-2 ${
                      finish === f.id
                        ? "bg-white text-gray-900 border-white scale-105 shadow-xl"
                        : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                    }`}
                  >
                    <Droplets className={`h-8 w-8 mx-auto mb-2 ${finish === f.id ? "text-gray-900" : "text-white/80"}`} />
                    <div className="font-bold">{f.label}</div>
                    <div className="text-xs text-white/60 mt-1">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Calculate Step */}
          {step === "calculate" && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-black text-white text-center mb-2">Calculadora de Tinta</h2>
              <p className="text-center text-white/60 mb-6">Mede a área a pintar.</p>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/80 text-sm font-semibold block mb-1">
                      <Ruler className="h-4 w-4 inline mr-1" />
                      Largura (m)
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="ex: 4"
                      className="w-full bg-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                    />
                  </div>
                  <div>
                    <label className="text-white/80 text-sm font-semibold block mb-1">
                      <Ruler className="h-4 w-4 inline mr-1" />
                      Altura (m)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="ex: 2.5"
                      className="w-full bg-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/80 text-sm font-semibold block mb-1">Paredes</label>
                    <select
                      value={walls}
                      onChange={(e) => setWalls(e.target.value)}
                      className="w-full bg-white/20 text-white rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n} className="bg-gray-800 text-white">
                          {n} parede{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/80 text-sm font-semibold block mb-1">Demãos</label>
                    <select
                      value={coats}
                      onChange={(e) => setCoats(e.target.value)}
                      className="w-full bg-white/20 text-white rounded-xl px-4 py-3 text-lg font-bold outline-none border border-white/10 focus:border-white/40"
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n} className="bg-gray-800 text-white">
                          {n} demão{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setStep("result")}
                  disabled={!width || !height}
                  className="w-full bg-white text-gray-900 font-bold text-lg py-4 rounded-xl hover:scale-[1.02] active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Calcular
                </button>
              </div>
            </div>
          )}

          {/* Result Step */}
          {step === "result" && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 text-white text-center">
                <div className="text-5xl mb-3">📐</div>
                <h2 className="text-3xl font-black mb-1">Resultado</h2>
                <p className="text-white/60 text-sm mb-4">Para o teu projeto, precisas de:</p>

                <div className="text-6xl font-black mb-2">
                  {totalLiters < 1 ? "< 1" : Math.ceil(totalLiters)}
                  <span className="text-2xl font-bold ml-1">L</span>
                </div>
                <p className="text-white/60 text-sm">
                  {area.toFixed(1)} m² — {surface === "exterior" ? " exterior" : ""} — {finish}
                </p>

                <div className="flex justify-center gap-4 mt-6">
                  {cans5l > 0 && (
                    <div className="bg-white/10 rounded-xl p-4 text-center min-w-[100px] border border-white/10">
                      <div className="text-3xl mb-1">🪣</div>
                      <div className="text-2xl font-bold">{cans5l}x</div>
                      <div className="text-xs text-white/60">5L</div>
                    </div>
                  )}
                  {cans1l > 0 && (
                    <div className="bg-white/10 rounded-xl p-4 text-center min-w-[100px] border border-white/10">
                      <div className="text-2xl mb-1">🥫</div>
                      <div className="text-2xl font-bold">{cans1l}x</div>
                      <div className="text-xs text-white/60">1L</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Color Explorer */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-5 w-5 text-white" />
                  <h3 className="text-lg font-bold text-white">Explorar Cores</h3>
                </div>
                <p className="text-white/60 text-sm mb-4">Toca numa cor para veres como fica no ecrã:</p>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((s) => (
                    <button
                      key={s.hex}
                      onClick={() => handleColorSelect(s.hex)}
                      className={`w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-125 ${
                        selectedColor === s.hex ? "border-white scale-110 shadow-lg" : "border-white/30"
                      }`}
                      style={{ backgroundColor: s.hex }}
                      title={s.name}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-white font-bold">{SWATCHES.find((s) => s.hex === selectedColor)?.name}</div>
                    <div className="text-white/60 text-xs">{selectedColor}</div>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl border-2 border-white/30"
                    style={{ backgroundColor: selectedColor }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 bg-white/10 text-white font-bold py-4 rounded-xl border border-white/20 hover:bg-white/20 transition"
                >
                  Recomeçar
                </button>
                <Link
                  to="/kiosk/start"
                  className="flex-1 bg-accent text-accent-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Ir para Compras
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
