import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import {
  Sparkles,
  AlertCircle,
  RotateCcw,
  Send,
  Crown,
  User,
  Zap,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  modelUsed?: string;
}

interface SavedChat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt?: string;
}

interface ClientOption {
  id: string;
  name: string;
  caseType?: string;
  phone?: string;
  cpf?: string;
}

interface PixPaymentData {
  paymentId: string | number;
  status?: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
}

type DeleteTarget =
  | { type: "single"; chat: SavedChat }
  | { type: "all" }
  | null;

const PEPITA_AVATAR_SRC = "/images/pepita-logo-navegador.png";
const MONTHLY_PRICE_LABEL = "R$ 49,90/mês";

const PRO_CAROUSEL_SLIDES = [
  {
    badge: "Mais Profundidade",
    title: "Respostas mais detalhadas",
    description:
      "Expande o limite para até 1.800 tokens, ideal para minutas, rascunhos de peças e análises completas sem cortes.",
  },
  {
    badge: "Estratégia Jurídica",
    title: "Análise focada em estratégia",
    description:
      "Ativa o modo Pepita Pro com instrução voltada a fundamentação, estratégia e visão mais ampla do caso.",
  },
  {
    badge: "Prioridade de Modelo",
    title: "IA Gemma 4 31B",
    description:
      "Em momentos de oscilação ou alta demanda, evita modelos leves e prioriza o Gemma 4 31B antes do fallback padrão.",
  },
  {
    badge: "Conta Sincronizada",
    title: "Plano salvo no seu perfil",
    description:
      "Após a confirmação do pagamento, o plano PRO fica vinculado à sua conta e continua ativo ao recarregar a tela.",
  },
];

