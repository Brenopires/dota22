import Phaser from 'phaser';
import { BaseEntity } from './BaseEntity';
import { Team, BossPhase, BuffType } from '../types';
import { EventBus, Events } from '../systems/EventBus';
import {
  BOSS_BASE_HP,
  BOSS_BASE_DAMAGE,
  BOSS_BASE_ARMOR,
  BOSS_SCALING_PER_MINUTE,
  BOSS_ATTACK_INTERVAL,
  BOSS_ENRAGED_ATTACK_INTERVAL,
  BOSS_DYING_ATTACK_INTERVAL,
  BOSS_RADIUS,
  BOSS_ENRAGED_THRESHOLD,
  BOSS_DYING_THRESHOLD,
  BOSS_MOVE_SPEED,
} from '../constants';

/**
 * BossEntity — the central neutral boss that both teams fight.
 *
 * Extends BaseEntity with entityType 'boss' and Team.NEUTRAL.
 * Uses health-threshold phase transitions (Normal -> Enraged -> Dying).
 * Scales stats per minute via scalePower() without full-healing.
 * Overrides die() to emit BOSS_KILLED instead of HERO_KILLED.
 */
export class BossEntity extends BaseEntity {
  readonly entityType = 'boss' as const;

  phase: BossPhase = BossPhase.NORMAL;

  private baseMaxHP: number;
  private baseDamage: number;
  private minutesElapsed = 0;
  attackTimer = 0;

