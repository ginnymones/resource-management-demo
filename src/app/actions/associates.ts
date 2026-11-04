"use server";

import { prisma } from "@/lib/prisma";
import { calculateBandwidth } from "@/lib/services/bandwidth.service";
import type { ProficiencyLevel } from "@prisma/client";

const PAGE_SIZE = 25;

/**
 * Get paginated list of associates with optional team/process filtering.
 */
export async function getAssociates(
  filters?: { teamId?: string; processId?: string },
  page: number = 1
) {
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};

  if (filters?.teamId) {
    where.teamId = filters.teamId;
  }

  if (filters?.processId) {
    where.timeEntries = {
      some: { processId: filters.processId },
    };
  }

  const [associates, total] = await Promise.all([
    prisma.associate.findMany({
      where,
      include: {
        team: true,
        skills: {
          include: { skill: true },
        },
      },
      skip,
      take: PAGE_SIZE,
      orderBy: { name: "asc" },
    }),
    prisma.associate.count({ where }),
  ]);

  return {
    data: associates,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
}

/**
 * Get full associate profile including skills, trainings, bandwidth, and success indicators.
 */
export async function getAssociateProfile(id: string) {
  const associate = await prisma.associate.findUnique({
    where: { id },
    include: {
      team: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
      skills: {
        include: { skill: true },
      },
      trainings: {
        orderBy: { completionDate: "desc" },
      },
      timeEntries: {
        include: { process: true },
        orderBy: { entryDate: "desc" },
      },
      requestAssociates: {
        where: { approvalStatus: "Approved" },
        include: {
          request: {
            include: { targetProcess: true },
          },
        },
      },
    },
  });

  if (!associate) {
    throw new Error("Associate not found.");
  }

  // Calculate current bandwidth from today's time entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntries = associate.timeEntries.filter(
    (entry) => new Date(entry.entryDate).toDateString() === today.toDateString()
  );

  const bandwidthInput = todayEntries.map((entry) => ({
    hours: entry.hours,
    processComplexityFactor: entry.process.complexityFactor,
  }));

  const bandwidth = calculateBandwidth(bandwidthInput);

  // Calculate success indicators: deployment count per process
  const deploymentCounts: Record<string, { processName: string; count: number }> = {};
  for (const ra of associate.requestAssociates) {
    const processName = ra.request.targetProcess.name;
    const processId = ra.request.targetProcessId;
    if (!deploymentCounts[processId]) {
      deploymentCounts[processId] = { processName, count: 0 };
    }
    deploymentCounts[processId].count++;
  }

  return {
    ...associate,
    bandwidth,
    successIndicators: Object.values(deploymentCounts),
  };
}

/**
 * Get time entry breakdown for an associate (last 30 days).
 * Returns total hours, this week/month hours, breakdown by process, and daily entries.
 */
export async function getAssociateTimeBreakdown(associateId: string) {
  const associate = await prisma.associate.findUnique({ where: { id: associateId } });
  if (!associate) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const entries = await prisma.timeEntry.findMany({
    where: {
      associateId,
      entryDate: { gte: thirtyDaysAgo },
    },
    include: { process: true },
    orderBy: { entryDate: "desc" },
  });

  // Aggregate by process
  const byProcess: Record<string, number> = {};
  let totalHours = 0;

  for (const entry of entries) {
    const processName = entry.process.name;
    byProcess[processName] = (byProcess[processName] || 0) + entry.hours;
    totalHours += entry.hours;
  }

  // This week's hours (week starts Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekHours = entries
    .filter((e) => new Date(e.entryDate) >= startOfWeek)
    .reduce((sum, e) => sum + e.hours, 0);

  // This month's hours
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonthHours = entries
    .filter((e) => new Date(e.entryDate) >= startOfMonth)
    .reduce((sum, e) => sum + e.hours, 0);

  return {
    totalHours,
    thisWeekHours,
    thisMonthHours,
    byProcess: Object.entries(byProcess)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours),
    dailyEntries: entries.slice(0, 50).map((e) => ({
      date: e.entryDate.toISOString().split("T")[0],
      process: e.process.name,
      hours: e.hours,
    })),
  };
}

