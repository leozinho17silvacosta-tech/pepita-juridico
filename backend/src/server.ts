import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { sendDailyOfficeDigest } from "./services/emailAlertService.js";
import { activatePepitaProForUser } from "./services/pepitaPlanService.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const ai = new GoogleGenAI();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "jurispainel-secret-change-in-env";

const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
const mpClient = mpAccessToken
  ? new MercadoPagoConfig({ accessToken: mpAccessToken })
  : null;

const PEPITA_PRO_AMOUNT = 49.9;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const isPublicUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const isHttpOrHttps =
      parsed.protocol === "http:" || parsed.protocol === "https:";
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return isHttpOrHttps && !isLocal;
  } catch {
    return false;
  }
};

const webhookUrl = isPublicUrl(`${BACKEND_URL}/api/pepita/mp/webhook`)
  ? `${BACKEND_URL}/api/pepita/mp/webhook`
  : undefined;

const extractUserIdFromReference = (ref?: string | null): string | null => {
  if (!ref) return null;
  const [userId] = String(ref).split("|");
  return userId ? userId.trim() : null;
};

interface AuthRequest extends Request {
  userId?: string;
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO JWT
// ==========================================
const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Token de autenticação não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
};

// ==========================================
// 0. ROTAS DE AUTENTICAÇÃO (LOGIN / REGISTER)
// ==========================================
const handleRegister = async (req: Request, res: Response) => {
  try {
    const { name, email, password, oab } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nome, e-mail e senha são obrigatórios." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Já existe uma conta cadastrada com este e-mail." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        oab: oab?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        oab: true,
        plan: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error("Erro no registro:", error);
    return res.status(500).json({ error: "Erro ao criar conta." });
  }
};

const handleLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Informe e-mail e senha para entrar." });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        oab: user.oab,
        plan: user.plan,
      },
      token,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: "Erro ao realizar login." });
  }
};

const handleMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, oab: true, plan: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    return res.json({ user });
  } catch {
    return res.status(500).json({ error: "Erro ao buscar usuário." });
  }
};

app.post("/api/auth/register", handleRegister);
app.post("/auth/register", handleRegister);
app.post("/api/auth/login", handleLogin);
app.post("/auth/login", handleLogin);
app.get("/api/auth/me", requireAuth, handleMe);
app.get("/auth/me", requireAuth, handleMe);

// ==========================================
// 1. ROTA DE TESTE & ALERTAS POR E-MAIL
// ==========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API do Sistema Jurídico rodando com sucesso!",
  });
});

const handleTestDailyAlert = async (req: Request, res: Response) => {
  const secret = req.headers["x-cron-secret"];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    const results = await sendDailyOfficeDigest();
    return res.json({ ok: true, results });
  } catch (error) {
    console.error("Erro ao testar alerta diário por e-mail:", error);
    return res
      .status(500)
      .json({ ok: false, error: "Erro ao enviar e-mail de alerta." });
  }
};

app.post("/api/alerts/test-daily", handleTestDailyAlert);
app.post("/alerts/test-daily", handleTestDailyAlert);

// ==========================================
// 2. ROTAS DE CLIENTES
// ==========================================
const getClientsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      include: { lawsuits: true, appointments: true, documents: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar clientes." });
  }
};

const createClientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      age,
      photoUrl,
      phone,
      email,
      address,
      cpf,
      rg,
      maritalStatus,
      profession,
      caseType,
      feeStatus,
      feeValue,
    } = req.body;

    const newClient = await prisma.client.create({
      data: {
        name,
        age: age ? Number(age) : null,
        photoUrl,
        phone,
        email,
        address,
        cpf,
        rg,
        maritalStatus,
        profession,
        caseType,
        feeStatus: feeStatus || "PENDING",
        feeValue: feeValue ? Number(feeValue) : null,
        userId: req.userId!,
      },
    });
    res.status(201).json(newClient);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ error: "Erro ao criar cliente." });
  }
};

const patchClientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.client.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    const {
      name,
      age,
      photoUrl,
      phone,
      email,
      address,
      cpf,
      rg,
      maritalStatus,
      profession,
      caseType,
      feeStatus,
      feeValue,
    } = req.body;

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: {
        ...(name && { name }),
        ...(age !== undefined && { age: age ? Number(age) : null }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(cpf !== undefined && { cpf }),
        ...(rg !== undefined && { rg }),
        ...(maritalStatus !== undefined && { maritalStatus }),
        ...(profession !== undefined && { profession }),
        ...(caseType && { caseType }),
        ...(feeStatus !== undefined && { feeStatus }),
        ...(feeValue !== undefined && {
          feeValue: feeValue ? Number(feeValue) : null,
        }),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ error: "Erro ao atualizar cliente." });
  }
};

const putClientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.client.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    const { userId, id: _id, ...safeData } = req.body;
    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: safeData,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar cliente." });
  }
};

const deleteClientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.client.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    await prisma.client.delete({
      where: { id: existing.id },
    });
    res.status(200).json({ message: "Cliente excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    res.status(500).json({ error: "Erro ao excluir cliente." });
  }
};

app.get("/api/clients", requireAuth, getClientsHandler);
app.get("/clients", requireAuth, getClientsHandler);
app.post("/api/clients", requireAuth, createClientHandler);
app.post("/clients", requireAuth, createClientHandler);
app.patch("/api/clients/:id", requireAuth, patchClientHandler);
app.patch("/clients/:id", requireAuth, patchClientHandler);
app.put("/api/clients/:id", requireAuth, putClientHandler);
app.put("/clients/:id", requireAuth, putClientHandler);
app.delete("/api/clients/:id", requireAuth, deleteClientHandler);
app.delete("/clients/:id", requireAuth, deleteClientHandler);

// ==========================================
// 3. ROTAS DE DOCUMENTOS DO CLIENTE
// ==========================================
const getDocumentsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = String(req.params.clientId);
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    });
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    const docs = await prisma.document.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar documentos." });
  }
};

const createDocumentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = String(req.params.clientId);
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
    });
    if (!client) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    const { title, fileUrl } = req.body;
    const newDoc = await prisma.document.create({
      data: { title, fileUrl, clientId },
    });
    res.status(201).json(newDoc);
  } catch (error) {
    console.error("Erro ao salvar documento:", error);
    res.status(500).json({ error: "Erro ao salvar documento." });
  }
};

const deleteDocumentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const doc = await prisma.document.findFirst({
      where: { id, client: { userId: req.userId } },
    });
    if (!doc) {
      return res.status(404).json({ error: "Documento não encontrado." });
    }

    await prisma.document.delete({ where: { id: doc.id } });
    res.status(200).json({ message: "Documento excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir documento:", error);
    res.status(500).json({ error: "Erro ao excluir documento." });
  }
};

app.get("/api/clients/:clientId/documents", requireAuth, getDocumentsHandler);
app.get("/clients/:clientId/documents", requireAuth, getDocumentsHandler);
app.post(
  "/api/clients/:clientId/documents",
  requireAuth,
  createDocumentHandler,
);
app.post("/clients/:clientId/documents", requireAuth, createDocumentHandler);
app.delete("/api/documents/:id", requireAuth, deleteDocumentHandler);
app.delete("/documents/:id", requireAuth, deleteDocumentHandler);

// ==========================================
// 4. ROTAS DE PROCESSOS & PRAZOS
// ==========================================
const getLawsuitsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const lawsuits = await prisma.lawsuit.findMany({
      where: { userId: req.userId },
      include: { client: true, updates: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(lawsuits);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar processos." });
  }
};

const createLawsuitHandler = async (req: AuthRequest, res: Response) => {
  try {
    const {
      cnfNumber,
      title,
      area,
      description,
      status,
      priority,
      deadlineDate,
      clientId,
    } = req.body;

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: req.userId },
      });
      if (!client) {
        return res.status(400).json({ error: "Cliente inválido." });
      }
    }

    const newLawsuit = await prisma.lawsuit.create({
      data: {
        cnfNumber,
        title,
        area,
        description,
        status: status || "PENDING",
        priority: priority || "MODERATE",
        deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
        clientId,
        userId: req.userId!,
      },
      include: { client: true, updates: true },
    });
    res.status(201).json(newLawsuit);
  } catch (error) {
    console.error("Erro ao criar processo:", error);
    res.status(500).json({ error: "Erro ao criar processo." });
  }
};

const patchLawsuitHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lawsuit.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Processo não encontrado." });
    }

    const { status, priority, deadlineDate, title, description } = req.body;
    const updated = await prisma.lawsuit.update({
      where: { id: existing.id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(deadlineDate !== undefined && {
          deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
        }),
      },
      include: { client: true, updates: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar processo." });
  }
};

const createLawsuitUpdateHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lawsuit.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Processo não encontrado." });
    }

    const { title, description } = req.body;
    const update = await prisma.lawsuitUpdate.create({
      data: { title, description, lawsuitId: existing.id },
    });
    res.status(201).json(update);
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar andamento." });
  }
};

const deleteLawsuitHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.lawsuit.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Processo não encontrado." });
    }

    await prisma.lawsuit.delete({ where: { id: existing.id } });
    res.status(200).json({ message: "Processo excluído com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir processo." });
  }
};

app.get("/api/lawsuits", requireAuth, getLawsuitsHandler);
app.get("/lawsuits", requireAuth, getLawsuitsHandler);
app.post("/api/lawsuits", requireAuth, createLawsuitHandler);
app.post("/lawsuits", requireAuth, createLawsuitHandler);
app.patch("/api/lawsuits/:id", requireAuth, patchLawsuitHandler);
app.patch("/lawsuits/:id", requireAuth, patchLawsuitHandler);
app.post("/api/lawsuits/:id/updates", requireAuth, createLawsuitUpdateHandler);
app.post("/lawsuits/:id/updates", requireAuth, createLawsuitUpdateHandler);
app.delete("/api/lawsuits/:id", requireAuth, deleteLawsuitHandler);
app.delete("/lawsuits/:id", requireAuth, deleteLawsuitHandler);

// ==========================================
// 5. ROTA DA PEPITA (ASSISTENTE IA)
// ==========================================
interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const listPepitaModelsHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const pager = await ai.models.list();
    const models: string[] = [];
    for await (const m of pager) {
      if (m.name) {
        models.push(m.name.replace("models/", ""));
      }
    }
    return res.json({ models });
  } catch (err: any) {
    console.error("Erro ao listar modelos Gemini:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Erro ao listar modelos disponíveis." });
  }
};

app.get("/api/pepita/models", requireAuth, listPepitaModelsHandler);
app.get("/pepita/models", requireAuth, listPepitaModelsHandler);

