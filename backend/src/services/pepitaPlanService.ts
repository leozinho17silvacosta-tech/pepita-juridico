import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function activatePepitaProForUser(userId: string) {
  if (!userId) return null;

  return prisma.user.update({
    where: { id: userId },
    data: {
      plan: "PRO",
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      updatedAt: true,
    },
  });
}
