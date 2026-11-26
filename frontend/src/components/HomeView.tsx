import React, { useState, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Users,
  Briefcase,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  X,
  AlertTriangle,
  Video,
  MapPin,
  User,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import { LegalCaseSelect } from "./LegalCaseSelect";
import { ClientSelect } from "./ClientSelect";
import { StyledSelect, type StyledSelectOption } from "./StyledSelect";

interface HomeViewProps {
  darkMode: boolean;
  onNavigateTab: (tab: string) => void;
}

const CONSULTATION_TYPE_OPTIONS: StyledSelectOption[] = [
  {
    value: "PRESENTIAL",
    label: "Presencial",
    subtitle: "Atendimento físico no escritório",
    icon: <MapPin size={14} className="text-emerald-400" />,
    badgeClass: "bg-emerald-500/15 text-emerald-400",
  },
  {
    value: "ONLINE",
    label: "Online",
    subtitle: "Videochamada (Meet / Zoom / WhatsApp)",
    icon: <Video size={14} className="text-blue-400" />,
    badgeClass: "bg-blue-500/15 text-blue-400",
  },
];

const COMMON_DEADLINE_LABELS: Record<number, string> = {
  5: "Embargos de Declaração / Manifestação",
  8: "Recurso Ordinário / Agravo (CLT)",
  10: "Contrarrazões / Prazo Geral",
  15: "Contestação / Apelação / Recurso (CPC)",
  30: "Fazenda Pública / Prazo Estendido",
};

const BUSINESS_DAYS_OPTIONS: StyledSelectOption[] = Array.from(
  { length: 90 },
  (_, i) => {
    const days = i + 1;
    return {
      value: String(days),
      label: `${days} ${days === 1 ? "dia útil" : "dias úteis"}`,
      subtitle: COMMON_DEADLINE_LABELS[days],
    };
  },
);

function parseLocalDate(dateStr: string): Date {
  const cleanDate = dateStr.split("T")[0];
  const [y, m, d] = cleanDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toInputDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addBusinessDays(
  publicationDateStr: string,
  businessDays: number,
): Date | null {
  if (!publicationDateStr || Number.isNaN(businessDays) || businessDays < 0) {
    return null;
  }
  const cursor = parseLocalDate(publicationDateStr);
  let remaining = Math.floor(businessDays);
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  return cursor;
}

function countBusinessDaysBetween(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (s.getTime() === e.getTime()) return 0;
  const isForward = e.getTime() > s.getTime();
  const cursor = new Date(s);
  let count = 0;
  if (isForward) {
    while (cursor.getTime() < e.getTime()) {
      cursor.setDate(cursor.getDate() + 1);
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  } else {
    while (cursor.getTime() > e.getTime()) {
      cursor.setDate(cursor.getDate() - 1);
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return -count;
  }
}

export const HomeView: React.FC<HomeViewProps> = ({
  darkMode,
  onNavigateTab,
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [lawsuits, setLawsuits] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [quickDeadlineOpen, setQuickDeadlineOpen] = useState(false);
  const [isClosingDeadlineModal, setIsClosingDeadlineModal] = useState(false);

  const [quickAppointmentOpen, setQuickAppointmentOpen] = useState(false);
  const [isClosingAppointmentModal, setIsClosingAppointmentModal] =
    useState(false);

  const [detailModalItem, setDetailModalItem] = useState<any>(null);
  const [isClosingDetailModal, setIsClosingDetailModal] = useState(false);

  const deadlineBackdropRef = useRef<HTMLDivElement | null>(null);
  const deadlineModalRef = useRef<HTMLDivElement | null>(null);
  const appointmentBackdropRef = useRef<HTMLDivElement | null>(null);
  const appointmentModalRef = useRef<HTMLDivElement | null>(null);
  const detailBackdropRef = useRef<HTMLDivElement | null>(null);
  const detailModalRef = useRef<HTMLDivElement | null>(null);

  const [dTitle, setDTitle] = useState("");
  const [dArea, setDArea] = useState("");
  const [dCnf, setDCnf] = useState("");
  const [dPriority] = useState("URGENT");
  const [dPubDate, setDPubDate] = useState(() => toInputDateString(new Date()));
  const [dBizDays, setDBizDays] = useState<number>(15);
  const [dClientId, setDClientId] = useState("");

  const [aTitle, setATitle] = useState("");
  const [aDate, setADate] = useState("");
  const [aType, setAType] = useState("PRESENTIAL");
  const [aNotes, setANotes] = useState("");
  const [aClientId, setAClientId] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const animateModalOpen = (
    backdropEl: HTMLDivElement | null,
    cardEl: HTMLDivElement | null,
  ) => {
    if (!cardEl) return gsap.context(() => {});

    return gsap.context(() => {
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
          scale: 0.93,
          rotateX: 15,
          transformPerspective: 1000,
          transformOrigin: "50% 55%",
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
  };

  const animateModalClose = (
    backdropEl: HTMLDivElement | null,
    cardEl: HTMLDivElement | null,
    onDone: () => void,
  ) => {
    if (!cardEl) {
      onDone();
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
      transformPerspective: 1000,
      duration: 0.26,
      ease: "power2.in",
      onComplete: onDone,
    });
  };

  useEffect(() => {
    if (!quickDeadlineOpen) return;
    setIsClosingDeadlineModal(false);
    const ctx = animateModalOpen(
      deadlineBackdropRef.current,
      deadlineModalRef.current,
    );
    return () => ctx.revert();
  }, [quickDeadlineOpen]);

  useEffect(() => {
    if (!quickAppointmentOpen) return;
    setIsClosingAppointmentModal(false);
    const ctx = animateModalOpen(
      appointmentBackdropRef.current,
      appointmentModalRef.current,
    );
    return () => ctx.revert();
  }, [quickAppointmentOpen]);

  useEffect(() => {
    if (!detailModalItem) return;
    setIsClosingDetailModal(false);
    const ctx = animateModalOpen(
      detailBackdropRef.current,
      detailModalRef.current,
    );
    return () => ctx.revert();
  }, [detailModalItem]);

  const closeQuickDeadlineModal = (onComplete?: () => void) => {
    if (!quickDeadlineOpen || isClosingDeadlineModal) return;
    setIsClosingDeadlineModal(true);
    animateModalClose(
      deadlineBackdropRef.current,
      deadlineModalRef.current,
      () => {
        setQuickDeadlineOpen(false);
        setIsClosingDeadlineModal(false);
        onComplete?.();
      },
    );
  };

  const closeQuickAppointmentModal = (onComplete?: () => void) => {
    if (!quickAppointmentOpen || isClosingAppointmentModal) return;
    setIsClosingAppointmentModal(true);
    animateModalClose(
      appointmentBackdropRef.current,
      appointmentModalRef.current,
      () => {
        setQuickAppointmentOpen(false);
        setIsClosingAppointmentModal(false);
        onComplete?.();
      },
    );
  };

  const closeDetailModal = (onComplete?: () => void) => {
    if (!detailModalItem || isClosingDetailModal) return;
    setIsClosingDetailModal(true);
    animateModalClose(detailBackdropRef.current, detailModalRef.current, () => {
      setDetailModalItem(null);
      setIsClosingDetailModal(false);
      onComplete?.();
    });
  };

  const loadDashboard = async () => {
    try {
      const [clientsRes, lawsuitsRes, appsRes] = await Promise.all([
        api.get("/clients"),
        api.get("/lawsuits"),
        api.get("/appointments"),
      ]);
      const loadedClients = clientsRes.data || [];
      setClients(loadedClients);
      setLawsuits(lawsuitsRes.data || []);
      setAppointments(appsRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar painel geral:", error);
      toast.error("Erro ao sincronizar dados do painel.");
    } finally {
      setLoading(false);
    }
  };

  const calculatedDueDate = useMemo(
    () => addBusinessDays(dPubDate, dBizDays),
    [dPubDate, dBizDays],
  );

  const activeLawsuits = useMemo(
    () =>
      lawsuits.filter(
        (l) => l.status !== "ARCHIVED" && l.status !== "COMPLETED",
      ),
    [lawsuits],
  );

  const pendingDeadlines = useMemo(
    () =>
      lawsuits
        .filter((l) => l.deadlineDate && l.status === "PENDING")
        .sort(
          (a, b) =>
            parseLocalDate(a.deadlineDate).getTime() -
            parseLocalDate(b.deadlineDate).getTime(),
        ),
    [lawsuits],
  );

  const upcomingAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [appointments],
  );

  const handleQuickCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculatedDueDate) return;
    if (!dArea) {
      toast.error("Selecione o tipo de processo.");
      return;
    }
    try {
      await api.post("/lawsuits", {
        title: dTitle,
        area: dArea,
        cnfNumber: dCnf,
        priority: dPriority,
        deadlineDate: toInputDateString(calculatedDueDate),
        description: `Publicado em ${parseLocalDate(dPubDate).toLocaleDateString("pt-BR")} (${dBizDays} dia(s) útil(eis)).`,
        clientId: dClientId || null,
        status: "PENDING",
      });
      setDTitle("");
      setDArea("");
      setDClientId("");
      setDCnf("");

      closeQuickDeadlineModal(() => {
        toast.success("Prazo criado no painel!");
        loadDashboard();
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar prazo.");
    }
  };

  const handleQuickCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/appointments", {
        title: aTitle,
        date: aDate,
        type: aType,
        notes: aNotes,
        priority: "MODERATE",
        clientId: aClientId || null,
      });
      setATitle("");
      setADate("");
      setANotes("");
      setAClientId("");

      closeQuickAppointmentModal(() => {
        toast.success("Consulta agendada no painel!");
        loadDashboard();
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao agendar consulta.");
    }
  };

  const handleCompleteDeadlineQuick = async (id: string) => {
    try {
      await api.patch(`/lawsuits/${id}`, { status: "ARCHIVED" });
      closeDetailModal(() => {
        toast.success("Prazo cumprido e arquivado!");
        loadDashboard();
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar prazo.");
    }
  };

  const getBizDaysBadge = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = parseLocalDate(dateString);
    deadline.setHours(0, 0, 0, 0);
    const diff = countBusinessDaysBetween(today, deadline);

    if (diff < 0) {
      return {
        text: `Vencido há ${Math.abs(diff)}d útil(eis)`,
        cls: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      };
    }
    if (diff === 0) {
      return {
        text: "Vence Hoje!",
        cls: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      };
    }
    if (diff <= 3) {
      return {
        text: `Faltam ${diff}d útil(eis)`,
        cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      };
    }
    return {
      text: `Faltam ${diff}d útil(eis)`,
      cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${clean}`, "_blank");
  };

  const fieldClass = `w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
    darkMode
      ? "bg-[#110d1b]/90 border-purple-400/15 text-slate-100 focus:border-purple-400/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
      : "bg-white/90 border-purple-200/90 text-slate-800 focus:border-purple-400 shadow-[inset_0_2px_6px_rgba(88,28,135,0.05)]"
  }`;

  const closeBtnClass = `flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-50 shrink-0 ${
    darkMode
      ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
      : "bg-purple-50 border-purple-200/70 text-slate-500 hover:text-slate-800 hover:bg-purple-100"
  }`;

  const modalCardBaseClass = `w-full p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
    darkMode
      ? "bg-gradient-to-b from-[#231b36] via-[#181226] to-[#120e1c] border-purple-400/25 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_45px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
      : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f4efff] border-purple-200/90 text-slate-800 shadow-[0_25px_65px_-15px_rgba(76,29,149,0.25),0_0_40px_-12px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]"
  }`;

  return (
    <div className="space-y-5 sm:space-y-6 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3
            className={`text-lg sm:text-xl font-bold ${darkMode ? "text-slate-100" : "text-slate-800"}`}
          >
            Painel Geral do Escritório
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Visão consolidada com modais de clique rápido para prazos, consultas
            e atalhos do sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setQuickDeadlineOpen(true)}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all"
          >
            <Plus size={15} className="shrink-0" />
            <span>Novo Prazo Rápido</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAppointmentOpen(true)}
            className={`flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl border text-xs font-semibold transition-all ${
              darkMode
                ? "bg-[#161221]/90 border-purple-500/35 text-purple-200 hover:bg-purple-900/30"
                : "bg-white border-purple-200 text-purple-800 hover:bg-purple-50 shadow-sm"
            }`}
          >
            <Plus size={15} className="shrink-0" />
            <span>Nova Consulta Rápida</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("pepita")}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-semibold transition-all"
          >
            <Sparkles size={15} className="shrink-0" />
            <span>Abrir Pepita IA</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigateTab("clients")}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all group min-w-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/45"
              : "bg-white border-purple-100 hover:border-purple-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider opacity-60 truncate">
              Clientes
            </span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
              <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold">
            {loading ? "—" : clients.length}
          </p>
          <span className="text-[11px] text-purple-400 inline-flex items-center gap-1 mt-1.5 sm:mt-2 group-hover:translate-x-0.5 transition-transform">
            Ver Clientes <ArrowRight size={12} />
          </span>
        </div>

        <div
          onClick={() => onNavigateTab("lawsuits")}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all group min-w-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/45"
              : "bg-white border-purple-100 hover:border-purple-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider opacity-60 truncate">
              Processos Ativos
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
              <Briefcase size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold">
            {loading ? "—" : activeLawsuits.length}
          </p>
          <span className="text-[11px] text-purple-400 inline-flex items-center gap-1 mt-1.5 sm:mt-2 group-hover:translate-x-0.5 transition-transform">
            Ver Processos <ArrowRight size={12} />
          </span>
        </div>

        <div
          onClick={() => onNavigateTab("deadlines")}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all group min-w-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/45"
              : "bg-white border-purple-100 hover:border-purple-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider opacity-60 truncate">
              Prazos Pendentes
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
              <Clock size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold">
            {loading ? "—" : pendingDeadlines.length}
          </p>
          <span className="text-[11px] text-purple-400 inline-flex items-center gap-1 mt-1.5 sm:mt-2 group-hover:translate-x-0.5 transition-transform">
            Ver Prazos <ArrowRight size={12} />
          </span>
        </div>

        <div
          onClick={() => onNavigateTab("consultations")}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all group min-w-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/45"
              : "bg-white border-purple-100 hover:border-purple-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider opacity-60 truncate">
              Consultas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <CalendarIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold">
            {loading ? "—" : appointments.length}
          </p>
          <span className="text-[11px] text-purple-400 inline-flex items-center gap-1 mt-1.5 sm:mt-2 group-hover:translate-x-0.5 transition-transform">
            Ver Consultas <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-16 text-slate-400">
          Carregando informações...
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div
            className={`p-4 sm:p-5 rounded-2xl border space-y-3 min-w-0 ${
              darkMode
                ? "bg-[#161221]/80 border-[#2a2238]"
                : "bg-white border-purple-100 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-500/10">
              <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2 min-w-0">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span className="truncate">Próximos Prazos (Dias Úteis)</span>
              </h4>
              <button
                type="button"
                onClick={() => onNavigateTab("deadlines")}
                className="text-xs text-purple-400 hover:underline font-medium shrink-0"
              >
                Ver todos
              </button>
            </div>

            {pendingDeadlines.length === 0 ? (
              <p className="text-xs opacity-50 py-10 text-center">
                Nenhum prazo pendente no momento.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5 sm:pr-1">
                {pendingDeadlines.slice(0, 6).map((item) => {
                  const badge = getBizDaysBadge(item.deadlineDate);
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setDetailModalItem({ ...item, kind: "deadline" })
                      }
                      className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 ${
                        darkMode
                          ? "bg-[#120f18]/80 border-[#2a2238] hover:border-purple-500/40"
                          : "bg-purple-50/40 border-purple-100 hover:border-purple-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {item.title}
                        </p>
                        <p className="text-xs opacity-65 truncate">
                          {item.client?.name || "Sem cliente"} • Venc:{" "}
                          {parseLocalDate(item.deadlineDate).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                      <span
                        className={`self-start sm:self-center text-[10px] px-2.5 py-1 rounded-full border font-semibold shrink-0 ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border space-y-3 min-w-0 ${
              darkMode
                ? "bg-[#161221]/80 border-[#2a2238]"
                : "bg-white border-purple-100 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-500/10">
              <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2 min-w-0">
                <CalendarIcon size={16} className="text-purple-400 shrink-0" />
                <span className="truncate">Agenda de Consultas</span>
              </h4>
              <button
                type="button"
                onClick={() => onNavigateTab("calendar")}
                className="text-xs text-purple-400 hover:underline font-medium shrink-0"
              >
                Abrir calendário
              </button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <p className="text-xs opacity-50 py-10 text-center">
                Nenhuma consulta agendada.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5 sm:pr-1">
                {upcomingAppointments.slice(0, 6).map((app) => (
                  <div
                    key={app.id}
                    onClick={() =>
                      setDetailModalItem({ ...app, kind: "consultation" })
                    }
                    className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 ${
                      darkMode
                        ? "bg-[#120f18]/80 border-[#2a2238] hover:border-purple-500/40"
                        : "bg-purple-50/40 border-purple-100 hover:border-purple-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 border shrink-0 ${
                            app.type === "ONLINE"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {app.type === "ONLINE" ? (
                            <Video size={10} />
                          ) : (
                            <MapPin size={10} />
                          )}
                          {app.type === "ONLINE" ? "Online" : "Presencial"}
                        </span>
                        <span className="text-xs font-semibold truncate">
                          {app.title}
                        </span>
                      </div>
                      <p className="text-xs opacity-65 truncate">
                        {app.client?.name || "Cliente avulso"}
                      </p>
                    </div>
                    <span className="self-start sm:self-center text-[11px] sm:text-xs font-mono text-purple-400 shrink-0">
                      {new Date(app.date).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE NOVO PRAZO RÁPIDO */}
      {quickDeadlineOpen && (
        <div
          ref={deadlineBackdropRef}
          onClick={() => closeQuickDeadlineModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={deadlineModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-lg`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    darkMode
                      ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <Calculator size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    Cálculo em Dias Úteis
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    Novo Prazo Rápido
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeQuickDeadlineModal()}
                disabled={isClosingDeadlineModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleQuickCreateDeadline}
              className="relative z-10 space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Data Publicação *
                  </label>
                  <input
                    type="date"
                    required
                    value={dPubDate}
                    onChange={(e) => setDPubDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Dias Úteis *
                  </label>
                  <StyledSelect
                    value={String(dBizDays)}
                    onChange={(val) => setDBizDays(Number(val))}
                    options={BUSINESS_DAYS_OPTIONS}
                    darkMode={darkMode}
                    placeholder="Selecionar dias úteis"
                    headerTitle="Prazo Processual"
                    headerIcon={<Clock size={13} />}
                    searchable
                    searchPlaceholder="Digitar quantidade de dias..."
                    allowCustomNumeric
                  />
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
                  darkMode
                    ? "bg-[#110d1b]/90 border-purple-400/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                    : "bg-white/90 border-purple-200/80 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                }`}
              >
                <span className="text-purple-400 font-bold flex items-center gap-1.5">
                  <Calculator size={14} className="shrink-0" /> Vencimento
                  calculado:
                </span>
                <span className="font-mono font-bold text-sm text-purple-300 shrink-0">
                  {calculatedDueDate
                    ? calculatedDueDate.toLocaleDateString("pt-BR")
                    : "—"}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={dTitle}
                  onChange={(e) => setDTitle(e.target.value)}
                  placeholder="Ex: Contestação / Recurso Ordinário / Audiência"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Cliente
                  </label>
                  <ClientSelect
                    value={dClientId}
                    onChange={setDClientId}
                    clients={clients}
                    darkMode={darkMode}
                    placeholder="Selecionar cliente"
                    emptyOptionLabel="Nenhum cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Área / Tipo de Processo *
                  </label>
                  <LegalCaseSelect
                    value={dArea}
                    onChange={setDArea}
                    darkMode={darkMode}
                    placeholder="Selecionar tipo de processo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-500/15">
                <button
                  type="button"
                  onClick={() => closeQuickDeadlineModal()}
                  disabled={isClosingDeadlineModal}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                    darkMode
                      ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isClosingDeadlineModal}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
                >
                  Salvar Prazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE NOVA CONSULTA RÁPIDA */}
      {quickAppointmentOpen && (
        <div
          ref={appointmentBackdropRef}
          onClick={() => closeQuickAppointmentModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={appointmentModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-lg`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    darkMode
                      ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <CalendarIcon size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    Agenda do Escritório
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    Nova Consulta Rápida
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeQuickAppointmentModal()}
                disabled={isClosingAppointmentModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleQuickCreateAppointment}
              className="relative z-10 space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={aTitle}
                  onChange={(e) => setATitle(e.target.value)}
                  placeholder="Ex: Reunião de acompanhamento"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Tipo de Consulta
                  </label>
                  <StyledSelect
                    value={aType}
                    onChange={setAType}
                    options={CONSULTATION_TYPE_OPTIONS}
                    darkMode={darkMode}
                    headerTitle="Modalidade"
                    headerIcon={<Video size={13} />}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={aDate}
                    onChange={(e) => setADate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Cliente
                </label>
                <ClientSelect
                  value={aClientId}
                  onChange={setAClientId}
                  clients={clients}
                  darkMode={darkMode}
                  placeholder="Selecionar cliente"
                  emptyOptionLabel="Cliente avulso (sem vínculo)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={aNotes}
                  onChange={(e) => setANotes(e.target.value)}
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-500/15">
                <button
                  type="button"
                  onClick={() => closeQuickAppointmentModal()}
                  disabled={isClosingAppointmentModal}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                    darkMode
                      ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isClosingAppointmentModal}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE DETALHES DO PRAZO / CONSULTA */}
      {detailModalItem && (
        <div
          ref={detailBackdropRef}
          onClick={() => closeDetailModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={detailModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-md space-y-4`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-emerald-500/15 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    detailModalItem.kind === "deadline"
                      ? darkMode
                        ? "bg-gradient-to-br from-rose-500/25 to-red-600/15 border-rose-400/30 text-rose-300 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        : "bg-gradient-to-br from-rose-500/15 to-red-500/10 border-rose-300/70 text-rose-600 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                      : darkMode
                        ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  {detailModalItem.kind === "deadline" ? (
                    <Clock size={20} />
                  ) : (
                    <CalendarIcon size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    {detailModalItem.kind === "deadline"
                      ? "Detalhes do Prazo"
                      : "Detalhes da Consulta"}
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                    {detailModalItem.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDetailModal()}
                disabled={isClosingDetailModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <div
              className={`relative z-10 p-3.5 sm:p-4 rounded-2xl border space-y-2.5 text-xs ${
                darkMode
                  ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                  : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
              }`}
            >
              <p className="flex items-center gap-2">
                <User size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">
                  Cliente:{" "}
                  <strong>
                    {detailModalItem.client?.name || "Não informado"}
                  </strong>
                </span>
              </p>

              {detailModalItem.kind === "deadline" &&
                detailModalItem.deadlineDate && (
                  <p className="flex items-center gap-2">
                    <Clock size={14} className="text-rose-400 shrink-0" />
                    <span>
                      Vencimento:{" "}
                      <strong className="font-mono">
                        {parseLocalDate(
                          detailModalItem.deadlineDate,
                        ).toLocaleDateString("pt-BR")}
                      </strong>
                    </span>
                  </p>
                )}

              {detailModalItem.kind === "consultation" &&
                detailModalItem.date && (
                  <p className="flex items-center gap-2">
                    <CalendarIcon
                      size={14}
                      className="text-purple-400 shrink-0"
                    />
                    <span>
                      Data/Hora:{" "}
                      <strong className="font-mono">
                        {new Date(detailModalItem.date).toLocaleString("pt-BR")}
                      </strong>
                    </span>
                  </p>
                )}

              {(detailModalItem.description || detailModalItem.notes) && (
                <p className="opacity-75 pt-2 border-t border-purple-500/10 leading-relaxed break-words">
                  {detailModalItem.description || detailModalItem.notes}
                </p>
              )}
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
              {detailModalItem.client?.phone ? (
                <button
                  type="button"
                  onClick={() => handleWhatsApp(detailModalItem.client.phone)}
                  className="justify-center inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold transition-all"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
              ) : (
                <span className="hidden sm:inline" />
              )}

              {detailModalItem.kind === "deadline" && (
                <button
                  type="button"
                  onClick={() =>
                    handleCompleteDeadlineQuick(detailModalItem.id)
                  }
                  disabled={isClosingDetailModal}
                  className="justify-center inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]"
                >
                  <CheckCircle2 size={14} /> Marcar Cumprido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
