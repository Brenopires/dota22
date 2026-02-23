import Phaser from 'phaser';
import { BossEntity } from '../entities/BossEntity';
import { BaseEntity } from '../entities/BaseEntity';
import { Hero } from '../entities/Hero';
import { BossPhase } from '../types';
import {
  BOSS_AGGRO_RADIUS,
  BOSS_LEASH_RADIUS,
  BOSS_ATTACK_RANGE,
  BOSS_MOVE_SPEED,
} from '../constants';

/**
 * BossAISystem -- standalone system driving boss behavior.
 *
 * NOT an AIController extension. Boss has no abilities, no mana, no hero
 * target-selection logic. Instead it uses aggro-radius targeting with a
 * sticky-target timer to prevent ping-pong switching, leash-to-home
 * (without healing), and 3 distinct phase-based attack patterns:
 *
 *   NORMAL  - single-target melee
 *   ENRAGED - melee + AoE ground slam
 *   DYING   - rapid attacks + larger AoE
 *
 * Boss targets ALL heroes regardless of team (neutral aggro).
 */
export class BossAISystem {
  private boss: BossEntity;
  private scene: Phaser.Scene;
  private homePosition: { x: number; y: number };
  private aggroTarget: BaseEntity | null = null;
  private stickyTargetTimer = 0;

  constructor(boss: BossEntity, scene: Phaser.Scene, homeX: number, homeY: number) {
    this.boss = boss;
    this.scene = scene;
    this.homePosition = { x: homeX, y: homeY };
  }

