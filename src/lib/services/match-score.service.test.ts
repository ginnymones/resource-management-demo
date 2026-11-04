import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  PROFICIENCY_VALUES,
  type MatchScoreInput,
} from './match-score.service';

describe('match-score.service', () => {
  describe('PROFICIENCY_VALUES', () => {
    it('maps Expert to 4', () => {
      expect(PROFICIENCY_VALUES.Expert).toBe(4);
    });

    it('maps Proficient to 3', () => {
      expect(PROFICIENCY_VALUES.Proficient).toBe(3);
    });

    it('maps Trained to 2', () => {
      expect(PROFICIENCY_VALUES.Trained).toBe(2);
    });

    it('maps Not_Trained to 1', () => {
      expect(PROFICIENCY_VALUES.Not_Trained).toBe(1);
    });
  });

  describe('calculateMatchScore', () => {
    it('returns 100 when associate perfectly matches all criteria', () => {
      const input: MatchScoreInput = {
        associate: {
          skills: [
            { skillId: 'skill-1', proficiency: 'Expert' },
            { skillId: 'skill-2', proficiency: 'Expert' },
          ],
          bandwidth: 7.5,
        },
        criteria: {
          requiredSkills: [
            { skillId: 'skill-1', minProficiency: 'Trained' },
            { skillId: 'skill-2', minProficiency: 'Trained' },
          ],
          minBandwidth: 1,
          targetProcessComplexity: 1,
        },
      };

      // Skill: 2/2 = 100, Bandwidth: 7.5/7.5 = 100, Proficiency: (4+4)/2/4 = 100
      // Score: 100*0.4 + 100*0.35 + 100*0.25 = 100
      expect(calculateMatchScore(input)).toBe(100);
    });

    it('returns 0 when associate has no matching skills and no bandwidth', () => {
      const input: MatchScoreInput = {
        associate: {
          skills: [],
          bandwidth: 0,
        },
        criteria: {
          requiredSkills: [
            { skillId: 'skill-1', minProficiency: 'Trained' },
          ],
          minBandwidth: 1,
          targetProcessComplexity: 1,
        },
      };

      // Skill: 0/1 = 0, Bandwidth: 0/7.5 = 0, Proficiency: 0
      // Score: 0*0.4 + 0*0.35 + 0*0.25 = 0
      expect(calculateMatchScore(input)).toBe(0);
    });

    it('calculates correct score with partial skill match', () => {
      const input: MatchScoreInput = {
        associate: {
          skills: [
            { skillId: 'skill-1', proficiency: 'Proficient' },
          ],
          bandwidth: 3.75,
        },
        criteria: {
          requiredSkills: [
            { skillId: 'skill-1', minProficiency: 'Trained' },
            { skillId: 'skill-2', minProficiency: 'Trained' },
          ],
          minBandwidth: 1,
          targetProcessComplexity: 1,
        },
      };

      // Skill: 1/2 = 50, Bandwidth: 3.75/7.5 = 50, Proficiency: 3/4 = 75
      // Score: 50*0.4 + 50*0.35 + 75*0.25 = 20 + 17.5 + 18.75 = 56.25 → 56
      expect(calculateMatchScore(input)).toBe(56);
    });

    it('does not include skills below minimum proficiency', () => {
      const input: MatchScoreInput = {
        associate: {
          skills: [
            { skillId: 'skill-1', proficiency: 'Trained' },
          ],
          bandwidth: 7.5,
        },
        criteria: {
          requiredSkills: [
            { skillId: 'skill-1', minProficiency: 'Expert' },
          ],
          minBandwidth: 1,
          targetProcessComplexity: 1,
        },
      };

      // Skill: 0/1 = 0 (Trained < Expert), Bandwidth: 100, Proficiency: 0
      // Score: 0*0.4 + 100*0.35 + 0*0.25 = 35
      expect(calculateMatchScore(input)).toBe(35);
    });

    it('caps bandwidth score at 100 even if bandwidth exceeds 7.5', () => {
      const input: MatchScoreInput = {
        associate: {
          skills: [{ skillId: 'skill-1', proficiency: 'Expert' }],
          bandwidth: 10, // exceeds max
        },
        criteria: {
          requiredSkills: [
            { skillId: 'skill-1', minProficiency: 'Trained' },
          ],
          minBandwidth: 1,
          targetProcessComplexity: 1,
        },
      };

      // Skill: 100, Bandwidth: min(10/7.5, 1)*100 = 100, Proficiency: 4/4*100 = 100
      // Score: 100*0.4 + 100*0.35 + 100*0.25 = 100
      expect(calculateMatchScore(input)).toBe(100);
    });

    it('result is always between 0 and 100', () => {
      const input: MatchScoreInput = {
        associate: {
          skills: [{ skillId: 'skill-1', proficiency: 'Not_Trained' }],
          bandwidth: 1,
        },
        criteria: {
          requiredSkills: [
            { skillId: 'skill-1', minProficiency: 'Not_Trained' },
          ],
          minBandwidth: 1,
          targetProcessComplexity: 1,
        },
      };

      const score = calculateMatchScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
