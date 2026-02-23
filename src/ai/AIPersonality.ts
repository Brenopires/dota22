import { HeroArchetype } from '../types';

export interface AIProfile {
  aggressiveness: number;    // 0-1, how willing to chase
  retreatThreshold: number;  // HP% to start retreating
  abilityPriority: number;   // 0-1, how often to prefer abilities over auto-attack
  targetPriority: 'closest' | 'lowest_hp' | 'highest_threat';
  kitingEnabled: boolean;
  keepDistance: number;       // preferred distance for ranged heroes
}

export interface MMRTier {
  name: string;
  minMMR: number;
  aggrMod: number;    // multiplier for aggressiveness
  retreatMod: number; // multiplier for retreatThreshold
}

export const MMR_TIERS: readonly MMRTier[] = [
  { name: 'Bronze',   minMMR: 0,    aggrMod: 0.7,  retreatMod: 1.3  }, // AI retreats more, attacks less
  { name: 'Silver',   minMMR: 800,  aggrMod: 0.85, retreatMod: 1.15 },
  { name: 'Gold',     minMMR: 1100, aggrMod: 1.0,  retreatMod: 1.0  }, // baseline
  { name: 'Platinum', minMMR: 1400, aggrMod: 1.15, retreatMod: 0.9  },
  { name: 'Diamond',  minMMR: 1700, aggrMod: 1.3,  retreatMod: 0.8  },
  { name: 'Master',   minMMR: 2000, aggrMod: 1.5,  retreatMod: 0.7  }, // most aggressive, rarely retreats
] as const;

export class AIPersonality {
  static getProfile(archetype: HeroArchetype): AIProfile {
    switch (archetype) {
      case HeroArchetype.TANK:
        return {
          aggressiveness: 0.8,
          retreatThreshold: 0.15,
          abilityPriority: 0.5,
          targetPriority: 'closest',
          kitingEnabled: false,
          keepDistance: 0,
        };

      case HeroArchetype.ASSASSIN:
        return {
          aggressiveness: 0.9,
          retreatThreshold: 0.25,
          abilityPriority: 0.6,
          targetPriority: 'lowest_hp',
          kitingEnabled: false,
          keepDistance: 0,
        };

      case HeroArchetype.MAGE:
        return {
          aggressiveness: 0.5,
          retreatThreshold: 0.30,
          abilityPriority: 0.8,
          targetPriority: 'lowest_hp',
          kitingEnabled: true,
          keepDistance: 250,
        };

      case HeroArchetype.CARRY:
        return {
          aggressiveness: 0.6,
          retreatThreshold: 0.25,
          abilityPriority: 0.5,
          targetPriority: 'lowest_hp',
          kitingEnabled: true,
          keepDistance: 200,
        };

      case HeroArchetype.SUPPORT:
        return {
          aggressiveness: 0.3,
          retreatThreshold: 0.35,
          abilityPriority: 0.9,
          targetPriority: 'closest',
          kitingEnabled: true,
          keepDistance: 200,
        };

      default:
        return {
          aggressiveness: 0.5,
          retreatThreshold: 0.25,
          abilityPriority: 0.5,
          targetPriority: 'closest',
          kitingEnabled: false,
          keepDistance: 0,
        };
    }
  }

  /**
   * Returns a new AIProfile with aggressiveness and retreatThreshold scaled by the
   * player's MMR tier. Higher MMR → more aggressive, less retreating.
   * Clamps aggressiveness to [0, 1] and retreatThreshold to [0.05, 0.5].
   */
  static applyMMRModifiers(profile: AIProfile, playerMMR: number): AIProfile {
    // Find highest matching tier
    let tier = MMR_TIERS[0];
    for (const t of MMR_TIERS) {
      if (playerMMR >= t.minMMR) tier = t;
    }
    return {
      ...profile,
      aggressiveness: Math.min(1.0, profile.aggressiveness * tier.aggrMod),
      retreatThreshold: Math.max(0.05, Math.min(0.5, profile.retreatThreshold * tier.retreatMod)),
    };
  }
}
