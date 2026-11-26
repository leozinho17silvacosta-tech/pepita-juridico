import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import {
  requireAuth,
  type AuthRequest,
} from "../middlewares/authMiddleware.js";

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// ================= CLIENTES =================
router.get("/clients", async (req: AuthRequest, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      include: { lawsuits: true, appointments: true, documents: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar clientes." });
  }
});

router.post("/clients", async (req: AuthRequest, res) => {
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
      area,
      feeStatus,
      feeValue,
    } = req.body;

    const client = await prisma.client.create({
      data: {
        name,
        age: age ? Number(age) : null,
        photoUrl: photoUrl || null,
        phone,
        email: email || null,
        address: address || null,
        cpf: cpf || null,
        rg: rg || null,
        maritalStatus: maritalStatus || null,
        profession: profession || null,
        caseType: caseType || area || "Reclamação Trabalhista",
        feeStatus: feeStatus || "PENDING",
        feeValue: feeValue ? Number(feeValue) : null,
        userId: req.userId!,
      },
    });
    res.status(201).json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar cliente." });
  }
});

router.delete("/clients/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }
    await prisma.client.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir cliente." });
  }
});

// ================= PROCESSOS & PRAZOS =================
router.get("/lawsuits", async (req: AuthRequest, res) => {
  try {
    const lawsuits = await prisma.lawsuit.findMany({
      where: { userId: req.userId },
      include: { client: true, updates: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(lawsuits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar processos e prazos." });
  }
});

router.post("/lawsuits", async (req: AuthRequest, res) => {
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

    const lawsuit = await prisma.lawsuit.create({
      data: {
        cnfNumber: cnfNumber || null,
        title,
        area: area || "Direito do Trabalho",
        description: description || null,
        status: status || "PENDING",
        priority: priority || "MODERATE",
        deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
        clientId: clientId || "",
        userId: req.userId!,
      },
      include: { client: true, updates: true },
    });

    res.status(201).json(lawsuit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar processo ou prazo." });
  }
});

router.patch("/lawsuits/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.lawsuit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    const { status, priority, deadlineDate, title, description, area } =
      req.body;

    const updated = await prisma.lawsuit.update({
      where: { id: existing.id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(title && { title }),
        ...(area && { area }),
        ...(description !== undefined && { description }),
        ...(deadlineDate !== undefined && {
          deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
        }),
      },
      include: { client: true, updates: true },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar registro." });
  }
});

router.delete("/lawsuits/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.lawsuit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    await prisma.lawsuit.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir registro." });
  }
});

// ================= CONSULTAS =================
router.get("/appointments", async (req: AuthRequest, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.userId },
      include: { client: true },
      orderBy: { date: "asc" },
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar consultas." });
  }
});

router.post("/appointments", async (req: AuthRequest, res) => {
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
        notes: notes || null,
        priority: priority || "MODERATE",
        clientId: clientId || null,
        userId: req.userId!,
      },
      include: { client: true },
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao agendar consulta." });
  }
});

router.delete("/appointments/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Consulta não encontrada." });
    }

    await prisma.appointment.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir consulta." });
  }
});

export default router;
