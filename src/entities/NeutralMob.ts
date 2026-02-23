import Phaser from 'phaser';
import { BaseEntity } from './BaseEntity';
import { Team, CampType } from '../types';
import { EventBus, Events } from '../systems/EventBus';
import {
  CAMP_MOB_HP,
  CAMP_MOB_DAMAGE,
  CAMP_MOB_ARMOR,
  CAMP_MOB_RADIUS,
  CAMP_MOB_MOVE_SPEED,
  CAMP_MOB_SCALING_PER_MINUTE,
} from '../constants';

/**
 * NeutralMob — a camp guardian entity for the four neutral buff camps.
 *
 * Extends BaseEntity with entityType 'neutral_mob' and Team.NEUTRAL.
 * Overrides die() to emit CAMP_CLEARED (not HERO_KILLED) — same pattern
 * as BossEntity emitting BOSS_KILLED instead of HERO_KILLED.
 *
 * Each camp type (Damage/Shield/Haste/Cooldown) has a distinct color and
 * single-letter label. NeutralCampSystem (Plan 04) owns instances of this.
 */
export class NeutralMob extends BaseEntity {
  readonly entityType = 'neutral_mob' as const;

  campType: CampType;
  attackTimer = 0; // public, like BossEntity.attackTimer

  private homePosition: { x: number; y: number };
  private baseMaxHP: number;
  private baseDamage: number;
  private minutesElapsed = 0;
  private mobCircle: Phaser.GameObjects.Arc;
  private mobLabel: Phaser.GameObjects.Text;

  // ---------------------------------------------------------------------------
  // Camp type visual mappings
  // ---------------------------------------------------------------------------

  private static readonly CAMP_COLORS: Record<CampType, number> = {
    [CampType.DAMAGE]:   0xFF4444,
    [CampType.SHIELD]:   0xCCCCCC,
    [CampType.HASTE]:    0x00FFFF,
    [CampType.COOLDOWN]: 0xAA44FF,
  };

  private static readonly CAMP_LABELS: Record<CampType, string> = {
    [CampType.DAMAGE]:   'D',
    [CampType.SHIELD]:   'S',
    [CampType.HASTE]:    'H',
    [CampType.COOLDOWN]: 'C',
  };

