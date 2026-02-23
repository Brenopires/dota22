import Phaser from 'phaser';
import { BaseEntity } from './BaseEntity';
import { Team } from '../types';
import { EventBus, Events } from '../systems/EventBus';
import { HealthBar } from './HealthBar';
import {
  TOWER_MAX_HP,
  TOWER_ATTACK_DAMAGE,
  TOWER_ATTACK_RADIUS,
  TOWER_ATTACK_INTERVAL,
  TOWER_RADIUS,
  TOWER_REGEN_RATE,
  TOWER_REGEN_DELAY,
} from '../constants';

/**
 * TowerEntity -- a static, team-owned defensive structure.
 *
 * Each team has a Core Tower positioned near their spawn. Towers provide
 * area denial via periodic AoE attacks on nearby enemy heroes, regenerate
 * HP when not under attack, and can be temporarily disabled. Tower
 * destruction is a match win condition (wired in plan 04-04).
 *
 * CRITICAL: die() emits TOWER_DESTROYED (NOT HERO_KILLED).
 * CRITICAL: Towers do NOT target Team.NEUTRAL entities (boss).
 */
export class TowerEntity extends BaseEntity {
  readonly entityType = 'tower' as const;

  private attackTimer = 0;
  private lastDamagedTime = 0;
  private disabled = false;
  private disableTimer = 0;
  private attackRadius: number;
  private attackDamage: number;

  // Visual references
  private rangeIndicator: Phaser.GameObjects.Arc;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private glowCircle: Phaser.GameObjects.Arc;
  private healthBar: HealthBar;

  constructor(scene: Phaser.Scene, x: number, y: number, team: Team) {
    super(scene, x, y, TOWER_MAX_HP, team);
    this.attackRadius = TOWER_ATTACK_RADIUS;
    this.attackDamage = TOWER_ATTACK_DAMAGE;

    const teamColor = team === Team.A ? 0x00aaff : 0xff4444;

    // --- Visuals (Container children, following Hero pattern) ---

    // Attack range indicator: faint circle showing AoE range
    this.rangeIndicator = scene.add.circle(0, 0, TOWER_ATTACK_RADIUS);
    this.rangeIndicator.setStrokeStyle(1, teamColor, 0.1);
    this.rangeIndicator.setFillStyle(0x000000, 0);
    this.add(this.rangeIndicator);

    // Team glow: circle with team-colored stroke and very faint fill
    this.glowCircle = scene.add.circle(0, 0, TOWER_RADIUS + 5);
    this.glowCircle.setStrokeStyle(2, teamColor, 0.3);
    this.glowCircle.setFillStyle(teamColor, 0.05);
    this.add(this.glowCircle);

    // Pulsing glow tween
    scene.tweens.add({
      targets: this.glowCircle,
      alpha: { from: 0.2, to: 0.4 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Base structure: rounded rect centered on (0,0) with team-colored border
    this.baseGraphics = scene.add.graphics();
    const size = TOWER_RADIUS * 2;
    this.baseGraphics.fillStyle(0x888888, 1);
    this.baseGraphics.fillRoundedRect(-TOWER_RADIUS, -TOWER_RADIUS, size, size, 6);
    this.baseGraphics.lineStyle(3, teamColor, 0.8);
    this.baseGraphics.strokeRoundedRect(-TOWER_RADIUS, -TOWER_RADIUS, size, size, 6);
    this.add(this.baseGraphics);

    // Label: "T" centered
    this.labelText = scene.add.text(0, 0, 'T', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5);
    this.add(this.labelText);

    // Health bar: use existing HealthBar class (same pattern as Hero)
    this.healthBar = new HealthBar(scene);
    for (const obj of this.healthBar.getGameObjects()) {
      this.add(obj);
    }

    // --- Add to scene with physics ---
    scene.add.existing(this);
    scene.physics.add.existing(this, false); // NOT static -- BaseEntity expects dynamic body

    // Configure physics body: immovable, never moves
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setCircle(TOWER_RADIUS, -TOWER_RADIUS, -TOWER_RADIUS);
    body.setVelocity(0, 0);
    body.moves = false;
    body.setCollideWorldBounds(true);
  }

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  /**
   * Per-frame update for the tower. Handles disable timer, attack logic,
   * and out-of-combat HP regen.
   */
  updateTower(dt: number, enemies: BaseEntity[]): void {
    if (!this.isAlive) return;

    // If disabled: decrement timer, auto-enable when expired, skip all logic
    if (this.disabled) {
      this.disableTimer -= dt;
      if (this.disableTimer <= 0) {
        this.enable();
      }
      return; // no attack, no regen while disabled
    }

    this.updateBuffs(dt);

    // --- Attack logic ---
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      // Filter enemies: alive, in range, NOT neutral (boss excluded)
      const targets = enemies.filter(e => {
        if (!e.isAlive) return false;
        if (e.team === Team.NEUTRAL) return false;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
        return dist <= TOWER_ATTACK_RADIUS;
      });

      if (targets.length > 0) {
        // Pick closest target
        let closest = targets[0];
        let closestDist = Phaser.Math.Distance.Between(this.x, this.y, closest.x, closest.y);
        for (let i = 1; i < targets.length; i++) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, targets[i].x, targets[i].y);
          if (d < closestDist) {
            closest = targets[i];
            closestDist = d;
          }
        }

        closest.takeDamage(this.attackDamage, this.getUniqueId());
        this.attackTimer = TOWER_ATTACK_INTERVAL;
        this.showAttackVFX(closest);
      }
    }

    // --- Regen logic ---
    const timeSinceDamage = this.scene.time.now - this.lastDamagedTime;
    if (timeSinceDamage > TOWER_REGEN_DELAY && this.currentHP < this.maxHP) {
      this.heal(TOWER_REGEN_RATE * dt);
    }

    // Update health bar (no mana bar for towers)
    const shieldRatio = this.shield / this.maxHP;
    this.healthBar.update(this.currentHP / this.maxHP, 0, shieldRatio);
  }

