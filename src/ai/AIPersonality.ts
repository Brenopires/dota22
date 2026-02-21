import { HeroArchetype } from '../types';

export interface AIProfile {
  aggressiveness: number;    // 0-1, how willing to chase
  retreatThreshold: number;  // HP% to start retreating
  abilityPriority: number;   // 0-1, how often to prefer abilities over auto-attack
  targetPriority: 'closest' | 'lowest_hp' | 'highest_threat';
  kitingEnabled: boolean;
  keepDistance: number;       // preferred distance for ranged heroes
}

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
}