const pepitaChatHandler = async (req: AuthRequest, res: Response) => {
  const perAttemptTimeoutMs = 10000;
  const maxTotalMs = 45000;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const isTransientUnavailable = (err: any) => {
    const code = err?.status || err?.code || err?.error?.code;
    const statusText = String(
      err?.status || err?.error?.status || "",
    ).toUpperCase();
    const msg = String(err?.error?.message || err?.message || "").toLowerCase();

    return (
      code === 503 ||
      code === 429 ||
      code === 500 ||
      statusText === "UNAVAILABLE" ||
      statusText === "INTERNAL" ||
      err?.name === "TimeoutError" ||
      err?.name === "AbortError" ||
      msg.includes("high demand") ||
      msg.includes("unavailable") ||
      msg.includes("overloaded") ||
      msg.includes("aborted") ||
      msg.includes("timeout")
    );
  };

  try {
    const { prompt, clientContext, history } = req.body as {
      prompt?: string;
      clientContext?: string;
      history?: ChatTurn[];
    };

    if (!prompt || !String(prompt).trim()) {
      return res
        .status(400)
        .json({ error: "Digite uma pergunta para a Pepita." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: "GEMINI_API_KEY não configurada no .env." });
    }

    const [user, lawsuits, appointments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true, oab: true, plan: true },
      }),
      prisma.lawsuit.findMany({
        where: { userId: req.userId, status: "PENDING" },
        include: { client: { select: { name: true, caseType: true } } },
        orderBy: { deadlineDate: "asc" },
        take: 15,
      }),
      prisma.appointment.findMany({
        where: { userId: req.userId, completed: false },
        include: { client: { select: { name: true } } },
        orderBy: { date: "asc" },
        take: 10,
      }),
    ]);

    const TIMEZONE = "America/Sao_Paulo";
    const now = new Date();

    const todayFormatted = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

    const formatDeadlineDate = (dateInput: Date | string) => {
      const d = new Date(dateInput);
      const utcYear = d.getUTCFullYear();
      const utcMonth = d.getUTCMonth();
      const utcDay = d.getUTCDate();
      const safeLocalDate = new Date(utcYear, utcMonth, utcDay, 12, 0, 0);

      const formatted = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(safeLocalDate);

      const todayParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
      const [ty, tm, td] = todayParts.split("-").map(Number);
      const todayMid = Date.UTC(ty, tm - 1, td);
      const targetMid = Date.UTC(utcYear, utcMonth, utcDay);
      const diffDays = Math.round(
        (targetMid - todayMid) / (1000 * 60 * 60 * 24),
      );

      let relativeLabel = "";
      if (diffDays < 0) {
        relativeLabel = `ATRASADO há ${Math.abs(diffDays)} dia(s)`;
      } else if (diffDays === 0) {
        relativeLabel = "VENCE HOJE";
      } else if (diffDays === 1) {
        relativeLabel = "VENCE AMANHÃ";
      } else {
        relativeLabel = `faltam ${diffDays} dias`;
      }

      return `${formatted} (${relativeLabel})`;
    };

    const formatAppointmentDate = (dateInput: Date | string) => {
      const d = new Date(dateInput);
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: TIMEZONE,
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    };

    const deadlinesSummary = lawsuits
      .filter((l) => l.deadlineDate)
      .map(
        (l) =>
          `- [${l.priority}] ${l.title} (${l.area}) | Cliente: ${l.client?.name || "Sem cliente"} | Prazo: ${formatDeadlineDate(l.deadlineDate!)} | Proc: ${l.cnfNumber || "N/A"}`,
      )
      .join("\n");

    const appointmentsSummary = appointments
      .map(
        (a) =>
          `- ${a.title} | Quando: ${formatAppointmentDate(a.date)} | Cliente: ${a.client?.name || "Geral"}`,
      )
      .join("\n");

    const isPro = user?.plan === "PRO";
    const candidateModels = isPro
      ? [
          "gemini-3.8-flash",
          "gemini-3.7-flash",
          "gemma-4-31b-it",
          "gemini-3.5-flash",
        ]
      : [
          "gemini-3.8-flash",
          "gemini-3.7-flash",
          "gemini-3.5-flash",
          "gemini-3.1-flash-lite",
        ];

    const systemInstruction = `Você é a "Pepita", uma assistente jurídica sênior no painel de ${user?.name || "Advogado(a)"}${user?.oab ? ` (OAB: ${user.oab})` : ""}.
Modo atual: ${isPro ? "PEPITA PRO (análise aprofundada, minutas, teses e estratégia completa)" : "PEPITA ESSENCIAL (respostas objetivas, prazos, consultas e orientações rápidas)"}.

DATA E HORA ATUAL DE REFERÊNCIA (Brasília): ${todayFormatted}.
Regras rígidas sobre datas:
- Use EXCLUSIVAMENTE as datas, dias da semana e contagens de dias fornecidas abaixo.
- Nunca recalcule nem altere o dia da semana ou a data informada nos registros.
- Responda de forma clara, prática, técnica e alinhada ao direito brasileiro, ao Código de Processo Civil (CPC) e às normas da OAB. Nunca invente andamentos ou números de processo.

Diretrizes de formatação:
- Use estrutura limpa, escaneável e elegante, adequada para leitura em chat.
- Evite usar títulos gigantes (###) em excesso ou muitas linhas "---" seguidas.
- Prefira blocos curtos com tópicos claros, datas e status em **negrito**, e destaque pontos urgentes com 🚨 e lembretes com 💡.

Contexto específico informado na tela:
${clientContext || "Nenhum cliente ou caso específico selecionado."}

Prazos e processos pendentes do escritório:
${deadlinesSummary || "Nenhum prazo pendente cadastrado."}

Próximas consultas / compromissos:
${appointmentsSummary || "Nenhuma consulta pendente."}`;

    const formattedHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "model") &&
              typeof item.text === "string" &&
              item.text.trim().length > 0,
          )
          .slice(-10)
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.text }],
          }))
      : [];

    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: String(prompt).trim() }],
      },
    ];

    const callOnce = async (modelName: string) => {
      return ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: isPro ? 0.3 : 0.35,
          maxOutputTokens: isPro ? 1800 : 1000,
          abortSignal: AbortSignal.timeout(perAttemptTimeoutMs),
        },
      });
    };

    const start = Date.now();
    let modelUsed = candidateModels[0];
    let response: any = null;
    let lastError: any = null;

    for (const candidate of candidateModels) {
      if (Date.now() - start > maxTotalMs) {
        console.log(
          "Pepita: orçamento de tempo da requisição atingido, encerrando cascata.",
        );
        break;
      }

      try {
        console.log(
          `Pepita (${candidate}): enviando conversa para o Gemini...`,
        );
        response = await callOnce(candidate);
        modelUsed = candidate;
        break;
      } catch (err: any) {
        lastError = err;
        const code = err?.status || err?.code || err?.error?.code;
        const isNotFound = code === 404;

        if (isTransientUnavailable(err) || isNotFound) {
          console.log(
            `Pepita: ${candidate} indisponível (${code || err?.name || "erro"}), tentando próximo modelo...`,
          );
          await sleep(250);
          continue;
        }

        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error("Nenhum modelo disponível respondeu.");
    }

    const elapsedMs = Date.now() - start;
    console.log(`Pepita: concluído com ${modelUsed} em ${elapsedMs}ms`);

    if (res.headersSent) {
      return;
    }

    const replyText = (response?.text || "").trim();

    if (!replyText) {
      return res.status(502).json({
        error: "A IA não retornou texto na resposta.",
        details: "Resposta vazia retornada pelo modelo Gemini.",
      });
    }

    return res.json({
      reply: replyText,
      modelUsed,
      plan: isPro ? "PRO" : "FREE",
    });
  } catch (error: any) {
    console.error("Erro na IA Pepita:", error);

    if (res.headersSent) {
      return;
    }

    const apiMessage =
      error?.error?.message ||
      error?.message ||
      "Erro ao processar a solicitação com a Pepita.";

    const transient = isTransientUnavailable(error);

    return res.status(transient ? 503 : 500).json({
      error: transient
        ? "O servidor de IA está com alta demanda no momento. Clique em 'Tentar novamente' em instantes."
        : "Erro ao processar a solicitação com a Pepita.",
      details: apiMessage,
    });
  }
};