const renderInlineFormatting = (text: string, darkMode: boolean) => {
  const tokens = text.split(/(\*\*[^*]+\*\*|\b\d{2}\/\d{2}\/\d{4}\b)/g);

  return tokens.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      const isUrgent = /urgent/i.test(inner);
      return (
        <strong
          key={idx}
          className={`font-semibold ${
            isUrgent
              ? "text-rose-400"
              : darkMode
                ? "text-purple-200"
                : "text-purple-900"
          }`}
        >
          {inner}
        </strong>
      );
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(part)) {
      return (
        <span
          key={idx}
          className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-mono font-semibold border align-baseline ${
            darkMode
              ? "bg-purple-500/15 text-purple-300 border-purple-500/25"
              : "bg-purple-100/80 text-purple-800 border-purple-200"
          }`}
        >
          {part}
        </span>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const FormattedBotMessage: React.FC<{ text: string; darkMode: boolean }> = ({
  text,
  darkMode,
}) => {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return <div key={index} className="h-1.5" />;
        }

        if (/^-{3,}$/.test(line)) {
          return (
            <hr
              key={index}
              className={`my-2.5 border-t ${
                darkMode ? "border-purple-500/15" : "border-purple-200/70"
              }`}
            />
          );
        }

        const headingMatch = line.match(/^#{1,4}\s*(.+)$/);
        if (headingMatch) {
          return (
            <div
              key={index}
              className={`pt-1.5 pb-0.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? "text-purple-300" : "text-purple-700"
              }`}
            >
              <span>{renderInlineFormatting(headingMatch[1], darkMode)}</span>
            </div>
          );
        }

        const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div
              key={index}
              className={`flex items-start gap-2 pl-2 py-1 rounded-lg text-xs sm:text-sm ${
                darkMode ? "bg-white/[0.02]" : "bg-purple-50/50"
              }`}
            >
              <span className="text-purple-400 font-bold mt-0.5">•</span>
              <div className="flex-1">
                {renderInlineFormatting(bulletMatch[1], darkMode)}
              </div>
            </div>
          );
        }

        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border text-xs sm:text-sm ${
                darkMode
                  ? "bg-[#171224] border-purple-500/15"
                  : "bg-white/80 border-purple-100"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                  darkMode
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {numberedMatch[1]}
              </span>
              <div className="flex-1">
                {renderInlineFormatting(numberedMatch[2], darkMode)}
              </div>
            </div>
          );
        }

        return (
          <p key={index} className="text-xs sm:text-sm whitespace-pre-wrap">
            {renderInlineFormatting(line, darkMode)}
          </p>
        );
      })}
    </div>
  );
};

export const PepitaChat: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isClosingDelete, setIsClosingDelete] = useState(false);
  const [deletingChats, setDeletingChats] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const deleteBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE");
  const [showProModal, setShowProModal] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  const proTouchStartX = useRef(0);
  const proTouchEndX = useRef(0);

  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "PIX">("CARD");
  const [payerEmail, setPayerEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkingPix, setCheckingPix] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkoutFeedback, setCheckoutFeedback] = useState("");
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const syncPlanFromAccount = async () => {
      try {
        const res = await api.get("/auth/me");
        const serverPlan = res.data?.user?.plan;
        if (serverPlan === "PRO" || serverPlan === "FREE") {
          setPlan(serverPlan);
        }
      } catch {
        // Mantém o plano atual caso a consulta falhe
      }
    };

    syncPlanFromAccount();
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;
    setIsClosingDelete(false);
    const cardEl = deleteModalRef.current;
    const backdropEl = deleteBackdropRef.current;
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
  }, [deleteTarget]);

  const closeDeleteModal = (onComplete?: () => void) => {
    if (!deleteTarget || isClosingDelete) return;
    setIsClosingDelete(true);

    const cardEl = deleteModalRef.current;
    const backdropEl = deleteBackdropRef.current;

    if (!cardEl) {
      setDeleteTarget(null);
      setIsClosingDelete(false);
      onComplete?.();
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
        setDeleteTarget(null);
        setIsClosingDelete(false);
        onComplete?.();
      },
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get("pepita_pro");
    if (mpStatus === "success") {
      setPlan("PRO");
      params.delete("pepita_pro");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  const loadSavedChats = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/pepita/chats");
      if (Array.isArray(res.data)) {
        const normalized: SavedChat[] = res.data.map((chat: any) => ({
          id: chat.id,
          title: chat.title || "Conversa",
          messages: Array.isArray(chat.messages) ? chat.messages : [],
          updatedAt: chat.updatedAt,
        }));
        setSavedChats(normalized);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico da Pepita:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSavedChats();

    const loadClients = async () => {
      try {
        const res = await api.get("/clients");
        if (Array.isArray(res.data)) {
          setClients(res.data);
        }
      } catch (err) {
        console.error(
          "Erro ao carregar clientes para contexto da Pepita:",
          err,
        );
      }
    };
    loadClients();
  }, []);

  const persistChat = async (
    nextMessages: Message[],
    chatIdToUpdate: string | null,
  ) => {
    if (nextMessages.length === 0) return;
    try {
      const res = await api.post("/pepita/chats", {
        id: chatIdToUpdate || undefined,
        messages: nextMessages,
      });

      const saved: SavedChat = {
        id: res.data.id,
        title: res.data.title,
        messages: Array.isArray(res.data.messages)
          ? res.data.messages
          : nextMessages,
        updatedAt: res.data.updatedAt,
      };

      setCurrentChatId(saved.id);
      setSavedChats((prev) => {
        const filtered = prev.filter((c) => c.id !== saved.id);
        return [saved, ...filtered];
      });
    } catch (err) {
      console.error("Erro ao salvar conversa no histórico:", err);
    }
  };

  const buildClientContext = () => {
    if (!selectedClientId) return "";
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return "";
    return [
      `Cliente: ${client.name}`,
      client.caseType ? `Tipo de caso: ${client.caseType}` : null,
      client.cpf ? `CPF: ${client.cpf}` : null,
      client.phone ? `Telefone: ${client.phone}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  };

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => {
        setCopiedId((prev) => (prev === msgId ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Erro ao copiar resposta:", err);
    }
  };

  const handleProButtonClick = () => {
    if (loading) return;
    if (plan === "PRO") {
      setPlan("FREE");
      return;
    }
    setCarouselIndex(0);
    setCheckoutFeedback("");
    setPixData(null);
    setPixCopied(false);
    setShowProModal(true);
  };

  const handlePrevSlide = () => {
    setCarouselIndex((prev) =>
      prev === 0 ? PRO_CAROUSEL_SLIDES.length - 1 : prev - 1,
    );
  };

  const handleNextSlide = () => {
    setCarouselIndex((prev) =>
      prev === PRO_CAROUSEL_SLIDES.length - 1 ? 0 : prev + 1,
    );
  };

  const handleProTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    proTouchStartX.current = e.touches[0].clientX;
  };

  const handleProTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    proTouchEndX.current = e.touches[0].clientX;
  };

  const handleProTouchEnd = () => {
    if (!proTouchStartX.current || !proTouchEndX.current) return;
    const distance = proTouchStartX.current - proTouchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      handleNextSlide();
    } else if (distance < -minSwipeDistance) {
      handlePrevSlide();
    }

    proTouchStartX.current = 0;
    proTouchEndX.current = 0;
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutFeedback("");

    try {
      if (paymentMethod === "CARD") {
        const res = await api.post("/pepita/mp/checkout", {
          email: payerEmail.trim() || undefined,
        });

        if (res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
          return;
        }

        throw new Error("URL de checkout do Mercado Pago não retornada.");
      }

      const res = await api.post("/pepita/mp/pix", {
        email: payerEmail.trim() || undefined,
      });

      if (!res.data?.qrCode && !res.data?.qrCodeBase64) {
        throw new Error("Não foi possível gerar o QR Code Pix.");
      }

      setPixData({
        paymentId: res.data.paymentId,
        status: res.data.status,
        qrCode: res.data.qrCode || "",
        qrCodeBase64: res.data.qrCodeBase64 || "",
        ticketUrl: res.data.ticketUrl || "",
      });
    } catch (err: any) {
      console.error("Erro ao iniciar pagamento no Mercado Pago:", err);
      setCheckoutFeedback(
        err?.response?.data?.error ||
          err?.message ||
          "Erro ao iniciar pagamento com o Mercado Pago.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar código Pix:", err);
    }
  };

  const handleVerifyPixPayment = async () => {
    if (!pixData?.paymentId || checkingPix) return;
    setCheckingPix(true);
    setCheckoutFeedback("");

    try {
      const res = await api.get(`/pepita/mp/payment/${pixData.paymentId}`);
      if (res.data?.approved) {
        setPlan(res.data?.plan === "PRO" ? "PRO" : "FREE");
        setShowProModal(false);
        setPixData(null);
      } else {
        setCheckoutFeedback(
          `Pagamento ainda em análise (${res.data?.status || "pending"}). Conclua o Pix no seu banco e clique em verificar novamente.`,
        );
      }
    } catch (err: any) {
      setCheckoutFeedback(
        err?.response?.data?.error || "Erro ao consultar status do Pix.",
      );
    } finally {
      setCheckingPix(false);
    }
  };

  const sendPromptText = async (
    textToSend: string,
    options?: { isRetry?: boolean },
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const baseMessages = options?.isRetry ? messages.slice(0, -1) : messages;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };

    const historyToSend = baseMessages.map(({ role, text }) => ({
      role,
      text,
    }));
    const nextWithUser = [...baseMessages, userMessage];
    const clientContext = buildClientContext();

    setMessages(nextWithUser);
    if (!options?.isRetry) {
      setPrompt("");
    }
    setErrorMsg("");
    setLastFailedPrompt(null);
    setLoading(true);

    try {
      const res = await api.post(
        "/pepita/chat",
        {
          prompt: trimmed,
          history: historyToSend,
          clientContext: clientContext || undefined,
          plan,
        },
        { timeout: 65000 },
      );

      const botMessage: Message = {
        id: `${Date.now()}-model`,
        role: "model",
        text: res.data.reply || "",
        modelUsed: res.data.modelUsed,
      };

      const finalMessages = [...nextWithUser, botMessage];
      setMessages(finalMessages);
      await persistChat(finalMessages, currentChatId);
    } catch (error: any) {
      console.error("Erro na Pepita:", error);

      const isTimeout =
        error?.code === "ECONNABORTED" ||
        String(error?.message || "")
          .toLowerCase()
          .includes("timeout");

      const backendError = isTimeout
        ? "A elaboração da resposta demorou mais que o esperado (65s) e atingiu o tempo limite. Clique em 'Tentar novamente'."
        : error?.response?.data?.error ||
          error?.response?.data?.details ||
          error?.message ||
          "Não foi possível obter resposta da Pepita no momento.";

      setErrorMsg(backendError);
      setLastFailedPrompt(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    if (loading) return;
    setCurrentChatId(null);
    setMessages([]);
    setErrorMsg("");
    setLastFailedPrompt(null);
    setPrompt("");
  };

  const handleSelectSavedChat = (chat: SavedChat) => {
    if (loading) return;
    setCurrentChatId(chat.id);
    setMessages(Array.isArray(chat.messages) ? chat.messages : []);
    setErrorMsg("");
    setLastFailedPrompt(null);
  };

  const handleRequestDeleteChat = (e: React.MouseEvent, chat: SavedChat) => {
    e.stopPropagation();
    if (loading || deletingChats || isClosingDelete) return;
    setDeleteTarget({ type: "single", chat });
  };

  const handleRequestDeleteAllChats = () => {
    if (
      loading ||
      deletingChats ||
      isClosingDelete ||
      savedChats.length === 0
    ) {
      return;
    }
    setDeleteTarget({ type: "all" });
  };

  const executeDeleteTarget = async (target: NonNullable<DeleteTarget>) => {
    try {
      setDeletingChats(true);

      if (target.type === "single") {
        const targetId = target.chat.id;
        await api.delete(`/pepita/chats/${targetId}`);
        setSavedChats((prev) => prev.filter((c) => c.id !== targetId));
        if (currentChatId === targetId) {
          setCurrentChatId(null);
          setMessages([]);
        }
      } else {
        await Promise.all(
          savedChats.map((chat) => api.delete(`/pepita/chats/${chat.id}`)),
        );
        setSavedChats([]);
        setCurrentChatId(null);
        setMessages([]);
        setErrorMsg("");
        setLastFailedPrompt(null);
      }
    } catch (err) {
      console.error("Erro ao excluir conversa(s):", err);
      await loadSavedChats();
    } finally {
      setDeletingChats(false);
    }
  };

  const handleConfirmDelete = () => {
    const target = deleteTarget;
    if (!target || deletingChats) return;
    closeDeleteModal(() => {
      executeDeleteTarget(target);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendPromptText(prompt);
  };

  const quickPrompts = [
    "Resuma meus prazos urgentes e próximos vencimentos",
    "Quais os meus compromissos para hoje?",
    "Liste as consultas agendadas esta semana",
  ];

  const deleteModalCardClass = `w-full max-w-md p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
    darkMode
      ? "bg-gradient-to-b from-[#231b36] via-[#181226] to-[#120e1c] border-purple-400/25 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_45px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
      : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f4efff] border-purple-200/90 text-slate-800 shadow-[0_25px_65px_-15px_rgba(76,29,149,0.25),0_0_40px_-12px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]"
  }`;

  const deleteCloseBtnClass = `flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-50 shrink-0 ${
    darkMode
      ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
      : "bg-purple-50 border-purple-200/70 text-slate-500 hover:text-slate-800 hover:bg-purple-100"
  }`;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* CABEÇALHO + PLANO ESSENCIAL / PEPITA PRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-xl font-bold ${
                darkMode ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Pepita - Assistente Jurídica IA
            </h3>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                plan === "PRO"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/20"
              }`}
            >
              {plan === "PRO" ? <Crown size={11} /> : <Zap size={11} />}
              <span>{plan === "PRO" ? "Pepita Pro" : "Essencial (Free)"}</span>
            </span>
          </div>
          <p
            className={`text-sm mt-0.5 ${
              darkMode ? "text-purple-300/60" : "text-purple-600/70"
            }`}
          >
            Tire dúvidas, consulte prazos do escritório e peça rascunhos
            jurídicos com histórico salvo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleProButtonClick}
            disabled={loading}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 ${
              plan === "PRO"
                ? "bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-amber-400/40 text-amber-300"
                : darkMode
                  ? "bg-[#161221] border-[#2a2238] text-purple-300 hover:border-purple-500/50"
                  : "bg-white border-purple-200 text-purple-700 hover:border-purple-400"
            }`}
          >
            <Crown size={13} />
            <span>
              {plan === "PRO" ? "Modo Pro Ativo" : "Ativar Pepita Pro"}
            </span>
          </button>

          {(messages.length > 0 || currentChatId) && (
            <button
              type="button"
              onClick={handleNewChat}
              disabled={loading}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                darkMode
                  ? "bg-[#161221] border-[#2a2238] text-slate-200 hover:border-purple-500"
                  : "bg-white border-purple-200 text-slate-700 hover:border-purple-400"
              }`}
            >
              <RotateCcw size={14} />
              <span>Nova conversa</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTEXTO DE CLIENTE + ATALHOS RÁPIDOS */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          darkMode
            ? "bg-[#161221]/60 border-[#2a2238]"
            : "bg-purple-50/50 border-purple-100"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 md:max-w-xs w-full">
          <User size={15} className="text-purple-400 shrink-0" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={loading}
            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium outline-none transition-all ${
              darkMode
                ? "bg-[#110d1b] border-purple-500/20 text-slate-200 focus:border-purple-400"
                : "bg-white border-purple-200 text-slate-700 focus:border-purple-400"
            }`}
          >
            <option value="">Contexto geral do escritório</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.caseType ? `(${c.caseType})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={loading}
              onClick={() => sendPromptText(qp)}
              className={`text-[11px] px-2.5 py-1.5 rounded-xl border font-medium transition-all disabled:opacity-50 ${
                darkMode
                  ? "bg-[#1f192b]/80 border-purple-500/20 text-purple-200 hover:border-purple-400/50"
                  : "bg-white border-purple-200/80 text-purple-700 hover:bg-purple-50"
              }`}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* LAYOUT PRINCIPAL: HISTÓRICO SALVO + ÁREA DE CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CONVERSAS SALVAS */}
        <div
          className={`lg:col-span-4 p-3.5 rounded-2xl border flex flex-col max-h-[560px] ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] text-slate-200"
              : "bg-white border-purple-100 text-slate-700 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Conversas Salvas
              </span>
              <span className="text-[11px] opacity-60">
                ({savedChats.length})
              </span>
            </div>

            {savedChats.length > 0 && (
              <button
                type="button"
                onClick={handleRequestDeleteAllChats}
                disabled={loading || deletingChats || isClosingDelete}
                title="Excluir todas as conversas salvas"
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-400 hover:bg-rose-500/15 border border-rose-500/20 inline-flex items-center gap-1 transition-all disabled:opacity-50"
              >
                <Trash2 size={12} />
                <span>Limpar tudo</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loadingHistory ? (
              <p className="text-xs opacity-60 text-center py-8">
                Carregando histórico...
              </p>
            ) : savedChats.length === 0 ? (
              <p className="text-xs opacity-60 text-center py-8 px-2">
                Nenhuma conversa salva ainda. Envie uma mensagem para iniciar.
              </p>
            ) : (
              savedChats.map((chat) => {
                const isSelected = chat.id === currentChatId;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectSavedChat(chat)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectSavedChat(chat);
                      }
                    }}
                    className={`group/chat flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-purple-600/20 border-purple-500/40 text-purple-200 font-semibold"
                        : darkMode
                          ? "bg-[#110d1b]/60 border-transparent hover:border-purple-500/20 text-slate-300"
                          : "bg-purple-50/40 border-transparent hover:border-purple-200 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare
                        size={14}
                        className="text-purple-400 shrink-0"
                      />
                      <span className="truncate">{chat.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleRequestDeleteChat(e, chat)}
                      disabled={loading || deletingChats || isClosingDelete}
                      title="Excluir conversa"
                      aria-label="Excluir conversa"
                      className="p-1 rounded-lg text-rose-400 opacity-75 sm:opacity-0 sm:group-hover/chat:opacity-100 hover:bg-rose-500/15 transition-all shrink-0 disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT + INPUT */}
        <div className="lg:col-span-8 space-y-3">
          <div
            className={`min-h-[340px] max-h-[480px] overflow-y-auto p-5 rounded-2xl border space-y-4 ${
              darkMode
                ? "bg-[#161221]/80 border-[#2a2238] text-slate-200"
                : "bg-white border-purple-100 text-slate-700 shadow-sm"
            }`}
          >
            {messages.length === 0 && !loading && (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-4 opacity-75">
                <Sparkles size={24} className="text-purple-400 mb-2" />
                <p className="font-medium">Como posso ajudar hoje?</p>
                <p className="text-xs mt-1 max-w-md">
                  Ex.: &ldquo;Redija um rascunho de petição inicial de
                  cobrança&rdquo; ou &ldquo;Quais os requisitos da tutela de
                  urgência no CPC?&rdquo;
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white whitespace-pre-wrap"
                        : darkMode
                          ? "bg-[#201930] border border-[#2f2545] text-slate-100"
                          : "bg-purple-50/70 border border-purple-100 text-slate-800"
                    }`}
                  >
                    {msg.role === "model" && (
                      <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-purple-500/15">
                        <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5 flex-wrap">
                          <img
                            src="/images/pepita-logo-navegador.png"
                            alt="Pepita IA"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-purple-400/40 shadow-md shadow-purple-500/20 shrink-0"
                          />
                          <span>PEPITA</span>
                          {msg.modelUsed && (
                            <span className="text-[10px] opacity-60 font-mono">
                              - {msg.modelUsed}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          title="Copiar resposta"
                          aria-label="Copiar resposta"
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-all shrink-0 ${
                            isCopied
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : darkMode
                                ? "bg-white/5 text-purple-200/80 hover:bg-white/10 hover:text-white"
                                : "bg-white text-purple-700 hover:bg-purple-100/80 border border-purple-200/70"
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {msg.role === "model" ? (
                      <FormattedBotMessage
                        text={msg.text}
                        darkMode={darkMode}
                      />
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm flex items-center gap-2 ${
                    darkMode
                      ? "bg-[#201930] border border-[#2f2545] text-purple-200"
                      : "bg-purple-50 border border-purple-100 text-purple-700"
                  }`}
                >
                  <Sparkles
                    size={15}
                    className="animate-pulse text-purple-400"
                  />
                  <span>Pensando...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {errorMsg && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm ${
                darkMode
                  ? "bg-red-950/40 border-red-500/40 text-red-200"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="shrink-0 mt-0.5 text-red-400"
                />
                <div>
                  <p className="font-semibold">Falha ao consultar a Pepita</p>
                  <p className="mt-0.5 opacity-90">{errorMsg}</p>
                </div>
              </div>

              {lastFailedPrompt && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    sendPromptText(lastFailedPrompt, { isRetry: true })
                  }
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 ${
                    darkMode
                      ? "bg-red-500/20 border-red-400/40 text-red-100 hover:bg-red-500/30"
                      : "bg-white border-red-300 text-red-700 hover:bg-red-100/70"
                  }`}
                >
                  <RefreshCw size={13} />
                  <span>Tentar novamente</span>
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Pergunte algo ou peça um rascunho de petição..."
              className={`flex-1 px-4 py-3 rounded-xl border outline-none transition-all ${
                darkMode
                  ? "bg-[#161221] border-[#2a2238] text-slate-100 focus:border-purple-500"
                  : "bg-white border-purple-200 text-slate-800 focus:border-purple-400"
              }`}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60"
            >
              <Send size={16} />
              <span>{loading ? "Pensando..." : "Enviar"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA EXCLUIR CONVERSA(S) */}
      {deleteTarget && (
        <div
          ref={deleteBackdropRef}
          onClick={() => closeDeleteModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={deleteModalRef}
            onClick={(e) => e.stopPropagation()}
            className={deleteModalCardClass}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-rose-500/20 via-red-500/20 to-purple-500/15 blur-2xl" />

            <button
              type="button"
              onClick={() => closeDeleteModal()}
              disabled={isClosingDelete || deletingChats}
              className={`relative z-10 top-0.5 right-0.5 ml-auto ${deleteCloseBtnClass}`}
            >
              <X size={16} />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center mt-1">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                  darkMode
                    ? "bg-gradient-to-br from-rose-500/25 to-red-600/15 border-rose-400/30 text-rose-300 shadow-[0_12px_24px_-6px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    : "bg-gradient-to-br from-rose-500/15 to-red-500/10 border-rose-300/70 text-rose-600 shadow-[0_12px_24px_-6px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                }`}
              >
                <Trash2 size={24} />
              </div>

              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-rose-400 mb-1">
                Ação Irreversível
              </span>

              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {deleteTarget.type === "single"
                  ? "Excluir Conversa?"
                  : "Excluir Todas as Conversas?"}
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed">
                {deleteTarget.type === "single"
                  ? "Esta ação removerá permanentemente a conversa selecionada do histórico."
                  : "Esta ação removerá permanentemente todas as conversas salvas do histórico."}
              </p>

              <div
                className={`w-full mt-4 p-3.5 rounded-2xl border text-left ${
                  darkMode
                    ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                    : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                }`}
              >
                {deleteTarget.type === "single" ? (
                  <>
                    <p className="text-sm font-bold truncate">
                      {deleteTarget.chat.title}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2 text-[11px] opacity-80">
                      <span>Histórico da Pepita IA</span>
                      <span className="font-mono text-rose-400">
                        {deleteTarget.chat.messages?.length || 0} mensagem(ns)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold truncate">
                      Histórico completo da Pepita IA
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2 text-[11px] opacity-80">
                      <span>Conversas que serão apagadas</span>
                      <span className="font-mono text-rose-400">
                        {savedChats.length} conversa(s)
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => closeDeleteModal()}
                disabled={isClosingDelete || deletingChats}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isClosingDelete || deletingChats}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                {deletingChats
                  ? "Excluindo..."
                  : deleteTarget.type === "single"
                    ? "Confirmar Exclusão"
                    : "Excluir Tudo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ASSINATURA MENSAL MERCADO PAGO - PEPITA PRO */}
      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto ${
              darkMode
                ? "bg-[#161221] border-[#2f2545] text-slate-100"
                : "bg-white border-purple-200 text-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() => setShowProModal(false)}
              aria-label="Fechar modal"
              className={`absolute top-4 right-4 p-1.5 rounded-xl transition-all ${
                darkMode
                  ? "text-slate-400 hover:bg-white/10 hover:text-white"
                  : "text-slate-500 hover:bg-purple-50 hover:text-slate-800"
              }`}
            >
              <X size={18} />
            </button>

            {/* FOTO DA PEPITA + TÍTULO */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-purple-950/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                {!avatarBroken ? (
                  <img
                    src={PEPITA_AVATAR_SRC}
                    alt="Pepita"
                    onError={() => setAvatarBroken(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Sparkles size={24} className="text-amber-400" />
                )}
              </div>

              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  <Crown size={12} />
                  <span>Assinatura Mensal</span>
                </div>
                <h4 className="text-lg font-bold leading-tight">
                  Ativar Pepita Pro
                </h4>
                <p className="text-xs opacity-75 mt-0.5">
                  Minutas detalhadas, análise estratégica e prioridade nas
                  respostas.
                </p>
              </div>
            </div>

            {/* VALOR MENSAL */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                darkMode
                  ? "bg-[#1f1930] border-amber-500/25"
                  : "bg-amber-50/70 border-amber-200"
              }`}
            >
              <div>
                <p className="text-xs font-semibold opacity-80">
                  Plano Mensal • Mercado Pago
                </p>
                <p className="text-[9px] opacity-60">
                  Pagamento direto na sua conta Mercado Pago
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-amber-400">
                  {MONTHLY_PRICE_LABEL}
                </span>
              </div>
            </div>

            {/* CARROSSEL 3D DE VANTAGENS DO PEPITA PRO */}
            <div
              className={`p-3 rounded-2xl border space-y-2 transition-colors ${
                darkMode
                  ? "bg-[#110d1b]/90 border-purple-500/20"
                  : "bg-purple-50/60 border-purple-200/80"
              }`}
            >
              <div className="relative flex items-center justify-center w-full gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Vantagem anterior"
                  className={`z-20 p-1.5 rounded-full border transition-all hover:scale-110 active:scale-95 shrink-0 cursor-pointer ${
                    darkMode
                      ? "bg-[#1b152b] border-purple-400/20 text-purple-200 hover:bg-[#241c38]"
                      : "bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <span className="block text-sm font-bold leading-none px-1">
                    ‹
                  </span>
                </button>

                <div
                  className="relative w-full h-[205px] sm:h-[215px] flex items-center justify-center overflow-hidden [perspective:1000px] touch-pan-y"
                  onTouchStart={handleProTouchStart}
                  onTouchMove={handleProTouchMove}
                  onTouchEnd={handleProTouchEnd}
                >
                  {PRO_CAROUSEL_SLIDES.map((slide, index) => {
                    const total = PRO_CAROUSEL_SLIDES.length;
                    const offset = (index - carouselIndex + total) % total;
                    let adjustedOffset = offset;

                    if (offset > total / 2) {
                      adjustedOffset = offset - total;
                    }

                    const isActive = adjustedOffset === 0;
                    const translateStep = isMobileScreen ? 95 : 130;
                    const rotateStep = isMobileScreen ? 20 : 28;

                    return (
                      <div
                        key={slide.title}
                        onClick={() => !isActive && setCarouselIndex(index)}
                        className={`absolute w-[210px] sm:w-[250px] h-[176px] sm:h-[186px] rounded-2xl p-3.5 flex flex-col justify-between border [transform-style:preserve-3d] transition-all duration-500 ease-out ${
                          isActive
                            ? darkMode
                              ? "bg-gradient-to-b from-[#251c3b] to-[#171226] border-amber-400/40 shadow-[0_12px_30px_-8px_rgba(245,158,11,0.28)]"
                              : "bg-white border-amber-400/60 shadow-[0_12px_28px_-8px_rgba(124,58,237,0.22)]"
                            : darkMode
                              ? "bg-[#191326]/70 border-purple-500/15 cursor-pointer"
                              : "bg-white/75 border-purple-100 cursor-pointer"
                        }`}
                        style={{
                          transform: `translateX(${adjustedOffset * translateStep}px) scale(${
                            isActive ? 1 : 0.78
                          }) rotateY(${adjustedOffset * rotateStep}deg)`,
                          opacity: Math.abs(adjustedOffset) > 1 ? 0 : 1,
                          zIndex: 10 - Math.abs(adjustedOffset),
                          filter: isActive
                            ? "none"
                            : "blur(1px) brightness(0.72)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 truncate">
                            {slide.badge}
                          </span>
                          <span className="text-[10px] font-mono opacity-60 shrink-0">
                            {index + 1}/{total}
                          </span>
                        </div>

                        <div className="space-y-1 my-auto min-w-0 text-center">
                          <h5 className="text-xs sm:text-sm font-bold leading-snug break-words text-center">
                            {slide.title}
                          </h5>
                          <p className="text-[11px] opacity-75 leading-snug line-clamp-3 break-words">
                            {slide.description}
                          </p>
                        </div>

                        <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent rounded mx-auto shrink-0" />
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Próxima vantagem"
                  className={`z-20 p-1.5 rounded-full border transition-all hover:scale-110 active:scale-95 shrink-0 cursor-pointer ${
                    darkMode
                      ? "bg-[#1b152b] border-purple-400/20 text-purple-200 hover:bg-[#241c38]"
                      : "bg-white border-purple-200 text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <span className="block text-sm font-bold leading-none px-1">
                    ›
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                {PRO_CAROUSEL_SLIDES.map((slide, idx) => {
                  const active = idx === carouselIndex;
                  return (
                    <button
                      key={slide.title}
                      type="button"
                      onClick={() => setCarouselIndex(idx)}
                      aria-label={`Ir para vantagem ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        active
                          ? "w-5 bg-amber-400"
                          : darkMode
                            ? "w-1.5 bg-purple-400/30 hover:bg-purple-400/50"
                            : "w-1.5 bg-purple-300 hover:bg-purple-400"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {!pixData ? (
              <form onSubmit={handleStartPayment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block opacity-85">
                    Forma de pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD")}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === "CARD"
                          ? "bg-purple-600/20 border-purple-500 text-purple-200"
                          : darkMode
                            ? "bg-[#110d1b] border-[#2a2238] text-slate-300 hover:border-purple-500/30"
                            : "bg-purple-50/40 border-purple-200 text-slate-700"
                      }`}
                    >
                      <CreditCard size={15} />
                      <span>Cartão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("PIX")}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === "PIX"
                          ? "bg-purple-600/20 border-purple-500 text-purple-200"
                          : darkMode
                            ? "bg-[#110d1b] border-[#2a2238] text-slate-300 hover:border-purple-500/30"
                            : "bg-purple-50/40 border-purple-200 text-slate-700"
                      }`}
                    >
                      <QrCode size={15} />
                      <span>Pix QR Code</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block opacity-85">
                    E-mail para recibo e cobrança
                  </label>
                  <input
                    type="email"
                    required
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="advogado@escritorio.com.br"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                      darkMode
                        ? "bg-[#110d1b] border-[#2a2238] text-slate-100 focus:border-purple-500"
                        : "bg-white border-purple-200 text-slate-800 focus:border-purple-400"
                    }`}
                  />
                </div>

                {checkoutFeedback && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-200 text-xs">
                    {checkoutFeedback}
                  </div>
                )}

                <div className="flex items-center gap-2 text-[9px] opacity-70">
                  <ShieldCheck
                    size={14}
                    className="text-emerald-400 shrink-0"
                  />
                  <span>
                    {paymentMethod === "CARD"
                      ? "Você será redirecionado ao checkout seguro do Mercado Pago para pagar com cartão."
                      : "Será gerado um QR Code Pix e código Copia e Cola na próxima tela."}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowProModal(false)}
                    disabled={checkoutLoading}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      darkMode
                        ? "bg-[#110d1b] border-[#2a2238] text-slate-300 hover:bg-white/5"
                        : "bg-white border-purple-200 text-slate-700 hover:bg-purple-50"
                    }`}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-95 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60"
                  >
                    <span>
                      {checkoutLoading
                        ? "Gerando..."
                        : paymentMethod === "CARD"
                          ? `Pagar com Cartão (${MONTHLY_PRICE_LABEL})`
                          : `Gerar Pix (${MONTHLY_PRICE_LABEL})`}
                    </span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-xs font-semibold text-emerald-400">
                    Escaneie o QR Code Pix abaixo para pagar{" "}
                    {MONTHLY_PRICE_LABEL}
                  </p>

                  {pixData.qrCodeBase64 && (
                    <div className="inline-block p-3 rounded-2xl bg-white shadow-md">
                      <img
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code Pix Mercado Pago"
                        className="w-44 h-44 object-contain"
                      />
                    </div>
                  )}
                </div>

                {pixData.qrCode && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block opacity-85">
                      Pix Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.qrCode}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                          darkMode
                            ? "bg-[#110d1b] border-[#2a2238] text-slate-200"
                            : "bg-purple-50/50 border-purple-200 text-slate-800"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleCopyPixCode}
                        className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0 hover:opacity-90"
                      >
                        {pixCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{pixCopied ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {checkoutFeedback && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-200 text-xs">
                    {checkoutFeedback}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPixData(null)}
                    className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      darkMode
                        ? "bg-[#110d1b] border-[#2a2238] text-slate-300 hover:bg-white/5"
                        : "bg-white border-purple-200 text-slate-700 hover:bg-purple-50"
                    }`}
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyPixPayment}
                    disabled={checkingPix}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-95 transition-all disabled:opacity-60"
                  >
                    <RefreshCw
                      size={13}
                      className={checkingPix ? "animate-spin" : ""}
                    />
                    <span>
                      {checkingPix
                        ? "Verificando..."
                        : "Já paguei / Verificar Pix"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
