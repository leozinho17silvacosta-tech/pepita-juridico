import React, { useState, useRef, useLayoutEffect, useMemo } from "react";
import { gsap } from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import StrokeText from "../gsap/StrokeText";
import {
  Mail,
  Lock,
  User,
  Award,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  oab?: string | null;
}

interface AuthViewProps {
  darkMode: boolean;
  onAuthSuccess: (user: AuthUser, token: string) => void;
}

interface PasswordStrength {
  score: number; // 0 a 4
  label: string;
  barClass: string;
  textClass: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      label: "Digite uma senha",
      barClass: "bg-slate-500/30",
      textClass: "opacity-60",
    };
  }

  let points = 0;
  if (password.length >= 6) points += 1;
  if (password.length >= 10) points += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) points += 1;

  if (points <= 1) {
    return {
      score: 1,
      label: "Fraca",
      barClass: "bg-rose-500",
      textClass: "text-rose-400",
    };
  }
  if (points === 2) {
    return {
      score: 2,
      label: "Razoável",
      barClass: "bg-amber-400",
      textClass: "text-amber-400",
    };
  }
  if (points === 3) {
    return {
      score: 3,
      label: "Boa",
      barClass: "bg-violet-400",
      textClass: "text-purple-400",
    };
  }
  return {
    score: 4,
    label: "Forte",
    barClass: "bg-emerald-400",
    textClass: "text-emerald-400",
  };
};

