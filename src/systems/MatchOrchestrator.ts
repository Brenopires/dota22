import { ARENA_THEMES, ARENA_LAYOUTS } from '../constants';
import { TeamManager } from './TeamManager';
import { MatchConfig } from '../types';
import { GEMS } from '../gems/gemData';
import { TraitSystem } from '../traits/TraitSystem';
import { heroDataMap } from '../heroes/heroData';

export class MatchOrchestrator {
  static generateMatch(): MatchConfig {
    const { sizeA: teamSizeA, sizeB: teamSizeB } = TeamManager.getRandomTeamSizes();
    const { teamA, teamB, playerHero } = TeamManager.generateTeams(teamSizeA, teamSizeB);

    const arenaTheme = ARENA_THEMES[Math.floor(Math.random() * ARENA_THEMES.length)];
    const arenaLayout = ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)];

    // Collect all hero passive IDs in this match for blacklist checking
    const allHeroIds = [...teamA, ...teamB];
    const heroPassiveIds = allHeroIds
      .map(id => heroDataMap[id]?.passive?.id)
      .filter((id): id is string => !!id);

    // Select trait (respects incompatibility blacklists)
    const selectedTrait = TraitSystem.selectTrait(heroPassiveIds);

    // Assign random gems to each hero (no duplicates constraint -- gems can repeat)
    const gemAssignments: Record<string, string> = {};
    for (const heroId of allHeroIds) {
      const randomGem = GEMS[Math.floor(Math.random() * GEMS.length)];
      gemAssignments[heroId] = randomGem.id;
    }

    return {
      teamSizeA,
      teamSizeB,
      teamSize: Math.max(teamSizeA, teamSizeB),  // backward compat
      teamA,
      teamB,
      playerHero,
      arenaTheme,
      arenaLayout,
      traitId: selectedTrait.id,
      gemAssignments,
    };
  }
}
