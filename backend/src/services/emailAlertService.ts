import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada no .env.");
  }
  return new Resend(apiKey);
}

function formatDateBr(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function formatTimeBr(date: Date | string): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSaoPauloDayBounds(referenceDate: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [year, month, day] = formatter
    .format(referenceDate)
    .split("-")
    .map(Number);

  const startOfDay = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
  const inThreeDays = new Date(
    Date.UTC(year, month - 1, day + 4, 2, 59, 59, 999),
  );

  return { startOfDay, endOfDay, inThreeDays };
}

export async function sendDailyOfficeDigest() {
  const resend = getResendClient();

  const from =
    process.env.EMAIL_FROM ||
    "Pepita • Painel Jurídico <alertas@pepitajuridico.com.br>";

  const now = new Date();
  const { startOfDay, endOfDay, inThreeDays } = getSaoPauloDayBounds(now);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const results = [];

  for (const user of users) {
    if (!user.email) continue;

    const [urgentDeadlines, todayAppointments] = await Promise.all([
      prisma.lawsuit.findMany({
        where: {
          userId: user.id,
          status: "PENDING",
          deadlineDate: { not: null },
          OR: [{ priority: "URGENT" }, { deadlineDate: { lte: inThreeDays } }],
        },
        include: { client: true },
        orderBy: { deadlineDate: "asc" },
      }),
      prisma.appointment.findMany({
        where: {
          userId: user.id,
          completed: false,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: { client: true },
        orderBy: { date: "asc" },
      }),
    ]);

    if (urgentDeadlines.length === 0 && todayAppointments.length === 0) {
      results.push({ email: user.email, status: "skipped_no_items" });
      continue;
    }

    const html = buildDigestHtml({
      lawyerName: user.name || "Doutor(a)",
      urgentDeadlines,
      todayAppointments,
    });

    try {
      const { error } = await resend.emails.send({
        from,
        to: user.email,
        subject: `Resumo do Escritório (${formatDateBr(now)}) — ${urgentDeadlines.length} prazo(s) e ${todayAppointments.length} consulta(s)`,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }

      results.push({ email: user.email, status: "sent" });
    } catch (error) {
      console.error(`Erro ao enviar alerta para ${user.email}:`, error);
      results.push({ email: user.email, status: "error", error });
    }
  }

  return results;
}

function buildDigestHtml({
  lawyerName,
  urgentDeadlines,
  todayAppointments,
}: {
  lawyerName: string;
  urgentDeadlines: any[];
  todayAppointments: any[];
}) {
  const deadlinesRows = urgentDeadlines
    .map((d) => {
      const due = d.deadlineDate ? formatDateBr(d.deadlineDate) : "—";
      const client = d.client?.name || "Sem cliente";
      const isUrgent = d.priority === "URGENT";
      const procBadge = d.cnfNumber ? ` • Proc: ${d.cnfNumber}` : "";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #ede9fe;">
            <strong style="color:#1e1b4b;">${d.title}</strong><br/>
            <span style="font-size:12px;color:#64748b;">Cliente: ${client} • Área: ${d.area || "Geral"}${procBadge}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #ede9fe;text-align:right;white-space:nowrap;">
            <span style="display:inline-block;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${isUrgent ? "#ffe4e6" : "#fef3c7"};color:${isUrgent ? "#be123c" : "#b45309"};">
              Venc: ${due}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  const appointmentsRows = todayAppointments
    .map((a) => {
      const time = formatTimeBr(a.date);
      const client = a.client?.name || "Cliente avulso";
      const mode = a.type === "ONLINE" ? "Online" : "Presencial";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #ede9fe;">
            <strong style="color:#1e1b4b;">${time} — ${a.title}</strong><br/>
            <span style="font-size:12px;color:#64748b;">Cliente: ${client} • ${mode}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#f5f2fb;padding:24px;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #ddd6fe;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;">Pepita • Painel Jurídico</p>
          <h2 style="margin:6px 0 0;font-size:20px;">Bom dia, ${lawyerName}!</h2>
        </div>

        <div style="padding:20px 24px;">
          <p style="margin:0 0 18px;font-size:14px;color:#334155;">
            Aqui está o resumo automático dos seus prazos urgentes e compromissos de hoje:
          </p>

          ${
            urgentDeadlines.length > 0
              ? `
            <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#be123c;">
              Prazos Urgentes e Próximos (${urgentDeadlines.length})
            </h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#faf8ff;border-radius:10px;">
              ${deadlinesRows}
            </table>
          `
              : ""
          }

          ${
            todayAppointments.length > 0
              ? `
            <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#6d28d9;">
              Consultas de Hoje (${todayAppointments.length})
            </h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;background:#faf8ff;border-radius:10px;">
              ${appointmentsRows}
            </table>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}
