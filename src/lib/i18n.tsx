import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "pt" | "en" | "es";

export const FLAGS: Record<Lang, string> = { pt: "🇵🇹", en: "🇬🇧", es: "🇪🇸" };

const DICT: Record<Lang, Record<string, string>> = {
  pt: {
    greeting_morning: "Bom dia",
    greeting_afternoon: "Boa tarde",
    greeting_evening: "Boa noite",
    welcome: "Bem-vindo à MarquesMater",
    subtitle: "Toque para descobrir o produto certo para si.",
    start: "Início",
    assistant_title: "Assistente MaterAssist",
    assistant_desc: "Descreve o que precisas por palavras tuas.",
    placeholder: "Ex: tenho uma torneira a pingar",
    thinking: "A pensar…",
    call_staff: "Chamar funcionário",
    calling: "A chamar...",
    end_session: "Terminar atendimento",
    session_active: "Sessão Ativa",
    session_blocked: "Esta sessão foi suspensa. Fale com um funcionário.",
    farewell_title: "Obrigado pela visita.",
    farewell_sub: "Até breve!",
    continue_phone: "Continua no telemóvel",
    scan_qr: "Aponte a câmara para continuar o chat no seu telemóvel",
    no_stock: "Sem stock",
    price_inquiry: "Preço sob consulta",
    promotion: "Promoção",
    contact_staff: "Chamar funcionário para assistência",
    try_again: "Tenta de novo",
    error_no_results: "Não encontrei nada no catálogo para a sua pesquisa.",
    error_call_staff:
      "Não foi possível chamar a equipa agora. Tenta de novo ou dirige-te a um funcionário na loja.",
    assistant_request: "Pedido do assistente",
    font_size: "Tamanho da letra",
    high_contrast: "Alto contraste",
    language: "Idioma",
  },
  en: {
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    welcome: "Welcome to MarquesMater",
    subtitle: "Tap to find the right product for you.",
    start: "Start",
    assistant_title: "MaterAssist Assistant",
    assistant_desc: "Describe what you need in your own words.",
    placeholder: "E.g., I have a dripping faucet",
    thinking: "Thinking…",
    call_staff: "Call staff",
    calling: "Calling...",
    end_session: "End session",
    session_active: "Active Session",
    session_blocked: "This session has been suspended. Please speak to a staff member.",
    farewell_title: "Thank you for visiting.",
    farewell_sub: "See you soon!",
    continue_phone: "Continue on your phone",
    scan_qr: "Point your camera to continue the chat on your phone",
    no_stock: "Out of stock",
    price_inquiry: "Price on request",
    promotion: "Promotion",
    contact_staff: "Call a staff member for assistance",
    try_again: "Try again",
    error_no_results: "I couldn't find anything in the catalog for your search.",
    error_call_staff:
      "Could not call the team now. Try again or speak to a staff member in the store.",
    assistant_request: "Assistant request",
    font_size: "Font size",
    high_contrast: "High contrast",
    language: "Language",
  },
  es: {
    greeting_morning: "Buenos días",
    greeting_afternoon: "Buenas tardes",
    greeting_evening: "Buenas noches",
    welcome: "Bienvenido a MarquesMater",
    subtitle: "Toque para encontrar el producto adecuado.",
    start: "Inicio",
    assistant_title: "Asistente MaterAssist",
    assistant_desc: "Describe lo que necesitas con tus palabras.",
    placeholder: "Ej: tengo un grifo que gotea",
    thinking: "Pensando…",
    call_staff: "Llamar empleado",
    calling: "Llamando...",
    end_session: "Finalizar atención",
    session_active: "Sesión Activa",
    session_blocked: "Esta sesión ha sido suspendida. Hable con un empleado.",
    farewell_title: "Gracias por su visita.",
    farewell_sub: "¡Hasta pronto!",
    continue_phone: "Continúa en tu móvil",
    scan_qr: "Apunta la cámara para continuar el chat en tu móvil",
    no_stock: "Sin stock",
    price_inquiry: "Precio bajo consulta",
    promotion: "Promoción",
    contact_staff: "Llame a un empleado para asistencia",
    try_again: "Intente de nuevo",
    error_no_results: "No encontré nada en el catálogo para su búsqueda.",
    error_call_staff:
      "No fue posible llamar al equipo ahora. Intente de nuevo o hable con un empleado en la tienda.",
    assistant_request: "Solicitud del asistente",
    font_size: "Tamaño de letra",
    high_contrast: "Alto contraste",
    language: "Idioma",
  },
};

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nCtx>({ lang: "pt", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("pt");
  const t = (key: string) => DICT[lang][key] ?? key;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

export function greetingFor(date: Date, lang: Lang) {
  const h = date.getHours();
  const key = h < 12 ? "greeting_morning" : h < 19 ? "greeting_afternoon" : "greeting_evening";
  return DICT[lang][key] || DICT.pt[key];
}
