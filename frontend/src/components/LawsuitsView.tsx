import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Clock,
  AlertTriangle,
  ExternalLink,
  X,
  User,
  GripVertical,
  CheckCircle2,
  Archive,
  FilePlus2,
  ArrowUpRight,
  Edit2,
  Flag,
} from "lucide-react";
import { LegalCaseSelect } from "./LegalCaseSelect";
import { ClientSelect } from "./ClientSelect";
import { StyledSelect, type StyledSelectOption } from "./StyledSelect";

interface LawsuitsViewProps {
  darkMode: boolean;
  onNavigateToClients?: (clientId?: string, clientName?: string) => void;
}

const PRIORITY_OPTIONS: StyledSelectOption[] = [
  {
    value: "NO_DEADLINE",
    label: "Sem Prazo",
    subtitle: "Acompanhamento regular sem vencimento",
    icon: <Clock size={14} className="text-blue-400" />,
    badgeClass: "bg-blue-500/15 text-blue-400",
  },
  {
    value: "MODERATE",
    label: "Prazo Moderado",
    subtitle: "Atenção normal no fluxo do escritório",
    icon: <AlertTriangle size={14} className="text-amber-400" />,
    badgeClass: "bg-amber-500/15 text-amber-400",
  },
  {
    value: "URGENT",
    label: "Urgente",
    subtitle: "Prioridade máxima / prazo crítico",
    icon: <AlertTriangle size={14} className="text-rose-400" />,
    badgeClass: "bg-rose-500/15 text-rose-400",
  },
];

