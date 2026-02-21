import { ARENA_THEMES, ARENA_LAYOUTS } from '../constants';
import { TeamManager } from './TeamManager';

export class MatchOrchestrator {
  static generateMatch() {
    const teamSize = TeamManager.getRandomTeamSize();
    const { teamA, teamB, playerHero } = TeamManager.generateTeams(teamSize);

    const arenaTheme = ARENA_THEMES[Math.floor(Math.random() * ARENA_THEMES.length)];
    const arenaLayout = ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)];

    return {
      teamSize,
      teamA,
      teamB,
      playerHero,
      arenaTheme,
      arenaLayout,
    };
  }
}
