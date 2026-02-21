import Phaser from 'phaser';
import { Team, AbilityDef, BuffType } from '../types';
import { Hero } from './Hero';

export class AreaEffect extends Phaser.GameObjects.Arc {
  abilityDef: AbilityDef;
  ownerTeam: Team;
  ownerId: string;
  damage: number;
  radius: number;
  duration: number;
  remaining: number;
  tickInterval: number;
  tickTimer: number;
  hasApplied: boolean;
  isHeal: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    ability: AbilityDef,
    owner: Hero
  ) {
    const radius = ability.radius || 60;
    const color = owner.stats.color;
    super(scene, x, y, radius, 0, 360, false, color, 0.2);

    this.abilityDef = ability;
    this.ownerTeam = owner.team;
    this.ownerId = owner.getUniqueId();
    this.damage = ability.damage || 0;
    this.radius = radius;
    this.duration = ability.duration || 1;
    this.remaining = this.duration;
    this.tickInterval = 0.5;
    this.tickTimer = 0;
    this.hasApplied = false;
    this.isHeal = (ability.healAmount || 0) > 0;

    this.setStrokeStyle(2, color, 0.6);
    this.setDepth(1);

    scene.add.existing(this);
  }

  updateEffect(dt: number, heroes: Hero[]): void {
    this.remaining -= dt;
    this.tickTimer += dt;

    // Apply effects on tick
    if (this.tickTimer >= this.tickInterval || !this.hasApplied) {
      this.tickTimer = 0;
      this.hasApplied = true;

      for (const hero of heroes) {
        if (!hero.isAlive) continue;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, hero.x, hero.y);
        if (dist > this.radius) continue;

        if (this.isHeal) {
          // Heal allies
          if (hero.team === this.ownerTeam) {
            hero.heal(this.abilityDef.healAmount || 0);
          }
        } else {
          // Damage enemies
          if (hero.team !== this.ownerTeam) {
            hero.takeDamage(this.damage * this.tickInterval, this.ownerId);

            // Apply debuffs
            if (this.abilityDef.buffType) {
              hero.addBuff({
                type: this.abilityDef.buffType,
                value: this.abilityDef.buffValue || 0,
                duration: this.abilityDef.buffDuration || 1,
                remaining: this.abilityDef.buffDuration || 1,
                sourceId: this.ownerId,
              });
            }
          }
        }
      }
    }

    // Fade out
    this.setAlpha(0.2 * (this.remaining / this.duration));

    if (this.remaining <= 0) {
      this.destroy();
    }
  }
}
