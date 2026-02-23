import { HeroStats } from '../types';
import { TEAM_BALANCE } from '../constants';

export class TeamBalancer {
  /**
   * Returns a stat multiplier >= 1.0 for the smaller team.
   * Larger team always gets 1.0. Equal teams always get 1.0.
   *
   * Formula:
   *   ratio          = largerSize / smallerSize
   *   rawBonus       = (ratio - 1) * BASE_SCALE_FACTOR
   *   mmrFactor      = 1 - clamp((mmr - MMR_SCALE_FLOOR) / MMR_SCALE_RANGE, 0, 1)
   *   effectiveBonus = rawBonus * mmrFactor * MMR_SCALE_REDUCTION
   *   multiplier     = min(1 + effectiveBonus, 1 + MAX_BONUS_CAP)
   */
  static computeMultiplier(smallerSize: number, largerSize: number, playerMMR: number): number {
    if (smallerSize >= largerSize) return 1.0;

    const ratio = largerSize / smallerSize;
    const rawBonus = (ratio - 1) * TEAM_BALANCE.BASE_SCALE_FACTOR;
    const mmrFactor = 1 - Math.min(1, Math.max(0,
      (playerMMR - TEAM_BALANCE.MMR_SCALE_FLOOR) / TEAM_BALANCE.MMR_SCALE_RANGE
    ));
    const effectiveBonus = rawBonus * mmrFactor * TEAM_BALANCE.MMR_SCALE_REDUCTION;
    return Math.min(1 + effectiveBonus, 1 + TEAM_BALANCE.MAX_BONUS_CAP);
  }

  /**
   * Returns a NEW HeroStats object with maxHP and damage scaled by multiplier.
   * Armor is intentionally NOT scaled (avoids compounding with level-up armor gains).
   * heroDataMap is never mutated — always pass a stats reference, not the map entry directly.
   */
  static applyToStats(stats: HeroStats, multiplier: number): HeroStats {
    return {
      ...stats,
      maxHP: Math.round(stats.maxHP * multiplier),
      damage: Math.round(stats.damage * multiplier),
    };
  }
}
