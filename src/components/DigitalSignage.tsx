import { useEffect, useState } from "react";

const SLIDES = [
  {
    emoji: "🎨",
    title: "Tintas em promoção",
    desc: "Até 30% desconto em tintas acrílicas e esmalte sintético.",
    bg: "from-blue-600 to-blue-800",
  },
  {
    emoji: "🔧",
    title: "Ferramentas profissionais",
    desc: "Furadeiras, níveis e jogos de chaves — os melhores preços.",
    bg: "from-emerald-600 to-emerald-800",
  },
  {
    emoji: "🌱",
    title: "Jardim e exterior",
    desc: "Terra, adubos e ferramentas de jardinagem.",
    bg: "from-green-600 to-green-800",
  },
  {
    emoji: "💡",
    title: "Eletricidade e iluminação",
    desc: "Lâmpadas LED, tomadas e material elétrico.",
    bg: "from-amber-600 to-amber-800",
  },
  {
    emoji: "🪠",
    title: "Canalização",
    desc: "Tubos, válvulas, sifões e tudo para reparações.",
    bg: "from-cyan-600 to-cyan-800",
  },
];

export default function DigitalSignage() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const s = SLIDES[idx];

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-br ${s.bg} text-white transition-all duration-1000`}
    >
      <div className="text-8xl mb-8 animate-bounce">{s.emoji}</div>
      <h2 className="text-5xl font-extrabold mb-4 text-center px-6">{s.title}</h2>
      <p className="text-2xl opacity-90 max-w-xl text-center px-6">{s.desc}</p>
      <div className="flex gap-2 mt-10">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-all ${i === idx ? "bg-white w-6" : "bg-white/40"}`}
          />
        ))}
      </div>
      <p className="absolute bottom-8 text-sm opacity-60">Toque no ecrã para voltar</p>
    </div>
  );
}
