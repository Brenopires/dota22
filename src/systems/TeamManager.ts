import { HeroRegistry } from '../heroes/HeroRegistry';

export class TeamManager {
  static generateTeams(teamSize: number): { teamA: string[]; teamB: string[]; playerHero: string } {
    const usedHeroes: string[] = [];
    const teamA: string[] = [];
    const teamB: string[] = [];

    // Pick player hero
    const playerHero = HeroRegistry.getRandomHeroId(usedHeroes);
    usedHeroes.push(playerHero);
    teamA.push(playerHero);

    // Fill rest of team A
    for (let i = 1; i < teamSize; i++) {
      const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
      usedHeroes.push(heroId);
      teamA.push(heroId);
    }

    // Fill team B
    for (let i = 0; i < teamSize; i++) {
      const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
      usedHeroes.push(heroId);
      teamB.push(heroId);
    }

    return { teamA, teamB, playerHero };
  }

  static getRandomTeamSize(): number {
    // 1v1 to 4v4
    const sizes = [1, 2, 3, 4];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }
}