  /**
   * Per-frame update. Drives boss targeting, movement, and phase attacks.
   */
  update(dt: number, heroes: Hero[]): void {
    if (!this.boss.isAlive) return;

    // Tick boss internal timers (buffs, attackTimer)
    this.boss.updateBoss(dt);

    // Decrement sticky target timer
    if (this.stickyTargetTimer > 0) {
      this.stickyTargetTimer -= dt;
    }

    // --- Step 1: Find alive heroes within aggro radius ---
    const inRange: Hero[] = [];
    for (const h of heroes) {
      if (!h.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, h.x, h.y);
      if (dist <= BOSS_AGGRO_RADIUS) {
        inRange.push(h);
      }
    }

    // --- Step 2: Aggro management ---
    // If current target is alive and within leash, keep it (sticky)
    if (
      this.aggroTarget &&
      this.aggroTarget.isAlive &&
      Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.aggroTarget.x, this.aggroTarget.y) <= BOSS_LEASH_RADIUS &&
      this.stickyTargetTimer > 0
    ) {
      // keep current target
    } else if (inRange.length > 0) {
      // Pick closest hero in aggro range
      let closest = inRange[0];
      let closestDist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, closest.x, closest.y);
      for (let i = 1; i < inRange.length; i++) {
        const d = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, inRange[i].x, inRange[i].y);
        if (d < closestDist) {
          closest = inRange[i];
          closestDist = d;
        }
      }
      this.aggroTarget = closest;
      this.stickyTargetTimer = 2.0;
    } else {
      // No heroes in aggro range -- return home
      this.aggroTarget = null;
      this.returnToHome(dt);
      return;
    }

    // --- Step 3: Move toward target ---
    const target = this.aggroTarget!;
    const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, target.x, target.y);
    const angle = Math.atan2(target.y - this.boss.y, target.x - this.boss.x);

    if (dist > BOSS_ATTACK_RANGE) {
      // Move toward target
      const body = this.boss.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(
        Math.cos(angle) * BOSS_MOVE_SPEED,
        Math.sin(angle) * BOSS_MOVE_SPEED,
      );
    } else {
      // In attack range -- stop and attack
      const body = this.boss.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      this.executeAttack(heroes, target);
    }
  }

  // ---------------------------------------------------------------------------
  // Attack execution per phase
  // ---------------------------------------------------------------------------

  private executeAttack(heroes: Hero[], target: BaseEntity): void {
    if (this.boss.attackTimer > 0) return; // not ready

    // Reset timer
    this.boss.attackTimer = this.boss.getAttackInterval();

    switch (this.boss.phase) {
      case BossPhase.NORMAL:
        this.attackNormal(target);
        break;
      case BossPhase.ENRAGED:
        this.attackEnraged(heroes, target);
        break;
      case BossPhase.DYING:
        this.attackDying(heroes, target);
        break;
    }
  }

  /**
   * NORMAL phase: single-target melee.
   */
  private attackNormal(target: BaseEntity): void {
    const damage = this.boss.getAttackDamage();
    target.takeDamage(damage, this.boss.getUniqueId());
    this.showMeleeVFX(target);
  }

  /**
   * ENRAGED phase: melee hit on primary + AoE ground slam (50% damage)
   * to all heroes within 120px, excluding primary target.
   */
  private attackEnraged(heroes: Hero[], target: BaseEntity): void {
    const damage = this.boss.getAttackDamage();

    // Primary target: full damage
    target.takeDamage(damage, this.boss.getUniqueId());
    this.showMeleeVFX(target);

    // AoE: 50% damage to nearby heroes (excluding primary)
    const aoeDamage = Math.floor(damage * 0.5);
    for (const h of heroes) {
      if (!h.isAlive) continue;
      if (h === target) continue;
      const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, h.x, h.y);
      if (dist <= 120) {
        h.takeDamage(aoeDamage, this.boss.getUniqueId());
      }
    }

    this.showAoEVFX(0xff8800, 120);
    this.tryScreenShake(0.005, 300);
  }

  /**
   * DYING phase: rapid attacks + larger AoE (60% damage, 150px radius).
   * Primary target takes 120% damage (desperate strikes).
   */
  private attackDying(heroes: Hero[], target: BaseEntity): void {
    const damage = this.boss.getAttackDamage();

    // Primary target: 120% damage
    const primaryDamage = Math.floor(damage * 1.2);
    target.takeDamage(primaryDamage, this.boss.getUniqueId());
    this.showMeleeVFX(target);

    // AoE: 60% damage to nearby heroes (excluding primary)
    const aoeDamage = Math.floor(damage * 0.6);
    for (const h of heroes) {
      if (!h.isAlive) continue;
      if (h === target) continue;
      const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, h.x, h.y);
      if (dist <= 150) {
        h.takeDamage(aoeDamage, this.boss.getUniqueId());
      }
    }

    this.showAoEVFX(0xff0000, 150);
    this.tryScreenShake(0.008, 400);
  }

  // ---------------------------------------------------------------------------
  // Leash -- return to home WITHOUT healing
  // ---------------------------------------------------------------------------

  private returnToHome(_dt: number): void {
    const dist = Phaser.Math.Distance.Between(
      this.boss.x, this.boss.y,
      this.homePosition.x, this.homePosition.y,
    );

    if (dist < 10) {
      const body = this.boss.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      return;
    }

    const angle = Math.atan2(
      this.homePosition.y - this.boss.y,
      this.homePosition.x - this.boss.x,
    );
    const body = this.boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * BOSS_MOVE_SPEED,
      Math.sin(angle) * BOSS_MOVE_SPEED,
    );
    // IMPORTANT: Do NOT heal boss when returning (leash exploit prevention).
  }

  // ---------------------------------------------------------------------------
  // VFX helpers
  // ---------------------------------------------------------------------------

  /**
   * Red/orange slash arc from boss toward target.
   */
  private showMeleeVFX(target: BaseEntity): void {
    const angle = Math.atan2(target.y - this.boss.y, target.x - this.boss.x);
    const g = this.scene.add.graphics();
    g.setDepth(6);
    g.lineStyle(4, 0xff4400, 0.9);
    const cx = this.boss.x + Math.cos(angle) * 20;
    const cy = this.boss.y + Math.sin(angle) * 20;
    g.beginPath();
    g.arc(cx, cy, 40, angle - 0.8, angle + 0.8, false);
    g.strokePath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      onComplete: () => g.destroy(),
    });

    // Impact flash at target
    const flash = this.scene.add.circle(target.x, target.y, 14, 0xff4444, 0.6);
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

  /**
   * Expanding ring VFX for AoE attacks.
   */
  private showAoEVFX(color: number, radius: number): void {
    const ring = this.scene.add.circle(this.boss.x, this.boss.y, 10);
    ring.setStrokeStyle(3, color, 0.8);
    ring.setFillStyle(color, 0.1);
    ring.setDepth(3);

    this.scene.tweens.add({
      targets: ring,
      scaleX: radius / 10,
      scaleY: radius / 10,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Screen shake via VFX manager if available.
   */
  private tryScreenShake(intensity: number, duration: number): void {
    const battleScene = this.scene as any;
    if (battleScene.vfxManager?.directionalShake) {
      battleScene.vfxManager.directionalShake(0, intensity, duration);
    }
  }
}
