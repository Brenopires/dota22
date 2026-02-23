import Phaser from 'phaser';
import { HeroStats, Team } from '../types';
import { Hero } from '../entities/Hero';
import { heroDataMap, heroIds } from './heroData';

export class HeroRegistry {
  static create(scene: Phaser.Scene, heroId: string, x: number, y: number, team: Team, isPlayer: boolean, statsOverride?: HeroStats): Hero {
    const stats = statsOverride ?? heroDataMap[heroId];
    if (!stats) {
      throw new Error(`Unknown hero: ${heroId}`);
    }
    return new Hero(scene, x, y, stats, team, isPlayer);
  }

  static getRandomHeroId(exclude: string[] = []): string {
    const available = heroIds.filter(id => !exclude.includes(id));
    return available[Math.floor(Math.random() * available.length)];
  }

  static getAllHeroIds(): string[] {
    return [...heroIds];
  }
}