app.post("/api/pepita/chat", requireAuth, pepitaChatHandler);
app.post("/pepita/chat", requireAuth, pepitaChatHandler);

// ==========================================
// 5.1 HISTÓRICO DE CONVERSAS DA PEPITA
// ==========================================
const getPepitaChatsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const chats = await prisma.pepitaChat.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    return res.json(chats);
  } catch (error) {
    console.error("Erro ao buscar chats da Pepita:", error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar histórico de conversas." });
  }
};

const savePepitaChatHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id, title, messages } = req.body as {
      id?: string;
      title?: string;
      messages?: Array<{
        id?: string;
        role: "user" | "model";
        text: string;
        modelUsed?: string;
      }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: "A conversa precisa ter ao menos uma mensagem." });
    }

    const firstUserMsg =
      messages.find((m) => m.role === "user")?.text?.trim() || "Nova conversa";
    const computedTitle =
      (title && title.trim()) ||
      (firstUserMsg.length > 45
        ? `${firstUserMsg.slice(0, 45)}...`
        : firstUserMsg);

    if (id) {
      const chatId = String(id);
      const existing = await prisma.pepitaChat.findFirst({
        where: { id: chatId, userId: req.userId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Conversa não encontrada." });
      }

      const updated = await prisma.pepitaChat.update({
        where: { id: existing.id },
        data: {
          title: computedTitle,
          messages,
        },
      });

      return res.json(updated);
    }

    const created = await prisma.pepitaChat.create({
      data: {
        title: computedTitle,
        messages,
        userId: req.userId!,
      },
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error("Erro ao salvar chat da Pepita:", error);
    return res
      .status(500)
      .json({ error: "Erro ao salvar conversa da Pepita." });
  }
};

const deletePepitaChatHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.pepitaChat.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Conversa não encontrada." });
    }

    await prisma.pepitaChat.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir chat da Pepita:", error);
    return res.status(500).json({ error: "Erro ao excluir conversa." });
  }
};

