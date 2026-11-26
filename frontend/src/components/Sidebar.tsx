import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Clock,
  Archive,
  Sparkles,
  LifeBuoy,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  darkMode: boolean;
  onOpenSupport?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  darkMode,
  onOpenSupport,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [devLogoError, setDevLogoError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosingMobile, setIsClosingMobile] = useState(false);

  const brandRef = useRef<HTMLDivElement | null>(null);
  const strokeTextRef = useRef<SVGTextElement | null>(null);
  const drawerBackdropRef = useRef<HTMLDivElement | null>(null);
  const drawerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const textEl = strokeTextRef.current;
      if (!textEl) return;

      const length = textEl.getComputedTextLength();

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.6,
        defaults: { ease: "power2.inOut" },
      });

      tl.set(textEl, {
        strokeDasharray: length,
        strokeDashoffset: length,
        fillOpacity: 0,
      })
        .to(textEl, {
          strokeDashoffset: 0,
          duration: 1.35,
        })
        .to(
          textEl,
          {
            fillOpacity: 1,
            duration: 0.4,
            ease: "power1.out",
          },
          "-=0.2",
        )
        .to(textEl, {
          duration: 1.4,
        })
        .to(textEl, {
          fillOpacity: 0,
          strokeDashoffset: length,
          duration: 0.85,
        });
    }, brandRef);

    return () => ctx.revert();
  }, [darkMode]);

  useEffect(() => {
    if (!mobileOpen) return;
    setIsClosingMobile(false);

    const panel = drawerPanelRef.current;
    const backdrop = drawerBackdropRef.current;

    const ctx = gsap.context(() => {
      if (backdrop) {
        gsap.fromTo(
          backdrop,
          { opacity: 0 },
          { opacity: 1, duration: 0.26, ease: "power2.out" },
        );
      }

      if (panel) {
        gsap.fromTo(
          panel,
          {
            x: "-105%",
            rotateY: -12,
            scale: 0.97,
            transformPerspective: 1000,
            transformOrigin: "left center",
          },
          {
            x: "0%",
            rotateY: 0,
            scale: 1,
            duration: 0.38,
            ease: "power3.out",
          },
        );
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      ctx.revert();
    };
  }, [mobileOpen]);

  const closeMobileMenu = (onComplete?: () => void) => {
    if (!mobileOpen || isClosingMobile) return;
    setIsClosingMobile(true);

    const panel = drawerPanelRef.current;
    const backdrop = drawerBackdropRef.current;

    const finish = () => {
      setMobileOpen(false);
      setIsClosingMobile(false);
      onComplete?.();
    };

    if (backdrop) {
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.22,
        ease: "power2.in",
      });
    }

    if (panel) {
      gsap.to(panel, {
        x: "-105%",
        rotateY: -10,
        scale: 0.97,
        transformPerspective: 1000,
        duration: 0.25,
        ease: "power2.in",
        onComplete: finish,
      });
    } else {
      finish();
    }
  };

  const handleToggleMobile = () => {
    if (mobileOpen) {
      closeMobileMenu();
    } else {
      setMobileOpen(true);
    }
  };

  const handleSelectTab = (tabId: string) => {
    if (mobileOpen) {
      closeMobileMenu(() => setCurrentTab(tabId));
    } else {
      setCurrentTab(tabId);
    }
  };

  const handleTriggerSupport = () => {
    if (!onOpenSupport) return;
    if (mobileOpen) {
      closeMobileMenu(() => onOpenSupport());
    } else {
      onOpenSupport();
    }
  };

  const menuItems = [
    { id: "home", label: "Painel Geral", icon: LayoutDashboard },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "lawsuits", label: "Processos", icon: FileText },
    { id: "consultations", label: "Consultas", icon: Calendar },
    { id: "deadlines", label: "Prazos", icon: Clock },
    { id: "calendar", label: "Calendário Geral", icon: Calendar },
    { id: "archived", label: "Arquivados", icon: Archive },
    { id: "pepita", label: "Pepita (IA)", icon: Sparkles, highlight: true },
  ];

  const renderBrandHeader = () => (
    <div
      ref={brandRef}
      className={`p-5 border-b flex flex-col items-center justify-center text-center gap-2.5 ${
        darkMode ? "border-[#2a2238]" : "border-purple-100"
      }`}
    >
      {!logoError ? (
        <img
          src="/images/pepita-logo-navegador.png"
          alt="Pepita Logo"
          onError={() => setLogoError(true)}
          className="w-12 h-12 rounded-2xl object-cover border border-purple-500/30 shadow-md shadow-purple-950/30 shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0">
          P
        </div>
      )}

      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 210 38"
          className="w-40 h-9 overflow-visible block mx-auto"
          aria-label="Pepita"
        >
          <defs>
            <linearGradient
              id="pepitaStrokeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={darkMode ? "#c084fc" : "#7e22ce"} />
              <stop
                offset="100%"
                stopColor={darkMode ? "#818cf8" : "#4f46e5"}
              />
            </linearGradient>
          </defs>
          <text
            ref={strokeTextRef}
            x="105"
            y="29"
            textAnchor="middle"
            fontSize="30"
            fontWeight="800"
            letterSpacing="0.14em"
            fill="url(#pepitaStrokeGradient)"
            stroke="url(#pepitaStrokeGradient)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            PEPITA
          </text>
        </svg>
        <p
          className={`text-xs mt-0.5 ${
            darkMode ? "text-purple-300/60" : "text-purple-600/70"
          }`}
        >
          Painel Jurídico
        </p>
      </div>
    </div>
  );

  const renderNavItems = () => (
    <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
              isActive
                ? item.highlight
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                  : darkMode
                    ? "bg-purple-600/90 text-white shadow-lg shadow-purple-900/40"
                    : "bg-purple-600 text-white shadow-lg shadow-purple-200"
                : item.highlight
                  ? darkMode
                    ? "bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 border border-purple-800/40"
                    : "bg-purple-100/60 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
                  : darkMode
                    ? "text-slate-400 hover:bg-[#1f192b] hover:text-slate-200"
                    : "text-slate-600 hover:bg-purple-50/80 hover:text-purple-900"
            }`}
          >
            <Icon
              size={18}
              className={item.highlight && !isActive ? "text-purple-400" : ""}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const renderFooter = () => (
    <div
      className={`px-4 py-3 border-t text-center shrink-0 space-y-2.5 ${
        darkMode
          ? "border-[#2a2238] bg-[#0e0b13]/60"
          : "border-purple-100 bg-purple-50/40"
      }`}
    >
      {onOpenSupport && (
        <button
          type="button"
          onClick={handleTriggerSupport}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            darkMode
              ? "bg-white/[0.03] border-purple-500/20 text-purple-200 hover:bg-purple-500/15 hover:border-purple-400/40"
              : "bg-white border-purple-200/80 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
          }`}
        >
          <LifeBuoy size={14} className="text-purple-400" />
          <span>Suporte</span>
        </button>
      )}

      <div>
        <p
          className={`text-[10px] uppercase tracking-widest ${
            darkMode ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Desenvolvido por
        </p>
        <a
          href="https://linktr.ee/leonardo.developer"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir linktree de LEO_DEV"
          className={`group/dev mt-1.5 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
            darkMode
              ? "bg-purple-500/5 border-purple-500/15 hover:bg-purple-500/15 hover:border-purple-400/35 hover:shadow-[0_8px_18px_-6px_rgba(139,92,246,0.45)]"
              : "bg-white/80 border-purple-200/70 hover:bg-purple-50 hover:border-purple-300 hover:shadow-[0_8px_16px_-6px_rgba(124,58,237,0.25)]"
          }`}
        >
          {!devLogoError ? (
            <img
              src="/images/leo-dev-logo.png"
              alt="LEO_DEV Logo"
              onError={() => setDevLogoError(true)}
              className="w-5 h-5 rounded-md object-cover border border-purple-500/30 shrink-0 transition-transform duration-200 group-hover/dev:scale-105"
            />
          ) : (
            <span className="w-5 h-5 rounded-md bg-purple-600/20 text-purple-400 text-[10px] font-extrabold inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/dev:scale-105">
              L
            </span>
          )}
          <span className="text-xs font-extrabold tracking-[0.2em] bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            LEO_DEV
          </span>
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* BOTÃO BURGER 3D MODERNO PARA MOBILE */}
      <button
        type="button"
        onClick={handleToggleMobile}
        disabled={isClosingMobile}
        aria-label={mobileOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
        aria-expanded={mobileOpen}
        className={`md:hidden fixed bottom-5 right-5 z-[70] w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 active:scale-95 ${
          darkMode
            ? "bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 border-purple-300/30 text-white shadow-[0_14px_30px_-6px_rgba(124,58,237,0.65),0_4px_0_#3b0764,inset_0_1px_0_rgba(255,255,255,0.35)]"
            : "bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 border-purple-200/80 text-white shadow-[0_14px_28px_-6px_rgba(109,40,217,0.45),0_4px_0_#581c87,inset_0_1px_0_rgba(255,255,255,0.4)]"
        }`}
      >
        <span className="relative w-6 h-5 flex flex-col justify-between items-center">
          <span
            className={`w-6 h-0.5 rounded-full bg-white transition-all duration-300 origin-center ${
              mobileOpen ? "translate-y-[9px] rotate-45" : ""
            }`}
          />
          <span
            className={`w-4 h-0.5 rounded-full bg-white/90 transition-all duration-200 ${
              mobileOpen ? "opacity-0 scale-x-0" : "opacity-100"
            }`}
          />
          <span
            className={`w-6 h-0.5 rounded-full bg-white transition-all duration-300 origin-center ${
              mobileOpen ? "-translate-y-[9px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {/* GAVETA MOBILE COM ANIMAÇÃO GSAP */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          <div
            ref={drawerBackdropRef}
            onClick={() => closeMobileMenu()}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            ref={drawerPanelRef}
            style={{ perspective: "1000px" }}
            className={`relative z-10 w-72 max-w-[82vw] h-screen flex flex-col border-r transition-colors ${
              darkMode
                ? "bg-gradient-to-b from-[#1a1429] via-[#120f18] to-[#0d0a12] text-slate-100 border-purple-400/20 shadow-[20px_0_50px_-12px_rgba(0,0,0,0.85),inset_-1px_0_0_rgba(255,255,255,0.06)]"
                : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f6f1ff] text-slate-800 border-purple-200/80 shadow-[20px_0_45px_-12px_rgba(76,29,149,0.22),inset_-1px_0_0_rgba(255,255,255,0.8)]"
            }`}
          >
            {renderBrandHeader()}
            {renderNavItems()}
            {renderFooter()}
          </div>
        </div>
      )}

      {/* SIDEBAR DESKTOP */}
      <aside
        className={`hidden md:flex w-64 flex-col h-screen border-r shrink-0 transition-colors duration-300 ${
          darkMode
            ? "bg-[#120f18] text-slate-100 border-[#2a2238]"
            : "bg-[#fcfaff] text-slate-800 border-purple-100"
        }`}
      >
        {renderBrandHeader()}
        {renderNavItems()}
        {renderFooter()}
      </aside>
    </>
  );
};