  /**
   * Temporarily disable the tower: no attacks, no regen for the given duration.
   */
  disable(duration: number): void {
    this.disabled = true;
    this.disableTimer = duration;
    EventBus.emit(Events.TOWER_DISABLED, { tower: this, duration });

    // Visual feedback: dim the base graphics
    this.baseGraphics.setAlpha(0.4);
  }

  /**
   * Returns whether the tower is currently disabled.
   */
  isDisabled(): boolean {
    return this.disabled;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Re-enable the tower after disable duration expires.
   */
  private enable(): void {
    this.disabled = false;
    this.disableTimer = 0;
    EventBus.emit(Events.TOWER_ENABLED, { tower: this });

    // Restore visual
    this.baseGraphics.setAlpha(1.0);
  }

  /**
   * Show attack VFX: line from tower to target, then fade + impact flash.
   */
  private showAttackVFX(target: BaseEntity): void {
    const teamColor = this.team === Team.A ? 0x00aaff : 0xff4444;

    // Draw a line from tower center to target position
    const lineGraphics = this.scene.add.graphics();
    lineGraphics.lineStyle(2, teamColor, 0.6);
    lineGraphics.lineBetween(this.x, this.y, target.x, target.y);
    lineGraphics.setDepth(50);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: lineGraphics,
      alpha: 0,
      duration: 200,
      onComplete: () => lineGraphics.destroy(),
    });

    // Impact flash circle at target position
    const flash = this.scene.add.circle(target.x, target.y, 12, teamColor, 0.5);
    flash.setDepth(50);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  getUniqueId(): string {
    return 'tower_' + this.team;
  }

  /**
   * Towers have flat armor of 10 (higher than heroes).
   */
  getArmor(): number {
    return 10;
  }

  // ---------------------------------------------------------------------------
  // Combat overrides
  // ---------------------------------------------------------------------------

  /**
   * Override takeDamage to track last damaged time for regen delay
   * and emit TOWER_DAMAGED event.
   */
  override takeDamage(rawDamage: number, sourceId?: string): number {
    if (!this.isAlive) return 0;

    // Track damage time for regen delay
    this.lastDamagedTime = this.scene.time.now;

    const finalDamage = super.takeDamage(rawDamage, sourceId);
    if (finalDamage > 0) {
      EventBus.emit(Events.TOWER_DAMAGED, { tower: this, damage: finalDamage });
    }
    return finalDamage;
  }

  // ---------------------------------------------------------------------------
  // Death -- CRITICAL: does NOT call super.die() to avoid HERO_KILLED emission
  // ---------------------------------------------------------------------------

  /**
   * Tower death path. Emits TOWER_DESTROYED (not HERO_KILLED).
   * Does NOT call super.die() -- that would emit HERO_KILLED which triggers
   * hero kill scoring, respawn logic, and XP grants.
   */
  protected die(killerId?: string): void {
    if (!this.isAlive) return; // idempotent guard
    this.isAlive = false;

    // Disable physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body?.setVelocity(0, 0);
    body?.setEnable(false);

    // Emit tower-specific death event
    EventBus.emit(Events.TOWER_DESTROYED, { tower: this, destroyedTeam: this.team, killerId });
    this.onDeath(killerId);
  }

  // ---------------------------------------------------------------------------
  // Death visuals
  // ---------------------------------------------------------------------------

  protected onDeath(killerId?: string): void {
    // Large explosion via VFX manager if available
    const battleScene = this.scene as any;
    if (battleScene.vfxManager?.spawnDeathExplosion) {
      battleScene.vfxManager.spawnDeathExplosion(this.x, this.y, 0xFF0000);
    }

    // Tween: scale down + fade + red flash
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
      },
    });

    // "TOWER DESTROYED!" text at tower position
    const text = this.scene.add.text(this.x, this.y - 50, 'TOWER DESTROYED!', {
      fontSize: '24px',
      color: '#ff0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 2000,
      onComplete: () => text.destroy(),
    });
  }
}