function toInputDateString(dateValue: string | Date): string {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const LawsuitsView: React.FC<LawsuitsViewProps> = ({
  darkMode,
  onNavigateToClients,
}) => {
  const [lawsuits, setLawsuits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosingCreate, setIsClosingCreate] = useState(false);
  const [editingLawsuitId, setEditingLawsuitId] = useState<string | null>(null);

  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [lawsuitToArchive, setLawsuitToArchive] = useState<any | null>(null);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);

  const [lawsuitToDelete, setLawsuitToDelete] = useState<any | null>(null);
  const [isClosingDelete, setIsClosingDelete] = useState(false);

  const confirmBackdropRef = useRef<HTMLDivElement | null>(null);
  const confirmModalRef = useRef<HTMLDivElement | null>(null);
  const deleteBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement | null>(null);
  const createBackdropRef = useRef<HTMLDivElement | null>(null);
  const createModalRef = useRef<HTMLDivElement | null>(null);

  const [cnfNumber, setCnfNumber] = useState("");
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MODERATE");
  const [deadlineDate, setDeadlineDate] = useState("");
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
    if (!lawsuitToArchive) return;
    setIsClosingConfirm(false);
    const ctx = animateModalOpen(
      confirmBackdropRef.current,
      confirmModalRef.current,
    );
    return () => ctx.revert();
  }, [lawsuitToArchive]);

  useEffect(() => {
    if (!lawsuitToDelete) return;
    setIsClosingDelete(false);
    const ctx = animateModalOpen(
      deleteBackdropRef.current,
      deleteModalRef.current,
    );
    return () => ctx.revert();
  }, [lawsuitToDelete]);

  useEffect(() => {
    if (!isModalOpen) return;
    setIsClosingCreate(false);
    const ctx = animateModalOpen(
      createBackdropRef.current,
      createModalRef.current,
    );
    return () => ctx.revert();
  }, [isModalOpen]);

  const closeConfirmModal = (onComplete?: () => void) => {
    if (!lawsuitToArchive || isClosingConfirm) return;
    setIsClosingConfirm(true);
    animateModalClose(
      confirmBackdropRef.current,
      confirmModalRef.current,
      () => {
        setLawsuitToArchive(null);
        setIsClosingConfirm(false);
        onComplete?.();
      },
    );
  };

  const closeDeleteModal = (onComplete?: () => void) => {
    if (!lawsuitToDelete || isClosingDelete) return;
    setIsClosingDelete(true);
    animateModalClose(deleteBackdropRef.current, deleteModalRef.current, () => {
      setLawsuitToDelete(null);
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

  const loadData = async () => {
    try {
      const [lawsuitsRes, clientsRes] = await Promise.all([
        api.get("/lawsuits"),
        api.get("/clients"),
      ]);
      setLawsuits(lawsuitsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados dos processos:", error);
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
    setEditingLawsuitId(null);
    setCnfNumber("");
    setTitle("");
    setArea("");
    setDescription("");
    setDeadlineDate("");
    setPriority("MODERATE");
    setClientId("");
  };

  const handleOpenEditModal = (lawsuit: any) => {
    setEditingLawsuitId(lawsuit.id);
    setCnfNumber(lawsuit.cnfNumber || "");
    setTitle(lawsuit.title || "");
    setArea(lawsuit.area || "");
    setDescription(lawsuit.description || "");
    setPriority(lawsuit.priority || "MODERATE");
    setDeadlineDate(
      lawsuit.deadlineDate ? toInputDateString(lawsuit.deadlineDate) : "",
    );
    setClientId(lawsuit.clientId || lawsuit.client?.id || "");
    setIsModalOpen(true);
  };

  const handleSaveLawsuit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area) {
      toast.error("Selecione o tipo de processo.");
      return;
    }

    const payload = {
      cnfNumber,
      title,
      area,
      description,
      priority,
      deadlineDate: deadlineDate || null,
      clientId: clientId || null,
    };

    try {
      const isEditing = Boolean(editingLawsuitId);

      if (editingLawsuitId) {
        await api.patch(`/lawsuits/${editingLawsuitId}`, payload);
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
            ? "Processo atualizado com sucesso!"
            : "Processo cadastrado com sucesso!",
        );
        loadData();
      });
    } catch (error) {
      console.error("Erro ao salvar processo:", error);
      toast.error("Erro ao salvar processo no Neon DB.");
    }
  };

  const executeArchiveLawsuit = async (lawsuitId: string) => {
    if (archivingId) return;
    setArchivingId(lawsuitId);

    setLawsuits((prev) =>
      prev.map((l) => (l.id === lawsuitId ? { ...l, status: "ARCHIVED" } : l)),
    );

    try {
      await api.patch(`/lawsuits/${lawsuitId}`, { status: "ARCHIVED" });
      toast.success("Processo concluído e movido para Arquivados!");
    } catch (error) {
      console.error("Erro ao arquivar processo:", error);
      toast.error("Não foi possível arquivar o processo.");
      loadData();
    } finally {
      setArchivingId(null);
    }
  };

  const handleConfirmArchive = (lawsuitId: string) => {
    closeConfirmModal(() => {
      executeArchiveLawsuit(lawsuitId);
    });
  };

  const executeDeleteLawsuit = async (target: any) => {
    if (!target) return;
    try {
      await api.delete(`/lawsuits/${target.id}`);
      toast.success("Processo excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir processo:", error);
      toast.error("Não foi possível excluir o processo.");
    }
  };

  const handleConfirmDelete = () => {
    const target = lawsuitToDelete;
    if (!target) return;
    closeDeleteModal(() => {
      executeDeleteLawsuit(target);
    });
  };

  const handleDragStart = (e: React.DragEvent, lawsuitId: string) => {
    e.dataTransfer.setData("text/plain", lawsuitId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetPriority: string) => {
    e.preventDefault();
    const lawsuitId = e.dataTransfer.getData("text/plain");
    if (!lawsuitId) return;

    setLawsuits((prev) =>
      prev.map((l) =>
        l.id === lawsuitId ? { ...l, priority: targetPriority } : l,
      ),
    );

    try {
      await api.patch(`/lawsuits/${lawsuitId}`, { priority: targetPriority });
      toast.success("Prioridade atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar prioridade via drag and drop:", error);
      toast.error("Erro ao atualizar prioridade.");
      loadData();
    }
  };

  const handleOpenProcessLink = (number: string) => {
    const cleanNum = number.replace(/\D/g, "");
    window.open(
      `https://www.google.com/search?q=consulta+processo+${cleanNum}`,
      "_blank",
    );
  };

  const activeLawsuits = lawsuits.filter((l) => l.status === "PENDING");

  const columns = [
    {
      id: "NO_DEADLINE",
      title: "Sem Prazo",
      icon: Clock,
      color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    },
    {
      id: "MODERATE",
      title: "Prazo Moderado",
      icon: AlertTriangle,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    },
    {
      id: "URGENT",
      title: "Urgente",
      icon: AlertTriangle,
      color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
    },
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3
            className={`text-lg sm:text-xl font-bold ${darkMode ? "text-slate-100" : "text-slate-800"}`}
          >
            Painel Kanban de Processos
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Arraste os cards entre as colunas para atualizar as prioridades e
            prazos.
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
          <span>Novo Processo</span>
        </button>
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">
          Carregando processos...
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {columns.map((col) => {
            const Icon = col.icon;
            const colLawsuits = activeLawsuits.filter(
              (l) => l.priority === col.id,
            );

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col h-auto min-h-[280px] max-h-[68vh] md:max-h-none md:h-[calc(100vh-240px)] transition-colors min-w-0 ${
                  darkMode
                    ? "bg-[#161221]/60 border-[#2a2238]"
                    : "bg-white border-purple-100 shadow-sm"
                }`}
              >
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border mb-3 sm:mb-4 shrink-0 ${col.color}`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm min-w-0">
                    <Icon size={17} className="shrink-0" />
                    <span className="truncate">{col.title}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 font-semibold shrink-0">
                    {colLawsuits.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 sm:pr-1">
                  {colLawsuits.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 text-slate-500 text-xs border-2 border-dashed border-purple-500/10 rounded-xl">
                      Arraste um processo para cá
                    </div>
                  ) : (
                    colLawsuits.map((lawsuit) => (
                      <div
                        key={lawsuit.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lawsuit.id)}
                        className={`group/card relative p-3.5 sm:p-4 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-300 ${
                          darkMode
                            ? "bg-[#1f192b]/70 border-purple-900/30 hover:border-purple-500/40 shadow-md shadow-purple-950/20"
                            : "bg-purple-50/40 border-purple-100 hover:border-purple-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold uppercase tracking-wider truncate">
                            {lawsuit.area}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {lawsuit.deadlineDate && (
                              <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1 mr-0.5">
                                <Clock size={12} />
                                {new Date(
                                  lawsuit.deadlineDate,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            )}

                            <button
                              type="button"
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(lawsuit);
                              }}
                              title="Editar processo"
                              aria-label="Editar processo"
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100 cursor-pointer ${
                                darkMode
                                  ? "bg-[#161221]/95 border-purple-500/25 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50"
                                  : "bg-white/95 border-purple-200/80 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                              }`}
                            >
                              <Edit2 size={11} />
                            </button>

                            <button
                              type="button"
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLawsuitToDelete(lawsuit);
                              }}
                              title="Excluir processo"
                              aria-label="Excluir processo"
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100 cursor-pointer ${
                                darkMode
                                  ? "bg-[#161221]/95 border-rose-500/25 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400/50"
                                  : "bg-white/95 border-rose-200/80 text-rose-500 hover:bg-rose-50 hover:border-rose-300"
                              }`}
                            >
                              <X size={12} />
                            </button>

                            <GripVertical size={14} className="opacity-40" />
                          </div>
                        </div>

                        <h4
                          className={`font-bold text-sm mb-1 break-words ${darkMode ? "text-slate-100" : "text-slate-800"}`}
                        >
                          {lawsuit.title}
                        </h4>

                        {lawsuit.cnfNumber && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenProcessLink(lawsuit.cnfNumber)
                            }
                            className="flex flex-col items-start text-left text-purple-400 hover:text-purple-300 mb-2.5 transition-colors group max-w-full"
                            title="Consultar andamento do processo"
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                              Processo nº
                              <span className="inline-flex items-center gap-1 ml-1.5 text-xs font-mono underline break-all">
                                <span>{lawsuit.cnfNumber}</span>
                                <ExternalLink size={12} className="shrink-0" />
                              </span>
                            </span>
                          </button>
                        )}

                        {lawsuit.description && (
                          <p className="text-xs opacity-70 line-clamp-2 mb-3">
                            {lawsuit.description}
                          </p>
                        )}

                        <div className="mt-3 pt-3 border-t border-purple-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToClient(lawsuit);
                            }}
                            title="Ir para o cadastro do cliente"
                            className={`group/client inline-flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg transition-all min-w-0 max-w-full cursor-pointer ${
                              darkMode
                                ? "text-slate-300 hover:text-purple-200 hover:bg-purple-500/15"
                                : "text-slate-600 hover:text-purple-800 hover:bg-purple-100/80"
                            }`}
                          >
                            <User
                              size={12}
                              className="shrink-0 text-purple-400 group-hover/client:scale-110 transition-transform"
                            />
                            <span className="truncate font-medium group-hover/client:underline">
                              {lawsuit.client?.name || "Cliente"}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-400 opacity-80 sm:opacity-0 sm:group-hover/client:opacity-100 transition-opacity shrink-0">
                              <span>Ver</span>
                              <ArrowUpRight size={11} />
                            </span>
                          </button>

                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLawsuitToArchive(lawsuit);
                            }}
                            disabled={archivingId === lawsuit.id}
                            title="Marcar como concluído e arquivar"
                            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
                              darkMode
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            <span>
                              {archivingId === lawsuit.id
                                ? "Arquivando..."
                                : "Concluir"}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA EXCLUIR PROCESSO */}
      {lawsuitToDelete && (
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
                Excluir Processo?
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed">
                Esta ação removerá permanentemente o processo selecionado do
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
                  {lawsuitToDelete.title}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2 text-[11px] opacity-80">
                  <span className="truncate">
                    Cliente: {lawsuitToDelete.client?.name || "Não informado"}
                  </span>
                  {lawsuitToDelete.cnfNumber && (
                    <div className="sm:text-right shrink-0">
                      <span className="block text-[10px] uppercase tracking-wider opacity-70">
                        Processo nº
                      </span>
                      <span className="font-mono text-rose-400 break-all">
                        {lawsuitToDelete.cnfNumber}
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
                onClick={handleConfirmDelete}
                disabled={isClosingDelete}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA CONCLUIR E ARQUIVAR */}
      {lawsuitToArchive && (
        <div
          ref={confirmBackdropRef}
          onClick={() => closeConfirmModal()}
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
              onClick={() => closeConfirmModal()}
              disabled={isClosingConfirm}
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
                Confirmação de Encerramento
              </span>

              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Concluir e Arquivar Processo?
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed">
                O processo será marcado como concluído e transferido para{" "}
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
                  {lawsuitToArchive.title}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2 text-[11px] opacity-80">
                  <span className="truncate">
                    Cliente: {lawsuitToArchive.client?.name || "Não informado"}
                  </span>
                  {lawsuitToArchive.cnfNumber && (
                    <div className="sm:text-right shrink-0">
                      <span className="block text-[10px] uppercase tracking-wider opacity-70">
                        Processo nº
                      </span>
                      <span className="font-mono text-purple-400 break-all">
                        {lawsuitToArchive.cnfNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => closeConfirmModal()}
                disabled={isClosingConfirm}
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
                onClick={() => handleConfirmArchive(lawsuitToArchive.id)}
                disabled={isClosingConfirm}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                Confirmar Conclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CRIAR / EDITAR PROCESSO */}
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
                  {editingLawsuitId ? (
                    <Edit2 size={19} />
                  ) : (
                    <FilePlus2 size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    {editingLawsuitId
                      ? "Atualização de Processo"
                      : "Novo Registro Jurídico"}
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    {editingLawsuitId
                      ? "Editar Processo"
                      : "Cadastrar Novo Processo"}
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
              onSubmit={handleSaveLawsuit}
              className="relative z-10 space-y-3.5 sm:space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Número do Processo (CNJ)
                  </label>
                  <input
                    type="text"
                    value={cnfNumber}
                    onChange={(e) => setCnfNumber(e.target.value)}
                    placeholder="Ex: 0001234-56.2026.5.02.0001"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Área / Tipo de Processo *
                  </label>
                  <LegalCaseSelect
                    value={area}
                    onChange={setArea}
                    darkMode={darkMode}
                    placeholder="Selecionar tipo de processo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Título / Ação *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reclamação Trabalhista / Ação de Cobrança"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Prioridade Inicial
                  </label>
                  <StyledSelect
                    value={priority}
                    onChange={setPriority}
                    options={PRIORITY_OPTIONS}
                    darkMode={darkMode}
                    headerTitle="Nível de Prioridade"
                    headerIcon={<Flag size={13} />}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Data de Prazo (Opcional)
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Descrição / Andamento
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Resumo do caso, providências ou andamento atual..."
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
                  {editingLawsuitId
                    ? "Salvar Alterações"
                    : "Cadastrar Processo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
