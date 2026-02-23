import { EventBus, Events } from './EventBus';
import { Hero } from '../entities/Hero';
import { BaseEntity } from '../entities/BaseEntity';

// XP awarded per event type
export const XP_PER_KILL = 50;
export const XP_PER_OBJECTIVE = 100;

// Cumulative XP required to REACH each level (index = level number).
// XP_THRESHOLDS[1] = 50 means level 2 requires 50 total XP.
// Tuned for 5-min match: 6 kills (~300 XP) reaches level 5 at 320 XP.
export const XP_THRESHOLDS = [0, 50, 120, 210, 320, 450, 600, 780, 990];
// Level:                        1   2    3    4    5    6    7    8    9

export class XPSystem {
  private heroes: Hero[];

  constructor(heroes: Hero[]) {
    this.heroes = heroes;
    EventBus.on(Events.HERO_KILLED, this.onKill, this);
  }

  private onKill({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    if (!killerId) return;
    const killer = this.heroes.find(h => h.getUniqueId() === killerId);
    if (!killer || !killer.isAlive) return;
    killer.gainXP(XP_PER_KILL);
  }

  /** Call when an objective is completed — pass the completing hero's uniqueId */
  awardObjectiveXP(heroId: string): void {
    const hero = this.heroes.find(h => h.getUniqueId() === heroId);
    if (hero && hero.isAlive) {
      hero.gainXP(XP_PER_OBJECTIVE);
    }
  }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this);
  }
}