app.get("/api/pepita/chats", requireAuth, getPepitaChatsHandler);
app.get("/pepita/chats", requireAuth, getPepitaChatsHandler);
app.post("/api/pepita/chats", requireAuth, savePepitaChatHandler);
app.post("/pepita/chats", requireAuth, savePepitaChatHandler);
app.delete("/api/pepita/chats/:id", requireAuth, deletePepitaChatHandler);
app.delete("/pepita/chats/:id", requireAuth, deletePepitaChatHandler);

// ==========================================
// 5.2 PAGAMENTOS MERCADO PAGO (CARTÃO & PIX)
// ==========================================
const createMpCardCheckoutHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!mpClient) {
      return res.status(500).json({
        error: "MERCADOPAGO_ACCESS_TOKEN não configurado no .env.",
      });
    }

    const { email } = req.body as { email?: string };
    const preference = new Preference(mpClient);

    const result = await preference.create({
      body: {
        items: [
          {
            id: "pepita-pro-mensal",
            title: "Pepita Pro - Assinatura Mensal (Assistente Jurídica IA)",
            quantity: 1,
            currency_id: "BRL",
            unit_price: PEPITA_PRO_AMOUNT,
          },
        ],
        payer: email ? { email: email.trim() } : undefined,
        external_reference: `${req.userId}|PEPITA_PRO`,
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }],
          installments: 1,
        },
        ...(isPublicUrl(FRONTEND_URL)
          ? {
              back_urls: {
                success: `${FRONTEND_URL}?pepita_pro=success`,
                failure: `${FRONTEND_URL}?pepita_pro=failure`,
                pending: `${FRONTEND_URL}?pepita_pro=pending`,
              },
              auto_return: "approved",
            }
          : {}),
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      },
    });

    return res.json({
      checkoutUrl: result.init_point || result.sandbox_init_point,
      preferenceId: result.id,
    });
  } catch (error: any) {
    console.error("Erro ao criar checkout cartão Mercado Pago:", error);
    return res.status(500).json({
      error:
        error?.message || "Erro ao gerar checkout de cartão no Mercado Pago.",
    });
  }
};

const createMpPixHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!mpClient) {
      return res.status(500).json({
        error: "MERCADOPAGO_ACCESS_TOKEN não configurado no .env.",
      });
    }

    const { email } = req.body as { email?: string };
    const payerEmail = (email || "").trim() || "cliente@escritorio.com.br";

    const payment = new Payment(mpClient);
    const created = await payment.create({
      body: {
        transaction_amount: PEPITA_PRO_AMOUNT,
        description: "Pepita Pro - Assinatura Mensal",
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
        },
        external_reference: `${req.userId}|PEPITA_PRO`,
        ...(webhookUrl ? { notification_url: webhookUrl } : {}),
      },
    });

    const txData = created.point_of_interaction?.transaction_data;

    return res.json({
      paymentId: created.id,
      status: created.status,
      qrCode: txData?.qr_code || "",
      qrCodeBase64: txData?.qr_code_base64 || "",
      ticketUrl: txData?.ticket_url || "",
    });
  } catch (error: any) {
    console.error("Erro ao gerar Pix QR Code Mercado Pago:", error);
    return res.status(500).json({
      error: error?.message || "Erro ao gerar Pix QR Code no Mercado Pago.",
    });
  }
};

const getMpPaymentStatusHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!mpClient) {
      return res.status(500).json({
        error: "MERCADOPAGO_ACCESS_TOKEN não configurado no .env.",
      });
    }

    const paymentId = String(req.params.paymentId);
    const payment = new Payment(mpClient);
    const info = await payment.get({ id: paymentId });
    const approved = info.status === "approved";

    const targetUserId =
      extractUserIdFromReference(info.external_reference) || req.userId || null;

    if (approved && targetUserId) {
      await activatePepitaProForUser(targetUserId);
    }

    return res.json({
      paymentId: info.id,
      status: info.status,
      approved,
      plan: approved ? "PRO" : "FREE",
    });
  } catch (error: any) {
    console.error("Erro ao consultar pagamento Mercado Pago:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao verificar pagamento." });
  }
};

