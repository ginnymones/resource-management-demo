"use server";

import { prisma } from "@/lib/prisma";
import { validateComplexityFactor } from "@/lib/validators";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

/**
 * Hash a PIN using bcrypt (server-side only).
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

// ─── CSV Import/Export ───────────────────────────────────────────────────────

const REQUIRED_HEADERS = ["Associate name", "team", "Skills", "Proficiency_Levels"];
const MAX_CSV_ROWS = 2000;

interface CSVImportResult {
  imported: number;
  errors: { row: number; message: string }[];
  total: number;
}

/**
 * Imports associate data from a CSV string.
 * Validates headers, max 2000 rows, imports valid records, returns error summary.
 */
export async function importCSV(csvContent: string, userId: string): Promise<CSVImportResult> {
  const lines = csvContent.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header row and at least one data row.");
  }

  // Validate headers
  const headers = lines[0].split(",").map((h) => h.trim());
  const missingHeaders = REQUIRED_HEADERS.filter(
    (rh) => !headers.some((h) => h.toLowerCase() === rh.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  const dataRows = lines.slice(1);

  // Check max rows
  if (dataRows.length > MAX_CSV_ROWS) {
    throw new Error(`CSV file exceeds maximum of ${MAX_CSV_ROWS} rows. Found ${dataRows.length} rows.`);
  }

  const nameIdx = headers.findIndex((h) => h.toLowerCase() === "associate name");
  const teamIdx = headers.findIndex((h) => h.toLowerCase() === "team");
  const skillsIdx = headers.findIndex((h) => h.toLowerCase() === "skills");
  const proficiencyIdx = headers.findIndex((h) => h.toLowerCase() === "proficiency_levels");

  const errors: { row: number; message: string }[] = [];
  let imported = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // 1-indexed, accounting for header

    try {
      const cols = parseCSVRow(row);

      const name = cols[nameIdx]?.trim();
      const teamName = cols[teamIdx]?.trim();
      const skillsStr = cols[skillsIdx]?.trim();
      const proficiencyStr = cols[proficiencyIdx]?.trim();

      if (!name) {
        errors.push({ row: rowNum, message: "Associate name is required." });
        continue;
      }

      if (!teamName) {
        errors.push({ row: rowNum, message: "Team is required." });
        continue;
      }

      // Find or create team
      let team = await prisma.team.findUnique({ where: { name: teamName } });
      if (!team) {
        team = await prisma.team.create({ data: { name: teamName } });
      }

      // Find or create a user for this associate
      const email = `${name.toLowerCase().replace(/\s+/g, ".")}@placeholder.com`;
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            role: "SME",
            passwordHash: "placeholder",
            teamId: team.id,
          },
        });
      }

      // Create or update associate
      const associate = await prisma.associate.upsert({
        where: { userId: user.id },
        update: { name, teamId: team.id },
        create: {
          userId: user.id,
          name,
          teamId: team.id,
        },
      });

      // Process skills and proficiency levels
      if (skillsStr && proficiencyStr) {
        const skills = skillsStr.split(";").map((s) => s.trim());
        const proficiencies = proficiencyStr.split(";").map((p) => p.trim());

        for (let j = 0; j < skills.length; j++) {
          const skillName = skills[j];
          if (!skillName) continue;

          const proficiency = proficiencies[j] || "Not_Trained";
          const validProficiencies = ["Expert", "Proficient", "Trained", "Not_Trained"];

          if (!validProficiencies.includes(proficiency)) {
            errors.push({
              row: rowNum,
              message: `Invalid proficiency "${proficiency}" for skill "${skillName}".`,
            });
            continue;
          }

          // Find or create skill
          let skill = await prisma.skill.findUnique({ where: { name: skillName } });
          if (!skill) {
            skill = await prisma.skill.create({ data: { name: skillName } });
          }

          // Upsert associate skill
          await prisma.associateSkill.upsert({
            where: {
              associateId_skillId: {
                associateId: associate.id,
                skillId: skill.id,
              },
            },
            update: { proficiency: proficiency as "Expert" | "Proficient" | "Trained" | "Not_Trained" },
            create: {
              associateId: associate.id,
              skillId: skill.id,
              proficiency: proficiency as "Expert" | "Proficient" | "Trained" | "Not_Trained",
            },
          });
        }
      }

      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Unknown error processing row.",
      });
    }
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      entityType: "CSV_Import",
      entityId: "bulk",
      action: "import",
      newValue: { imported, errors: errors.length, total: dataRows.length },
    },
  });

  return { imported, errors, total: dataRows.length };
}

