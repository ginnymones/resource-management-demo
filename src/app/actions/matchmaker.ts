"use server";

import { prisma } from "@/lib/prisma";
import { calculateBandwidth } from "@/lib/services/bandwidth.service";
import {
  calculateMatchScore,
  PROFICIENCY_VALUES,
  type ProficiencyLevel,
  type SearchCriteria,
} from "@/lib/services/match-score.service";

const PAGE_SIZE = 25;

export interface MatchmakerResult {
  id: string;
  name: string;
  email?: string;
  team: string;
  bandwidth: number;
  matchScore: number;
  skills: { name: string; proficiency: ProficiencyLevel }[];
  supervisorName?: string;
}

/**
 * Simplified matchmaker search.
 * Filters by: required skills + minimum proficiency + minimum available hours.
 * No complexity factor in the search — just straightforward skill + availability matching.
 */
export async function searchAssociates(
  criteria: SearchCriteria,
  page: number = 1
): Promise<{
  data: MatchmakerResult[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  // Fetch all associates with their skills, time entries, and supervisor info
  const associates = await prisma.associate.findMany({
    include: {
      team: true,
      user: {
        select: {
          email: true,
          manager: { select: { name: true } },
        },
      },
      skills: {
        include: { skill: true },
      },
      timeEntries: {
        where: {
          entryDate: new Date(new Date().toISOString().split("T")[0]),
        },
        include: { process: true },
      },
    },
  });

  // Filter and score associates
  const scoredResults: MatchmakerResult[] = [];

  for (const associate of associates) {
    // Calculate bandwidth from time entries
    const bandwidthInput = associate.timeEntries.map((entry) => ({
      hours: entry.hours,
      processComplexityFactor: entry.process.complexityFactor,
    }));

    const bandwidth =
      associate.bandwidthCache !== null && associate.bandwidthCache !== undefined
        ? associate.bandwidthCache
        : calculateBandwidth(bandwidthInput);

    // Filter: bandwidth must be > 0
    if (bandwidth <= 0) continue;

    // Filter: bandwidth must meet minimum available hours
    if (criteria.minBandwidth > 0 && bandwidth < criteria.minBandwidth) continue;

    // Filter: must have ALL requested skills at or above minimum proficiency
    const associateSkills = associate.skills.map((as) => ({
      skillId: as.skillId,
      proficiency: as.proficiency as ProficiencyLevel,
    }));

    const hasAllSkills = criteria.requiredSkills.every((req) => {
      const assocSkill = associateSkills.find((s) => s.skillId === req.skillId);
      return (
        assocSkill &&
        PROFICIENCY_VALUES[assocSkill.proficiency] >=
          PROFICIENCY_VALUES[req.minProficiency]
      );
    });

    if (!hasAllSkills) continue;

    // Calculate match score
    const matchScore = calculateMatchScore({
      associate: { skills: associateSkills, bandwidth },
      criteria,
    });

    scoredResults.push({
      id: associate.id,
      name: associate.name,
      email: associate.user.email,
      team: associate.team.name,
      bandwidth,
      matchScore,
      skills: associate.skills
        .filter((as) =>
          criteria.requiredSkills.some((req) => req.skillId === as.skillId)
        )
        .map((as) => ({
          name: as.skill.name,
          proficiency: as.proficiency as ProficiencyLevel,
        })),
      supervisorName: associate.user.manager?.name ?? undefined,
    });
  }

  // Sort by match score descending
  scoredResults.sort((a, b) => b.matchScore - a.matchScore);

  // Paginate
  const total = scoredResults.length;
  const skip = (page - 1) * PAGE_SIZE;
  const paginatedResults = scoredResults.slice(skip, skip + PAGE_SIZE);

  return {
    data: paginatedResults,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
}