export const AuthView: React.FC<AuthViewProps> = ({
  darkMode,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oab, setOab] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const formBodyRef = useRef<HTMLDivElement>(null);
  const registerRowRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number | null>(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, active: false });

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMismatch =
    mode === "register" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  useLayoutEffect(() => {
    const body = formBodyRef.current;
    if (!body || typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const targetHeight = body.scrollHeight;
    const previousHeight = prevHeightRef.current;
    prevHeightRef.current = targetHeight;

    if (prefersReducedMotion || previousHeight === null) {
      gsap.set(body, { height: "auto", opacity: 1 });
      if (registerRowRef.current) {
        gsap.set(registerRowRef.current, { opacity: 1, y: 0 });
      }
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        body,
        { height: previousHeight },
        {
          height: targetHeight,
          duration: 0.36,
          ease: "power2.inOut",
          clearProps: "height",
        },
      );

      if (mode === "register" && registerRowRef.current) {
        gsap.fromTo(
          registerRowRef.current,
          { opacity: 0, y: -4 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            delay: 0.08,
            ease: "power2.out",
            clearProps: "transform",
          },
        );
      }
    }, formBodyRef);

    return () => ctx.revert();
  }, [mode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "register" && password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "register") {
        const res = await api.post("/auth/register", {
          name,
          email,
          password,
          oab,
        });
        toast.success(`Conta criada! Bem-vindo(a), ${res.data.user.name}.`);
        onAuthSuccess(res.data.user, res.data.token);
      } else {
        const res = await api.post("/auth/login", { email, password });
        toast.success(`Bem-vindo(a) de volta, ${res.data.user.name}!`);
        onAuthSuccess(res.data.user, res.data.token);
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        "Não foi possível concluir a autenticação.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all duration-200 ${
    darkMode
      ? "bg-[#120f18]/90 border-[#2a2238] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
      : "bg-purple-50/40 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
  }`;

  const renderLogo = (sizeClass: string, textSizeClass = "text-2xl") => {
    if (!logoError) {
      return (
        <img
          src="/images/pepita-logo.png"
          alt="Pepita Logo"
          onError={() => setLogoError(true)}
          className={`${sizeClass} rounded-3xl object-cover border border-purple-500/30 shadow-xl shadow-purple-950/30 shrink-0 transition-transform duration-500 ease-out hover:scale-[1.03]`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-extrabold ${textSizeClass} shadow-xl shadow-purple-500/20 shrink-0`}
      >
        P
      </div>
    );
  };

  return (
    <div
      className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden transition-colors duration-300 ${
        darkMode ? "bg-[#0f0d14] text-slate-100" : "bg-[#f8f6fc] text-slate-800"
      }`}
    >
      {/* Fundo pontilhado sutil + aurora roxa */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: darkMode
            ? "radial-gradient(rgba(168, 85, 247, 0.22) 1px, transparent 1px)"
            : "radial-gradient(rgba(126, 34, 206, 0.14) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className={`pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[340px] rounded-full blur-3xl opacity-30 ${
          darkMode ? "bg-purple-600" : "bg-purple-400"
        }`}
      />
      <div
        className={`pointer-events-none absolute -bottom-32 right-1/4 w-[420px] h-[280px] rounded-full blur-3xl opacity-20 ${
          darkMode ? "bg-indigo-600" : "bg-indigo-300"
        }`}
      />

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() =>
          setSpotlight((prev) => ({ ...prev, active: false }))
        }
        className={`relative z-10 w-full max-w-4xl rounded-3xl border backdrop-blur-xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-colors duration-300 ${
          darkMode
            ? "bg-[#161221]/85 border-[#2a2238] shadow-purple-950/40"
            : "bg-white/90 border-purple-100 shadow-purple-200/60"
        }`}
      >
        {spotlight.active && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(420px circle at ${spotlight.x}px ${spotlight.y}px, ${
                darkMode
                  ? "rgba(168, 85, 247, 0.12)"
                  : "rgba(147, 51, 234, 0.08)"
              }, transparent 70%)`,
            }}
          />
        )}

        {/* Coluna Esquerda — Logo ampliada + PEPITA + Painel Jurídico centralizados */}
        <div
          className={`hidden lg:flex lg:col-span-5 flex-col justify-between p-8 border-r ${
            darkMode
              ? "bg-gradient-to-b from-purple-950/40 via-[#14101f]/70 to-[#120f18]/90 border-[#2a2238]"
              : "bg-gradient-to-b from-purple-50/90 via-white/80 to-indigo-50/70 border-purple-100"
          }`}
        >
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="flex flex-col items-center justify-center gap-3.5">
              {renderLogo("w-24 h-24", "text-3xl")}
              <StrokeText
                key={darkMode ? "pepita-stroke-dark" : "pepita-stroke-light"}
                text="PEPITA"
                trigger="loop"
                fontSize={44}
                fontWeight={800}
                letterSpacing={-1.5}
                strokeColor={darkMode ? "#C084FC" : "#7E22CE"}
                fillColor={darkMode ? "#F8FAFC" : "#1E1B4B"}
                strokeWidth={1.3}
                drawDuration={1.2}
                fillDelay={0.15}
                stagger={0.06}
                fillMode="wipe"
                wipeFrom="left"
                hoverRedraw
                className="!w-fit mx-auto"
              />
            </div>

            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase border border-purple-500/30 bg-purple-500/10 text-purple-400">
              Painel Jurídico
            </span>

            <p className="text-xs leading-relaxed opacity-75 max-w-xs mt-8">
              Organize clientes, acompanhe processos no Kanban, calcule prazos
              em dias úteis e conte com a Pepita IA para apoio na rotina
              jurídica.
            </p>
          </div>

          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 text-left mt-4 ${
              darkMode
                ? "bg-[#120f18]/80 border-[#2a2238]"
                : "bg-white/80 border-purple-100"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-purple-400">
              <ShieldCheck size={15} />
              <span>Ambiente Isolado por Advogado(a)</span>
            </div>
            <p className="text-[11px] opacity-70 leading-relaxed">
              Cada conta possui sua própria carteira protegida com autenticação
              por token.
            </p>
          </div>
        </div>

        {/* Coluna Direita — Formulário de Login / Register */}
        <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <div className="flex flex-col items-center justify-center gap-2.5 lg:hidden mb-3">
              {renderLogo("w-14 h-14", "text-xl")}
              <div className="w-28">
                <StrokeText
                  key={
                    darkMode
                      ? "pepita-stroke-mobile-dark"
                      : "pepita-stroke-mobile-light"
                  }
                  text="PEPITA"
                  trigger="loop"
                  fontSize={34}
                  fontWeight={800}
                  letterSpacing={-1}
                  strokeColor={darkMode ? "#C084FC" : "#7E22CE"}
                  fillColor={darkMode ? "#F8FAFC" : "#1E1B4B"}
                  strokeWidth={1.2}
                  drawDuration={1.1}
                  fillDelay={0.15}
                  stagger={0.05}
                  fillMode="wipe"
                  wipeFrom="left"
                  className="!w-fit mx-auto"
                />
              </div>
              <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-purple-500/30 bg-purple-500/10 text-purple-400">
                Painel Jurídico
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {mode === "login"
                ? "Acesse sua conta"
                : "Criar conta de advogado"}
            </h2>
            <p className="text-xs opacity-70">
              {mode === "login"
                ? "Entre com seu e-mail e senha para gerenciar seus processos."
                : "Preencha seus dados para começar a organizar seu escritório."}
            </p>
          </div>

          {/* Seletor com thumb deslizante sutil */}
          <div
            className={`relative grid grid-cols-2 p-1 rounded-2xl border text-xs font-semibold ${
              darkMode
                ? "bg-[#120f18] border-[#2a2238]"
                : "bg-purple-50/80 border-purple-100"
            }`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-500/20 transition-transform duration-300 ease-out ${
                mode === "login"
                  ? "translate-x-1"
                  : "translate-x-[calc(100%+0.25rem)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`relative z-10 py-2.5 rounded-xl transition-colors duration-200 ${
                mode === "login" ? "text-white" : "opacity-65 hover:opacity-100"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`relative z-10 py-2.5 rounded-xl transition-colors duration-200 ${
                mode === "register"
                  ? "text-white"
                  : "opacity-65 hover:opacity-100"
              }`}
            >
              Criar Conta
            </button>
          </div>

          <div ref={formBodyRef} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div
                  ref={registerRowRef}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
                >
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3.5 top-3 text-purple-400"
                      />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Dr(a). Ana Maria"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">
                      OAB (Opcional)
                    </label>
                    <div className="relative">
                      <Award
                        size={16}
                        className="absolute left-3.5 top-3 text-purple-400"
                      />
                      <input
                        type="text"
                        value={oab}
                        onChange={(e) => setOab(e.target.value)}
                        placeholder="Ex: OAB/SP 123456"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">
                  E-mail Profissional *
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-3 text-purple-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="advogado@escritorio.com"
                    className={inputClass}
                  />
                </div>
              </div>

              {mode === "register" ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">
                        Senha *
                      </label>
                      <div className="relative">
                        <Lock
                          size={16}
                          className="absolute left-3.5 top-3 text-purple-400"
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Crie uma senha forte"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-400 transition-colors"
                          title={
                            showPassword ? "Ocultar senha" : "Mostrar senha"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">
                        Confirmar Senha *
                      </label>
                      <div className="relative">
                        <Lock
                          size={16}
                          className="absolute left-3.5 top-3 text-purple-400"
                        />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          className={`${inputClass} ${
                            passwordsMismatch
                              ? "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20"
                              : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-400 transition-colors"
                          title={
                            showConfirmPassword
                              ? "Ocultar confirmação"
                              : "Mostrar confirmação"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Medidor de força da senha */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="opacity-65">
                        Use maiúsculas, números ou símbolos (mín. 6 caracteres)
                      </span>
                      <span className={`font-semibold ${strength.textClass}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className={`rounded-full transition-all duration-300 ${
                            strength.score >= level
                              ? strength.barClass
                              : darkMode
                                ? "bg-[#2a2238]"
                                : "bg-purple-100"
                          }`}
                        />
                      ))}
                    </div>
                    {passwordsMismatch && (
                      <p className="text-[11px] font-medium text-rose-400">
                        As senhas não conferem.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-75">
                    Senha *
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-3 text-purple-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-400 transition-colors"
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || passwordsMismatch}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:opacity-95 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 mt-2 group"
              >
                <span>
                  {submitting
                    ? "Processando..."
                    : mode === "login"
                      ? "Entrar no Painel"
                      : "Criar Conta Profissional"}
                </span>
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