  constructor(scene: Phaser.Scene, x: number, y: number, campType: CampType) {
    super(scene, x, y, CAMP_MOB_HP, Team.NEUTRAL);

    this.campType = campType;
    this.homePosition = { x, y };
    this.baseMaxHP = CAMP_MOB_HP;
    this.baseDamage = CAMP_MOB_DAMAGE;

    const campColor = NeutralMob.CAMP_COLORS[campType];

    // --- Visuals (Container children, following BossEntity pattern) ---

    // Glow ring: ADD blend + subtle pulse tween
    const glowRing = scene.add.circle(0, 0, CAMP_MOB_RADIUS + 4, campColor, 0.08);
    glowRing.setBlendMode(Phaser.BlendModes.ADD);
    this.add(glowRing);

    scene.tweens.add({
      targets: glowRing,
      alpha: { from: 0.05, to: 0.15 },
      scaleX: { from: 1.0, to: 1.08 },
      scaleY: { from: 1.0, to: 1.08 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Outer ring: stroke only + alpha pulse
    const outerRing = scene.add.circle(0, 0, CAMP_MOB_RADIUS + 6);
    outerRing.setStrokeStyle(1.5, campColor);
    outerRing.setFillStyle(0x000000, 0);
    this.add(outerRing);

    scene.tweens.add({
      targets: outerRing,
      alpha: { from: 0.3, to: 0.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main circle — stored for color changes
    this.mobCircle = scene.add.circle(0, 0, CAMP_MOB_RADIUS, campColor);
    this.add(this.mobCircle);

    // Label: single letter centered (D/S/H/C)
    const labelChar = NeutralMob.CAMP_LABELS[campType];
    this.mobLabel = scene.add.text(0, 0, labelChar, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.mobLabel.setOrigin(0.5);
    this.add(this.mobLabel);

    // --- Add to scene with physics ---
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(CAMP_MOB_RADIUS, -CAMP_MOB_RADIUS, -CAMP_MOB_RADIUS);
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(400);
    body.setMaxVelocity(CAMP_MOB_MOVE_SPEED);
  }

  // ---------------------------------------------------------------------------
  // BaseEntity interface implementation
  // ---------------------------------------------------------------------------

  getUniqueId(): string {
    return 'camp_' + this.campType; // e.g., 'camp_damage'
  }

  // ---------------------------------------------------------------------------
  // Combat methods
  // ---------------------------------------------------------------------------

  getAttackDamage(): number {
    return Math.floor(this.baseDamage * (1 + this.minutesElapsed * CAMP_MOB_SCALING_PER_MINUTE));
  }

  getArmor(): number {
    return CAMP_MOB_ARMOR;
  }

  // ---------------------------------------------------------------------------
  // Per-minute scaling — same pattern as BossEntity.scalePower()
  // ---------------------------------------------------------------------------

  scalePower(minute: number): void {
    this.minutesElapsed = minute;
    const multiplier = 1 + (minute * CAMP_MOB_SCALING_PER_MINUTE);
    const newMaxHP = Math.floor(this.baseMaxHP * multiplier);
    const hpDelta = newMaxHP - this.maxHP;
    this.maxHP = newMaxHP;
    if (hpDelta > 0) {
      this.currentHP += hpDelta; // heal only the delta, not full heal
    }
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  /**
   * Tick buffs and decrement attack timer.
   * Called each frame by NeutralCampSystem.
   */
  updateMob(dt: number): void {
    this.updateBuffs(dt);
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }
  }

  // ---------------------------------------------------------------------------
  // Movement helpers
  // ---------------------------------------------------------------------------

  moveToward(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * CAMP_MOB_MOVE_SPEED,
      Math.sin(angle) * CAMP_MOB_MOVE_SPEED,
    );
  }

  stopMoving(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  /**
   * Return mob to spawn origin. Full-heals on arrival.
   * Called by NeutralCampSystem when mob is out of leash range.
   */
  returnToHome(): void {
    const dist = Phaser.Math.Distance.Between(
      this.x, this.y,
      this.homePosition.x, this.homePosition.y,
    );

    if (dist < 10) {
      this.stopMoving();
      this.currentHP = this.maxHP; // full-heal on arrival
      return;
    }

    this.moveToward(this.homePosition.x, this.homePosition.y);
  }

  // ---------------------------------------------------------------------------
  // Combat VFX
  // ---------------------------------------------------------------------------

  /**
   * Melee slash VFX toward target — smaller than boss (radius 25, lineWidth 3).
   * Following BossAISystem.showMeleeVFX pattern.
   */
  showMeleeVFX(target: BaseEntity): void {
    const campColor = NeutralMob.CAMP_COLORS[this.campType];
    const duration = 200;

    // Slash line from mob toward target
    const slashLine = this.scene.add.graphics();
    slashLine.setDepth(50);
    slashLine.lineStyle(3, campColor, 0.9);
    slashLine.lineBetween(this.x, this.y, target.x, target.y);

    this.scene.tweens.add({
      targets: slashLine,
      alpha: 0,
      duration,
      onComplete: () => slashLine.destroy(),
    });

    // Impact flash at target position
    const flash = this.scene.add.circle(target.x, target.y, 10, campColor, 0.7);
    flash.setDepth(50);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  // ---------------------------------------------------------------------------
  // Damage override — show floating damage number
  // ---------------------------------------------------------------------------

  override takeDamage(rawDamage: number, sourceId?: string): number {
    if (!this.isAlive) return 0;
    const finalDamage = super.takeDamage(rawDamage, sourceId);
    if (finalDamage > 0) {
      this.showMobDamageNumber(finalDamage);
    }
    return finalDamage;
  }

  // ---------------------------------------------------------------------------
  // Death — CRITICAL: does NOT call super.die() to avoid HERO_KILLED emission
  // ---------------------------------------------------------------------------

  /**
   * Camp mob death path. Emits CAMP_CLEARED (NOT HERO_KILLED).
   * Does NOT call super.die() — that would emit HERO_KILLED which triggers
   * hero kill scoring, respawn logic, and XP grants.
   */
  protected die(killerId?: string): void {
    if (!this.isAlive) return; // idempotent guard
    this.isAlive = false;

    // Disable physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body?.setVelocity(0, 0);
    body?.setEnable(false);
    body?.setCircle(0);

    // Emit camp-specific death event (NOT HERO_KILLED)
    EventBus.emit(Events.CAMP_CLEARED, {
      victim: this,
      killerId,
      campType: this.campType,
    });

    this.onDeath(killerId);
  }

  // ---------------------------------------------------------------------------
  // Death visuals
  // ---------------------------------------------------------------------------

  protected onDeath(killerId?: string): void {
    const campColor = NeutralMob.CAMP_COLORS[this.campType];

    // Death explosion via VFX manager if available
    const battleScene = this.scene as any;
    if (battleScene.vfxManager?.spawnDeathExplosion) {
      battleScene.vfxManager.spawnDeathExplosion(this.x, this.y, campColor);
    }

    // Death animation: shrink + fade + rotate (400ms, Back.easeIn)
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      angle: 360,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.setVisible(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Respawn — called by NeutralCampSystem to revive this mob
  // ---------------------------------------------------------------------------

  /**
   * Fully restore the mob to its initial live state.
   * Called by NeutralCampSystem after the respawn delay (60s) elapses.
   */
  respawn(): void {
    this.isAlive = true;
    this.currentHP = this.maxHP;
    this.buffs = [];
    this.shield = 0;
    this.attackTimer = 0;

    this.setPosition(this.homePosition.x, this.homePosition.y);
    this.setScale(1);
    this.setAlpha(0);
    this.setVisible(true);
    this.setAngle(0);

    // Re-enable and reconfigure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setEnable(true);
    body.setCircle(CAMP_MOB_RADIUS, -CAMP_MOB_RADIUS, -CAMP_MOB_RADIUS);
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(400);
    body.setMaxVelocity(CAMP_MOB_MOVE_SPEED);
    body.setVelocity(0, 0);

    // Fade in
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private showMobDamageNumber(amount: number): void {
    const campColor = NeutralMob.CAMP_COLORS[this.campType];
    const rounded = Math.round(amount);
    const offsetX = Phaser.Math.Between(-10, 10);

    // Convert 0xRRGGBB to CSS hex string for Phaser text color
    const r = (campColor >> 16) & 0xFF;
    const g = (campColor >> 8) & 0xFF;
    const b = campColor & 0xFF;
    const colorStr = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    const text = this.scene.add.text(this.x + offsetX, this.y - 30, `-${rounded}`, {
      fontSize: '12px',
      color: colorStr,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}
