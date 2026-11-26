import React, { useState } from "react";

interface FooterProps {
  darkMode: boolean;
}

export const Footer: React.FC<FooterProps> = ({ darkMode }) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <footer
      className={`border-t px-4 sm:px-6 md:px-8 py-4 pb-24 md:pb-4 text-[11px] sm:text-xs transition-colors duration-300 backdrop-blur-md ${
        darkMode
          ? "bg-[#120f18]/70 border-[#2a2238] text-slate-400"
          : "bg-white/70 border-purple-100 text-slate-500"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
          {!logoError && (
            <img
              src="/images/pepita-logo-navegador.png"
              alt="Pepita"
              onError={() => setLogoError(true)}
              className="w-4 h-4 rounded object-cover shrink-0"
            />
          )}
          <span className="font-semibold text-purple-400">Pepita</span>
          <span>&bull; Sistema de Gestão Jurídica</span>
        </div>

        <p className="opacity-75">
          &copy; {new Date().getFullYear()} Pepita &bull; Todos os direitos
          reservados
        </p>
      </div>
    </footer>
  );
};
