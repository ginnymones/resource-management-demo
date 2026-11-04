"use server";

import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

/**
 * Get the associate's assigned processes (based on their skills).
 * Falls back to all processes if no skills are assigned.
 */
export async function getMyProcesses(userId: string) {
  // Find the associate record for this user
  const associate = await prisma.associate.findUnique({
    where: { userId },
    include: {
      skills: {
        include: { skill: true },
      },
    },
  });

  if (!associate) {
    // If no associate record, return all processes as fallback
    const allProcesses = await prisma.process.findMany({
      orderBy: { name: "asc" },
    });
    return allProcesses.map((p) => ({ id: p.id, name: p.name }));
  }

  // If the associate has skills, try to match processes by skill name
  if (associate.skills.length > 0) {
    const skillNames = associate.skills.map((s) => s.skill.name);
    const matchedProcesses = await prisma.process.findMany({
      where: {
        name: { in: skillNames },
      },
      orderBy: { name: "asc" },
    });

    // If we found matching processes, return them; otherwise fall back to all
    if (matchedProcesses.length > 0) {
      return matchedProcesses.map((p) => ({ id: p.id, name: p.name }));
    }
  }

  // Fallback: return all processes
  const allProcesses = await prisma.process.findMany({
    orderBy: { name: "asc" },
  });
  return allProcesses.map((p) => ({ id: p.id, name: p.name }));
}

/**
 * Log a time entry for the current associate.
 */
export async function logMyTime(data: {
  userId: string;
  processId: string;
  date: string;
  hours: number;
  notes?: string;
}) {
  // Validate hours
  if (data.hours <= 0 || data.hours > 7.5) {
    throw new Error("Hours must be between 0 and 7.5");
  }
  if (data.hours % 0.25 !== 0) {
    throw new Error("Hours must be in increments of 0.25");
  }

  // Find or verify the associate record
  const associate = await prisma.associate.findUnique({
    where: { userId: data.userId },
  });

  if (!associate) {
    throw new Error("Associate record not found. Contact your manager.");
  }

  const entryDate = new Date(data.date);

  // Create the time entry
  const timeEntry = await prisma.timeEntry.upsert({
    where: {
      associateId_processId_entryDate: {
        associateId: associate.id,
        processId: data.processId,
        entryDate,
      },
    },
    update: {
      hours: data.hours,
      enteredBy: data.userId,
      taskId: data.notes || null,
    },
    create: {
      associateId: associate.id,
      processId: data.processId,
      entryDate,
      hours: data.hours,
      enteredBy: data.userId,
      taskId: data.notes || null,
    },
    include: { process: true },
  });

  return {
    id: timeEntry.id,
    processName: timeEntry.process.name,
    hours: timeEntry.hours,
    date: timeEntry.entryDate,
    notes: timeEntry.taskId,
  };
}

/**
 * Get today's entries for the current associate.
 */
export async function getMyTodayEntries(userId: string) {
  const associate = await prisma.associate.findUnique({
    where: { userId },
  });

  if (!associate) {
    return [];
  }

  const today = new Date(new Date().toISOString().split("T")[0]);

  const entries = await prisma.timeEntry.findMany({
    where: {
      associateId: associate.id,
      entryDate: today,
    },
    include: { process: true },
    orderBy: { createdAt: "desc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    processName: entry.process.name,
    processId: entry.processId,
    hours: entry.hours,
    notes: entry.taskId,
    createdAt: entry.createdAt.toISOString(),
  }));
}

/**
 * Get timesheet history for the current associate.
 */
export async function getMyTimeHistory(
  userId: string,
  params?: { startDate?: string; endDate?: string; page?: number }
) {
  const associate = await prisma.associate.findUnique({
    where: { userId },
  });

  if (!associate) {
    return { entries: [], total: 0, page: 1, totalPages: 0 };
  }

  const page = params?.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params?.startDate) {
    dateFilter.gte = new Date(params.startDate);
  }
  if (params?.endDate) {
    dateFilter.lte = new Date(params.endDate);
  }

  const where = {
    associateId: associate.id,
    ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: { process: true },
      orderBy: { entryDate: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      processName: entry.process.name,
      processId: entry.processId,
      hours: entry.hours,
      notes: entry.taskId,
      date: entry.entryDate.toISOString().split("T")[0],
      createdAt: entry.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/**
 * Delete a time entry (only if it belongs to the current user and is from today).
 */
export async function deleteMyTimeEntry(entryId: string, userId: string) {
  const associate = await prisma.associate.findUnique({
    where: { userId },
  });

  if (!associate) {
    throw new Error("Associate record not found.");
  }

  const today = new Date(new Date().toISOString().split("T")[0]);

  const entry = await prisma.timeEntry.findFirst({
    where: {
      id: entryId,
      associateId: associate.id,
      entryDate: today,
    },
  });

  if (!entry) {
    throw new Error("Entry not found or cannot be deleted (only today's entries can be removed).");
  }

  await prisma.timeEntry.delete({
    where: { id: entryId },
  });

  return { success: true };
}

/**
 * Edit a time entry (only if it belongs to the current user and is from today).
 */
export async function editMyTimeEntry(
  entryId: string,
  userId: string,
  data: { hours: number; notes?: string }
) {
  // Validate hours
  if (data.hours <= 0 || data.hours > 7.5) {
    throw new Error("Hours must be between 0 and 7.5");
  }
  if (data.hours % 0.25 !== 0) {
    throw new Error("Hours must be in increments of 0.25");
  }

  const associate = await prisma.associate.findUnique({
    where: { userId },
  });

  if (!associate) {
    throw new Error("Associate record not found.");
  }

  const today = new Date(new Date().toISOString().split("T")[0]);

  const entry = await prisma.timeEntry.findFirst({
    where: {
      id: entryId,
      associateId: associate.id,
      entryDate: today,
    },
  });

  if (!entry) {
    throw new Error("Entry not found or cannot be edited (only today's entries can be modified).");
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      hours: data.hours,
      taskId: data.notes !== undefined ? (data.notes || null) : entry.taskId,
    },
    include: { process: true },
  });

  return {
    id: updated.id,
    processName: updated.process.name,
    hours: updated.hours,
    notes: updated.taskId,
  };
}
