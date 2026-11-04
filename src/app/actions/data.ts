"use server";

import { prisma } from "@/lib/prisma";

/**
 * Fetch all skills from the database.
 */
export async function getSkills() {
  const skills = await prisma.skill.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return skills.map((s) => ({ id: s.id, name: s.name, category: s.category }));
}

/**
 * Fetch all processes from the database.
 */
export async function getProcesses() {
  const processes = await prisma.process.findMany({
    include: { parent: { select: { name: true } } },
    orderBy: [{ parent: { name: "asc" } }, { name: "asc" }],
  });
  return processes.map((p) => ({
    id: p.id,
    name: p.name,
    complexityFactor: p.complexityFactor,
    description: p.description,
    parentName: p.parent?.name ?? null,
    category: p.category,
    parentId: p.parentId,
    isActive: p.isActive,
    plannedHC: p.plannedHC,
    actualHC: p.actualHC,
    trainedHC: p.trainedHC,
  }));
}

/**
 * Fetch all teams from the database.
 */
export async function getTeams() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
  });
  return teams.map((t) => ({ id: t.id, name: t.name }));
}

/**
 * Fetch pending approval requests for a user (Manager/Senior_Leader/Admin).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPendingApprovals(userId: string) {
  const pendingRequests = await prisma.resourceRequest.findMany({
    where: {
      status: "Pending",
    },
    include: {
      requestor: { select: { name: true } },
      requestAssociates: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });

  return pendingRequests.map((r) => ({
    id: r.id,
    referenceNumber: r.referenceNumber,
    projectName: r.projectName,
    requestorName: r.requestor.name,
    submittedAt: r.submittedAt?.toISOString() ?? r.createdAt.toISOString(),
    associateCount: r.requestAssociates.length,
  }));
}

/**
 * Fetch all users from the database (for admin panel).
 */
export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: !u.lockedUntil || u.lockedUntil <= new Date(),
  }));
}

/**
 * Fetch associates with bandwidth data for climate view.
 */
