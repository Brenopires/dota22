import Phaser from 'phaser';
import { AUTO_ATTACK_COOLDOWN } from '../constants';
import { AbilityDef, AbilityType, BuffType, Team } from '../types';
import { Hero } from '../entities/Hero';
import { BaseEntity } from '../entities/BaseEntity';
import { Projectile } from '../entities/Projectile';
import { AreaEffect } from '../entities/AreaEffect';
import { VFXManager } from './VFXManager';
import { EventBus, Events } from './EventBus';

export class CombatSystem {
  private scene: Phaser.Scene;
  private projectiles: Projectile[] = [];
  private areaEffects: AreaEffect[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupCollisions(heroes: Hero[], obstacles: Phaser.Physics.Arcade.StaticGroup): void {
    for (const hero of heroes) {
      this.scene.physics.add.collider(hero, obstacles);
    }
    for (let i = 0; i < heroes.length; i++) {
      for (let j = i + 1; j < heroes.length; j++) {
        this.scene.physics.add.collider(heroes[i], heroes[j]);
      }
    }
  }

  update(dt: number): void {
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
      proj.update();

      const battleScene = this.scene as any;
      const heroes: Hero[] = battleScene.heroes || [];
      for (const hero of heroes) {
        if (!hero.isAlive) continue;
        if (hero.team === proj.ownerTeam) {
          if (proj.abilityDef.healAmount && hero.team === proj.ownerTeam) {
            const dist = Phaser.Math.Distance.Between(proj.x, proj.y, hero.x, hero.y);
            if (dist < 25 && hero.getUniqueId() !== proj.ownerId) {
              hero.heal(proj.abilityDef.healAmount);
              proj.destroyProjectile();
              this.projectiles.splice(i, 1);
              break;
            }
          }
          continue;
        }

        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, hero.x, hero.y);
        if (dist < 25) {
          hero.takeDamage(proj.damage, proj.ownerId);

          if (proj.abilityDef.buffType) {
            hero.addBuff({
              type: proj.abilityDef.buffType,
              value: proj.abilityDef.buffValue || 0,
              duration: proj.abilityDef.buffDuration || 1,
              remaining: proj.abilityDef.buffDuration || 1,
              sourceId: proj.ownerId,
              tickInterval: 1,
            });
          }

          if (proj.abilityDef.healAmount) {
            const owner = heroes.find(h => h.getUniqueId() === proj.ownerId);
            if (owner && owner.isAlive) {
              owner.heal(proj.abilityDef.healAmount);
            }
          }

          proj.destroyProjectile();
          this.projectiles.splice(i, 1);
          break;
        }
      }

      // Check collision with boss and towers
      if (proj.active) {
        const nonHeroTargets: BaseEntity[] = battleScene.getNonHeroTargets?.(proj.ownerTeam) || [];
        for (const target of nonHeroTargets) {
          if (!target.isAlive) continue;
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, target.x, target.y);
          if (dist < 25) {
            target.takeDamage(proj.damage, proj.ownerId);
            // Do NOT apply buffs to boss/tower (buff system is hero-only)
            proj.destroyProjectile();
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      // Check collision with obstacles
      if (proj.active) {
        const obstacles: Phaser.Physics.Arcade.StaticGroup = battleScene.obstacles;
        if (obstacles) {
          const bodies = obstacles.getChildren();
          for (const obs of bodies) {
            const obsRect = obs as Phaser.GameObjects.Rectangle;
            const bounds = obsRect.getBounds();
            if (bounds.contains(proj.x, proj.y)) {
              proj.destroyProjectile();
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
    }

    // Update area effects
    const battleScene = this.scene as any;
    const heroes: Hero[] = battleScene.heroes || [];
    for (let i = this.areaEffects.length - 1; i >= 0; i--) {
      const area = this.areaEffects[i];
      if (!area.active) {
        this.areaEffects.splice(i, 1);
        continue;
      }
      const nonHeroTargets: BaseEntity[] = battleScene.getNonHeroTargets?.(area.ownerTeam) || [];
      area.updateEffect(dt, heroes, nonHeroTargets);
      if (!area.active) {
        this.areaEffects.splice(i, 1);
      }
    }
  }

  tryAutoAttack(hero: Hero): void {
    if (!hero.isAlive || hero.isStunned()) return;
    if (hero.autoAttackTimer > 0) return;

    const battleScene = this.scene as any;
    const enemies = battleScene.getEnemies(hero.team) as Hero[];

    const range = hero.getAttackRange();
    let closest: Hero | BaseEntity | null = null;
    let closestDist = Infinity;

    // Check hero enemies (existing logic)
    if (enemies) {
      for (const enemy of enemies) {
        const dist = hero.distanceTo(enemy);
        if (dist <= range && dist < closestDist) {
          closestDist = dist;
          closest = enemy;
        }
      }
    }

    // Also check boss and enemy towers as valid targets
    const nonHeroTargets: BaseEntity[] = battleScene.getNonHeroTargets?.(hero.team) || [];
    for (const target of nonHeroTargets) {
      if (!target.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(hero.x, hero.y, target.x, target.y);
      if (dist <= range && dist < closestDist) {
        closestDist = dist;
        closest = target;
      }
    }

    if (closest) {
      const damage = hero.getAttackDamage();
      closest.takeDamage(damage, hero.getUniqueId());
      EventBus.emit(Events.HERO_HIT, {
        attacker: hero,
        victim: closest,
        damage,
      });
      hero.autoAttackTimer = AUTO_ATTACK_COOLDOWN / 1000;

      // VFX: check if target is a Hero for existing VFX, else generic
      if (closest instanceof Hero) {
        if (hero.isRanged()) {
          this.showRangedAttack(hero, closest);
        } else {
          this.showMeleeSlash(hero, closest);
        }
      } else {
        this.showGenericAttack(hero, closest);
      }
    }
  }

  private showMeleeSlash(attacker: Hero, target: Hero): void {
    const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    const g = this.scene.add.graphics();
    g.setDepth(6);

    g.lineStyle(3, attacker.stats.color, 0.8);
    const cx = attacker.x + Math.cos(angle) * 15;
    const cy = attacker.y + Math.sin(angle) * 15;
    const slashRadius = 30;
    g.beginPath();
    g.arc(cx, cy, slashRadius, angle - 0.8, angle + 0.8, false);
    g.strokePath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      onComplete: () => g.destroy(),
    });

    // Impact burst
    const vfx = (this.scene as any).vfxManager as VFXManager | undefined;
    if (vfx) {
      const element = VFXManager.getElement(attacker.stats.id);
      vfx.spawnImpact(target.x, target.y, element, attacker.stats.color);
    }

    // Impact flash
    const flash = this.scene.add.circle(target.x, target.y, 12, 0xffffff, 0.6);
    flash.setDepth(4);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  private showRangedAttack(attacker: Hero, target: Hero): void {
    const dot = this.scene.add.circle(attacker.x, attacker.y, 4, attacker.stats.color, 0.8);
    dot.setDepth(5);

    this.scene.tweens.add({
      targets: dot,
      x: target.x,
      y: target.y,
      duration: 100,
      ease: 'Linear',
      onComplete: () => {
        dot.destroy();

        // Impact burst
        const vfx = (this.scene as any).vfxManager as VFXManager | undefined;
        if (vfx) {
          const element = VFXManager.getElement(attacker.stats.id);
          vfx.spawnImpact(target.x, target.y, element, attacker.stats.color);
        }

        const flash = this.scene.add.circle(target.x, target.y, 10, 0xffffff, 0.5);
        flash.setDepth(4);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 150,
          onComplete: () => flash.destroy(),
        });
      },
    });
  }

  /**
   * Generic attack VFX for non-Hero targets (boss, towers).
   */
  private showGenericAttack(attacker: Hero, target: BaseEntity): void {
    if (attacker.isRanged()) {
      // Ranged: small projectile dot flying to target
      const dot = this.scene.add.circle(attacker.x, attacker.y, 4, attacker.stats.color, 0.8);
      dot.setDepth(5);
      this.scene.tweens.add({
        targets: dot,
        x: target.x,
        y: target.y,
        duration: 100,
        ease: 'Linear',
        onComplete: () => {
          dot.destroy();
          const flash = this.scene.add.circle(target.x, target.y, 10, 0xffffff, 0.5);
          flash.setDepth(4);
          this.scene.tweens.add({
            targets: flash,
            alpha: 0, scaleX: 1.5, scaleY: 1.5,
            duration: 150,
            onComplete: () => flash.destroy(),
          });
        },
      });
    } else {
      // Melee: slash arc toward target
      const angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
      const g = this.scene.add.graphics();
      g.setDepth(6);
      g.lineStyle(3, attacker.stats.color, 0.8);
      const cx = attacker.x + Math.cos(angle) * 15;
      const cy = attacker.y + Math.sin(angle) * 15;
      g.beginPath();
      g.arc(cx, cy, 30, angle - 0.8, angle + 0.8, false);
      g.strokePath();
      this.scene.tweens.add({
        targets: g,
        alpha: 0, scaleX: 1.3, scaleY: 1.3,
        duration: 200,
        onComplete: () => g.destroy(),
      });
      const flash = this.scene.add.circle(target.x, target.y, 12, 0xffffff, 0.6);
      flash.setDepth(4);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 150,
        onComplete: () => flash.destroy(),
      });
    }
  }

  executeAbility(caster: Hero, ability: AbilityDef, targetX: number, targetY: number): void {
    const angle = Math.atan2(targetY - caster.y, targetX - caster.x);

    // Ultimate effects (R-slot)
    if (ability.isUltimate === true) {
      const vfx = (this.scene as any).vfxManager as VFXManager | undefined;
      if (vfx) {
        vfx.zoomPulse(500, 0.04);
        vfx.directionalShake(angle, 0.005, 300);
        vfx.screenFlash(caster.stats.color, 200, 0.3);
      } else {
        this.scene.cameras.main.shake(300, 0.01);
      }
    }

    switch (ability.type) {
      case AbilityType.PROJECTILE:
        this.fireProjectile(caster, ability, angle);
        break;
      case AbilityType.AREA:
        this.createAreaEffect(caster, ability, targetX, targetY);
        break;
      case AbilityType.BUFF:
        this.applyBuff(caster, ability, targetX, targetY);
        break;
      case AbilityType.DASH:
        this.executeDash(caster, ability, angle);
        break;
      case AbilityType.SELF_BUFF:
        this.applySelfBuff(caster, ability);
        break;
    }
  }

  private fireProjectile(caster: Hero, ability: AbilityDef, angle: number): void {
    const proj = new Projectile(
      this.scene,
      caster.x + Math.cos(angle) * 25,
      caster.y + Math.sin(angle) * 25,
      angle,
      ability,
      caster
    );
    this.projectiles.push(proj);
  }

  private createAreaEffect(caster: Hero, ability: AbilityDef, targetX: number, targetY: number): void {
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, targetX, targetY);
    const maxRange = ability.range || 300;
    let finalX = targetX;
    let finalY = targetY;

    if (dist > maxRange) {
      const angle = Math.atan2(targetY - caster.y, targetX - caster.x);
      finalX = caster.x + Math.cos(angle) * maxRange;
      finalY = caster.y + Math.sin(angle) * maxRange;
    }

    if (!ability.range) {
      finalX = caster.x;
      finalY = caster.y;
    }

    const area = new AreaEffect(this.scene, finalX, finalY, ability, caster);
    this.areaEffects.push(area);
  }