/**
 * Get deployment history for an associate.
 * A "deployment" is any process where the user logged time.
 * Groups by process showing date range (first to last date worked) and total hours.
 *
 * @param scope - "month" (current month), "90days" (last 90 days), or "all" (full history)
 */
export async function getDeploymentHistory(
  associateId: string,
  scope: "month" | "90days" | "all" = "all"
) {
  const now = new Date();
  let dateFilter: { gte?: Date } | undefined;

  if (scope === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    dateFilter = { gte: startOfMonth };
  } else if (scope === "90days") {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    dateFilter = { gte: ninetyDaysAgo };
  }
  // "all" = no date filter

  const entries = await prisma.timeEntry.findMany({
    where: {
      associateId,
      ...(dateFilter ? { entryDate: dateFilter } : {}),
    },
    include: { process: true },
    orderBy: { entryDate: "asc" },
  });

  // Group by process: track first date, last date, and total hours
  const processMap: Record<
    string,
    { processName: string; firstDate: string; lastDate: string; totalHours: number }
  > = {};

  for (const entry of entries) {
    const processName = entry.process.name;
    const dateStr = entry.entryDate.toISOString().split("T")[0];

    if (!processMap[processName]) {
      processMap[processName] = {
        processName,
        firstDate: dateStr,
        lastDate: dateStr,
        totalHours: 0,
      };
    }

    const record = processMap[processName];
    if (dateStr < record.firstDate) record.firstDate = dateStr;
    if (dateStr > record.lastDate) record.lastDate = dateStr;
    record.totalHours += entry.hours;
  }

  // Sort by most recent lastDate first, then by total hours desc
  const deployments = Object.values(processMap)
    .map((d) => ({
      ...d,
      totalHours: Math.round(d.totalHours * 100) / 100,
    }))
    .sort((a, b) => {
      if (b.lastDate !== a.lastDate) return b.lastDate.localeCompare(a.lastDate);
      return b.totalHours - a.totalHours;
    });

  return {
    scope,
    totalDeployments: deployments.length,
    totalHours: Math.round(deployments.reduce((sum, d) => sum + d.totalHours, 0) * 100) / 100,
    deployments,
  };
}

/**
 * Update associate skills and trigger bandwidth recalculation.
 */
export async function updateAssociateSkills(
  associateId: string,
  skills: { skillId: string; proficiency: ProficiencyLevel }[]
) {
  // Verify associate exists
  const associate = await prisma.associate.findUnique({
    where: { id: associateId },
  });

  if (!associate) {
    throw new Error("Associate not found.");
  }

  // Upsert each skill
  for (const skill of skills) {
    await prisma.associateSkill.upsert({
      where: {
        associateId_skillId: {
          associateId,
          skillId: skill.skillId,
        },
      },
      update: {
        proficiency: skill.proficiency,
      },
      create: {
        associateId,
        skillId: skill.skillId,
        proficiency: skill.proficiency,
      },
    });
  }

  // Recalculate bandwidth and update cache
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntries = await prisma.timeEntry.findMany({
    where: {
      associateId,
      entryDate: today,
    },
    include: { process: true },
  });

  const bandwidthInput = todayEntries.map((entry) => ({
    hours: entry.hours,
    processComplexityFactor: entry.process.complexityFactor,
  }));

  const newBandwidth = calculateBandwidth(bandwidthInput);

  await prisma.associate.update({
    where: { id: associateId },
    data: {
      bandwidthCache: newBandwidth,
      bandwidthUpdatedAt: new Date(),
    },
  });

  return { success: true, bandwidth: newBandwidth };
}
