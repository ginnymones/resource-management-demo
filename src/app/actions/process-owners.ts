"use server";

import { prisma } from "@/lib/prisma";

/**
 * Get all process owners (process → user mapping).
 */
export async function getProcessOwners() {
  const owners = await prisma.processOwner.findMany({
    include: {
      process: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { process: { name: "asc" } },
  });

  return owners.map((o) => ({
    id: o.id,
    processId: o.process.id,
    processName: o.process.name,
    userId: o.user.id,
    userName: o.user.name,
    userEmail: o.user.email,
    userRole: o.user.role,
  }));
}

/**
 * Get owners for a specific process.
 */
export async function getOwnersForProcess(processId: string) {
  const owners = await prisma.processOwner.findMany({
    where: { processId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return owners.map((o) => ({
    id: o.id,
    userId: o.user.id,
    userName: o.user.name,
    userEmail: o.user.email,
    userRole: o.user.role,
  }));
}

/**
 * Get processes owned by a specific user.
 */
export async function getProcessesForOwner(userId: string) {
  const ownerships = await prisma.processOwner.findMany({
    where: { userId },
    include: { process: { select: { id: true, name: true } } },
  });

  return ownerships.map((o) => ({
    processId: o.process.id,
    processName: o.process.name,
  }));
}

/**
 * Assign a user as an owner of a process. Admin only.
 */
export async function assignProcessOwner(processId: string, userId: string) {
  // Verify the user exists and is SME or Manager
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  if (!["SME", "Manager", "Admin", "Senior_Leader"].includes(user.role)) {
    throw new Error("Only SMEs, Managers, Senior Leaders, or Admins can own processes.");
  }

  const existing = await prisma.processOwner.findUnique({
    where: { processId_userId: { processId, userId } },
  });
  if (existing) return existing;

  return await prisma.processOwner.create({
    data: { processId, userId },
  });
}

/**
 * Remove a user from process ownership. Admin only.
 */
export async function removeProcessOwner(processId: string, userId: string) {
  const existing = await prisma.processOwner.findUnique({
    where: { processId_userId: { processId, userId } },
  });
  if (!existing) return null;

  return await prisma.processOwner.delete({
    where: { id: existing.id },
  });
}

/**
 * Get all eligible users who can be assigned as process owners (SME, Manager, Senior_Leader, Admin).
 */
export async function getEligibleProcessOwners() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["SME", "Manager", "Senior_Leader", "Admin"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return users;
}