const mpWebhookHandler = async (req: Request, res: Response) => {
  try {
    const topic = req.query.type || req.query.topic || req.body?.type;
    const paymentId =
      req.query["data.id"] || req.query.id || req.body?.data?.id;

    if (topic === "payment" && paymentId && mpClient) {
      const payment = new Payment(mpClient);
      const info = await payment.get({ id: String(paymentId) });

      if (info.status === "approved") {
        const userId = extractUserIdFromReference(info.external_reference);
        if (userId) {
          await activatePepitaProForUser(userId);
          console.log(
            `Plano Pepita PRO ativado via webhook para usuário ${userId} (pagamento ${info.id}).`,
          );
        } else {
          console.log(
            `Pagamento Pepita Pro aprovado no Mercado Pago: ${info.id} | ref: ${info.external_reference}`,
          );
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Erro no webhook do Mercado Pago:", error);
    return res.status(200).send("OK");
  }
};

app.post("/api/pepita/mp/checkout", requireAuth, createMpCardCheckoutHandler);
app.post("/pepita/mp/checkout", requireAuth, createMpCardCheckoutHandler);
app.post("/api/pepita/mp/pix", requireAuth, createMpPixHandler);
app.post("/pepita/mp/pix", requireAuth, createMpPixHandler);
app.get(
  "/api/pepita/mp/payment/:paymentId",
  requireAuth,
  getMpPaymentStatusHandler,
);
app.get(
  "/pepita/mp/payment/:paymentId",
  requireAuth,
  getMpPaymentStatusHandler,
);
app.post("/api/pepita/mp/webhook", mpWebhookHandler);
app.post("/pepita/mp/webhook", mpWebhookHandler);

// ==========================================
// 6. ROTAS DA AGENDA / CONSULTAS
// ==========================================
const getAppointmentsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.userId },
      include: { client: true },
      orderBy: { date: "asc" },
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar agenda." });
  }
};

const createAppointmentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { title, date, type, notes, priority, clientId } = req.body;

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: req.userId },
      });
      if (!client) {
        return res.status(400).json({ error: "Cliente inválido." });
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        date: new Date(date),
        type: type || "PRESENTIAL",
        notes,
        priority: priority || "MODERATE",
        clientId: clientId || null,
        userId: req.userId!,
      },
      include: { client: true },
    });
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar consulta." });
  }
};

const patchAppointmentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.appointment.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Consulta não encontrada." });
    }

    const { notes, completed, priority, date, title } = req.body;
    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(completed !== undefined && { completed }),
        ...(priority && { priority }),
        ...(title && { title }),
        ...(date && { date: new Date(date) }),
      },
      include: { client: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar consulta." });
  }
};

const deleteAppointmentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.appointment.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Consulta não encontrada." });
    }

    await prisma.appointment.delete({ where: { id: existing.id } });
    res.status(200).json({ message: "Consulta excluída com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir consulta:", error);
    res.status(500).json({ error: "Erro ao excluir consulta." });
  }
};

app.get("/api/appointments", requireAuth, getAppointmentsHandler);
app.get("/appointments", requireAuth, getAppointmentsHandler);
app.post("/api/appointments", requireAuth, createAppointmentHandler);
app.post("/appointments", requireAuth, createAppointmentHandler);
app.patch("/api/appointments/:id", requireAuth, patchAppointmentHandler);
app.patch("/appointments/:id", requireAuth, patchAppointmentHandler);
app.delete("/api/appointments/:id", requireAuth, deleteAppointmentHandler);
app.delete("/appointments/:id", requireAuth, deleteAppointmentHandler);

// ==========================================
// 7. AGENDAMENTO AUTOMÁTICO DIÁRIO (CRON)
// ==========================================
cron.schedule(
  "0 8 * * *",
  async () => {
    console.log("[CRON] Executando resumo diário por e-mail...");
    try {
      const results = await sendDailyOfficeDigest();
      console.log("[CRON] Resultado:", results);
    } catch (error) {
      console.error("[CRON] Erro no resumo diário:", error);
    }
  },
  { timezone: "America/Sao_Paulo" },
);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
