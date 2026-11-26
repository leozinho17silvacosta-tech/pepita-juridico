import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { Sun, Moon, LogOut } from "lucide-react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  oab?: string | null;
}

interface HeaderProps {
  currentTab: string;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: AuthUser | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  user,
  onLogout,
}) => {
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Advogado(a)";
  const shinyRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const el = shinyRef.current;
      if (!el) return;

      gsap.set(el, { backgroundPosition: "-100% 0%" });

      gsap.to(el, {
        backgroundPosition: "100% 0%",
        duration: 3.2,
        repeat: -1,
        ease: "none",
      });
    }, shinyRef);

    return () => ctx.revert();
  }, [darkMode, firstName]);

  const shinyGradient = darkMode
    ? "linear-gradient(90deg, #a855f7 0%, #c084fc 35%, #f5f3ff 50%, #818cf8 65%, #a855f7 100%)"
    : "linear-gradient(90deg, #6b21a8 0%, #9333ea 35%, #faf5ff 50%, #4f46e5 65%, #6b21a8 100%)";

  return (
    <header
      className={`h-16 min-h-16 max-h-16 w-full shrink-0 border-b px-3.5 sm:px-6 md:px-8 flex items-center justify-between gap-2 z-30 backdrop-blur-md transition-colors duration-300 ${
        darkMode
          ? "bg-[#120f18]/80 border-[#2a2238] text-slate-100"
          : "bg-white/80 border-purple-100 text-slate-800"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base md:text-lg font-extrabold tracking-wide text-purple-400 truncate leading-tight">
            <span>Bem-vindo(a), </span>
            <span
              ref={shinyRef}
              style={{
                backgroundImage: shinyGradient,
                backgroundSize: "250% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                willChange: "background-position",
              }}
              className="inline font-extrabold"
            >
              {firstName}
            </span>
            <span className="ml-1 inline-block not-italic">⚖️</span>
          </h2>
          <p
            className={`text-[11px] sm:text-xs truncate leading-tight mt-0.5 ${
              darkMode ? "text-purple-300/60" : "text-purple-600/70"
            }`}
          >
            OAB{user?.oab ? ` • ${user.oab}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
            darkMode
              ? "bg-[#1f192b] border-[#2a2238] text-purple-300 hover:border-purple-500/50 hover:bg-[#261f35]"
              : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
          }`}
          title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          aria-label={
            darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"
          }
        >
          {darkMode ? (
            <Sun size={16} className="text-amber-300" />
          ) : (
            <Moon size={16} className="text-purple-600" />
          )}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
            darkMode
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
              : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
          }`}
          title="Sair da conta"
          aria-label="Sair da conta"
        >
          <LogOut size={15} />
          <span className="hidden md:inline">Sair</span>
        </button>
      </div>
    </header>
  );
};