  private applyBuff(caster: Hero, ability: AbilityDef, targetX: number, targetY: number): void {
    if (!ability.buffType) return;

    const battleScene = this.scene as any;
    const allies = battleScene.getAllies(caster.team) as Hero[];

    if (ability.range) {
      let bestTarget: Hero | null = null;
      let bestDist = Infinity;

      const allTargets = [...allies, caster];
      for (const ally of allTargets) {
        if (!ally.isAlive) continue;
        const dist = Phaser.Math.Distance.Between(targetX, targetY, ally.x, ally.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestTarget = ally;
        }
      }

      if (bestTarget) {
        bestTarget.addBuff({
          type: ability.buffType,
          value: ability.buffValue || 0,
          duration: ability.buffDuration || 1,
          remaining: ability.buffDuration || 1,
          sourceId: caster.getUniqueId(),
        });

        this.showBuffEffect(bestTarget, ability.buffType);
      }
    } else {
      const range = 200;
      const allTargets = [...allies, caster];
      for (const ally of allTargets) {
        if (!ally.isAlive) continue;
        const dist = caster.distanceTo(ally);
        if (dist <= range) {
          ally.addBuff({
            type: ability.buffType,
            value: ability.buffValue || 0,
            duration: ability.buffDuration || 1,
            remaining: ability.buffDuration || 1,
            sourceId: caster.getUniqueId(),
          });
        }
      }
    }
  }

