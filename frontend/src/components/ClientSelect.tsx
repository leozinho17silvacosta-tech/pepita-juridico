import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, X, Check, Search, User, Users } from "lucide-react";

interface ClientItem {
  id: string;
  name: string;
  phone?: string;
  caseType?: string;
  photoUrl?: string;
}

interface ClientSelectProps {
  value: string;
  onChange: (value: string) => void;
  clients: ClientItem[];
  darkMode: boolean;
  placeholder?: string;
  emptyOptionLabel?: string;
  allowEmpty?: boolean;
  className?: string;
}

export const ClientSelect: React.FC<ClientSelectProps> = ({
  value,
  onChange,
  clients,
  darkMode,
  placeholder = "Selecionar cliente",
  emptyOptionLabel = "Nenhum cliente",
  allowEmpty = true,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === value) || null,
    [clients, value],
  );

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.caseType && c.caseType.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)),
    );
  }, [clients, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      return;
    }

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all flex items-center justify-between gap-2 text-left cursor-pointer ${
          darkMode
            ? "bg-[#110d1b]/90 border-purple-400/15 text-slate-100 hover:border-purple-400/45 focus:border-purple-400/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
            : "bg-white/90 border-purple-200/90 text-slate-800 hover:border-purple-300 focus:border-purple-400 shadow-[inset_0_2px_6px_rgba(88,28,135,0.05)]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedClient ? (
            <>
              {selectedClient.photoUrl ? (
                <img
                  src={selectedClient.photoUrl}
                  alt={selectedClient.name}
                  className="w-5 h-5 rounded-full object-cover border border-purple-400/40 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <User size={11} />
                </div>
              )}
              <span className="truncate font-medium">
                {selectedClient.name}
              </span>
            </>
          ) : (
            <span className="truncate opacity-60">
              {value === "" ? placeholder : emptyOptionLabel}
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`shrink-0 text-purple-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-2 z-50 rounded-2xl border p-2.5 transition-all max-h-80 flex flex-col ${
            darkMode
              ? "bg-[#181226] border-purple-400/25 text-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),0_0_30px_-10px_rgba(139,92,246,0.3)]"
              : "bg-white border-purple-200/90 text-slate-800 shadow-[0_20px_45px_-12px_rgba(76,29,149,0.22)]"
          }`}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-purple-500/15 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400">
              <Users size={13} />
              <span>Carteira de Clientes</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Fechar seletor"
              aria-label="Fechar seletor"
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                darkMode
                  ? "text-slate-400 hover:text-white hover:bg-white/10"
                  : "text-slate-500 hover:text-slate-800 hover:bg-purple-50"
              }`}
            >
              <X size={14} />
            </button>
          </div>

          {/* Campo de busca rápido */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border mb-2 text-xs shrink-0 ${
              darkMode
                ? "bg-[#110d1b]/90 border-purple-400/15 text-slate-100"
                : "bg-purple-50/50 border-purple-200/80 text-slate-800"
            }`}
          >
            <Search size={13} className="text-purple-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente ou área..."
              className="w-full bg-transparent outline-none min-w-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-purple-400 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista rolável */}
          <div className="overflow-y-auto space-y-1 pr-0.5">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  value === ""
                    ? darkMode
                      ? "bg-purple-600/25 text-purple-200 border border-purple-400/30"
                      : "bg-purple-100/80 text-purple-900 border border-purple-300/70"
                    : darkMode
                      ? "hover:bg-white/5 text-slate-400"
                      : "hover:bg-purple-50/80 text-slate-600"
                }`}
              >
                <span>{emptyOptionLabel}</span>
                {value === "" && (
                  <Check size={14} className="text-purple-400" />
                )}
              </button>
            )}

            {filteredClients.length === 0 ? (
              <p className="text-center py-6 text-xs opacity-50">
                Nenhum cliente encontrado.
              </p>
            ) : (
              filteredClients.map((client) => {
                const isSelected = value === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client.id)}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-sm"
                        : darkMode
                          ? "text-slate-200 hover:bg-purple-500/15 hover:text-white"
                          : "text-slate-700 hover:bg-purple-100/70 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {client.photoUrl ? (
                        <img
                          src={client.photoUrl}
                          alt={client.name}
                          className="w-7 h-7 rounded-full object-cover border border-purple-400/30 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-purple-500/15 text-purple-400"
                          }`}
                        >
                          <User size={13} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{client.name}</p>
                        {client.caseType && (
                          <p
                            className={`text-[10px] truncate ${
                              isSelected ? "text-purple-100" : "opacity-60"
                            }`}
                          >
                            {client.caseType}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
