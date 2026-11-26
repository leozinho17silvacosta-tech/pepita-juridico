import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, X, Check, Search } from "lucide-react";

export interface StyledSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badgeClass?: string;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: StyledSelectOption[];
  darkMode: boolean;
  placeholder?: string;
  headerTitle?: string;
  headerIcon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  allowCustomNumeric?: boolean;
  className?: string;
}

export const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onChange,
  options,
  darkMode,
  placeholder = "Selecionar opção",
  headerTitle = "Opções",
  headerIcon,
  searchable = false,
  searchPlaceholder = "Pesquisar...",
  allowCustomNumeric = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q)),
    );
  }, [options, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (searchable) {
      timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

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
      if (timer) clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, searchable]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const trimmedSearch = searchTerm.trim();
  const canUseCustomNumeric =
    allowCustomNumeric &&
    trimmedSearch !== "" &&
    /^\d+$/.test(trimmedSearch) &&
    !options.some((opt) => opt.value === String(Number(trimmedSearch)));

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
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 flex items-center">
                  {selectedOption.icon}
                </span>
              )}
              <span className="truncate font-medium">
                {selectedOption.label}
              </span>
            </>
          ) : value ? (
            <span className="truncate font-medium">
              {Number(value)} {Number(value) === 1 ? "dia útil" : "dias úteis"}
            </span>
          ) : (
            <span className="truncate opacity-60">{placeholder}</span>
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
          className={`absolute left-0 right-0 mt-2 z-50 rounded-2xl border p-2.5 transition-all max-h-72 flex flex-col ${
            darkMode
              ? "bg-[#181226] border-purple-400/25 text-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),0_0_30px_-10px_rgba(139,92,246,0.3)]"
              : "bg-white border-purple-200/90 text-slate-800 shadow-[0_20px_45px_-12px_rgba(76,29,149,0.22)]"
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-purple-500/15 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400">
              {headerIcon}
              <span>{headerTitle}</span>
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

          {searchable && (
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
                placeholder={searchPlaceholder}
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
          )}

          <div className="overflow-y-auto space-y-1 pr-0.5">
            {canUseCustomNumeric && (
              <button
                type="button"
                onClick={() => handleSelect(String(Number(trimmedSearch)))}
                className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 text-left transition-all cursor-pointer border ${
                  darkMode
                    ? "bg-purple-600/20 border-purple-400/35 text-purple-200 hover:bg-purple-600/30"
                    : "bg-purple-100/80 border-purple-300 text-purple-900 hover:bg-purple-200/80"
                }`}
              >
                <span className="font-semibold">
                  Usar {Number(trimmedSearch)}{" "}
                  {Number(trimmedSearch) === 1 ? "dia útil" : "dias úteis"}
                </span>
                <Check size={14} className="shrink-0 text-purple-400" />
              </button>
            )}

            {filteredOptions.length === 0 && !canUseCustomNumeric ? (
              <p className="text-center py-5 text-xs opacity-50">
                Nenhuma opção encontrada.
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-sm"
                        : darkMode
                          ? "text-slate-200 hover:bg-purple-500/15 hover:text-white"
                          : "text-slate-700 hover:bg-purple-100/70 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {option.icon && (
                        <span
                          className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : option.badgeClass ||
                                "bg-purple-500/15 text-purple-400"
                          }`}
                        >
                          {option.icon}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{option.label}</p>
                        {option.subtitle && (
                          <p
                            className={`text-[10px] truncate ${
                              isSelected ? "text-purple-100" : "opacity-60"
                            }`}
                          >
                            {option.subtitle}
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
