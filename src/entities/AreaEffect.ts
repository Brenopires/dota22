import Phaser from 'phaser';
import { Team, AbilityDef, BuffType } from '../types';
import { Hero } from './Hero';
import { VFXManager } from '../systems/VFXManager';

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
  private pulseRing: Phaser.GameObjects.Arc | null = null;
  private areaEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

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

    // Entry animation: scale from 0
    this.setScale(0);
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Pulsing ring on border
    this.pulseRing = scene.add.circle(x, y, radius);
    this.pulseRing.setStrokeStyle(2, color, 0.8);
    this.pulseRing.setFillStyle(0x000000, 0);
    this.pulseRing.setDepth(1);
    scene.tweens.add({
      targets: this.pulseRing,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      alpha: { from: 0.8, to: 0.4 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Area fill particles
    const battleScene = scene as any;
    if (battleScene.vfxManager) {
      const element = VFXManager.getElement(owner.stats.id);
      this.areaEmitter = battleScene.vfxManager.createAreaParticles(x, y, radius, element, this.duration, color);
    }
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
          if (hero.team === this.ownerTeam) {
            hero.heal(this.abilityDef.healAmount || 0);
          }
        } else {
          if (hero.team !== this.ownerTeam) {
            hero.takeDamage(this.damage * this.tickInterval, this.ownerId);

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
      this.cleanupAndDestroy();
    }
  }

  private cleanupAndDestroy(): void {
    if (this.pulseRing) {
      this.pulseRing.destroy();
      this.pulseRing = null;
    }
    if (this.areaEmitter?.active) {
      this.areaEmitter.stop();
      const emitter = this.areaEmitter;
      this.scene.time.delayedCall(600, () => {
        if (emitter?.active) emitter.destroy();
      });
      this.areaEmitter = null;
    }
    this.destroy();
  }
}
