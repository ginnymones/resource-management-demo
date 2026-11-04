/**
 * Match Score Calculation Service
 *
 * Calculates the composite Match_Score for an associate relative to search criteria.
 *
 * Formula:
 *   Match_Score = (Skill_Score × 0.40) + (Bandwidth_Score × 0.35) + (Proficiency_Score × 0.25)
 *
 * Where:
 *   - Skill_Score (0–100): proportion of requested skills met at or above minimum proficiency × 100
 *   - Bandwidth_Score (0–100): min(bandwidth / 7.5, 1) × 100
 *   - Proficiency_Score (0–100): (avg proficiency of matched skills / 4) × 100
 */

/** Maximum productive hours per day used as bandwidth denominator */
const MAX_BANDWIDTH = 7.5;

/** Maximum proficiency numeric value */
const MAX_PROFICIENCY = 4;

/** Proficiency level type matching the Prisma enum */
export type ProficiencyLevel = 'Expert' | 'Proficient' | 'Trained' | 'Not_Trained';

/** Numeric mapping for proficiency levels */
export const PROFICIENCY_VALUES: Record<ProficiencyLevel, number> = {
  Expert: 4,
  Proficient: 3,
  Trained: 2,
  Not_Trained: 1,
};

/** Skill data for an associate */
export interface AssociateSkillData {
  skillId: string;
  proficiency: ProficiencyLevel;
}

/** Search criteria for the matchmaker */
export interface SearchCriteria {
  requiredSkills: { skillId: string; minProficiency: ProficiencyLevel }[];
  minBandwidth: number;
  targetProcessComplexity: number;
}

/** Input for match score calculation */
export interface MatchScoreInput {
  associate: {
    skills: AssociateSkillData[];
    bandwidth: number; // available hours per day
  };
  criteria: SearchCriteria;
}

/**
 * Calculates the composite Match_Score for an associate against search criteria.
 *
 * @param input - The associate data and search criteria
 * @returns A score between 0 and 100 (inclusive), rounded to the nearest integer
 */
export function calculateMatchScore(input: MatchScoreInput): number {
  const { associate, criteria } = input;

  // Handle edge case: no required skills
  if (criteria.requiredSkills.length === 0) {
    const bandwidthScore = Math.min(associate.bandwidth / MAX_BANDWIDTH, 1) * 100;
    // With no skills to match, skill score is 100% (all 0 of 0 met) and proficiency is 0
    return Math.round((100 * 0.40) + (bandwidthScore * 0.35) + (0 * 0.25));
  }

  // Skill Score: proportion of required skills met at or above minimum proficiency
  const matchedSkills = criteria.requiredSkills.filter((req) => {
    const assocSkill = associate.skills.find((s) => s.skillId === req.skillId);
    return (
      assocSkill &&
      PROFICIENCY_VALUES[assocSkill.proficiency] >= PROFICIENCY_VALUES[req.minProficiency]
    );
  });
  const skillScore = (matchedSkills.length / criteria.requiredSkills.length) * 100;

  // Bandwidth Score: available bandwidth as proportion of max (7.5 hours), capped at 100
  const bandwidthScore = Math.min(associate.bandwidth / MAX_BANDWIDTH, 1) * 100;

  // Proficiency Score: average proficiency of matched skills relative to max (4)
  const avgProficiency =
    matchedSkills.length > 0
      ? matchedSkills.reduce((sum, req) => {
          const assocSkill = associate.skills.find(
            (s) => s.skillId === req.skillId
          )!;
          return sum + PROFICIENCY_VALUES[assocSkill.proficiency];
        }, 0) / matchedSkills.length
      : 0;
  const proficiencyScore = (avgProficiency / MAX_PROFICIENCY) * 100;

  // Weighted composite
  const rawScore =
    skillScore * 0.40 + bandwidthScore * 0.35 + proficiencyScore * 0.25;

  // Clamp to 0-100 range and round
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}
