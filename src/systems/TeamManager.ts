import { HeroRegistry } from '../heroes/HeroRegistry';

export interface TeamSizes {
  sizeA: number;
  sizeB: number;
}

export class TeamManager {
  static getRandomTeamSizes(): TeamSizes {
    // Draw sizeA and sizeB independently from [1, 2, 3, 4, 5] — any MvN combination is valid
    const sizeA = Math.floor(Math.random() * 5) + 1;
    const sizeB = Math.floor(Math.random() * 5) + 1;
    return { sizeA, sizeB };
  }

  static generateTeams(sizeA: number, sizeB: number): { teamA: string[]; teamB: string[]; playerHero: string } {
    const usedHeroes: string[] = [];
    const teamA: string[] = [];
    const teamB: string[] = [];

    // Pick player hero — player is always first in teamA
    const playerHero = HeroRegistry.getRandomHeroId(usedHeroes);
    usedHeroes.push(playerHero);
    teamA.push(playerHero);

    // Fill rest of team A (sizeA - 1 additional heroes)
    for (let i = 1; i < sizeA; i++) {
      const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
      usedHeroes.push(heroId);
      teamA.push(heroId);
    }

    // Fill team B (sizeB heroes)
    for (let i = 0; i < sizeB; i++) {
      const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
      usedHeroes.push(heroId);
      teamB.push(heroId);
    }

    return { teamA, teamB, playerHero };
  }

  static generateTeamBOnly(sizeB: number): { teamB: string[] } {
    const usedHeroes: string[] = [];
    const teamB: string[] = [];

    for (let i = 0; i < sizeB; i++) {
      const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
      usedHeroes.push(heroId);
      teamB.push(heroId);
    }

    return { teamB };
  }
}