  // Visual references for phase-change tinting
  private bossCircle: Phaser.GameObjects.Arc;
  private outerRing: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, BOSS_BASE_HP, Team.NEUTRAL);
    this.baseMaxHP = BOSS_BASE_HP;
    this.baseDamage = BOSS_BASE_DAMAGE;

    // --- Visuals (Container children, following Hero pattern) ---

    // Inner glow circle with ADD blend mode
    const innerGlow = scene.add.circle(0, 0, BOSS_RADIUS + 4, 0xff4444, 0.08);
    innerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.add(innerGlow);

    // Subtle pulse tween on inner glow
    scene.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.05, to: 0.15 },
      scaleX: { from: 1.0, to: 1.1 },
      scaleY: { from: 1.0, to: 1.1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Outer pulsing ring
    this.outerRing = scene.add.circle(0, 0, BOSS_RADIUS + 8);
    this.outerRing.setStrokeStyle(2, 0xff4444);
    this.outerRing.setFillStyle(0x000000, 0);
    this.add(this.outerRing);

    scene.tweens.add({
      targets: this.outerRing,
      alpha: { from: 0.4, to: 0.9 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main boss circle (dark red)
    this.bossCircle = scene.add.circle(0, 0, BOSS_RADIUS, 0x8B0000);
    this.add(this.bossCircle);

    // "B" label centered
    const label = scene.add.text(0, 0, 'B', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);
    this.add(label);

    // --- Add to scene with physics ---
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BOSS_RADIUS, -BOSS_RADIUS, -BOSS_RADIUS);
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(400);
    body.setMaxVelocity(BOSS_MOVE_SPEED);
  }

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  /**
   * Scale boss stats per minute. Heals ONLY the HP delta from new scaling
   * (NOT a full heal). Called by BossSystem each game minute.
   */
  scalePower(minute: number): void {
    this.minutesElapsed = minute;
    const multiplier = 1 + (minute * BOSS_SCALING_PER_MINUTE);
    const newMaxHP = Math.floor(this.baseMaxHP * multiplier);
    const hpDelta = newMaxHP - this.maxHP;
    this.maxHP = newMaxHP;
    if (hpDelta > 0) {
      this.currentHP += hpDelta; // heal only the delta
    }
    EventBus.emit(Events.BOSS_SCALED, { boss: this, minute, multiplier });
  }

  /**
   * Returns current attack damage factoring in scaling and STAT_BUFF buffs.
   */
  getAttackDamage(): number {
    let damage = Math.floor(this.baseDamage * (1 + this.minutesElapsed * BOSS_SCALING_PER_MINUTE));
    for (const buff of this.buffs) {
      if (buff.type === BuffType.STAT_BUFF && buff.remaining > 0) {
        damage += buff.value;
      }
    }
    return damage;
  }

  /**
   * Returns attack interval based on current phase.
   */
  getAttackInterval(): number {
    switch (this.phase) {
      case BossPhase.ENRAGED: return BOSS_ENRAGED_ATTACK_INTERVAL;
      case BossPhase.DYING:   return BOSS_DYING_ATTACK_INTERVAL;
      default:                return BOSS_ATTACK_INTERVAL;
    }
  }

  /**
   * Per-frame update: tick buffs and decrement attack timer.
   */
  updateBoss(dt: number): void {
    this.updateBuffs(dt);
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }
  }

  getUniqueId(): string {
    return 'boss_neutral';
  }

  /**
   * Boss armor increases by 1 each minute on top of base armor.
   */
  getArmor(): number {
    return BOSS_BASE_ARMOR + this.minutesElapsed;
  }

  // ---------------------------------------------------------------------------
  // Combat overrides
  // ---------------------------------------------------------------------------

  /**
   * Override takeDamage to check phase transitions and show damage numbers.
   */
  override takeDamage(rawDamage: number, sourceId?: string): number {
    if (!this.isAlive) return 0;
    const finalDamage = super.takeDamage(rawDamage, sourceId);
    if (finalDamage > 0) {
      this.checkPhaseTransition();
      this.showBossDamageNumber(finalDamage);
    }
    return finalDamage;
  }

  // ---------------------------------------------------------------------------
  // Phase transitions
  // ---------------------------------------------------------------------------

  /**
   * Check HP ratio and transition phases. DYING checked first so massive
   * damage that skips ENRAGED is handled correctly.
   */
  private checkPhaseTransition(): void {
    const hpRatio = this.currentHP / this.maxHP;

    if (hpRatio <= BOSS_DYING_THRESHOLD && this.phase !== BossPhase.DYING) {
      this.phase = BossPhase.DYING;
      EventBus.emit(Events.BOSS_PHASE_CHANGED, { phase: BossPhase.DYING, boss: this });
      this.showPhaseTransitionVFX();
    } else if (hpRatio <= BOSS_ENRAGED_THRESHOLD && this.phase === BossPhase.NORMAL) {
      this.phase = BossPhase.ENRAGED;
      EventBus.emit(Events.BOSS_PHASE_CHANGED, { phase: BossPhase.ENRAGED, boss: this });
      this.showPhaseTransitionVFX();
    }
  }

  private showPhaseTransitionVFX(): void {
    // Screen shake if VFX manager available
    const battleScene = this.scene as any;
    if (battleScene.vfxManager?.directionalShake) {
      battleScene.vfxManager.directionalShake(0, 0.01, 500);
    }

    // Flash phase text at boss position
    const isDying = this.phase === BossPhase.DYING;
    const text = this.scene.add.text(this.x, this.y - 50, isDying ? 'DYING!' : 'ENRAGED!', {
      fontSize: '20px',
      color: isDying ? '#ff0000' : '#ffff00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1500,
      onComplete: () => text.destroy(),
    });

    // Change boss circle tint based on phase
    switch (this.phase) {
      case BossPhase.ENRAGED:
        this.bossCircle.setFillStyle(0xFF4500);
        this.outerRing.setStrokeStyle(2, 0xFF4500);
        break;
      case BossPhase.DYING:
        this.bossCircle.setFillStyle(0xFF0000);
        this.outerRing.setStrokeStyle(2, 0xFF0000);
        break;
      default:
        this.bossCircle.setFillStyle(0x8B0000);
        this.outerRing.setStrokeStyle(2, 0xff4444);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Death — CRITICAL: does NOT call super.die() to avoid HERO_KILLED emission
  // ---------------------------------------------------------------------------

  /**
   * Boss death path. Emits BOSS_KILLED (not HERO_KILLED).
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

    // Emit boss-specific death event
    EventBus.emit(Events.BOSS_KILLED, { victim: this, killerId });
    this.onDeath(killerId);
  }

  // ---------------------------------------------------------------------------
  // Death visuals
  // ---------------------------------------------------------------------------

  protected onDeath(killerId?: string): void {
    // Large death explosion via VFX manager if available
    const battleScene = this.scene as any;
    if (battleScene.vfxManager?.spawnDeathExplosion) {
      battleScene.vfxManager.spawnDeathExplosion(this.x, this.y, 0xFF0000);
    }

    // Death animation: shrink + fade + rotate
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      angle: 360,
      duration: 800,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.setVisible(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Boss-specific damage number (simpler than Hero — red floating text)
  // ---------------------------------------------------------------------------

  private showBossDamageNumber(amount: number): void {
    const rounded = Math.round(amount);
    const offsetX = Phaser.Math.Between(-10, 10);

    const text = this.scene.add.text(this.x + offsetX, this.y - 35, `-${rounded}`, {
      fontSize: '14px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}
