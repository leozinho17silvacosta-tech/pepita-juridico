import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { api } from "./services/api";
import { AuthView } from "./components/AuthView";
import { Sidebar } from "./components/Sidebar";
import { Header, type AuthUser } from "./components/Header";
import { Footer } from "./components/Footer";
import { HomeView } from "./components/HomeView";
import { ClientsView } from "./components/ClientsView";
import { LawsuitsView } from "./components/LawsuitsView";
import { ConsultationsView } from "./components/ConsultationsView";
import { DeadlinesView } from "./components/DeadlinesView";
import { CalendarView } from "./components/CalendarView";
import { ArchivedView } from "./components/ArchivedView";
import { PepitaChat } from "./components/PepitaChat";
import { SupportModal } from "./components/SupportModal";

export type { AuthUser };

const TOKEN_KEY = "jurispainel_token";

const TAB_LABELS: Record<string, string> = {
  home: "Painel Geral",
  clients: "Clientes",
  lawsuits: "Processos",
  consultations: "Consultas",
  deadlines: "Prazos",
  calendar: "Calendário Geral",
  archived: "Arquivados",
  pepita: "Pepita (IA)",
};

export function App() {
  const [currentTab, setCurrentTab] = useState("home");
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        tab?: string;
        clientId?: string;
        clientName?: string;
      }>;

      if (customEvent.detail?.tab) {
        setCurrentTab(customEvent.detail.tab);
      }
    };

    window.addEventListener("pepita:navigate", handleNavigate);
    return () => {
      window.removeEventListener("pepita:navigate", handleNavigate);
    };
  }, []);

  const handleAuthSuccess = (authenticatedUser: AuthUser, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(authenticatedUser);
    setCurrentTab("home");
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setIsSupportOpen(false);
  };

  const handleNavigateToClients = (clientId?: string, clientName?: string) => {
    if (clientId || clientName) {
      try {
        sessionStorage.setItem(
          "pepita:selectedClient",
          JSON.stringify({
            id: clientId || null,
            name: clientName || "",
          }),
        );
      } catch {
        // Ignora erro de storage em ambientes restritos
      }
    }
    setCurrentTab("clients");
  };

  if (checkingAuth) {
    return (
      <div
        data-theme={darkMode ? "dark" : "light"}
        className={`h-screen flex items-center justify-center text-sm font-medium ${
          darkMode
            ? "bg-[#0f0d14] text-purple-300"
            : "bg-[#f5f2fb] text-purple-800"
        }`}
      >
        Verificando sessão...
      </div>
    );
  }

  if (!user) {
    return (
      <div data-theme={darkMode ? "dark" : "light"}>
        <Toaster position="top-right" />
        <AuthView darkMode={darkMode} onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div
      data-theme={darkMode ? "dark" : "light"}
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${
        darkMode ? "bg-[#0f0d14] text-slate-100" : "bg-[#f5f2fb] text-slate-900"
      }`}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: darkMode ? "#161221" : "#ffffff",
            color: darkMode ? "#f1f5f9" : "#0f172a",
            border: darkMode
              ? "1px solid rgba(168, 85, 247, 0.3)"
              : "1px solid rgba(109, 40, 217, 0.25)",
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        darkMode={darkMode}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <Header
          currentTab={currentTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={user}
          onLogout={handleLogout}
        />

        <div className="p-4 sm:p-6 md:p-8 flex-1">
          {currentTab === "home" && (
            <HomeView darkMode={darkMode} onNavigateTab={setCurrentTab} />
          )}
          {currentTab === "clients" && <ClientsView darkMode={darkMode} />}
          {currentTab === "lawsuits" && (
            <LawsuitsView
              darkMode={darkMode}
              onNavigateToClients={handleNavigateToClients}
            />
          )}
          {currentTab === "consultations" && (
            <ConsultationsView darkMode={darkMode} />
          )}
          {currentTab === "deadlines" && <DeadlinesView darkMode={darkMode} />}
          {currentTab === "calendar" && <CalendarView darkMode={darkMode} />}
          {currentTab === "archived" && <ArchivedView darkMode={darkMode} />}
          {currentTab === "pepita" && <PepitaChat darkMode={darkMode} />}
        </div>

        <Footer darkMode={darkMode} />
      </main>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        darkMode={darkMode}
        activeTabLabel={TAB_LABELS[currentTab] || currentTab}
        supportEmail="pepitapaineljuridico@gmail.com"
      />
    </div>
  );
}

export default App;
