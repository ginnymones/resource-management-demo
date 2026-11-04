"use server";

import { prisma } from "@/lib/prisma";
import { validateTimeEntry } from "@/lib/validators";
import { calculateBandwidth } from "@/lib/services/bandwidth.service";

export interface TimeEntryInput {
  associateId: string;
  processId: string;
  date: string; // ISO date string
  hours: number;
  enteredBy: string;
}

/**
 * Records a time entry for an associate.
 * Validates hours (0-7.5, multiples of 0.25), checks for duplicates.
 * Returns { duplicate: true, existing: ... } if a duplicate is found.
 */
export async function recordTimeEntry(
  entry: TimeEntryInput,
  overwrite: boolean = false
) {
  // Validate hours
  const validation = validateTimeEntry(entry.hours);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const entryDate = new Date(entry.date);

  // Check for existing entry (duplicate detection)
  const existing = await prisma.timeEntry.findUnique({
    where: {
      associateId_processId_entryDate: {
        associateId: entry.associateId,
        processId: entry.processId,
        entryDate,
      },
    },
  });

  if (existing && !overwrite) {
    return {
      duplicate: true,
      existing: {
        id: existing.id,
        hours: existing.hours,
        entryDate: existing.entryDate,
      },
    };
  }

  // Upsert the time entry
  const timeEntry = await prisma.timeEntry.upsert({
    where: {
      associateId_processId_entryDate: {
        associateId: entry.associateId,
        processId: entry.processId,
        entryDate,
      },
    },
    update: {
      hours: entry.hours,
      enteredBy: entry.enteredBy,
    },
    create: {
      associateId: entry.associateId,
      processId: entry.processId,
      entryDate,
      hours: entry.hours,
      enteredBy: entry.enteredBy,
    },
  });

  // Trigger bandwidth recalculation
  await recalculateBandwidth(entry.associateId);

  return { duplicate: false, entry: timeEntry };
}

/**
 * Gets utilization data for an associate within a date range.
 * Aggregates time entries by process.
 */
export async function getUtilization(
  associateId: string,
  dateRange: { start: Date; end: Date }
) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      associateId,
      entryDate: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    include: { process: true },
    orderBy: { entryDate: "asc" },
  });

  // Aggregate by process
  const byProcess: Record<
    string,
    { processId: string; processName: string; totalHours: number; entries: number }
  > = {};

  let totalHours = 0;

  for (const entry of entries) {
    if (!byProcess[entry.processId]) {
      byProcess[entry.processId] = {
        processId: entry.processId,
        processName: entry.process.name,
        totalHours: 0,
        entries: 0,
      };
    }
    byProcess[entry.processId].totalHours += entry.hours;
    byProcess[entry.processId].entries++;
    totalHours += entry.hours;
  }

  // Calculate number of working days in range
  const startTime = dateRange.start.getTime();
  const endTime = dateRange.end.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  let workingDays = 0;
  for (let t = startTime; t <= endTime; t += dayMs) {
    const day = new Date(t).getDay();
    if (day !== 0 && day !== 6) workingDays++;
  }

  const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

  return {
    associateId,
    dateRange,
    totalHours,
    avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
    workingDays,
    byProcess: Object.values(byProcess),
    entries,
  };
}

/**
 * Recalculates and caches bandwidth for an associate based on today's time entries.
 */
export async function recalculateBandwidth(associateId: string) {
  const today = new Date(new Date().toISOString().split("T")[0]);

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

  return newBandwidth;
}
