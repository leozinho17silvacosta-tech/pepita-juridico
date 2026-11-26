import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import {
  LifeBuoy,
  X,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  MessageCircle,
  Mail,
  HelpCircle,
  RefreshCw,
} from "lucide-react";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  activeTabLabel?: string;
  supportPhone?: string;
  supportEmail?: string;
}

type ApiStatusState = "idle" | "checking" | "online" | "offline";

const QUICK_FAQS = [
  {
    q: "O e-mail das 08h não chegou na caixa de entrada",
    a: "Verifique a pasta de Spam/Lixo Eletrônico e marque o remetente como seguro. Em servidores gratuitos que hibernam, garanta que o cron externo esteja ativo às 08h (America/Sao_Paulo).",
  },
  {
    q: "Como mover ou concluir um processo no Kanban",
    a: "Arraste o card entre Sem Prazo, Prazo Moderado e Urgente para atualizar a prioridade, ou clique em Concluir para arquivar o processo.",
  },
  {
    q: "Gerou Pix mas o plano não atualizou na tela",
    a: "Conclua o pagamento no aplicativo do banco e clique em Já paguei / Verificar Pix dentro do modal da Pepita Pro.",
  },
];

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  activeTabLabel = "Painel Jurídico",
  supportPhone = "",
  supportEmail = "pepitapaineljuridico@gmail.com",
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatusState>("idle");
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [copiedReport, setCopiedReport] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const runApiCheck = async () => {
    setApiStatus("checking");
    setApiLatency(null);
    const start = performance.now();

    try {
      await api.get("/health", { timeout: 8000 });
      setApiLatency(Math.round(performance.now() - start));
      setApiStatus("online");
    } catch {
      try {
        await api.get("/pepita/chats", { timeout: 8000 });
        setApiLatency(Math.round(performance.now() - start));
        setApiStatus("online");
      } catch {
        setApiStatus("offline");
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setIsClosing(false);
    setCopiedReport(false);
    runApiCheck();

    const cardEl = modalRef.current;
    const backdropEl = backdropRef.current;
    if (!cardEl) return;

    const ctx = gsap.context(() => {
      if (backdropEl) {
        gsap.fromTo(
          backdropEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.28, ease: "power2.out" },
        );
      }

      gsap.fromTo(
        cardEl,
        {
          opacity: 0,
          y: 22,
          scale: 0.92,
          rotateX: 16,
          transformPerspective: 900,
          transformOrigin: "50% 60%",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.42,
          ease: "power3.out",
        },
      );
    }, cardEl);

    return () => ctx.revert();
  }, [isOpen]);

  const handleClose = () => {
    if (!isOpen || isClosing) return;
    setIsClosing(true);

    const cardEl = modalRef.current;
    const backdropEl = backdropRef.current;

    if (!cardEl) {
      setIsClosing(false);
      onClose();
      return;
    }

    if (backdropEl) {
      gsap.to(backdropEl, {
        opacity: 0,
        duration: 0.24,
        ease: "power2.in",
      });
    }

    gsap.to(cardEl, {
      opacity: 0,
      y: 16,
      scale: 0.94,
      rotateX: -10,
      transformPerspective: 900,
      duration: 0.26,
      ease: "power2.in",
      onComplete: () => {
        setIsClosing(false);
        onClose();
      },
    });
  };

  if (!isOpen) return null;

  const buildDiagnosticMessage = () => {
    const nowBr = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const viewport =
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight}`
        : "N/A";
    const route =
      typeof window !== "undefined" ? window.location.pathname : "/";

    return [
      "Olá! Preciso de suporte no Pepita Painel Jurídico:",
      `• Tela: ${activeTabLabel}`,
      `• Rota: ${route}`,
      `• Tema: ${darkMode ? "Escuro" : "Claro"}`,
      `• Resolução: ${viewport}`,
      `• Status API: ${apiStatus.toUpperCase()}${apiLatency !== null ? ` (${apiLatency}ms)` : ""}`,
      `• Data/Hora: ${nowBr}`,
      problemDescription.trim()
        ? `• Relato: ${problemDescription.trim()}`
        : "• Relato: (descreva o que aconteceu)",
    ].join("\n");
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildDiagnosticMessage());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar relatório:", err);
    }
  };

  const cleanPhone = supportPhone.replace(/\D/g, "");
  const whatsappHref = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(buildDiagnosticMessage())}`
    : null;

  const mailtoHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(`Suporte Pepita Painel Jurídico - ${activeTabLabel}`)}&body=${encodeURIComponent(buildDiagnosticMessage())}`
    : null;

  const modalCardClass = `w-full max-w-lg p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
    darkMode
      ? "bg-gradient-to-b from-[#231b36] via-[#181226] to-[#120e1c] border-purple-400/25 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_45px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
      : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f4efff] border-purple-200/90 text-slate-800 shadow-[0_25px_65px_-15px_rgba(76,29,149,0.25),0_0_40px_-12px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]"
  }`;

  const inputClass = `w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
    darkMode
      ? "bg-[#110d1b]/90 border-purple-400/15 text-slate-100 focus:border-purple-400/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
      : "bg-white/90 border-purple-200/90 text-slate-800 focus:border-purple-400 shadow-[inset_0_2px_6px_rgba(88,28,135,0.05)]"
  }`;

  return (
    <div
      ref={backdropRef}
      onClick={handleClose}
      style={{ perspective: "1000px" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={modalCardClass}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

        {/* CABEÇALHO */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                darkMode
                  ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
              }`}
            >
              <LifeBuoy size={20} />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                Central de Ajuda & Diagnóstico
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
                Suporte do Sistema
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing}
            aria-label="Fechar suporte"
            className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-50 shrink-0 ${
              darkMode
                ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                : "bg-purple-50 border-purple-200/70 text-slate-500 hover:text-slate-800 hover:bg-purple-100"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative z-10 space-y-4">
          {/* STATUS RÁPIDO DO SERVIDOR */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              darkMode
                ? "bg-[#110d1b]/90 border-purple-400/15"
                : "bg-white/90 border-purple-100"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {apiStatus === "online" ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : apiStatus === "offline" ? (
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
              ) : (
                <Wifi size={18} className="text-purple-400 shrink-0" />
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {apiStatus === "checking" &&
                    "Verificando conexão com a API..."}
                  {apiStatus === "online" &&
                    `Servidor online${apiLatency !== null ? ` (${apiLatency}ms)` : ""}`}
                  {apiStatus === "offline" &&
                    "Servidor indisponível ou carregando"}
                  {apiStatus === "idle" && "Status da conexão"}
                </p>
                <p className="text-[11px] opacity-65 truncate">
                  Tela atual: {activeTabLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={runApiCheck}
              disabled={apiStatus === "checking"}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50 ${
                darkMode
                  ? "bg-white/5 border-white/10 text-purple-200 hover:bg-white/10"
                  : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              }`}
            >
              <RefreshCw
                size={12}
                className={apiStatus === "checking" ? "animate-spin" : ""}
              />
              <span>Testar</span>
            </button>
          </div>

          {/* DÚVIDAS RÁPIDAS */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400 px-0.5">
              <HelpCircle size={13} />
              <span>Respostas rápidas</span>
            </div>

            <div className="space-y-1.5">
              {QUICK_FAQS.map((item, idx) => {
                const expanded = openFaqIndex === idx;
                return (
                  <div
                    key={item.q}
                    className={`rounded-2xl border overflow-hidden transition-colors ${
                      darkMode
                        ? "bg-[#110d1b]/70 border-purple-400/15"
                        : "bg-white/80 border-purple-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(expanded ? null : idx)}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between gap-2"
                    >
                      <span>{item.q}</span>
                      <span className="text-purple-400 font-mono text-sm shrink-0">
                        {expanded ? "−" : "+"}
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-3.5 pb-3 text-xs opacity-75 leading-relaxed border-t border-purple-500/10 pt-2">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RELATO DE PROBLEMA + COPIAR CONTEXTO */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-75">
              O que está acontecendo?
            </label>
            <textarea
              rows={3}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Ex: Tentei salvar um processo ou gerar um Pix e apareceu erro..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* AÇÕES DE RELATO */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-500/15">
            <button
              type="button"
              onClick={handleCopyReport}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                copiedReport
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                  : darkMode
                    ? "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                    : "bg-purple-50/80 border-purple-200 text-purple-700 hover:bg-purple-100"
              }`}
            >
              {copiedReport ? <Check size={14} /> : <Copy size={14} />}
              <span>
                {copiedReport ? "Relatório copiado!" : "Copiar diagnóstico"}
              </span>
            </button>

            <div className="flex items-center gap-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                    darkMode
                      ? "bg-[#110d1b] border-purple-400/20 text-purple-200 hover:border-purple-400/50"
                      : "bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </a>
              )}

              {mailtoHref && (
                <a
                  href={mailtoHref}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 transition-all inline-flex items-center gap-1.5 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55)]"
                >
                  <Mail size={14} />
                  <span>Enviar por e-mail</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
