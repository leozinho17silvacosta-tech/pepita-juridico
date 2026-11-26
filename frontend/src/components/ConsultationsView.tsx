import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Video,
  MapPin,
  X,
  User,
  Filter,
  FileText,
  ArrowUpRight,
  CalendarPlus,
  Phone,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { ClientSelect } from "./ClientSelect";
import { StyledSelect, type StyledSelectOption } from "./StyledSelect";

interface ConsultationsViewProps {
  darkMode: boolean;
  onNavigateToClients?: (clientId?: string, clientName?: string) => void;
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
    label: "Online / Remoto",
    subtitle: "Videochamada (Meet / Zoom / WhatsApp)",
    icon: <Video size={14} className="text-blue-400" />,
    badgeClass: "bg-blue-500/15 text-blue-400",
  },
];

function toDatetimeLocalString(dateValue: string | Date): string {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hours}:${minutes}`;
}

function formatPhoneBr(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }
  if (rest.length <= 8) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export const ConsultationsView: React.FC<ConsultationsViewProps> = ({
  darkMode,
  onNavigateToClients,
}) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosingCreate, setIsClosingCreate] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<
    string | null
  >(null);

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isClosingDetails, setIsClosingDetails] = useState(false);

  const [appointmentDeleteTarget, setAppointmentDeleteTarget] =
    useState<any>(null);
  const [isClosingDelete, setIsClosingDelete] = useState(false);

  const createBackdropRef = useRef<HTMLDivElement | null>(null);
  const createModalRef = useRef<HTMLDivElement | null>(null);
  const detailsBackdropRef = useRef<HTMLDivElement | null>(null);
  const detailsModalRef = useRef<HTMLDivElement | null>(null);
  const deleteBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement | null>(null);

  const [typeFilter, setTypeFilter] = useState("ALL");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("PRESENTIAL");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("MODERATE");
  const [clientId, setClientId] = useState("");

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
          y: 24,
          scale: 0.93,
          rotateX: 14,
          transformPerspective: 1000,
          transformOrigin: "50% 55%",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.44,
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
      y: 18,
      scale: 0.94,
      rotateX: -10,
      transformPerspective: 1000,
      duration: 0.26,
      ease: "power2.in",
      onComplete: onDone,
    });
  };

  useEffect(() => {
    if (!isModalOpen) return;
    setIsClosingCreate(false);
    const ctx = animateModalOpen(
      createBackdropRef.current,
      createModalRef.current,
    );
    return () => ctx.revert();
  }, [isModalOpen]);

  useEffect(() => {
    if (!selectedAppointment) return;
    setIsClosingDetails(false);
    const ctx = animateModalOpen(
      detailsBackdropRef.current,
      detailsModalRef.current,
    );
    return () => ctx.revert();
  }, [selectedAppointment]);

  useEffect(() => {
    if (!appointmentDeleteTarget) return;
    setIsClosingDelete(false);
    const ctx = animateModalOpen(
      deleteBackdropRef.current,
      deleteModalRef.current,
    );
    return () => ctx.revert();
  }, [appointmentDeleteTarget]);

  const closeCreateModal = (onComplete?: () => void) => {
    if (!isModalOpen || isClosingCreate) return;
    setIsClosingCreate(true);
    animateModalClose(createBackdropRef.current, createModalRef.current, () => {
      setIsModalOpen(false);
      setIsClosingCreate(false);
      onComplete?.();
    });
  };

  const closeDetailsModal = (onComplete?: () => void) => {
    if (!selectedAppointment || isClosingDetails) return;
    setIsClosingDetails(true);
    animateModalClose(
      detailsBackdropRef.current,
      detailsModalRef.current,
      () => {
        setSelectedAppointment(null);
        setIsClosingDetails(false);
        onComplete?.();
      },
    );
  };

  const closeDeleteModal = (onComplete?: () => void) => {
    if (!appointmentDeleteTarget || isClosingDelete) return;
    setIsClosingDelete(true);
    animateModalClose(deleteBackdropRef.current, deleteModalRef.current, () => {
      setAppointmentDeleteTarget(null);
      setIsClosingDelete(false);
      onComplete?.();
    });
  };

  const loadData = async () => {
    try {
      const [appRes, clientsRes] = await Promise.all([
        api.get("/appointments"),
        api.get("/clients"),
      ]);
      setAppointments(appRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      toast.error("Erro ao carregar consultas.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToClient = (appointment: any) => {
    const targetClientId = appointment.clientId || appointment.client?.id;
    const targetClientName = appointment.client?.name;

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
    setEditingAppointmentId(null);
    setTitle("");
    setDate("");
    setType("PRESENTIAL");
    setNotes("");
    setPriority("MODERATE");
    setClientId("");
  };

  const handleOpenEditModal = (app: any) => {
    setEditingAppointmentId(app.id);
    setTitle(app.title || "");
    setDate(app.date ? toDatetimeLocalString(app.date) : "");
    setType(app.type || "PRESENTIAL");
    setNotes(app.notes || "");
    setPriority(app.priority || "MODERATE");
    setClientId(app.clientId || app.client?.id || "");
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      date,
      type,
      notes,
      priority,
      clientId: clientId || null,
    };

    try {
      const isEditing = Boolean(editingAppointmentId);

      if (editingAppointmentId) {
        await api.patch(`/appointments/${editingAppointmentId}`, payload);
      } else {
        await api.post("/appointments", payload);
      }

      resetForm();
      closeCreateModal(() => {
        toast.success(
          isEditing
            ? "Consulta atualizada com sucesso!"
            : "Consulta agendada com sucesso!",
        );
        loadData();
      });
    } catch (error) {
      console.error("Erro ao salvar consulta:", error);
      toast.error("Erro ao salvar consulta.");
    }
  };

  const executeDeleteAppointment = async (target: any) => {
    if (!target) return;
    try {
      await api.delete(`/appointments/${target.id}`);
      toast.success("Consulta excluída com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir consulta:", error);
      toast.error("Erro ao excluir consulta.");
    }
  };

  const confirmDeleteAppointment = () => {
    const target = appointmentDeleteTarget;
    if (!target) return;
    closeDeleteModal(() => {
      executeDeleteAppointment(target);
    });
  };

  const handleUpdateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    try {
      await api.patch(`/appointments/${selectedAppointment.id}`, {
        notes: selectedAppointment.notes,
      });

      closeDetailsModal(() => {
        toast.success("Anotações salvas com sucesso!");
        loadData();
      });
    } catch (error) {
      console.error("Erro ao atualizar notas:", error);
      toast.error("Erro ao salvar anotações.");
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (typeFilter === "ALL") return true;
    return app.type === typeFilter;
  });

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
            Gestão de Consultas & Atendimentos
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Controle de reuniões presenciais ou online com registro de anotações
            pós-atendimento.
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
          <span>Nova Consulta</span>
        </button>
      </div>

      {/* BARRA DE FILTROS (TODAS, PRESENCIAL, ONLINE) */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] text-purple-300"
              : "bg-white border-purple-100 text-purple-700 shadow-sm"
          }`}
        >
          <Filter size={14} />
          <span>Filtrar por:</span>
        </div>
        <button
          type="button"
          onClick={() => setTypeFilter("ALL")}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
            typeFilter === "ALL"
              ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
              : darkMode
                ? "bg-[#161221]/50 border-[#2a2238] text-slate-400 hover:bg-[#1f192b]"
                : "bg-white border-purple-100 text-slate-600 hover:bg-purple-50"
          }`}
        >
          Todas ({appointments.length})
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter("PRESENTIAL")}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 shrink-0 ${
            typeFilter === "PRESENTIAL"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
              : darkMode
                ? "bg-[#161221]/50 border-[#2a2238] text-slate-400 hover:bg-[#1f192b]"
                : "bg-white border-purple-100 text-slate-600 hover:bg-purple-50"
          }`}
        >
          <MapPin size={12} />
          Presenciais
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter("ONLINE")}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 shrink-0 ${
            typeFilter === "ONLINE"
              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
              : darkMode
                ? "bg-[#161221]/50 border-[#2a2238] text-slate-400 hover:bg-[#1f192b]"
                : "bg-white border-purple-100 text-slate-600 hover:bg-purple-50"
          }`}
        >
          <Video size={12} />
          Online / Remoto
        </button>
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">
          Carregando consultas...
        </p>
      ) : filteredAppointments.length === 0 ? (
        <div
          className={`text-center py-16 sm:py-20 px-4 rounded-2xl border border-dashed ${
            darkMode
              ? "border-purple-900/40 text-slate-500"
              : "border-purple-200 text-slate-400"
          }`}
        >
          <CalendarIcon
            size={44}
            className="mx-auto mb-3 opacity-40 text-purple-400"
          />
          <p className="text-sm">
            Nenhuma consulta encontrada com esse filtro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredAppointments.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedAppointment(app)}
              className={`group/card p-4 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative min-w-0 ${
                darkMode
                  ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/50 shadow-lg shadow-purple-950/20 hover:shadow-purple-900/40"
                  : "bg-white border-purple-100 hover:border-purple-300 shadow-md shadow-purple-100/50 hover:shadow-lg"
              }`}
            >
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-95 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(app);
                  }}
                  title="Editar consulta"
                  aria-label="Editar consulta"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setAppointmentDeleteTarget(app);
                  }}
                  title="Excluir consulta"
                  aria-label="Excluir consulta"
                  className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    darkMode
                      ? "bg-[#1c162b]/95 border-rose-500/25 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400/50 hover:text-rose-300"
                      : "bg-white/95 border-rose-200/80 text-rose-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 shadow-sm"
                  }`}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="min-w-0 pr-14 sm:pr-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:pr-14">
                  <span
                    className={`text-[11px] px-2.5 sm:px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 border shadow-sm max-w-full ${
                      app.type === "ONLINE"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {app.type === "ONLINE" ? (
                      <Video size={13} className="shrink-0" />
                    ) : (
                      <MapPin size={13} className="shrink-0" />
                    )}
                    <span className="truncate">
                      {app.type === "ONLINE"
                        ? "Atendimento Online"
                        : "Atendimento Presencial"}
                    </span>
                  </span>
                </div>

                <h4
                  className={`font-bold text-base sm:text-lg mb-2 break-words group-hover/card:text-purple-400 transition-colors ${
                    darkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  {app.title}
                </h4>

                {app.client && (
                  <div className="mb-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoToClient(app);
                      }}
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
                            {app.client.name}
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

                {app.notes ? (
                  <p className="text-xs opacity-80 bg-purple-500/5 p-3 rounded-xl border border-purple-500/10 line-clamp-3 break-words">
                    <strong className="text-purple-400">Anotações:</strong>{" "}
                    {app.notes}
                  </p>
                ) : (
                  <p className="text-xs opacity-40 italic flex items-center gap-1 mt-2">
                    <FileText size={12} className="shrink-0" />
                    <span>Clique para registrar anotações e pareceres...</span>
                  </p>
                )}
              </div>

              <div className="mt-5 sm:mt-6 pt-4 border-t border-purple-500/10 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] sm:text-xs text-purple-400/90 font-mono font-medium flex items-center gap-1 bg-purple-500/5 px-2.5 py-1 rounded-lg border border-purple-500/10 truncate">
                  <Clock size={12} className="shrink-0" />
                  <span className="truncate">
                    {new Date(app.date).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                <span className="text-purple-400 font-semibold group-hover/card:translate-x-1 transition-transform inline-flex items-center gap-1 shrink-0">
                  Ver / Anotar &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA EXCLUIR CONSULTA */}
      {appointmentDeleteTarget && (
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
                Excluir Consulta?
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed">
                Esta ação removerá permanentemente o atendimento selecionado do
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
                  {appointmentDeleteTarget.title}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2 text-[11px] opacity-80">
                  <span className="truncate">
                    Cliente:{" "}
                    {appointmentDeleteTarget.client?.name || "Não informado"}
                  </span>
                  {appointmentDeleteTarget.date && (
                    <span className="font-mono text-rose-400 shrink-0">
                      {new Date(appointmentDeleteTarget.date).toLocaleString(
                        "pt-BR",
                        {
                          dateStyle: "short",
                          timeStyle: "short",
                        },
                      )}
                    </span>
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
                onClick={confirmDeleteAppointment}
                disabled={isClosingDelete}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CRIAR / EDITAR CONSULTA */}
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
                  {editingAppointmentId ? (
                    <Edit2 size={19} />
                  ) : (
                    <CalendarPlus size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    {editingAppointmentId
                      ? "Atualização de Atendimento"
                      : "Novo Atendimento"}
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    {editingAppointmentId
                      ? "Editar Consulta"
                      : "Agendar Nova Consulta"}
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
              onSubmit={handleSaveAppointment}
              className="relative z-10 space-y-3.5 sm:space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Título / Assunto *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião Inicial de Aposentadoria"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Tipo de Atendimento
                  </label>
                  <StyledSelect
                    value={type}
                    onChange={setType}
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
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

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Observações / Pauta Inicial
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes ou documentos que o cliente trará..."
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
                  {editingAppointmentId
                    ? "Salvar Alterações"
                    : "Agendar Consulta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE ANOTAÇÕES / DETALHES DA CONSULTA */}
      {selectedAppointment && (
        <div
          ref={detailsBackdropRef}
          onClick={() => closeDetailsModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={detailsModalRef}
            onClick={(e) => e.stopPropagation()}
            className={modalCardBaseClass}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 mb-4">
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 mt-0.5 ${
                    darkMode
                      ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <FileText size={20} />
                </div>

                <div className="min-w-0">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border mb-1.5 inline-block ${
                      selectedAppointment.type === "ONLINE"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {selectedAppointment.type === "ONLINE"
                      ? "Online / Remoto"
                      : "Presencial"}
                  </span>

                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight break-words bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    {selectedAppointment.title}
                  </h3>

                  <p className="text-xs text-purple-400 mt-1 flex items-center gap-1.5 font-mono">
                    <Clock size={13} className="shrink-0" />
                    <span className="truncate">
                      {new Date(selectedAppointment.date).toLocaleString(
                        "pt-BR",
                        {
                          dateStyle: "full",
                          timeStyle: "short",
                        },
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDetailsModal()}
                disabled={isClosingDetails}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            {selectedAppointment.client && (
              <div className="relative z-10 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedAppointment;
                    closeDetailsModal(() => handleGoToClient(target));
                  }}
                  title="Ir para o cadastro do cliente"
                  className={`group/client w-full flex items-center justify-between gap-2 text-xs px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer min-w-0 ${
                    darkMode
                      ? "bg-[#110d1b]/90 border-purple-400/20 text-slate-200 hover:border-purple-400/50 hover:bg-purple-500/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
                      : "bg-white/90 border-purple-200/80 text-slate-700 hover:border-purple-400 hover:bg-purple-50 shadow-[inset_0_2px_6px_rgba(88,28,135,0.05)]"
                  }`}
                >
                  <span className="flex flex-col gap-1.5 min-w-0">
                    <span className="flex items-center gap-2 min-w-0">
                      <User size={15} className="text-purple-400 shrink-0" />
                      <span className="truncate">
                        Cliente:{" "}
                        <strong className="group-hover/client:underline">
                          {selectedAppointment.client.name}
                        </strong>
                      </span>
                    </span>

                    {selectedAppointment.client.phone && (
                      <span className="flex items-center gap-2 min-w-0 text-[11px] opacity-80">
                        <Phone size={13} className="text-purple-400 shrink-0" />
                        <span className="font-mono truncate">
                          {formatPhoneBr(selectedAppointment.client.phone)}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 shrink-0">
                    <span>Ver cliente</span>
                    <ArrowUpRight size={13} />
                  </span>
                </button>
              </div>
            )}

            <form
              onSubmit={handleUpdateNotes}
              className="relative z-10 space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Anotações / Parecer do Atendimento
                </label>
                <textarea
                  rows={5}
                  value={selectedAppointment.notes || ""}
                  onChange={(e) =>
                    setSelectedAppointment({
                      ...selectedAppointment,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Registre aqui as conclusões, combinados ou orientações passadas ao cliente..."
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-500/15">
                <button
                  type="button"
                  onClick={() => closeDetailsModal()}
                  disabled={isClosingDetails}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                    darkMode
                      ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                  }`}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isClosingDetails}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
                >
                  Salvar Anotações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
