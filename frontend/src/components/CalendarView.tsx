import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Video,
  MapPin,
  X,
  ExternalLink,
  FileText,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";

interface CalendarViewProps {
  darkMode: boolean;
  onNavigateToClients?: (clientId?: string, clientName?: string) => void;
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

export const CalendarView: React.FC<CalendarViewProps> = ({
  darkMode,
  onNavigateToClients,
}) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [lawsuits, setLawsuits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEventModal, setSelectedEventModal] = useState<any>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);

  const eventBackdropRef = useRef<HTMLDivElement | null>(null);
  const eventModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedEventModal) return;

    setIsClosingModal(false);

    const ctx = gsap.context(() => {
      const card = eventModalRef.current;
      const backdrop = eventBackdropRef.current;
      if (!card) return;

      if (backdrop) {
        gsap.fromTo(
          backdrop,
          { opacity: 0 },
          { opacity: 1, duration: 0.28, ease: "power2.out" },
        );
      }

      gsap.fromTo(
        card,
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
    }, eventModalRef);

    return () => ctx.revert();
  }, [selectedEventModal]);

  const closeEventModal = (onComplete?: () => void) => {
    if (!selectedEventModal || isClosingModal) return;
    setIsClosingModal(true);

    const card = eventModalRef.current;
    const backdrop = eventBackdropRef.current;

    const finish = () => {
      setSelectedEventModal(null);
      setIsClosingModal(false);
      onComplete?.();
    };

    if (!card) {
      finish();
      return;
    }

    if (backdrop) {
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.24,
        ease: "power2.in",
      });
    }

    gsap.to(card, {
      opacity: 0,
      y: 18,
      scale: 0.94,
      rotateX: -10,
      transformPerspective: 1000,
      duration: 0.26,
      ease: "power2.in",
      onComplete: finish,
    });
  };

  const loadData = async () => {
    try {
      const [appRes, lawsuitsRes] = await Promise.all([
        api.get("/appointments"),
        api.get("/lawsuits"),
      ]);
      setAppointments(appRes.data);
      setLawsuits(lawsuitsRes.data);
    } catch (error) {
      console.error("Erro ao carregar calendário:", error);
      toast.error("Erro ao carregar eventos do calendário.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToClient = (eventItem: any) => {
    const raw = eventItem?.raw || {};
    const targetClientId =
      raw.clientId || eventItem?.clientId || eventItem?.client?.id;
    const targetClientName = eventItem?.client?.name || raw.client?.name;

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

  const allEvents = [
    ...appointments.map((a) => ({
      id: a.id,
      title: a.title,
      itemType: "consultation" as const,
      subType: a.type,
      dateObj: new Date(a.date),
      client: a.client,
      notes: a.notes,
      raw: a,
    })),
    ...lawsuits
      .filter((l) => l.deadlineDate && l.status === "PENDING")
      .map((l) => {
        const d = new Date(l.deadlineDate);
        const adjustedDate = new Date(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          23,
          59,
        );
        return {
          id: l.id,
          title: l.title,
          itemType: "deadline" as const,
          area: l.area,
          cnfNumber: l.cnfNumber,
          priority: l.priority,
          dateObj: adjustedDate,
          client: l.client,
          notes: l.description,
          raw: l,
        };
      }),
  ];

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(year, month, day));
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const selectedDayEvents = allEvents
    .filter((ev) => isSameDay(ev.dateObj, selectedDate))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const handleOpenProcessLink = (cnfNumber: string) => {
    const cleanNum = cnfNumber.replace(/\D/g, "");
    window.open(
      `https://www.google.com/search?q=consulta+processo+${cleanNum}`,
      "_blank",
    );
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  return (
    <div className="space-y-5 sm:space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3
            className={`text-lg sm:text-xl font-bold ${
              darkMode ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Calendário Jurídico
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${
              darkMode ? "text-purple-300/60" : "text-purple-600/70"
            }`}
          >
            Clique em um dia para inspecionar consultas e prazos na agenda.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
            <span className="opacity-80">Consultas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
            <span className="opacity-80">Prazos Fatais</span>
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">
          Carregando calendário...
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          <div
            className={`lg:col-span-8 p-3.5 sm:p-5 rounded-2xl border transition-colors min-w-0 ${
              darkMode
                ? "bg-[#161221]/85 border-[#2a2238] shadow-xl shadow-purple-950/25"
                : "bg-white border-purple-100 shadow-md shadow-purple-100/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
              <h4
                className={`text-sm sm:text-base font-bold capitalize truncate ${
                  darkMode ? "text-slate-100" : "text-slate-800"
                }`}
              >
                {currentMonth.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </h4>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToday}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    darkMode
                      ? "bg-[#1f192b] border-purple-900/40 text-purple-300 hover:bg-purple-900/40"
                      : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  Hoje
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                      darkMode
                        ? "bg-[#1f192b] border-purple-900/40 text-slate-300 hover:border-purple-500/50"
                        : "bg-white border-purple-200 text-slate-700 hover:bg-purple-50"
                    }`}
                    title="Mês Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                      darkMode
                        ? "bg-[#1f192b] border-purple-900/40 text-slate-300 hover:border-purple-500/50"
                        : "bg-white border-purple-200 text-slate-700 hover:bg-purple-50"
                    }`}
                    title="Próximo Mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 text-center">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-400/80 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((cellDate, index) => {
                if (!cellDate) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-14 sm:h-20 rounded-xl opacity-20"
                    />
                  );
                }

                const dayEvents = allEvents.filter((ev) =>
                  isSameDay(ev.dateObj, cellDate),
                );
                const isSelected = isSameDay(cellDate, selectedDate);
                const isToday = isSameDay(cellDate, new Date());

                return (
                  <button
                    type="button"
                    key={cellDate.toISOString()}
                    onClick={() => setSelectedDate(cellDate)}
                    className={`h-14 sm:h-20 p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden min-w-0 ${
                      isSelected
                        ? darkMode
                          ? "bg-purple-600/25 border-purple-400 ring-1 ring-purple-500/50 shadow-[0_0_16px_-4px_rgba(168,85,247,0.45)]"
                          : "bg-purple-100/80 border-purple-500 ring-1 ring-purple-400"
                        : darkMode
                          ? "bg-[#120f18]/75 border-[#2a2238] hover:border-purple-500/40"
                          : "bg-purple-50/30 border-purple-100 hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-0.5">
                      <span
                        className={`text-[11px] sm:text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                          isToday
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                            : darkMode
                              ? "text-slate-300"
                              : "text-slate-700"
                        }`}
                      >
                        {cellDate.getDate()}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 shrink-0">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="flex sm:hidden items-center gap-1 mt-auto">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            ev.itemType === "deadline"
                              ? "bg-rose-400"
                              : "bg-purple-400"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="hidden sm:block space-y-1 w-full mt-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, i) => (
                        <div
                          key={i}
                          className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                            ev.itemType === "deadline"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/20"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                          }`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[8px] text-purple-400 font-semibold pl-0.5">
                          +{dayEvents.length - 2} mais
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`lg:col-span-4 p-4 sm:p-5 rounded-2xl border flex flex-col min-h-[320px] lg:min-h-[480px] transition-colors min-w-0 ${
              darkMode
                ? "bg-[#161221]/90 border-[#2a2238] shadow-xl shadow-purple-950/25"
                : "bg-white border-purple-100 shadow-md shadow-purple-100/50"
            }`}
          >
            <div className="pb-3 mb-3 border-b border-purple-500/15">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Agenda do Dia
              </span>
              <h4
                className={`text-sm sm:text-base font-bold capitalize mt-0.5 ${
                  darkMode ? "text-slate-100" : "text-slate-800"
                }`}
              >
                {selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 sm:pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-12 sm:py-16 opacity-50 space-y-2">
                  <CalendarIcon
                    className="mx-auto text-purple-400 opacity-50"
                    size={32}
                  />
                  <p className="text-xs">
                    Nenhum compromisso ou prazo para esta data.
                  </p>
                </div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div
                    key={`${ev.itemType}-${ev.id}`}
                    onClick={() => setSelectedEventModal(ev)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all group min-w-0 ${
                      ev.itemType === "deadline"
                        ? darkMode
                          ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-400"
                          : "bg-rose-50/60 border-rose-200 hover:border-rose-400"
                        : darkMode
                          ? "bg-[#1f192b]/80 border-purple-900/40 hover:border-purple-500"
                          : "bg-purple-50/60 border-purple-200 hover:border-purple-400"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border ${
                          ev.itemType === "deadline"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                        }`}
                      >
                        {ev.itemType === "deadline" ? (
                          <>
                            <AlertTriangle size={11} />
                            Prazo Fatal
                          </>
                        ) : (
                          <>
                            {ev.subType === "ONLINE" ? (
                              <Video size={11} />
                            ) : (
                              <MapPin size={11} />
                            )}
                            {ev.subType === "ONLINE" ? "Online" : "Presencial"}
                          </>
                        )}
                      </span>

                      {ev.itemType === "consultation" && (
                        <span className="text-xs font-mono text-purple-400 flex items-center gap-1">
                          <Clock size={12} />
                          {ev.dateObj.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <h5
                      className={`font-bold text-sm mb-1.5 break-words group-hover:text-purple-400 transition-colors ${
                        darkMode ? "text-slate-100" : "text-slate-800"
                      }`}
                    >
                      {ev.title}
                    </h5>

                    {ev.client && (
                      <div className="mt-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoToClient(ev);
                          }}
                          title="Ir para o cadastro do cliente"
                          className={`group/client w-full flex items-center justify-between gap-2 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer min-w-0 ${
                            darkMode
                              ? "text-purple-200/90 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400/40"
                              : "text-purple-800 bg-white/80 border-purple-200/80 hover:bg-purple-100 hover:border-purple-300"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <User
                              className="text-purple-400 shrink-0 group-hover/client:scale-110 transition-transform"
                              size={13}
                            />
                            <span className="truncate group-hover/client:underline">
                              {ev.client.name}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-400 opacity-80 sm:opacity-0 sm:group-hover/client:opacity-100 transition-opacity shrink-0">
                            <span>Ver</span>
                            <ArrowUpRight size={11} />
                          </span>
                        </button>
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-purple-500/10 flex justify-end">
                      <span className="text-[11px] font-semibold text-purple-400 group-hover:translate-x-0.5 transition-transform">
                        Ver detalhes &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE DETALHES DO EVENTO */}
      {selectedEventModal && (
        <div
          ref={eventBackdropRef}
          onClick={() => closeEventModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={eventModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
              darkMode
                ? "bg-gradient-to-b from-[#231b36] via-[#181226] to-[#120e1c] border-purple-400/25 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_45px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f4efff] border-purple-200/90 text-slate-800 shadow-[0_25px_65px_-15px_rgba(76,29,149,0.25),0_0_40px_-12px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]"
            }`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 mb-4">
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 mt-0.5 ${
                    selectedEventModal.itemType === "deadline"
                      ? darkMode
                        ? "bg-gradient-to-br from-rose-500/25 to-red-600/15 border-rose-400/30 text-rose-300 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        : "bg-gradient-to-br from-rose-500/15 to-red-500/10 border-rose-300/70 text-rose-600 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                      : darkMode
                        ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  {selectedEventModal.itemType === "deadline" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <CalendarIcon size={20} />
                  )}
                </div>

                <div className="min-w-0">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border inline-flex items-center gap-1.5 mb-1.5 ${
                      selectedEventModal.itemType === "deadline"
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    }`}
                  >
                    {selectedEventModal.itemType === "deadline"
                      ? `Prazo Processual (${selectedEventModal.area})`
                      : `Consulta ${
                          selectedEventModal.subType === "ONLINE"
                            ? "Online"
                            : "Presencial"
                        }`}
                  </span>

                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight break-words bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    {selectedEventModal.title}
                  </h3>

                  <p className="text-xs text-purple-400 mt-1 flex items-center gap-1.5 font-mono">
                    <Clock size={13} className="shrink-0" />
                    <span className="truncate">
                      {selectedEventModal.itemType === "deadline"
                        ? `Vencimento: ${selectedEventModal.dateObj.toLocaleDateString("pt-BR")}`
                        : selectedEventModal.dateObj.toLocaleString("pt-BR", {
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeEventModal()}
                disabled={isClosingModal}
                className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-50 shrink-0 ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    : "bg-purple-50 border-purple-200/70 text-slate-500 hover:text-slate-800 hover:bg-purple-100"
                }`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative z-10 space-y-3 text-sm">
              {selectedEventModal.client && (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    darkMode
                      ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                      : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedEventModal;
                      closeEventModal(() => handleGoToClient(target));
                    }}
                    title="Ir para o cadastro do cliente"
                    className="group/client flex items-center justify-between gap-2.5 min-w-0 text-left cursor-pointer flex-1"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <User
                        className="text-purple-400 shrink-0 group-hover/client:scale-110 transition-transform"
                        size={16}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] opacity-60">
                          Cliente Vinculado
                        </p>
                        <p className="font-semibold truncate group-hover/client:underline group-hover/client:text-purple-300 transition-colors">
                          {selectedEventModal.client.name}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-purple-400 shrink-0">
                      <span>Ver</span>
                      <ArrowUpRight size={13} />
                    </span>
                  </button>

                  {selectedEventModal.client.phone && (
                    <button
                      type="button"
                      onClick={() =>
                        handleWhatsApp(selectedEventModal.client.phone)
                      }
                      className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shrink-0"
                      title="Abrir WhatsApp do cliente"
                    >
                      <MessageCircle size={14} />
                      <span className="font-mono">
                        {formatPhoneBr(selectedEventModal.client.phone)}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {selectedEventModal.cnfNumber && (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    darkMode
                      ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                      : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] opacity-60">
                      Número do Processo (CNJ)
                    </p>
                    <p className="font-mono text-xs font-semibold text-purple-400 break-all">
                      {selectedEventModal.cnfNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenProcessLink(selectedEventModal.cnfNumber)
                    }
                    className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-600/30 transition-colors shrink-0"
                  >
                    <span>Consultar</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}

              <div
                className={`p-4 rounded-2xl border ${
                  darkMode
                    ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                    : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-65 mb-1.5 flex items-center gap-1.5">
                  <FileText className="text-purple-400" size={13} />
                  Observações / Detalhes
                </p>
                <p className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap break-words">
                  {selectedEventModal.notes ||
                    "Nenhuma observação adicional registrada para este compromisso."}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex justify-end pt-4 mt-5 border-t border-purple-500/15">
              <button
                type="button"
                onClick={() => closeEventModal()}
                disabled={isClosingModal}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
