import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, X, Check, FolderTree } from "lucide-react";
import {
  LEGAL_AREA_GROUPS,
  ALL_LEGAL_CASE_TYPES,
} from "../constants/legalAreas";

interface LegalCaseSelectProps {
  value: string;
  onChange: (value: string) => void;
  darkMode: boolean;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
}

export const LegalCaseSelect: React.FC<LegalCaseSelectProps> = ({
  value,
  onChange,
  darkMode,
  placeholder = "Selecione o tipo de processo",
  includeAllOption = false,
  allOptionLabel = "Todos os Processos",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const found = LEGAL_AREA_GROUPS.find((g) => g.options.includes(value));
    return found ? found.group : null;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value || value === "ALL") return;
    const found = LEGAL_AREA_GROUPS.find((g) => g.options.includes(value));
    if (found) {
      setExpandedGroup(found.group);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

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
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroup((prev) => (prev === groupName ? null : groupName));
  };

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const displayLabel =
    includeAllOption && value === "ALL" ? allOptionLabel : value || placeholder;

  const isCustomLegacyValue =
    Boolean(value) && value !== "ALL" && !ALL_LEGAL_CASE_TYPES.includes(value);

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
        <span className={`truncate ${!value ? "opacity-60" : "font-medium"}`}>
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-purple-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-2 z-50 rounded-2xl border p-2.5 transition-all max-h-80 overflow-y-auto ${
            darkMode
              ? "bg-[#181226] border-purple-400/25 text-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),0_0_30px_-10px_rgba(139,92,246,0.3)]"
              : "bg-white border-purple-200/90 text-slate-800 shadow-[0_20px_45px_-12px_rgba(76,29,149,0.22)]"
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-purple-500/15">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400">
              <FolderTree size={13} />
              <span>Áreas do Direito</span>
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

          {includeAllOption && (
            <button
              type="button"
              onClick={() => handleSelectOption("ALL")}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors mb-1 cursor-pointer ${
                value === "ALL"
                  ? darkMode
                    ? "bg-purple-600/25 text-purple-200 border border-purple-400/30"
                    : "bg-purple-100/80 text-purple-900 border border-purple-300/70"
                  : darkMode
                    ? "hover:bg-white/5 text-slate-200"
                    : "hover:bg-purple-50/80 text-slate-700"
              }`}
            >
              <span>{allOptionLabel}</span>
              {value === "ALL" && (
                <Check size={14} className="text-purple-400" />
              )}
            </button>
          )}

          {isCustomLegacyValue && (
            <button
              type="button"
              onClick={() => handleSelectOption(value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between mb-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white cursor-pointer"
            >
              <span className="truncate">{value}</span>
              <Check size={13} className="shrink-0" />
            </button>
          )}

          <div className="space-y-1">
            {LEGAL_AREA_GROUPS.map((section) => {
              const isExpanded = expandedGroup === section.group;
              const hasSelectedInside = section.options.includes(value);

              return (
                <div
                  key={section.group}
                  className={`rounded-xl border transition-colors ${
                    hasSelectedInside
                      ? darkMode
                        ? "border-purple-500/35 bg-purple-950/25"
                        : "border-purple-300/80 bg-purple-50/50"
                      : darkMode
                        ? "border-purple-500/10 bg-[#120e1c]/60"
                        : "border-purple-100 bg-purple-50/25"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.group)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs font-bold transition-colors cursor-pointer ${
                      darkMode
                        ? "text-slate-100 hover:bg-white/5"
                        : "text-slate-800 hover:bg-purple-50"
                    }`}
                  >
                    <span className="truncate">{section.group}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400">
                        {section.options.length}
                      </span>
                      <ChevronRight
                        size={14}
                        className={`text-purple-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-1.5 pb-1.5 pt-0.5 space-y-0.5 border-t border-purple-500/10">
                        {section.options.map((option) => {
                          const isSelected = value === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleSelectOption(option)}
                              className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-sm"
                                  : darkMode
                                    ? "text-slate-300 hover:bg-purple-500/15 hover:text-white"
                                    : "text-slate-700 hover:bg-purple-100/70 hover:text-slate-900"
                              }`}
                            >
                              <span className="truncate">{option}</span>
                              {isSelected && (
                                <Check size={13} className="shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
