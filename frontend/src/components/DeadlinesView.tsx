import React, { useState, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Clock,
  AlertTriangle,
  User,
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  Filter,
  Calendar,
  Calculator,
  Archive,
  ArrowUpRight,
  Edit2,
  Scale,
  Flag,
} from "lucide-react";
import { ClientSelect } from "./ClientSelect";
import { StyledSelect, type StyledSelectOption } from "./StyledSelect";

interface DeadlinesViewProps {
  darkMode: boolean;
  onNavigateToClients?: (clientId?: string, clientName?: string) => void;
}

const DEADLINE_AREA_OPTIONS: StyledSelectOption[] = [
  {
    value: "Previdenciário",
    label: "Previdenciário / INSS",
    subtitle: "Benefícios, recursos administrativos e revisões",
    icon: <Scale size={14} className="text-purple-400" />,
  },
  {
    value: "Civil",
    label: "Civil",
    subtitle: "Contestações, recursos, cobranças e execuções",
    icon: <Scale size={14} className="text-indigo-400" />,
  },
  {
    value: "Trabalhista",
    label: "Trabalhista",
    subtitle: "Audiências, recursos, contestações e execuções",
    icon: <Scale size={14} className="text-amber-400" />,
  },
  {
    value: "Administrativo",
    label: "Administrativo",
    subtitle: "Órgãos públicos, intimações e processos administrativos",
    icon: <Scale size={14} className="text-emerald-400" />,
  },
];

const DEADLINE_PRIORITY_OPTIONS: StyledSelectOption[] = [
  {
    value: "URGENT",
    label: "Urgente",
    subtitle: "Prazo fatal / prioridade máxima",
    icon: <AlertTriangle size={14} className="text-rose-400" />,
    badgeClass: "bg-rose-500/15 text-rose-400",
  },
  {
    value: "MODERATE",
    label: "Prazo Moderado",
    subtitle: "Acompanhamento dentro do prazo regular",
    icon: <Clock size={14} className="text-amber-400" />,
    badgeClass: "bg-amber-500/15 text-amber-400",
  },
  {
    value: "NO_DEADLINE",
    label: "Comum / Sem Urgência",
    subtitle: "Diligência ou monitoramento ordinário",
    icon: <Clock size={14} className="text-blue-400" />,
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
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
      if (day !== 0 && day !== 6) {
        count++;
      }
    }
    return count;
  } else {
    while (cursor.getTime() > e.getTime()) {
      cursor.setDate(cursor.getDate() - 1);
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
    }
    return -count;
  }
}

