import React, { useState, useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Users,
  Phone,
  Mail,
  Plus,
  MessageCircle,
  X,
  Upload,
  User,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  AlertTriangle,
  FolderOpen,
  FileText,
  Download,
  UserPlus,
  Calendar,
} from "lucide-react";
import { LegalCaseSelect } from "./LegalCaseSelect";
import { StyledSelect, type StyledSelectOption } from "./StyledSelect";

interface ClientsViewProps {
  darkMode: boolean;
}

const AGE_OPTIONS = Array.from({ length: 93 }, (_, i) => i + 18);

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

export const ClientsView: React.FC<ClientsViewProps> = ({ darkMode }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosingClientModal, setIsClosingClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(
    null,
  );
  const [highlightedClientName, setHighlightedClientName] =
    useState<string>("");

  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isClosingDeleteModal, setIsClosingDeleteModal] = useState(false);
  const [clientForDocs, setClientForDocs] = useState<any>(null);
  const [isClosingDocsModal, setIsClosingDocsModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [isClosingDeleteDocModal, setIsClosingDeleteDocModal] = useState(false);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docFileUrl, setDocFileUrl] = useState("");

  const docsBackdropRef = useRef<HTMLDivElement | null>(null);
  const docsModalRef = useRef<HTMLDivElement | null>(null);
  const deleteBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement | null>(null);
  const deleteDocBackdropRef = useRef<HTMLDivElement | null>(null);
  const deleteDocModalRef = useRef<HTMLDivElement | null>(null);
  const clientBackdropRef = useRef<HTMLDivElement | null>(null);
  const clientModalRef = useRef<HTMLDivElement | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterCase, setSelectedFilterCase] = useState("ALL");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("");
  const [caseType, setCaseType] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const ageSelectOptions = useMemo<StyledSelectOption[]>(() => {
    const base: StyledSelectOption[] = [{ value: "", label: "Não informada" }];
    if (age !== "" && !AGE_OPTIONS.some((item) => String(item) === age)) {
      base.push({ value: age, label: `${age} anos` });
    }
    AGE_OPTIONS.forEach((item) => {
      base.push({ value: String(item), label: `${item} anos` });
    });
    return base;
  }, [age]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pepita:selectedClient");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) {
          setHighlightedClientId(String(parsed.id));
        }
        if (parsed?.name) {
          setHighlightedClientName(String(parsed.name));
        }
        sessionStorage.removeItem("pepita:selectedClient");
      }
    } catch {
      // Ignora erro de storage em ambientes restritos
    }

    loadClients();
  }, []);

  const animateModalOpen = (
    backdropEl: HTMLDivElement | null,
    cardEl: HTMLDivElement | null,
  ) => {
    if (!cardEl) return gsap.context(() => {});

    return gsap.context(() => {
      if (backdropEl) {
        gsap.fromTo(
          backdropEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.28, ease: "power2.out" },
        );
      }

      gsap.fromTo(
        cardEl,
        {
          opacity: 0,
          y: 22,
          scale: 0.93,
          rotateX: 15,
          transformPerspective: 1000,
          transformOrigin: "50% 55%",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.42,
          ease: "power3.out",
        },
      );
    }, cardEl);
  };

  const animateModalClose = (
    backdropEl: HTMLDivElement | null,
    cardEl: HTMLDivElement | null,
    onDone: () => void,
  ) => {
    if (!cardEl) {
      onDone();
      return;
    }

    if (backdropEl) {
      gsap.to(backdropEl, {
        opacity: 0,
        duration: 0.24,
        ease: "power2.in",
      });
    }

    gsap.to(cardEl, {
      opacity: 0,
      y: 16,
      scale: 0.94,
      rotateX: -10,
      transformPerspective: 1000,
      duration: 0.26,
      ease: "power2.in",
      onComplete: onDone,
    });
  };

  useEffect(() => {
    if (!clientForDocs) return;
    setIsClosingDocsModal(false);
    const ctx = animateModalOpen(docsBackdropRef.current, docsModalRef.current);
    return () => ctx.revert();
  }, [clientForDocs]);

  useEffect(() => {
    if (!clientToDelete) return;
    setIsClosingDeleteModal(false);
    const ctx = animateModalOpen(
      deleteBackdropRef.current,
      deleteModalRef.current,
    );
    return () => ctx.revert();
  }, [clientToDelete]);

  useEffect(() => {
    if (!docToDelete) return;
    setIsClosingDeleteDocModal(false);
    const ctx = animateModalOpen(
      deleteDocBackdropRef.current,
      deleteDocModalRef.current,
    );
    return () => ctx.revert();
  }, [docToDelete]);

  useEffect(() => {
    if (!isModalOpen) return;
    setIsClosingClientModal(false);
    const ctx = animateModalOpen(
      clientBackdropRef.current,
      clientModalRef.current,
    );
    return () => ctx.revert();
  }, [isModalOpen]);

  const closeDocsModal = (onComplete?: () => void) => {
    if (!clientForDocs || isClosingDocsModal) return;
    setIsClosingDocsModal(true);
    animateModalClose(docsBackdropRef.current, docsModalRef.current, () => {
      setClientForDocs(null);
      setIsClosingDocsModal(false);
      onComplete?.();
    });
  };

  const closeDeleteModal = (onComplete?: () => void) => {
    if (!clientToDelete || isClosingDeleteModal) return;
    setIsClosingDeleteModal(true);
    animateModalClose(deleteBackdropRef.current, deleteModalRef.current, () => {
      setClientToDelete(null);
      setIsClosingDeleteModal(false);
      onComplete?.();
    });
  };

  const closeDeleteDocModal = (onComplete?: () => void) => {
    if (!docToDelete || isClosingDeleteDocModal) return;
    setIsClosingDeleteDocModal(true);
    animateModalClose(
      deleteDocBackdropRef.current,
      deleteDocModalRef.current,
      () => {
        setDocToDelete(null);
        setIsClosingDeleteDocModal(false);
        onComplete?.();
      },
    );
  };

  const closeClientModal = (onComplete?: () => void) => {
    if (!isModalOpen || isClosingClientModal) return;
    setIsClosingClientModal(true);
    animateModalClose(clientBackdropRef.current, clientModalRef.current, () => {
      setIsModalOpen(false);
      setIsClosingClientModal(false);
      onComplete?.();
    });
  };

  const loadClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (phoneValue: string) => {
    const cleanPhone = phoneValue.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const handleOpenProcessLink = (cnfNumber: string) => {
    if (!cnfNumber) return;
    const cleanNum = cnfNumber.replace(/\D/g, "");
    window.open(
      `https://www.google.com/search?q=consulta+processo+${cleanNum}`,
      "_blank",
    );
  };

  const handleOpenDocument = (doc: any) => {
    try {
      if (doc.fileUrl && doc.fileUrl.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = doc.fileUrl;
        link.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, "_")}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download iniciado com sucesso!");
      } else {
        window.open(doc.fileUrl, "_blank");
      }
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      toast.error("Erro ao realizar o download do arquivo.");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isDoc: boolean = false,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isDoc) {
          setDocFileUrl(reader.result as string);
        } else {
          setPhotoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClientId(null);
    setName("");
    setAge("");
    setPhone("");
    setEmail("");
    setProfession("");
    setCaseType("");
    setPhotoUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: any) => {
    setEditingClientId(client.id);
    setName(client.name || "");
    setAge(client.age ? client.age.toString() : "");
    setPhone(client.phone ? formatPhoneBr(client.phone) : "");
    setEmail(client.email || "");
    setProfession(client.profession || "");
    setCaseType(client.caseType || "");
    setPhotoUrl(client.photoUrl || "");
    setIsModalOpen(true);
  };

  const handleOpenDocsModal = async (client: any) => {
    setClientForDocs(client);
    setDocTitle("");
    setDocFileUrl("");
    try {
      const res = await api.get(`/clients/${client.id}/documents`);
      setClientDocuments(res.data);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      toast.error("Erro ao carregar documentos.");
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForDocs || !docFileUrl) {
      toast.error("Insira o título e anexe o arquivo do documento.");
      return;
    }

    try {
      await api.post(`/clients/${clientForDocs.id}/documents`, {
        title: docTitle || "Documento sem título",
        fileUrl: docFileUrl,
      });
      toast.success("Documento anexado com sucesso!");
      setDocTitle("");
      setDocFileUrl("");
      const res = await api.get(`/clients/${clientForDocs.id}/documents`);
      setClientDocuments(res.data);
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      toast.error("Erro ao salvar documento.");
    }
  };

  const executeDeleteDocument = async (docId: string) => {
    try {
      await api.delete(`/documents/${docId}`);
      toast.success("Documento removido!");
      setClientDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento.");
    }
  };

  const confirmDeleteDocument = () => {
    const target = docToDelete;
    if (!target) return;
    closeDeleteDocModal(() => {
      executeDeleteDocument(target.id);
    });
  };

  const executeDeleteClient = async (target: any) => {
    if (!target) return;
    try {
      await api.delete(`/clients/${target.id}`);
      toast.success("Cliente excluído com sucesso!");
      loadClients();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente.");
    }
  };

  const confirmDeleteClient = () => {
    const target = clientToDelete;
    if (!target) return;
    closeDeleteModal(() => {
      executeDeleteClient(target);
    });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseType) {
      toast.error("Selecione o tipo de processo.");
      return;
    }

    const formattedPhone = formatPhoneBr(phone);

    try {
      const payload = {
        name,
        age: age ? parseInt(age, 10) : null,
        phone: formattedPhone,
        email,
        profession,
        caseType,
        photoUrl,
      };

      const isEditing = Boolean(editingClientId);

      if (editingClientId) {
        const res = await api.patch(`/clients/${editingClientId}`, payload);
        const updatedRecord = {
          ...(res?.data && typeof res.data === "object" ? res.data : payload),
          id: editingClientId,
          phone: formatPhoneBr(res?.data?.phone || formattedPhone),
        };
        setClients((prev) =>
          prev.map((c) =>
            c.id === editingClientId ? { ...c, ...updatedRecord } : c,
          ),
        );
      } else {
        const res = await api.post("/clients", payload);
        const createdRecord = {
          ...(res?.data && typeof res.data === "object" ? res.data : payload),
          id: res?.data?.id || `temp-${Date.now()}`,
          phone: formatPhoneBr(res?.data?.phone || formattedPhone),
          lawsuits: res?.data?.lawsuits || [],
        };
        setClients((prev) => [createdRecord, ...prev]);
      }

      setPhone(formattedPhone);

      closeClientModal(() => {
        toast.success(
          isEditing
            ? "Cliente atualizado com sucesso!"
            : "Cliente cadastrado com sucesso!",
        );
        loadClients();
      });
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar dados no Neon DB.");
    }
  };

  const isHighlightedClient = (client: any) => {
    if (
      highlightedClientId &&
      String(client.id) === String(highlightedClientId)
    ) {
      return true;
    }
    if (
      highlightedClientName &&
      client.name?.toLowerCase().trim() ===
        highlightedClientName.toLowerCase().trim()
    ) {
      return true;
    }
    return false;
  };

  const filteredClients = clients
    .filter((client) => {
      const matchesName = client.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCase =
        selectedFilterCase === "ALL" || client.caseType === selectedFilterCase;
      return matchesName && matchesCase;
    })
    .sort((a, b) => {
      const aSelected = isHighlightedClient(a);
      const bSelected = isHighlightedClient(b);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  const fieldClass = `w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
    darkMode
      ? "bg-[#110d1b]/90 border-purple-400/15 text-slate-100 focus:border-purple-400/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
      : "bg-white/90 border-purple-200/90 text-slate-800 focus:border-purple-400 shadow-[inset_0_2px_6px_rgba(88,28,135,0.05)]"
  }`;

  const closeBtnClass = `flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-50 shrink-0 ${
    darkMode
      ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
      : "bg-purple-50 border-purple-200/70 text-slate-500 hover:text-slate-800 hover:bg-purple-100"
  }`;

  const modalCardBaseClass = `w-full p-4 sm:p-6 rounded-3xl border relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors ${
    darkMode
      ? "bg-gradient-to-b from-[#231b36] via-[#181226] to-[#120e1c] border-purple-400/25 text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_45px_-12px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]"
      : "bg-gradient-to-b from-white via-[#fcfaff] to-[#f4efff] border-purple-200/90 text-slate-800 shadow-[0_25px_65px_-15px_rgba(76,29,149,0.25),0_0_40px_-12px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]"
  }`;

  return (
    <div className="space-y-5 sm:space-y-6 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3
            className={`text-lg sm:text-xl font-bold ${darkMode ? "text-slate-100" : "text-slate-800"}`}
          >
            Carteira de Clientes
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-purple-300/60" : "text-purple-600/70"}`}
          >
            Gerenciamento de dados, contatos, documentos e processos dos
            clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all text-sm shrink-0"
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className={`flex-1 flex items-center gap-3 px-3.5 sm:px-4 py-2.5 rounded-xl border transition-colors min-w-0 ${
            darkMode
              ? "bg-[#161221]/80 border-[#2a2238]"
              : "bg-white border-purple-100 shadow-sm"
          }`}
        >
          <Search size={18} className="text-purple-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar cliente pelo nome..."
            className="w-full bg-transparent text-sm outline-none min-w-0"
          />
        </div>

        <LegalCaseSelect
          value={selectedFilterCase}
          onChange={setSelectedFilterCase}
          darkMode={darkMode}
          includeAllOption
          allOptionLabel="Todos os Processos"
          className="sm:w-64 shrink-0"
        />
      </div>

      {loading ? (
        <p className="text-center py-20 text-slate-400">
          Carregando clientes...
        </p>
      ) : filteredClients.length === 0 ? (
        <div
          className={`text-center py-16 sm:py-20 px-4 rounded-2xl border border-dashed ${
            darkMode
              ? "border-purple-900/40 text-slate-500"
              : "border-purple-200 text-slate-400"
          }`}
        >
          <Users
            size={44}
            className="mx-auto mb-3 opacity-40 text-purple-400"
          />
          <p className="text-sm">
            Nenhum cliente encontrado com esses critérios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClients.map((client) => {
            const displayPhone = client.phone
              ? formatPhoneBr(client.phone)
              : "";
            const isSelectedFromLawsuit = isHighlightedClient(client);

            return (
              <div
                key={client.id}
                className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-w-0 ${
                  isSelectedFromLawsuit
                    ? darkMode
                      ? "bg-[#1b152b]/95 border-purple-400 ring-2 ring-purple-500/40 shadow-xl shadow-purple-950/40"
                      : "bg-purple-50/50 border-purple-400 ring-2 ring-purple-300/60 shadow-lg shadow-purple-200/60"
                    : darkMode
                      ? "bg-[#161221]/80 border-[#2a2238] hover:border-purple-500/40 shadow-lg shadow-purple-950/20"
                      : "bg-white border-purple-100 hover:border-purple-300 shadow-md shadow-purple-100/50"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                      {client.photoUrl ? (
                        <img
                          src={client.photoUrl}
                          alt={client.name}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border border-purple-500/30 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${
                            darkMode
                              ? "bg-purple-950/60 text-purple-300 border border-purple-800/40"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          <User size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4
                            className={`font-bold text-base sm:text-lg truncate ${darkMode ? "text-slate-100" : "text-slate-800"}`}
                          >
                            {client.name}
                          </h4>
                          {isSelectedFromLawsuit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedClientId(null);
                                setHighlightedClientName("");
                              }}
                              title="Soltar seleção e remover foco"
                              className={`group/badge text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 cursor-pointer transition-all ${
                                darkMode
                                  ? "bg-purple-500/20 text-purple-300 border-purple-400/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-400/40"
                                  : "bg-purple-100 text-purple-700 border-purple-300 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300"
                              }`}
                            >
                              <span className="group-hover/badge:hidden">
                                Selecionado
                              </span>
                              <span className="hidden group-hover/badge:inline">
                                Soltar
                              </span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-purple-400/80 font-medium truncate">
                          {client.age ? `${client.age} anos` : ""}{" "}
                          {client.profession ? `• ${client.profession}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDocsModal(client)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          darkMode
                            ? "bg-[#1f192b] border-purple-900/40 text-purple-300 hover:bg-purple-900/40"
                            : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                        }`}
                        title="Documentos do Cliente (RG, CPF, Certidões, CTPS...)"
                        aria-label="Documentos do Cliente"
                      >
                        <FolderOpen size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(client)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          darkMode
                            ? "bg-[#1f192b] border-purple-900/40 text-purple-300 hover:bg-purple-900/40"
                            : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                        }`}
                        title="Editar Cliente"
                        aria-label="Editar Cliente"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientToDelete(client)}
                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Excluir Cliente"
                        aria-label="Excluir Cliente"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs sm:text-sm">
                    <div className="inline-block px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold mb-1">
                      {client.caseType}
                    </div>
                    {displayPhone && (
                      <div className="flex items-center gap-2.5 opacity-80 min-w-0">
                        <Phone size={15} className="text-purple-400 shrink-0" />
                        <span className="truncate">{displayPhone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2.5 opacity-80 min-w-0">
                        <Mail size={15} className="text-purple-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}

                    {client.lawsuits && client.lawsuits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-500/10 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                          Processos Vinculados:
                        </p>
                        {client.lawsuits.map((lawsuit: any) => (
                          <div
                            key={lawsuit.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs bg-purple-500/5 p-2 rounded-lg border border-purple-500/10"
                          >
                            <span
                              className="truncate min-w-0"
                              title={lawsuit.title}
                            >
                              {lawsuit.title}
                            </span>
                            {lawsuit.cnfNumber ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenProcessLink(lawsuit.cnfNumber)
                                }
                                className="self-start sm:self-center flex items-center gap-1 text-purple-400 hover:text-purple-300 font-mono text-[11px] underline shrink-0"
                                title="Consultar processo"
                              >
                                <span>{lawsuit.cnfNumber}</span>
                                <ExternalLink size={12} />
                              </button>
                            ) : (
                              <span className="self-start sm:self-center text-[10px] opacity-50 shrink-0">
                                Sem CNJ
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 pt-4 border-t border-purple-500/10 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 truncate">
                    {client.lawsuits?.length || 0} processo(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleWhatsApp(displayPhone)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shrink-0"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 3D MODERNO DE DOCUMENTOS DO CLIENTE */}
      {clientForDocs && (
        <div
          ref={docsBackdropRef}
          onClick={() => closeDocsModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={docsModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-2xl flex flex-col`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 mb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    darkMode
                      ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <FolderOpen size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    Pasta Digital do Cliente
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    Documentos de {clientForDocs.name}
                  </h3>
                  <p className="text-xs opacity-70 truncate">
                    RG, CPF, Certidões, CNIS, CTPS e outros documentos
                    jurídicos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDocsModal()}
                disabled={isClosingDocsModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleAddDocument}
              className={`relative z-10 p-3.5 sm:p-4 rounded-2xl border mb-4 space-y-3 ${
                darkMode
                  ? "bg-[#110d1b]/90 border-purple-400/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]"
                  : "bg-white/90 border-purple-100 shadow-[inset_0_2px_6px_rgba(88,28,135,0.06)]"
              }`}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                Adicionar Novo Documento
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Título (Ex: RG e CPF - Frente e Verso)"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className={fieldClass}
                />
                <div className="relative flex items-center min-w-0">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, true)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div
                    className={`${fieldClass} flex items-center justify-between gap-2 min-w-0`}
                  >
                    <span className="truncate">
                      {docFileUrl
                        ? "Arquivo selecionado ✓"
                        : "Selecionar PDF ou imagem..."}
                    </span>
                    <Upload size={16} className="text-purple-400 shrink-0" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]"
                >
                  Enviar Documento
                </button>
              </div>
            </form>

            <div className="relative z-10 flex-1 overflow-y-auto space-y-2 pr-0.5 sm:pr-1">
              {clientDocuments.length === 0 ? (
                <p className="text-center py-10 text-xs opacity-50">
                  Nenhum documento anexado para este cliente ainda.
                </p>
              ) : (
                clientDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                      darkMode
                        ? "bg-[#110d1b]/75 border-purple-400/15"
                        : "bg-white/85 border-purple-100"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm truncate">
                          {doc.title}
                        </h5>
                        <p className="text-[10px] opacity-60">
                          Enviado em{" "}
                          {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDocument(doc)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                          darkMode
                            ? "bg-white/5 border-white/10 text-purple-300 hover:bg-white/10"
                            : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                        }`}
                        title="Baixar documento"
                      >
                        <Download size={14} />
                        <span className="sm:hidden">Baixar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Excluir documento"
                        aria-label="Excluir documento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CRIAR / EDITAR CLIENTE */}
      {isModalOpen && (
        <div
          ref={clientBackdropRef}
          onClick={() => closeClientModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={clientModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-lg`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full bg-gradient-to-r from-purple-500/25 via-indigo-500/25 to-fuchsia-500/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    darkMode
                      ? "bg-gradient-to-br from-purple-500/25 to-indigo-600/20 border-purple-400/30 text-purple-300 shadow-[0_10px_20px_-6px_rgba(139,92,246,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-purple-300/80 text-purple-700 shadow-[0_10px_20px_-6px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <UserPlus size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 truncate">
                    Cadastro de Cliente
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight truncate bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                    {editingClientId ? "Editar Cliente" : "Novo Cliente"}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeClientModal()}
                disabled={isClosingClientModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveClient}
              className="relative z-10 space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Aparecida Silva"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Idade
                  </label>
                  <StyledSelect
                    value={age}
                    onChange={setAge}
                    options={ageSelectOptions}
                    darkMode={darkMode}
                    placeholder="Selecionar idade"
                    headerTitle="Faixa Etária"
                    headerIcon={<Calendar size={13} />}
                    searchable
                    searchPlaceholder="Digitar idade..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                    placeholder="(12) 99999-9999"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex: Aposentado, Autônomo"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Tipo de Processo *
                  </label>
                  <LegalCaseSelect
                    value={caseType}
                    onChange={setCaseType}
                    darkMode={darkMode}
                    placeholder="Selecionar tipo de processo"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-75">
                    Foto do Cliente
                  </label>
                  <div className="relative flex items-center min-w-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, false)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div
                      className={`${fieldClass} flex items-center justify-between gap-2 min-w-0`}
                    >
                      <span className="truncate">
                        {photoUrl ? "Foto selecionada ✓" : "Escolher foto..."}
                      </span>
                      <Upload size={16} className="text-purple-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-500/15">
                <button
                  type="button"
                  onClick={() => closeClientModal()}
                  disabled={isClosingClientModal}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                    darkMode
                      ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isClosingClientModal}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]"
                >
                  {editingClientId ? "Salvar Alterações" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO DE EXCLUSÃO DE CLIENTE */}
      {clientToDelete && (
        <div
          ref={deleteBackdropRef}
          onClick={() => closeDeleteModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={deleteModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-md space-y-4`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-rose-500/20 via-red-500/20 to-purple-500/15 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    darkMode
                      ? "bg-gradient-to-br from-rose-500/25 to-red-600/15 border-rose-400/30 text-rose-300 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-rose-500/15 to-red-500/10 border-rose-300/70 text-rose-600 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400 truncate">
                    Ação Irreversível
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                    Excluir Cliente
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDeleteModal()}
                disabled={isClosingDeleteModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <p className="relative z-10 text-xs sm:text-sm opacity-80 leading-relaxed break-words">
              Tem certeza que deseja excluir{" "}
              <strong className="text-purple-300">{clientToDelete.name}</strong>
              ? Esta ação removerá os dados cadastrados do cliente.
            </p>

            <div className="relative z-10 grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => closeDeleteModal()}
                disabled={isClosingDeleteModal}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                disabled={isClosingDeleteModal}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3D MODERNO DE CONFIRMAÇÃO DE EXCLUSÃO DE DOCUMENTO */}
      {docToDelete && (
        <div
          ref={deleteDocBackdropRef}
          onClick={() => closeDeleteDocModal()}
          style={{ perspective: "1000px" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <div
            ref={deleteDocModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`${modalCardBaseClass} max-w-md space-y-4`}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-gradient-to-r from-rose-500/20 via-red-500/20 to-purple-500/15 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    darkMode
                      ? "bg-gradient-to-br from-rose-500/25 to-red-600/15 border-rose-400/30 text-rose-300 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "bg-gradient-to-br from-rose-500/15 to-red-500/10 border-rose-300/70 text-rose-600 shadow-[0_10px_20px_-6px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.85)]"
                  }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400 truncate">
                    Remover Anexo
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                    Excluir Documento
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDeleteDocModal()}
                disabled={isClosingDeleteDocModal}
                className={closeBtnClass}
              >
                <X size={16} />
              </button>
            </div>

            <p className="relative z-10 text-xs sm:text-sm opacity-80 leading-relaxed break-words">
              Deseja realmente remover o documento{" "}
              <strong className="text-purple-300">{docToDelete.title}</strong>?
            </p>

            <div className="relative z-10 grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => closeDeleteDocModal()}
                disabled={isClosingDeleteDocModal}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all disabled:opacity-50 ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    : "bg-purple-50/70 border-purple-200/80 text-slate-700 hover:bg-purple-100"
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteDocument}
                disabled={isClosingDeleteDocModal}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_25px_-5px_rgba(225,29,72,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
