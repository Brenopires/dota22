import { ARENA_THEMES, ARENA_LAYOUTS } from '../constants';
import { TeamManager } from './TeamManager';
import { MatchConfig } from '../types';
import { GEMS } from '../gems/gemData';
import { TraitSystem } from '../traits/TraitSystem';
import { heroDataMap } from '../heroes/heroData';
import { HeroRegistry } from '../heroes/HeroRegistry';

export interface PartialMatchConfig {
  teamSizeA: number;
  teamSizeB: number;
  teamB: string[];
  arenaTheme: string;
  arenaLayout: string;
  traitId: string;
  gemAssignments: Record<string, string>; // teamB gems only at this stage
}

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

  static generatePartialMatch(): PartialMatchConfig {
    const { sizeA: teamSizeA, sizeB: teamSizeB } = TeamManager.getRandomTeamSizes();
    const { teamB } = TeamManager.generateTeamBOnly(teamSizeB);

    const arenaTheme = ARENA_THEMES[Math.floor(Math.random() * ARENA_THEMES.length)];
    const arenaLayout = ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)];

    // Collect teamB passive IDs for trait blacklist checking
    const heroPassiveIds = teamB
      .map(id => heroDataMap[id]?.passive?.id)
      .filter((id): id is string => !!id);

    const selectedTrait = TraitSystem.selectTrait(heroPassiveIds);

    // Assign gems to teamB only — player and teamA gems assigned in finalizeMatch
    const gemAssignments: Record<string, string> = {};
    for (const heroId of teamB) {
      gemAssignments[heroId] = GEMS[Math.floor(Math.random() * GEMS.length)].id;
    }

    return { teamSizeA, teamSizeB, teamB, arenaTheme, arenaLayout, traitId: selectedTrait.id, gemAssignments };
  }

  static finalizeMatch(playerHeroId: string, partial: PartialMatchConfig): MatchConfig {
    const usedHeroes = [playerHeroId, ...partial.teamB];
    const teamA: string[] = [playerHeroId];

    // Fill remaining teamA slots with random heroes
    for (let i = 1; i < partial.teamSizeA; i++) {
      const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
      usedHeroes.push(heroId);
      teamA.push(heroId);
    }

    // Assign gems to player hero and any new teamA members
    const gemAssignments = { ...partial.gemAssignments };
    for (const heroId of teamA) {
      if (!gemAssignments[heroId]) {
        gemAssignments[heroId] = GEMS[Math.floor(Math.random() * GEMS.length)].id;
      }
    }

    // Include teamA passive IDs in trait compatibility check is unnecessary here —
    // trait was already selected in partial step. If player hero's passive conflicts,
    // it's acceptable (trait was chosen before hero was picked, matching the game's
    // "draft after trait reveal" flow from Phase 5).

    return {
      teamSizeA: partial.teamSizeA,
      teamSizeB: partial.teamSizeB,
      teamSize: Math.max(partial.teamSizeA, partial.teamSizeB),
      teamA,
      teamB: partial.teamB,
      playerHero: playerHeroId,
      arenaTheme: partial.arenaTheme,
      arenaLayout: partial.arenaLayout,
      traitId: partial.traitId,
      gemAssignments,
    };
  }
}
