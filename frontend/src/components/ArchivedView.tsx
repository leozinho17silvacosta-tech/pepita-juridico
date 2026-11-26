import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Archive,
  Search,
  User,
  Calendar,
  ExternalLink,
  RotateCcw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  X,
} from "lucide-react";

interface ArchivedViewProps {
  darkMode: boolean;
  onNavigateToClients?: (clientId?: string, clientName?: string) => void;
}

function parseLocalDate(dateStr: string): Date {
  const cleanDate = dateStr.split("T")[0];
  const [y, m, d] = cleanDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const ArchivedView: React.FC<ArchivedViewProps> = ({
  darkMode,
  onNavigateToClients,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [itemToRestore, setItemToRestore] = useState<any>(null);
  const [isClosingRestore, setIsClosingRestore] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isClosingDelete, setIsClosingDelete] = useState(false);

  const restoreBackdropRef = useRef<HTMLDivElement | null>(null);
  const restoreModalRef = useRef<HTMLDivElement | null>(null);
  const deleteBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadArchived();
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
    if (!itemToRestore) return;
    setIsClosingRestore(false);
    const ctx = animateModalOpen(
      restoreBackdropRef.current,
      restoreModalRef.current,
    );
    return () => ctx.revert();
  }, [itemToRestore]);

  useEffect(() => {
    if (!itemToDelete) return;
    setIsClosingDelete(false);
    const ctx = animateModalOpen(
      deleteBackdropRef.current,
      deleteModalRef.current,
    );
    return () => ctx.revert();
  }, [itemToDelete]);

  const closeRestoreModal = (onComplete?: () => void) => {
    if (!itemToRestore || isClosingRestore) return;
    setIsClosingRestore(true);
    animateModalClose(
      restoreBackdropRef.current,
      restoreModalRef.current,
      () => {
        setItemToRestore(null);
        setIsClosingRestore(false);
        onComplete?.();
      },
    );
  };

  const closeDeleteModal = (onComplete?: () => void) => {
    if (!itemToDelete || isClosingDelete) return;
    setIsClosingDelete(true);
    animateModalClose(deleteBackdropRef.current, deleteModalRef.current, () => {
      setItemToDelete(null);
      setIsClosingDelete(false);
      onComplete?.();
    });
  };

  const loadArchived = async () => {
    try {
      const res = await api.get("/lawsuits");
      const archivedOnly = res.data.filter(
        (item: any) =>
          item.status === "ARCHIVED" || item.status === "COMPLETED",
      );
      setItems(archivedOnly);
    } catch (error) {
      console.error("Erro ao carregar arquivados:", error);
      toast.error("Erro ao carregar itens arquivados.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToClient = (item: any) => {
    const targetClientId = item.clientId || item.client?.id;
    const targetClientName = item.client?.name;

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

  const executeRestore = async (target: any) => {
    if (!target) return;
    try {
      await api.patch(`/lawsuits/${target.id}`, { status: "PENDING" });
      toast.success("Item restaurado para os pendentes!");
      loadArchived();
    } catch (error) {
      console.error("Erro ao restaurar item:", error);
      toast.error("Erro ao restaurar item.");
    }
  };

  const confirmRestore = () => {
    const target = itemToRestore;
    if (!target) return;
    closeRestoreModal(() => {
      executeRestore(target);
    });
  };

  const executeDelete = async (target: any) => {
    if (!target) return;
    try {
      await api.delete(`/lawsuits/${target.id}`);
      toast.success("Item excluído permanentemente!");
      loadArchived();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao excluir item.");
    }
  };

  const confirmDelete = () => {
    const target = itemToDelete;
    if (!target) return;
    closeDeleteModal(() => {
      executeDelete(target);
    });
  };

  const handleOpenProcessLink = (number: string) => {
    const cleanNum = number.replace(/\D/g, "");
    window.open(
      `https://www.google.com/search?q=consulta+processo+${cleanNum}`,
      "_blank",
    );
  };

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesTitle = item.title?.toLowerCase().includes(term);
    const matchesClient = item.client?.name?.toLowerCase().includes(term);
    const matchesNumber = item.cnfNumber?.toLowerCase().includes(term);
    const matchesArea = item.area?.toLowerCase().includes(term);
    return matchesTitle || matchesClient || matchesNumber || matchesArea;
  });

  const closeBtnClass = `flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-50 shrink-0 ${
    darkMode
      ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
      : "bg-purple-50 border-purple-200/70 text-slate-500 hover:text-slate-800 hover:bg-purple-100"
  }`;

  const modalCardBaseClass = `w-full max-w-md p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
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
            Arquivados & Cumpridos
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Histórico de prazos cumpridos e processos arquivados com opção de
            restauração.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold w-full sm:w-fit justify-center sm:justify-start shrink-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238] text-purple-300"
              : "bg-white border-purple-100 text-purple-700 shadow-sm"
          }`}
        >
          <Archive size={15} className="text-purple-400 shrink-0" />
          <span>{filteredItems.length} registro(s)</span>
        </span>
      </div>

      <div
        className={`flex items-center gap-3 px-3.5 sm:px-4 py-2.5 rounded-xl border transition-colors min-w-0 ${
          darkMode
            ? "bg-[#161221]/80 border-[#2a2238]"
            : "bg-white border-purple-100 shadow-sm"
        }`}
      >
        <Search size={18} className="text-purple-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por título, cliente, área ou número do processo..."
          className="w-full bg-transparent text-sm outline-none min-w-0"
        />
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">
          Carregando arquivados...
        </p>
      ) : filteredItems.length === 0 ? (
        <div
          className={`text-center py-16 sm:py-20 px-4 rounded-2xl border border-dashed ${
            darkMode
              ? "border-purple-900/40 text-slate-500"
              : "border-purple-200 text-slate-400"
          }`}
        >
          <Archive
            size={44}
            className="mx-auto mb-3 opacity-40 text-purple-400"
          />
          <p className="text-sm">
            Nenhum prazo ou processo arquivado encontrado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-w-0 ${
                darkMode
                  ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/40 shadow-lg shadow-purple-950/20"
                  : "bg-white border-purple-100 hover:border-purple-300 shadow-md shadow-purple-100/50"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 size={12} />
                    Arquivado
                  </span>

                  {item.area && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold uppercase tracking-wider truncate">
                      {item.area}
                    </span>
                  )}
                </div>

                {item.deadlineDate && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400/90 mb-2">
                    <Calendar size={13} className="shrink-0" />
                    <span className="truncate">
                      Data do Prazo:{" "}
                      <strong>
                        {parseLocalDate(item.deadlineDate).toLocaleDateString(
                          "pt-BR",
                        )}
                      </strong>
                    </span>
                  </div>
                )}

                <h4
                  className={`font-bold text-base mb-1.5 break-words ${
                    darkMode ? "text-slate-100" : "text-slate-800"
                  }`}
                >
                  {item.title}
                </h4>

                {item.cnfNumber && (
                  <button
                    type="button"
                    onClick={() => handleOpenProcessLink(item.cnfNumber)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-purple-400 hover:text-purple-300 underline mb-2 transition-colors max-w-full"
                    title="Consultar processo"
                  >
                    <span className="truncate">Proc: {item.cnfNumber}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </button>
                )}

                {item.description && (
                  <p className="text-xs opacity-70 line-clamp-2 mb-3 whitespace-pre-line break-words">
                    {item.description}
                  </p>
                )}

                {item.client && (
                  <div className="mt-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleGoToClient(item)}
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
                            {item.client.name}
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
                <button
                  type="button"
                  onClick={() => setItemToRestore(item)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all shrink-0 ${
                    darkMode
                      ? "bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border-purple-500/30"
                      : "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  }`}
                >
                  <RotateCcw size={13} />
                  <span>Restaurar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setItemToDelete(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold transition-all shrink-0"
                  title="Excluir permanentemente"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA RESTAURAR */}
      {itemToRestore && (
        <div
          ref={restoreBackdropRef}
          onClick={() => closeRestoreModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={restoreModalRef}
            onClick={(e) => e.stopPropagation()}
            className={modalCardBaseClass}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-fuchsia-500/20 blur-2xl" />

            <button
              type="button"
              onClick={() => closeRestoreModal()}
              disabled={isClosingRestore}
              className={`relative z-10 top-0.5 right-0.5 ml-auto ${closeBtnClass}`}
            >
              <X size={16} />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center mt-1">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4 border ${
                  darkMode
                    ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/15 border-purple-400/30 text-purple-300 shadow-[0_12px_24px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/70 text-purple-700 shadow-[0_12px_24px_-6px_rgba(124,58,237,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                }`}
              >
                <RotateCcw size={24} />
              </div>

              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-1">
                Retornar aos Pendentes
              </span>

              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Restaurar Registro
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed break-words">
                Deseja devolver{" "}
                <strong className="text-purple-400">
                  "{itemToRestore.title}"
                </strong>{" "}
                para os pendentes?
              </p>

              {itemToRestore.client?.name && (
                <div
                  className={`w-full mt-4 p-3 rounded-2xl border text-left text-xs ${
                    darkMode
                      ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                      : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                  }`}
                >
                  <span className="opacity-65">Cliente: </span>
                  <strong className="truncate">
                    {itemToRestore.client.name}
                  </strong>
                </div>
              )}
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={() => closeRestoreModal()}
                disabled={isClosingRestore}
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
                onClick={confirmRestore}
                disabled={isClosingRestore}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO PARA EXCLUIR */}
      {itemToDelete && (
        <div
          ref={deleteBackdropRef}
          onClick={() => closeDeleteModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={deleteModalRef}
            onClick={(e) => e.stopPropagation()}
            className={modalCardBaseClass}
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
                Excluir Permanentemente
              </h3>

              <p className="text-xs sm:text-sm opacity-75 mt-2 max-w-sm leading-relaxed break-words">
                Tem certeza que deseja excluir{" "}
                <strong className="text-rose-400">
                  "{itemToDelete.title}"
                </strong>
                ? Essa ação não pode ser desfeita.
              </p>

              {itemToDelete.client?.name && (
                <div
                  className={`w-full mt-4 p-3 rounded-2xl border text-left text-xs ${
                    darkMode
                      ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                      : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                  }`}
                >
                  <span className="opacity-65">Cliente: </span>
                  <strong className="truncate">
                    {itemToDelete.client.name}
                  </strong>
                </div>
              )}
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
                onClick={confirmDelete}
                disabled={isClosingDelete}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
