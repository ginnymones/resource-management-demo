"use server";

import { prisma } from "@/lib/prisma";
import type { ProficiencyLevel } from "@prisma/client";

/**
 * Get all skills from the global skill list.
 */
export async function getAllSkills() {
  return await prisma.skill.findMany({ orderBy: { name: "asc" } });
}

/**
 * Create a new global skill. Admin only.
 */
export async function createSkill(name: string, category?: string) {
  const existing = await prisma.skill.findUnique({ where: { name } });
  if (existing) throw new Error(`Skill "${name}" already exists.`);

  return await prisma.skill.create({
    data: { name, category },
  });
}

/**
 * Delete a global skill. Admin only.
 */
export async function deleteSkill(skillId: string) {
  // Remove all associate-skill mappings first
  await prisma.associateSkill.deleteMany({ where: { skillId } });
  return await prisma.skill.delete({ where: { id: skillId } });
}

/**
 * Get associates managed by a user.
 * - For Managers: associates where the user is their supervisor (via reportsTo)
 * - For SMEs: associates linked to processes they own
 * - For Admins: all associates
 */
export async function getManagedAssociates(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { processOwners: { include: { process: true } } },
  });
  if (!user) throw new Error("User not found.");

  if (user.role === "Admin" || user.role === "Senior_Leader") {
    // Admin/Senior Leader sees all
    const associates = await prisma.associate.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        skills: { include: { skill: true } },
        team: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    return associates.map(formatAssociate);
  }

  if (user.role === "Manager") {
    // Manager sees direct reports
    const associates = await prisma.associate.findMany({
      where: { user: { reportsTo: userId } },
      include: {
        user: { select: { id: true, email: true, name: true } },
        skills: { include: { skill: true } },
        team: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    return associates.map(formatAssociate);
  }

  if (user.role === "SME") {
    // SME sees associates who have time entries on their processes
    const ownedProcessIds = user.processOwners.map((po) => po.processId);
    if (ownedProcessIds.length === 0) return [];

    const associates = await prisma.associate.findMany({
      where: {
        timeEntries: { some: { processId: { in: ownedProcessIds } } },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        skills: { include: { skill: true } },
        team: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    return associates.map(formatAssociate);
  }

  return [];
}

/**
 * Add a skill to an associate. SME/Manager can do this for their mapped associates.
 */
export async function addAssociateSkill(
  associateId: string,
  skillId: string,
  proficiency: ProficiencyLevel
) {
  const existing = await prisma.associateSkill.findUnique({
    where: { associateId_skillId: { associateId, skillId } },
  });

  if (existing) {
    // Update proficiency if already exists
    return await prisma.associateSkill.update({
      where: { id: existing.id },
      data: { proficiency },
      include: { skill: true },
    });
  }

  return await prisma.associateSkill.create({
    data: { associateId, skillId, proficiency },
    include: { skill: true },
  });
}

/**
 * Update an associate's skill proficiency level.
 */
export async function updateAssociateSkillProficiency(
  associateId: string,
  skillId: string,
  proficiency: ProficiencyLevel
) {
  return await prisma.associateSkill.update({
    where: { associateId_skillId: { associateId, skillId } },
    data: { proficiency },
    include: { skill: true },
  });
}

/**
 * Remove a skill from an associate.
 */
export async function removeAssociateSkill(associateId: string, skillId: string) {
  return await prisma.associateSkill.delete({
    where: { associateId_skillId: { associateId, skillId } },
  });
}

// Helper to format associate for the UI
function formatAssociate(a: {
  id: string;
  name: string;
  user: { id: string; email: string; name: string };
  skills: { skill: { id: string; name: string }; proficiency: ProficiencyLevel }[];
  team: { name: string };
}) {
  return {
    id: a.id,
    name: a.name,
    login: a.user.email.replace(/@.*$/, ""),
    email: a.user.email,
    team: a.team.name,
    skills: a.skills.map((s) => ({
      skillId: s.skill.id,
      skillName: s.skill.name,
      proficiency: s.proficiency,
    })),
  };
}