/**
 * Parses a single CSV row, handling quoted fields.
 */
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Exports associate data as CSV string with optional team filtering.
 */
export async function exportCSV(filters?: { teamId?: string }): Promise<string> {
  const where: Record<string, unknown> = {};
  if (filters?.teamId) {
    where.teamId = filters.teamId;
  }

  const associates = await prisma.associate.findMany({
    where,
    include: {
      team: true,
      skills: { include: { skill: true } },
      user: { select: { email: true, role: true } },
    },
    orderBy: { name: "asc" },
  });

  // Build CSV
  const headers = ["Associate name", "team", "email", "role", "Skills", "Proficiency_Levels", "Bandwidth"];
  const rows = associates.map((a) => {
    const skills = a.skills.map((s) => s.skill.name).join(";");
    const proficiencies = a.skills.map((s) => s.proficiency).join(";");
    return [
      escapeCSV(a.name),
      escapeCSV(a.team.name),
      escapeCSV(a.user.email),
      a.user.role,
      escapeCSV(skills),
      escapeCSV(proficiencies),
      a.bandwidthCache?.toString() ?? "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Process Management ──────────────────────────────────────────────────────

/**
 * Creates a new process with validated complexity factor.
 */
export async function createProcess(
  data: { name: string; complexityFactor: number; description?: string },
  userId: string
) {
  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Process name is required.");
  }

  const validation = validateComplexityFactor(data.complexityFactor);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const process = await prisma.process.create({
    data: {
      name: data.name.trim(),
      complexityFactor: data.complexityFactor,
      description: data.description ?? null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      entityType: "Process",
      entityId: process.id,
      action: "create",
      newValue: { name: process.name, complexityFactor: process.complexityFactor },
    },
  });

  return process;
}

/**
 * Updates an existing process with validated complexity factor.
 */
export async function updateProcess(
  id: string,
  data: { name?: string; complexityFactor?: number; description?: string; plannedHC?: number; actualHC?: number; trainedHC?: number; isActive?: boolean },
  userId: string
) {
  const existing = await prisma.process.findUnique({ where: { id } });
  if (!existing) throw new Error("Process not found.");

  if (data.complexityFactor !== undefined) {
    const validation = validateComplexityFactor(data.complexityFactor);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.complexityFactor !== undefined) updateData.complexityFactor = data.complexityFactor;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.plannedHC !== undefined) updateData.plannedHC = data.plannedHC;
  if (data.actualHC !== undefined) updateData.actualHC = data.actualHC;
  if (data.trainedHC !== undefined) updateData.trainedHC = data.trainedHC;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const process = await prisma.process.update({
    where: { id },
    data: updateData,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      entityType: "Process",
      entityId: process.id,
      action: "update",
      oldValue: { name: existing.name, complexityFactor: existing.complexityFactor },
      newValue: { name: process.name, complexityFactor: process.complexityFactor },
    },
  });

  return process;
}

// ─── User Management ─────────────────────────────────────────────────────────

/**
 * Creates a new user with specified role and profile fields.
 */
export async function createUser(
  data: {
    email: string;
    name: string;
    passwordHash: string;
    role?: Role;
    teamId?: string;
    level?: string;
    location?: string;
    jobTitle?: string;
  },
  adminUserId: string
) {
  if (!data.email || !data.name) {
    throw new Error("Email and name are required.");
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role ?? "SME",
      passwordHash: data.passwordHash,
      teamId: data.teamId ?? null,
      level: data.level ?? null,
      location: data.location ?? null,
      jobTitle: data.jobTitle ?? null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      entityType: "User",
      entityId: user.id,
      action: "create",
      newValue: { email: user.email, name: user.name, role: user.role },
    },
  });

  return user;
}

/**
 * Updates a user's role.
 */
export async function updateUserRole(
  userId: string,
  newRole: Role,
  adminUserId: string
) {
  const validRoles: Role[] = ["SME", "POC", "Manager", "Senior_Leader", "Admin"];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("User not found.");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      entityType: "User",
      entityId: user.id,
      action: "update_role",
      oldValue: { role: existing.role },
      newValue: { role: user.role },
    },
  });

  return user;
}

/**
 * Soft deactivates a user by locking their account indefinitely.
 */
export async function deactivateUser(userId: string, adminUserId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("User not found.");

  // Lock the account far into the future to effectively deactivate
  const farFuture = new Date("2099-12-31T23:59:59Z");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { lockedUntil: farFuture },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      entityType: "User",
      entityId: user.id,
      action: "deactivate",
      oldValue: { lockedUntil: existing.lockedUntil },
      newValue: { lockedUntil: farFuture },
    },
  });

  return user;
}