export const DeadlinesView: React.FC<DeadlinesViewProps> = ({
  darkMode,
  onNavigateToClients,
}) => {
  const [lawsuits, setLawsuits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosingCreate, setIsClosingCreate] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(
    null,
  );

  const [deadlineCompleteTarget, setDeadlineCompleteTarget] =
    useState<any>(null);
  const [isClosingComplete, setIsClosingComplete] = useState(false);

  const [deadlineDeleteTarget, setDeadlineDeleteTarget] = useState<any>(null);
  const [isClosingDelete, setIsClosingDelete] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const confirmBackdropRef = useRef<HTMLDivElement | null>(null);
  const confirmModalRef = useRef<HTMLDivElement | null>(null);
  const deleteBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement | null>(null);
  const createBackdropRef = useRef<HTMLDivElement | null>(null);
  const createModalRef = useRef<HTMLDivElement | null>(null);

  const [cnfNumber, setCnfNumber] = useState("");
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("Previdenciário");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("URGENT");
  const [publicationDate, setPublicationDate] = useState(() =>
    toInputDateString(new Date()),
  );
  const [businessDays, setBusinessDays] = useState<number>(15);
  const [manualOverrideDate, setManualOverrideDate] = useState<string>("");
  const [clientId, setClientId] = useState("");

  const areaSelectOptions = useMemo<StyledSelectOption[]>(() => {
    if (area && !DEADLINE_AREA_OPTIONS.some((opt) => opt.value === area)) {
      return [
        {
          value: area,
          label: area,
          icon: <Scale size={14} className="text-purple-400" />,
        },
        ...DEADLINE_AREA_OPTIONS,
      ];
    }
    return DEADLINE_AREA_OPTIONS;
  }, [area]);

  useEffect(() => {
    loadData();
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
      transformPerspective: 900,
      duration: 0.26,
      ease: "power2.in",
      onComplete: onDone,
    });
  };

  useEffect(() => {
    if (!deadlineCompleteTarget) return;
    setIsClosingComplete(false);
    const ctx = animateModalOpen(
      confirmBackdropRef.current,
      confirmModalRef.current,
    );
    return () => ctx.revert();
  }, [deadlineCompleteTarget]);

  useEffect(() => {
    if (!deadlineDeleteTarget) return;
    setIsClosingDelete(false);
    const ctx = animateModalOpen(
      deleteBackdropRef.current,
      deleteModalRef.current,
    );
    return () => ctx.revert();
  }, [deadlineDeleteTarget]);

  useEffect(() => {
    if (!isModalOpen) return;
    setIsClosingCreate(false);
    const ctx = animateModalOpen(
      createBackdropRef.current,
      createModalRef.current,
    );
    return () => ctx.revert();
  }, [isModalOpen]);

  const closeCompleteModal = (onComplete?: () => void) => {
    if (!deadlineCompleteTarget || isClosingComplete) return;
    setIsClosingComplete(true);
    animateModalClose(
      confirmBackdropRef.current,
      confirmModalRef.current,
      () => {
        setDeadlineCompleteTarget(null);
        setIsClosingComplete(false);
        onComplete?.();
      },
    );
  };

  const closeDeleteModal = (onComplete?: () => void) => {
    if (!deadlineDeleteTarget || isClosingDelete) return;
    setIsClosingDelete(true);
    animateModalClose(deleteBackdropRef.current, deleteModalRef.current, () => {
      setDeadlineDeleteTarget(null);
      setIsClosingDelete(false);
      onComplete?.();
    });
  };

  const closeCreateModal = (onComplete?: () => void) => {
    if (!isModalOpen || isClosingCreate) return;
    setIsClosingCreate(true);
    animateModalClose(createBackdropRef.current, createModalRef.current, () => {
      setIsModalOpen(false);
      setIsClosingCreate(false);
      onComplete?.();
    });
  };

  const calculatedDueDate = useMemo(() => {
    return addBusinessDays(publicationDate, businessDays);
  }, [publicationDate, businessDays]);

  const effectiveDueDateStr = useMemo(() => {
    if (manualOverrideDate) return manualOverrideDate;
    return calculatedDueDate ? toInputDateString(calculatedDueDate) : "";
  }, [manualOverrideDate, calculatedDueDate]);

  const loadData = async () => {
    try {
      const [lawsuitsRes, clientsRes] = await Promise.all([
        api.get("/lawsuits"),
        api.get("/clients"),
      ]);
      setLawsuits(lawsuitsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error("Erro ao buscar prazos:", error);
      toast.error("Erro ao carregar prazos processuais.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToClient = (lawsuit: any) => {
    const targetClientId = lawsuit.clientId || lawsuit.client?.id;
    const targetClientName = lawsuit.client?.name;

    if (targetClientId || targetClientName) {
      try {
        sessionStorage.setItem(
          "pepita:selectedClient",
          JSON.stringify({
            id: targetClientId || null,
            name: targetClientName || "",
          }),
        );
      } catch {
        // Ignora erro de storage em ambientes restritos
      }
    }

    if (onNavigateToClients) {
      onNavigateToClients(targetClientId, targetClientName);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("pepita:navigate", {
        detail: {
          tab: "clients",
          clientId: targetClientId,
          clientName: targetClientName,
        },
      }),
    );

    toast(
      targetClientName
        ? `Abrindo carteira de clientes para ${targetClientName}...`
        : "Abrindo carteira de clientes...",
    );
  };

  const resetForm = () => {
    setEditingDeadlineId(null);
    setCnfNumber("");
    setTitle("");
    setArea("Previdenciário");
    setDescription("");
    setPriority("URGENT");
    setPublicationDate(toInputDateString(new Date()));
    setBusinessDays(15);
    setManualOverrideDate("");
    setClientId("");
  };

  const handleOpenEditModal = (lawsuit: any) => {
    setEditingDeadlineId(lawsuit.id);
    setTitle(lawsuit.title || "");
    setArea(lawsuit.area || "Previdenciário");
    setCnfNumber(lawsuit.cnfNumber || "");
    setPriority(lawsuit.priority || "URGENT");
    setClientId(lawsuit.clientId || lawsuit.client?.id || "");

    const rawDesc = String(lawsuit.description || "");
    const lines = rawDesc.split("\n");
    const pubLineIndex = lines.findIndex((line) =>
      line.startsWith("Publicado em "),
    );

    if (pubLineIndex !== -1) {
      const pubLine = lines[pubLineIndex];
      const dateMatch = pubLine.match(/Publicado em (\d{2}\/\d{2}\/\d{4})/);
      const daysMatch = pubLine.match(/\((\d+)\s*dia\(s\)\s*útil\(eis\)\)/);

      if (dateMatch) {
        const [d, m, y] = dateMatch[1].split("/");
        setPublicationDate(`${y}-${m}-${d}`);
      }
      if (daysMatch) {
        setBusinessDays(Number(daysMatch[1]));
      }

      const cleanDesc = lines
        .filter((_, idx) => idx !== pubLineIndex)
        .join("\n")
        .trim();
      setDescription(cleanDesc);
    } else {
      setDescription(rawDesc);
    }

    const dueStr = lawsuit.deadlineDate
      ? toInputDateString(parseLocalDate(lawsuit.deadlineDate))
      : "";
    setManualOverrideDate(dueStr);
    setIsModalOpen(true);
  };

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDueDateStr) {
      toast.error("Informe a data da publicação e os dias úteis.");
      return;
    }

    const extraInfo = [
      description?.trim(),
      `Publicado em ${parseLocalDate(publicationDate).toLocaleDateString("pt-BR")} (${businessDays} dia(s) útil(eis)).`,
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      cnfNumber,
      title,
      area,
      description: extraInfo,
      priority,
      deadlineDate: effectiveDueDateStr,
      clientId: clientId || null,
    };

    try {
      const isEditing = Boolean(editingDeadlineId);

      if (editingDeadlineId) {
        await api.patch(`/lawsuits/${editingDeadlineId}`, payload);
      } else {
        await api.post("/lawsuits", {
          ...payload,
          status: "PENDING",
        });
      }

      resetForm();
      closeCreateModal(() => {
        toast.success(
          isEditing
            ? "Prazo atualizado com sucesso!"
            : "Prazo calculado e cadastrado com sucesso!",
        );
        loadData();
      });
    } catch (error) {
      console.error("Erro ao salvar prazo:", error);
      toast.error("Erro ao salvar prazo no banco de dados.");
    }
  };

  const executeCompleteDeadline = async (target: any) => {
    if (!target) return;
    try {
      await api.patch(`/lawsuits/${target.id}`, {
        status: "ARCHIVED",
      });
      toast.success("Prazo cumprido e enviado para os arquivados!");
      loadData();
    } catch (error) {
      console.error("Erro ao concluir prazo:", error);
      toast.error("Erro ao atualizar status do prazo.");
    }
  };

  const confirmCompleteDeadline = () => {
    const target = deadlineCompleteTarget;
    if (!target) return;
    closeCompleteModal(() => {
      executeCompleteDeadline(target);
    });
  };

  const executeDeleteDeadline = async (target: any) => {
    if (!target) return;
    try {
      await api.delete(`/lawsuits/${target.id}`);
      toast.success("Prazo excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir prazo:", error);
      toast.error("Erro ao excluir prazo.");
    }
  };

  const confirmDeleteDeadline = () => {
    const target = deadlineDeleteTarget;
    if (!target) return;
    closeDeleteModal(() => {
      executeDeleteDeadline(target);
    });
  };

  const handleOpenProcessLink = (number: string) => {
    const cleanNum = number.replace(/\D/g, "");
    window.open(
      `https://www.google.com/search?q=consulta+processo+${cleanNum}`,
      "_blank",
    );
  };

  const getDaysRemainingBadge = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = parseLocalDate(dateString);
    deadline.setHours(0, 0, 0, 0);

    const diffBusinessDays = countBusinessDaysBetween(today, deadline);

    if (diffBusinessDays < 0) {
      const absDays = Math.abs(diffBusinessDays);
      return {
        label: `Vencido há ${absDays} dia(s) útil(eis)`,
        style: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      };
    }
    if (diffBusinessDays === 0) {
      return {
        label: "Vence Hoje!",
        style: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
      };
    }
    if (diffBusinessDays <= 3) {
      return {
        label: `Faltam ${diffBusinessDays} dia(s) útil(eis)`,
        style: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      };
    }
    return {
      label: `Faltam ${diffBusinessDays} dia(s) útil(eis)`,
      style: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  };

  const getUrgencyBadge = (prio: string) => {
    if (prio === "URGENT") {
      return {
        label: "Urgente",
        style: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      };
    }
    if (prio === "MODERATE") {
      return {
        label: "Moderado",
        style: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      };
    }
    return {
      label: "Comum",
      style: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
  };

  const processDeadlines = lawsuits
    .filter((l) => l.deadlineDate && l.status === "PENDING")
    .filter((l) => priorityFilter === "ALL" || l.priority === priorityFilter)
    .sort(
      (a, b) =>
        parseLocalDate(a.deadlineDate).getTime() -
        parseLocalDate(b.deadlineDate).getTime(),
    );

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

  const modalCardBaseClass = `w-full max-w-lg p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
    darkMode
      ? "bg-gradient-to-b from-[#231b36] via-[#181226] to-[#120e1c] border-purple-400/25 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_45px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
      : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f4efff] border-purple-200/90 text-slate-800 shadow-[0_25px_65px_-15px_rgba(76,29,149,0.25),0_0_40px_-12px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]"
  }`;

  return (
    <div className="space-y-5 sm:space-y-6 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3
            className={`text-lg sm:text-xl font-bold ${darkMode ? "text-slate-100" : "text-slate-800"}`}
          >
            Prazos Processuais & Fatais
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Cálculo por dias úteis a partir da publicação (INSS, órgãos ou
            processos) vinculados aos clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all text-sm shrink-0"
        >
          <Plus size={18} />
          <span>Novo Prazo</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] text-purple-300"
              : "bg-white border-purple-100 text-purple-700 shadow-sm"
          }`}
        >
          <Filter size={14} />
          <span>Prioridade:</span>
        </div>

        {[
          { id: "ALL", label: "Todos" },
          { id: "URGENT", label: "Urgentes" },
          { id: "MODERATE", label: "Prazo Moderado" },
          { id: "NO_DEADLINE", label: "Comum / Sem Urgência" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPriorityFilter(item.id)}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
              priorityFilter === item.id
                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
                : darkMode
                  ? "bg-[#161221]/50 border-[#2a2238] text-slate-400 hover:bg-[#1f192b]"
                  : "bg-white border-purple-100 text-slate-600 hover:bg-purple-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">Carregando prazos...</p>
      ) : processDeadlines.length === 0 ? (
        <div
          className={`text-center py-16 sm:py-20 px-4 rounded-2xl border border-dashed ${
            darkMode
              ? "border-purple-900/40 text-slate-500"
              : "border-purple-200 text-slate-400"
          }`}
        >
          <AlertTriangle
            size={44}
            className="mx-auto mb-3 opacity-40 text-amber-400"
          />
          <p className="text-sm">
            Nenhum prazo fatal encontrado com esses critérios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {processDeadlines.map((lawsuit) => {
            const badge = getDaysRemainingBadge(lawsuit.deadlineDate);
            const urgency = getUrgencyBadge(lawsuit.priority);

            return (
              <div
                key={lawsuit.id}
                className={`group/card relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-w-0 ${
                  darkMode
                    ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/40 shadow-lg shadow-purple-950/20"
                    : "bg-white border-purple-100 hover:border-purple-300 shadow-md shadow-purple-100/50"
                }`}
              >
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-95 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(lawsuit)}
                    title="Editar prazo"
                    aria-label="Editar prazo"
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      darkMode
                        ? "bg-[#1c162b]/95 border-purple-500/25 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50 hover:text-purple-200"
                        : "bg-white/95 border-purple-200/80 text-purple-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                    }`}
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeadlineDeleteTarget(lawsuit)}
                    title="Excluir prazo"
                    aria-label="Excluir prazo"
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      darkMode
                        ? "bg-[#1c162b]/95 border-rose-500/25 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400/50 hover:text-rose-300"
                        : "bg-white/95 border-rose-200/80 text-rose-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 shadow-sm"
                    }`}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex justify-center -mt-1 sm:-mt-2 mb-2.5 px-12">
                    <span
                      className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-wider shrink-0 ${urgency.style}`}
                    >
                      {urgency.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 max-w-full ${badge.style}`}
                    >
                      <Clock size={12} className="shrink-0" />
                      <span className="truncate">{badge.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 mb-2">
                    <Calendar size={13} className="shrink-0" />
                    <span className="truncate">
                      Vencimento:{" "}
                      <strong>
                        {parseLocalDate(
                          lawsuit.deadlineDate,
                        ).toLocaleDateString("pt-BR")}
                      </strong>
                    </span>
                  </div>

                  <h4
                    className={`font-bold text-base mb-1.5 break-words ${darkMode ? "text-slate-100" : "text-slate-800"}`}
                  >
                    {lawsuit.title}
                  </h4>

                  {lawsuit.cnfNumber && (
                    <button
                      type="button"
                      onClick={() => handleOpenProcessLink(lawsuit.cnfNumber)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-purple-400 hover:text-purple-300 underline mb-2 transition-colors max-w-full"
                      title="Consultar andamento do processo"
                    >
                      <span className="truncate">
                        Proc: {lawsuit.cnfNumber}
                      </span>
                      <ExternalLink size={12} className="shrink-0" />
                    </button>
                  )}

                  {lawsuit.description && (
                    <p className="text-xs opacity-70 line-clamp-2 mb-3 whitespace-pre-line break-words">
                      {lawsuit.description}
                    </p>
                  )}

                  {lawsuit.client && (
                    <div className="mt-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleGoToClient(lawsuit)}
                        title="Ir para o cadastro do cliente"
                        className={`group/client w-full flex items-center justify-between gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-all cursor-pointer min-w-0 ${
                          darkMode
                            ? "text-purple-300/90 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400/40 hover:text-purple-200"
                            : "text-purple-800 bg-purple-50/80 border-purple-200/80 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-950"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <User
                            size={14}
                            className="text-purple-400 shrink-0 group-hover/client:scale-110 transition-transform"
                          />
                          <span className="truncate">
                            Cliente:{" "}
                            <strong className="group-hover/client:underline">
                              {lawsuit.client.name}
                            </strong>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-400 opacity-80 sm:opacity-0 sm:group-hover/client:opacity-100 transition-opacity shrink-0">
                          <span>Ver</span>
                          <ArrowUpRight size={12} />
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-5 sm:mt-6 pt-4 border-t border-purple-500/10 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold uppercase tracking-wider truncate">
                    {lawsuit.area}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeadlineCompleteTarget(lawsuit)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold transition-all shrink-0"
                  >
                    <CheckCircle2 size={14} />
                    <span>Cumprido</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA EXCLUIR PRAZO */}
      {deadlineDeleteTarget && (
        <div
          ref={deleteBackdropRef}
          onClick={() => closeDeleteModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={deleteModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-md`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-rose-500/20 via-red-500/20 to-purple-500/15 blur-2xl" />

            <button
              type="button"
              onClick={() => closeDeleteModal()}
              disabled={isClosingDelete}
              className={`relative z-10 top-0.5 right-0.5 ml-auto ${closeBtnClass}`}
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
                <AlertTriangle size={24} />
              </div>

              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-rose-400 mb-1">
                Ação Irreversível
              </span>

              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Excluir Prazo Processual?
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed">
                Esta ação removerá permanentemente o prazo selecionado do
                sistema.
              </p>

              <div
                className={`w-full mt-4 p-3.5 rounded-2xl border text-left ${
                  darkMode
                    ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                    : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                }`}
              >
                <p className="text-sm font-bold truncate">
                  {deadlineDeleteTarget.title}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2 text-[11px] opacity-80">
                  <span className="truncate">
                    Cliente:{" "}
                    {deadlineDeleteTarget.client?.name || "Não informado"}
                  </span>
                  {deadlineDeleteTarget.cnfNumber && (
                    <div className="sm:text-right shrink-0">
                      <span className="block text-[10px] uppercase tracking-wider opacity-70">
                        Processo nº
                      </span>
                      <span className="font-mono text-rose-400 break-all">
                        {deadlineDeleteTarget.cnfNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => closeDeleteModal()}
                disabled={isClosingDelete}
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
                onClick={confirmDeleteDeadline}
                disabled={isClosingDelete}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA CONCLUIR PRAZO */}
      {deadlineCompleteTarget && (
        <div
          ref={confirmBackdropRef}
          onClick={() => closeCompleteModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={confirmModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-md`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-emerald-400/20 via-purple-500/20 to-indigo-500/20 blur-2xl" />

            <button
              type="button"
              onClick={() => closeCompleteModal()}
              disabled={isClosingComplete}
              className={`relative z-10 top-0.5 right-0.5 ml-auto ${closeBtnClass}`}
            >
              <X size={16} />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center mt-1">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                  darkMode
                    ? "bg-gradient-to-br from-emerald-500/25 to-teal-600/15 border-emerald-400/30 text-emerald-300 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    : "bg-gradient-to-br from-emerald-500/15 to-purple-500/10 border-emerald-300/70 text-emerald-600 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                }`}
              >
                <CheckCircle2 size={28} />
              </div>

              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">
                Confirmação de Cumprimento
              </span>

              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Marcar Prazo como Cumprido?
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed">
                O prazo será marcado como concluído e enviado para{" "}
                <span className="inline-flex items-center gap-1 font-semibold text-purple-400">
                  <Archive size={13} />
                  Arquivados
                </span>
                .
              </p>

              <div
                className={`w-full mt-4 p-3.5 rounded-2xl border text-left ${
                  darkMode
                    ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                    : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                }`}
              >
                <p className="text-sm font-bold truncate">
                  {deadlineCompleteTarget.title}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2 text-[11px] opacity-80">
                  <span className="truncate">
                    Cliente:{" "}
                    {deadlineCompleteTarget.client?.name || "Não informado"}
                  </span>
                  {deadlineCompleteTarget.deadlineDate && (
                    <span className="font-mono text-rose-400 shrink-0">
                      Venc:{" "}
                      {parseLocalDate(
                        deadlineCompleteTarget.deadlineDate,
                      ).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => closeCompleteModal()}
                disabled={isClosingComplete}
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
                onClick={confirmCompleteDeadline}
                disabled={isClosingComplete}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                Confirmar Cumprimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CRIAR / EDITAR PRAZO COM CALCULADORA DE DIAS ÚTEIS */}
      {isModalOpen && (
        <div
          ref={createBackdropRef}
          onClick={() => closeCreateModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={createModalRef}
            onClick={(e) => e.stopPropagation()}
            className={modalCardBaseClass}
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
                  {editingDeadlineId ? (
                    <Edit2 size={19} />
                  ) : (
                    <Calculator size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    {editingDeadlineId
                      ? "Atualização de Prazo"
                      : "Calculadora de Dias Úteis"}
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    {editingDeadlineId
                      ? "Editar Prazo"
                      : "Cadastrar Novo Prazo"}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeCreateModal()}
                disabled={isClosingCreate}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveDeadline}
              className="relative z-10 space-y-3.5 sm:space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Título / Providência do Prazo *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Recurso Administrativo INSS / Contestação"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Área / Órgão
                  </label>
                  <StyledSelect
                    value={area}
                    onChange={setArea}
                    options={areaSelectOptions}
                    darkMode={darkMode}
                    placeholder="Selecionar área"
                    headerTitle="Área Jurídica"
                    headerIcon={<Scale size={13} />}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Cliente Vinculado
                  </label>
                  <ClientSelect
                    value={clientId}
                    onChange={setClientId}
                    clients={clients}
                    darkMode={darkMode}
                    placeholder="Selecionar cliente"
                    emptyOptionLabel="Nenhum cliente vinculado"
                  />
                </div>
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
                  darkMode
                    ? "bg-[#110d1b]/90 border-purple-400/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                    : "bg-purple-50/70 border-purple-200/80 shadow-[inset_0_2px_6px_rgba(88,28,135,0.05)]"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <Calculator size={14} className="shrink-0" />
                  <span>Cálculo Automático por Dias Úteis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-75">
                      Data da Publicação *
                    </label>
                    <input
                      type="date"
                      required
                      value={publicationDate}
                      onChange={(e) => {
                        setPublicationDate(e.target.value);
                        setManualOverrideDate("");
                      }}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 opacity-75">
                      Quantidade de Dias Úteis *
                    </label>
                    <StyledSelect
                      value={String(businessDays)}
                      onChange={(val) => {
                        setBusinessDays(Number(val));
                        setManualOverrideDate("");
                      }}
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

                <div className="pt-2 border-t border-purple-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs opacity-80">
                    Data final calculada:
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-rose-400">
                    {effectiveDueDateStr
                      ? parseLocalDate(effectiveDueDateStr).toLocaleDateString(
                          "pt-BR",
                        )
                      : "—"}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-65">
                    Ajuste Manual da Data Final (Opcional - feriados locais)
                  </label>
                  <input
                    type="date"
                    value={effectiveDueDateStr}
                    onChange={(e) => setManualOverrideDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Número do Processo / Protocolo
                  </label>
                  <input
                    type="text"
                    value={cnfNumber}
                    onChange={(e) => setCnfNumber(e.target.value)}
                    placeholder="Opcional"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Urgência / Prioridade
                  </label>
                  <StyledSelect
                    value={priority}
                    onChange={setPriority}
                    options={DEADLINE_PRIORITY_OPTIONS}
                    darkMode={darkMode}
                    headerTitle="Nível de Urgência"
                    headerIcon={<Flag size={13} />}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes da intimação ou exigência..."
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-500/15">
                <button
                  type="button"
                  onClick={() => closeCreateModal()}
                  disabled={isClosingCreate}
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
                  disabled={isClosingCreate}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
                >
                  {editingDeadlineId ? "Salvar Alterações" : "Salvar Prazo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