export async function getClimateData(filters?: { teamId?: string; processId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.teamId && filters.teamId !== "all") {
    where.teamId = filters.teamId;
  }

  const associates = await prisma.associate.findMany({
    where,
    include: {
      team: true,
      user: { select: { email: true } },
      timeEntries: {
        where: filters?.processId && filters.processId !== "all"
          ? { processId: filters.processId }
          : undefined,
        include: { process: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return associates.map((a) => {
    const totalHours = a.timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const bandwidth = a.bandwidthCache ?? 7.5;
    return {
      associateId: a.id,
      associateName: a.user.email.replace(/@.*$/, ""),
      team: a.team.name,
      utilizedHours: totalHours,
      bandwidth,
    };
  });
}

/**
 * Fetch associates list (id and name) for dropdowns.
 */
export async function getAssociatesList() {
  const associates = await prisma.associate.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return associates;
}

/**
 * Fetch associates by IDs with bandwidth info.
 */
export async function getAssociatesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const associates = await prisma.associate.findMany({
    where: { id: { in: ids } },
    include: { team: true, user: { select: { email: true } } },
  });
  return associates.map((a) => ({
    id: a.id,
    name: a.user.email.replace(/@.*$/, ""),
    team: a.team.name,
    bandwidth: a.bandwidthCache ?? 7.5,
  }));
}


/**
 * Fetch managers (users with Manager, Senior_Leader, or Admin roles) for filter dropdowns.
 */
export async function getManagers() {
  const managers = await prisma.user.findMany({
    where: { role: { in: ["Manager", "Senior_Leader", "Admin"] } },
    orderBy: { email: "asc" },
    select: { id: true, name: true, email: true },
  });
  return managers.map((m) => ({ id: m.id, name: m.email.replace(/@.*$/, "") }));
}

/**
 * Fetch calendar data for the climate calendar view.
 */
export async function getCalendarData(params: {
  month: number; // 0-11
  year: number;
  teamId?: string;
  viewType: "team" | "manager" | "associate";
  managerId?: string;
  associateId?: string;
}) {
  const { month, year, teamId, viewType, managerId, associateId } = params;

  // Calculate date range for the month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  // Build associate filter
  const associateWhere: Record<string, unknown> = {};
  if (teamId) {
    associateWhere.teamId = teamId;
  }

  // For manager view, filter by associates reporting to a specific manager
  if (viewType === "manager" && managerId) {
    associateWhere.user = { reportsTo: managerId };
  }

  // For associate view, filter to a specific associate
  if (viewType === "associate" && associateId) {
    associateWhere.id = associateId;
  }

  // Fetch time entries for the month
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      entryDate: {
        gte: startDate,
        lte: endDate,
      },
      associate: Object.keys(associateWhere).length > 0 ? associateWhere : undefined,
    },
    select: {
      entryDate: true,
      hours: true,
    },
  });

  // Fetch approved/active requests that overlap with the month
  const activeRequests = await prisma.resourceRequest.findMany({
    where: {
      status: { in: ["Approved", "Active"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      requestAssociates: teamId
        ? { some: { associate: { teamId } } }
        : undefined,
    },
    select: {
      startDate: true,
      endDate: true,
      hoursPerDay: true,
      requestAssociates: {
        select: { associateId: true },
      },
    },
  });

  // Get total associate count for bandwidth calculation
  const associateCount = await prisma.associate.count({
    where: Object.keys(associateWhere).length > 0 ? associateWhere : undefined,
  });

  const dailyBandwidth = associateCount * 7.5; // 7.5 hours per associate per day

  // Aggregate daily data
  const daysInMonth = endDate.getDate();
  const result: { date: string; utilizedHours: number; bandwidth: number; commitments: number }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const currentDate = new Date(year, month, day);

    // Sum time entries for this day
    const dayEntries = timeEntries.filter((e) => {
      const entryDate = new Date(e.entryDate);
      return entryDate.getFullYear() === year && entryDate.getMonth() === month && entryDate.getDate() === day;
    });
    const utilizedHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);

    // Count active request commitments for this day
    let commitments = 0;
    let committedHours = 0;
    for (const req of activeRequests) {
      const reqStart = new Date(req.startDate);
      const reqEnd = new Date(req.endDate);
      if (currentDate >= reqStart && currentDate <= reqEnd) {
        commitments++;
        committedHours += req.hoursPerDay * req.requestAssociates.length;
      }
    }

    result.push({
      date: dateStr,
      utilizedHours: utilizedHours + committedHours,
      bandwidth: dailyBandwidth,
      commitments,
    });
  }

  return result;
}

/**
 * Fetch roster data for the roster page.
 * Supports filtering by team, search text, skill, and proficiency.
 * When both skill and proficiency are provided, only associates with that skill
 * at or above that proficiency level are returned.
 */
export async function getRosterData(params?: {
  teamId?: string;
  search?: string;
  skillIds?: string[];
  skillCategory?: string;
  proficiency?: string;
  managerId?: string;
  page?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (params?.teamId && params.teamId !== "all") {
    where.teamId = params.teamId;
  }

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { user: { email: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  // Manager filter
  if (params?.managerId) {
    where.user = { ...(where.user || {}), reportsTo: params.managerId };
  }

  // Skill and proficiency filter
  if (params?.skillIds?.length || params?.skillCategory || params?.proficiency) {
    const skillFilter: Record<string, unknown> = {};
    if (params?.skillIds?.length) {
      skillFilter.skillId = { in: params.skillIds };
    }
    if (params?.skillCategory) {
      skillFilter.skill = { category: params.skillCategory };
    }
    if (params?.proficiency) {
      const proficiencyHierarchy: Record<string, string[]> = {
        Expert: ["Expert"],
        Proficient: ["Expert", "Proficient"],
        Trained: ["Expert", "Proficient", "Trained"],
      };
      const validLevels = proficiencyHierarchy[params.proficiency] ?? ["Expert", "Proficient", "Trained", "Not_Trained"];
      skillFilter.proficiency = { in: validLevels };
    }
    where.skills = { some: skillFilter };
  }

  const [associates, total] = await Promise.all([
    prisma.associate.findMany({
      where,
      include: {
        team: true,
        user: {
          select: {
            email: true,
            level: true,
            location: true,
            jobTitle: true,
            manager: { select: { name: true, email: true } },
          },
        },
        skills: {
          include: { skill: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.associate.count({ where }),
  ]);

  return {
    data: associates.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.user.email,
      team: a.team.name,
      level: a.user.level,
      location: a.user.location,
      jobTitle: a.user.jobTitle,
      skills: a.skills.map((s) => s.skill.name),
      manager: a.user.manager?.name ?? null,
      managerEmail: a.user.manager?.email ?? null,
      currentStatus: a.currentStatus ?? "Stop",
      currentSubStatus: a.currentSubStatus ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
