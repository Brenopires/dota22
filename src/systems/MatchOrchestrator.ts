import { ARENA_THEMES, ARENA_LAYOUTS } from '../constants';
import { TeamManager } from './TeamManager';
import { MatchConfig } from '../types';

export class MatchOrchestrator {
  static generateMatch(): MatchConfig {
    const { sizeA: teamSizeA, sizeB: teamSizeB } = TeamManager.getRandomTeamSizes();
    const { teamA, teamB, playerHero } = TeamManager.generateTeams(teamSizeA, teamSizeB);

    const arenaTheme = ARENA_THEMES[Math.floor(Math.random() * ARENA_THEMES.length)];
    const arenaLayout = ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)];

    return {
      teamSizeA,
      teamSizeB,
      teamSize: Math.max(teamSizeA, teamSizeB),  // backward compat — BattleScene still reads this until Plan 03-02
      teamA,
      teamB,
      playerHero,
      arenaTheme,
      arenaLayout,
    };
  }
}
