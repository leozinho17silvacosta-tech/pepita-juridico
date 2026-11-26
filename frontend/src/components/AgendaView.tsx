import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  FileText,
  CheckCircle2,
  X,
  User,
} from "lucide-react";

interface AgendaViewProps {
  darkMode: boolean;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ darkMode }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null); // Para o modal de anotações/edição

  // Estados do formulário de nova consulta
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("MODERATE");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appRes, clientsRes] = await Promise.all([
        api.get("/appointments"),
        api.get("/clients"),
      ]);
      setAppointments(appRes.data);
      setClients(clientsRes.data);
      if (clientsRes.data.length > 0) {
        setClientId(clientsRes.data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/appointments", {
        title,
        date,
        notes,
        priority,
        clientId: clientId || null,
      });

      setTitle("");
      setDate("");
      setNotes("");
      setPriority("MODERATE");
      setIsModalOpen(false);

      loadData();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      alert("Erro ao salvar compromisso no Neon DB.");
    }
  };

  // Salvar anotações da consulta ("do que se trata")
  const handleUpdateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      await api.patch(`/appointments/${selectedAppointment.id}`, {
        notes: selectedAppointment.notes,
        completed: selectedAppointment.completed,
      });

      setSelectedAppointment(null);
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar anotações:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3
            className={`text-xl font-bold ${darkMode ? "text-slate-100" : "text-slate-800"}`}
          >
            Agenda & Consultas Semanais
          </h3>
          <p
            className={`text-sm ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Controle de compromissos, reuniões e anotações pós-atendimento.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all text-sm"
        >
          <Plus size={18} />
          <span>Nova Consulta</span>
        </button>
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">Carregando agenda...</p>
      ) : appointments.length === 0 ? (
        <div
          className={`text-center py-20 rounded-2xl border border-dashed ${
            darkMode
              ? "border-purple-900/40 text-slate-500"
              : "border-purple-200 text-slate-400"
          }`}
        >
          <CalendarIcon
            size={48}
            className="mx-auto mb-3 opacity-40 text-purple-400"
          />
          <p>Nenhuma consulta agendada no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedAppointment(app)}
              className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                darkMode
                  ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/40 shadow-lg shadow-purple-950/20"
                  : "bg-white border-purple-100 hover:border-purple-300 shadow-md shadow-purple-100/50"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                    {app.priority}
                  </span>
                  <span className="text-xs text-purple-400/80 font-medium flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(app.date).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <h4
                  className={`font-bold text-lg mb-1 ${darkMode ? "text-slate-100" : "text-slate-800"}`}
                >
                  {app.title}
                </h4>

                {app.client && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-3">
                    <User size={14} />
                    <span>Cliente: {app.client.name}</span>
                  </div>
                )}

                {app.notes ? (
                  <p className="text-xs opacity-75 bg-purple-500/5 p-3 rounded-xl border border-purple-500/10 line-clamp-3">
                    <strong>Anotações:</strong> {app.notes}
                  </p>
                ) : (
                  <p className="text-xs opacity-40 italic">
                    Clique para adicionar anotações do que foi tratado...
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-purple-500/10 flex items-center justify-between text-xs">
                <span className="opacity-60">Status: Agendado</span>
                <span className="text-purple-400 font-semibold hover:underline">
                  Ver / Editar &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE NOVA CONSULTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative transition-colors ${
              darkMode
                ? "bg-[#161221] border-[#2a2238] text-slate-100"
                : "bg-white border-purple-100 text-slate-800"
            }`}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Agendar Nova Consulta
            </h3>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião Inicial - Divórcio"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    darkMode
                      ? "bg-[#120f18] border-[#2a2238] focus:border-purple-500"
                      : "bg-purple-50/30 border-purple-200 focus:border-purple-400"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                      darkMode
                        ? "bg-[#120f18] border-[#2a2238] text-slate-100 focus:border-purple-500"
                        : "bg-purple-50/30 border-purple-200 text-slate-800 focus:border-purple-400"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Cliente (Opcional)
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                      darkMode
                        ? "bg-[#120f18] border-[#2a2238] text-slate-100 focus:border-purple-500"
                        : "bg-purple-50/30 border-purple-200 text-slate-800 focus:border-purple-400"
                    }`}
                  >
                    <option value="">Nenhum / Externo</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                  Anotações Prévias
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Assuntos a serem tratados..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors resize-none ${
                    darkMode
                      ? "bg-[#120f18] border-[#2a2238] focus:border-purple-500"
                      : "bg-purple-50/30 border-purple-200 focus:border-purple-400"
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    darkMode
                      ? "bg-[#120f18] text-slate-400 hover:bg-[#1f192b]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all"
                >
                  Salvar Compromisso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ANOTAÇÕES E EDIÇÃO DA CONSULTA */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative transition-colors ${
              darkMode
                ? "bg-[#161221] border-[#2a2238] text-slate-100"
                : "bg-white border-purple-100 text-slate-800"
            }`}
          >
            <button
              onClick={() => setSelectedAppointment(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              {selectedAppointment.title}
            </h3>
            <p className="text-xs text-purple-400 mb-4">
              Data: {new Date(selectedAppointment.date).toLocaleString("pt-BR")}
            </p>

            <form onSubmit={handleUpdateNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                  Anotações do que foi tratado
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
                  placeholder="Escreva aqui os detalhes, acordos e orientações passadas ao cliente..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors resize-none ${
                    darkMode
                      ? "bg-[#120f18] border-[#2a2238] focus:border-purple-500 text-slate-100"
                      : "bg-purple-50/30 border-purple-200 focus:border-purple-400 text-slate-800"
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    darkMode
                      ? "bg-[#120f18] text-slate-400 hover:bg-[#1f192b]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all"
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