  private executeDash(caster: Hero, ability: AbilityDef, angle: number): void {
    const distance = ability.dashDistance || 200;
    const speed = ability.dashSpeed || 800;
    const duration = (distance / speed) * 1000;

    const targetX = caster.x + Math.cos(angle) * distance;
    const targetY = caster.y + Math.sin(angle) * distance;

    const hitEnemies = new Set<string>();

    // Ghost image interval
    const ghostInterval = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (!caster.isAlive) return;
        const ghost = this.scene.add.circle(caster.x, caster.y, 18, caster.stats.color, 0.4);
        ghost.setDepth(2);
        this.scene.tweens.add({
          targets: ghost,
          scaleX: 0.5,
          scaleY: 0.5,
          alpha: 0,
          duration: 300,
          onComplete: () => ghost.destroy(),
        });
      },
      repeat: Math.floor(duration / 50),
    });

    // Particle trail during dash
    const vfx = (this.scene as any).vfxManager as VFXManager | undefined;
    let dashTrail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    if (vfx) {
      const element = VFXManager.getElement(caster.stats.id);
      dashTrail = vfx.createTrail(caster, element, caster.stats.color);
    }

    // Dash movement
    this.scene.tweens.add({
      targets: caster,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Power1',
      onUpdate: () => {
        caster.body?.reset(caster.x, caster.y);
        if (ability.damage) {
          const battleScene = this.scene as any;
          const enemies = battleScene.getEnemies(caster.team) as Hero[];
          for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            if (hitEnemies.has(enemy.getUniqueId())) continue;
            const dist = Phaser.Math.Distance.Between(caster.x, caster.y, enemy.x, enemy.y);
            if (dist < 40) {
              hitEnemies.add(enemy.getUniqueId());
              enemy.takeDamage(ability.damage, caster.getUniqueId());
              if (ability.buffType) {
                enemy.addBuff({
                  type: ability.buffType,
                  value: ability.buffValue || 0,
                  duration: ability.buffDuration || 1,
                  remaining: ability.buffDuration || 1,
                  sourceId: caster.getUniqueId(),
                });
              }
            }
          }
        }
      },
      onComplete: () => {
        caster.body?.reset(caster.x, caster.y);
        ghostInterval.destroy();
        if (dashTrail?.active) {
          dashTrail.stop();
          this.scene.time.delayedCall(400, () => {
            if (dashTrail?.active) dashTrail.destroy();
          });
        }
      },
    });
  }

  private applySelfBuff(caster: Hero, ability: AbilityDef): void {
    if (!ability.buffType) return;

    caster.addBuff({
      type: ability.buffType,
      value: ability.buffValue || 0,
      duration: ability.buffDuration || 1,
      remaining: ability.buffDuration || 1,
      sourceId: caster.getUniqueId(),
    });

    this.showBuffEffect(caster, ability.buffType);
  }

  private showBuffEffect(hero: Hero, buffType: BuffType): void {
    const color = buffType === BuffType.SHIELD ? 0xffffff :
                  buffType === BuffType.STAT_BUFF ? 0xffff00 :
                  buffType === BuffType.HEAL_OVER_TIME ? 0x00ff00 : 0xaaaaaa;

    // Ring expanding with stroke and ADD blend
    const ring = this.scene.add.circle(hero.x, hero.y, 20);
    ring.setStrokeStyle(2, color, 0.8);
    ring.setFillStyle(0x000000, 0);
    ring.setDepth(4);
    ring.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });

    // Particle burst
    const vfx = (this.scene as any).vfxManager as VFXManager | undefined;
    if (vfx) {
      vfx.spawnBurst(hero.x, hero.y, 'generic', 8, color);
    }
  }
}
