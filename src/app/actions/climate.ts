"use server";

import { prisma } from "@/lib/prisma";

/**
 * Get program status data for the Climate page default view.
 * Returns all child processes with HC data grouped by parent team.
 */
export async function getProgramStatus(filters?: { categories?: string[] }) {
  const where: Record<string, unknown> = {
    parentId: { not: null },
    plannedHC: { not: null },
  };

  if (filters?.categories && filters.categories.length > 0) {
    where.category = { in: filters.categories };
  }

  const programs = await prisma.process.findMany({
    where,
    include: {
      parent: { select: { name: true } },
      owners: { include: { user: { select: { email: true, name: true } } } },
    },
    orderBy: [{ parent: { name: "asc" } }, { name: "asc" }],
  });

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    team: p.parent?.name ?? "Unknown",
    category: p.category ?? "Unknown",
    vertical: p.vertical,
    isActive: p.isActive,
    plannedHC: p.plannedHC ?? 0,
    actualHC: p.actualHC ?? 0,
    trainedHC: p.trainedHC ?? 0,
    deficit: (p.actualHC ?? 0) - (p.plannedHC ?? 0),
    poc: p.owners.length > 0
      ? p.owners[0].user.email.replace(/@.*$/, "")
      : null,
  }));
}

/**
 * Get overall/summary HC numbers across all programs.
 */
export async function getHCSummary() {
  const programs = await prisma.process.findMany({
    where: { parentId: { not: null }, plannedHC: { not: null } },
  });

  const active = programs.filter((p) => p.isActive);
  const inactive = programs.filter((p) => !p.isActive);

  return {
    totalPrograms: programs.length,
    activePrograms: active.length,
    inactivePrograms: inactive.length,
    totalPlannedHC: programs.reduce((s, p) => s + (p.plannedHC ?? 0), 0),
    totalActualHC: programs.reduce((s, p) => s + (p.actualHC ?? 0), 0),
    totalTrainedHC: programs.reduce((s, p) => s + (p.trainedHC ?? 0), 0),
    activePlannedHC: active.reduce((s, p) => s + (p.plannedHC ?? 0), 0),
    activeActualHC: active.reduce((s, p) => s + (p.actualHC ?? 0), 0),
    activeTrainedHC: active.reduce((s, p) => s + (p.trainedHC ?? 0), 0),
  };
}

/**
 * Get unique categories for the filter dropdown.
 */
export async function getProgramCategories() {
  const processes = await prisma.process.findMany({
    where: { parentId: { not: null }, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return processes.map((p) => p.category!).sort();
}

/**
 * Update HC values for a process (admin/SME/POC).
 */
export async function updateProcessHC(
  processId: string,
  data: { plannedHC?: number; actualHC?: number; trainedHC?: number; isActive?: boolean }
) {
  return await prisma.process.update({
    where: { id: processId },
    data,
  });
}
