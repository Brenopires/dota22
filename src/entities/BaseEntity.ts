import Phaser from 'phaser';
import { EventBus, Events } from '../systems/EventBus';
import { Team, ActiveBuff, BuffType } from '../types';

/**
 * Abstract base class for all damageable game entities (Hero, Boss, Tower, NeutralMob).
 *
 * Provides:
 * - Canonical die() path that emits HERO_KILLED on EventBus (decouples death notification)
 * - Shared combat logic: takeDamage, heal, addBuff, buff status checks, updateBuffs
 * - Abstract hooks subclasses must implement: entityType, getUniqueId(), onDeath()
 *
 * Physics body setup is intentionally NOT done here — each subclass uses its own
 * radius/bounds values and configures the body after calling super().
 */
export abstract class BaseEntity extends Phaser.GameObjects.Container {
  readonly abstract entityType: 'hero' | 'boss' | 'tower' | 'neutral_mob';

  team: Team;
  isAlive = true;
  currentHP: number;
  maxHP: number;
  buffs: ActiveBuff[] = [];
  shield = 0;
  body!: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHP: number, team: Team) {
    super(scene, x, y);
    this.maxHP = maxHP;
    this.currentHP = maxHP;
    this.team = team;
  }

  // ---------------------------------------------------------------------------
  // Abstract interface — subclasses must implement
  // ---------------------------------------------------------------------------

  abstract getUniqueId(): string;

  protected abstract onDeath(killerId?: string): void;

  // ---------------------------------------------------------------------------
  // Canonical death path
  // ---------------------------------------------------------------------------

  /**
   * die() is the single canonical death path for all entity types.
   * Idempotent guard prevents double-fire on AoE.
   * Emits HERO_KILLED on EventBus — respawn system (plan 01-04) intercepts this.
   * Then calls abstract onDeath() for subclass-specific visual/audio behavior.
   */
  protected die(killerId?: string): void {
    if (!this.isAlive) return; // idempotent guard — prevents double-fire on AoE
    this.isAlive = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body?.setVelocity(0, 0);
    body?.setEnable(false);
    body?.setCircle(0);
    EventBus.emit(Events.HERO_KILLED, { victim: this, killerId });
    this.onDeath(killerId);
  }

  // ---------------------------------------------------------------------------
  // Combat methods (shared across all entity types)
  // ---------------------------------------------------------------------------

  takeDamage(rawDamage: number, sourceId?: string): number {
    if (!this.isAlive) return 0;

    // Shield absorb
    let damage = rawDamage;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      for (const buff of this.buffs) {
        if (buff.type === BuffType.SHIELD && buff.value > 0) {
          const take = Math.min(buff.value, absorbed);
          buff.value -= take;
          damage -= take;
          if (damage <= 0) break;
        }
      }
      if (damage <= 0) return 0;
    }

    // Apply armor
    const finalDamage = Math.max(1, damage - this.getArmor());
    this.currentHP -= finalDamage;

    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die(sourceId);
    }

    return finalDamage;
  }

  heal(amount: number): void {
    if (!this.isAlive) return;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
  }

  addBuff(buff: ActiveBuff): void {
    this.buffs.push({ ...buff });
  }

  isStunned(): boolean {
    return this.buffs.some(b => b.type === BuffType.STUN && b.remaining > 0);
  }

  isRooted(): boolean {
    return this.buffs.some(b => b.type === BuffType.ROOT && b.remaining > 0);
  }

  isSilenced(): boolean {
    return this.buffs.some(b => b.type === BuffType.SILENCE && b.remaining > 0);
  }

  getSlowFactor(): number {
    let slowFactor = 1;
    for (const buff of this.buffs) {
      if (buff.type === BuffType.SLOW && buff.remaining > 0) {
        slowFactor *= (1 - buff.value);
      }
    }
    return slowFactor;
  }

  /**
   * Default armor — returns 0. Hero overrides via stats.armor.
   */
  getArmor(): number {
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Buff lifecycle
  // ---------------------------------------------------------------------------

  protected updateBuffs(dt: number): void {
    this.shield = 0;

    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const buff = this.buffs[i];
      buff.remaining -= dt;

      // Shield tracking
      if (buff.type === BuffType.SHIELD) {
        this.shield += buff.value;
      }

      // DoT / HoT tick
      if (buff.type === BuffType.DOT || buff.type === BuffType.HEAL_OVER_TIME) {
        if (!buff.tickTimer) buff.tickTimer = 0;
        buff.tickTimer += dt;
        const interval = buff.tickInterval || 1;
        if (buff.tickTimer >= interval) {
          buff.tickTimer -= interval;
          if (buff.type === BuffType.DOT) {
            this.takeDamage(buff.value, buff.sourceId);
          } else {
            this.heal(buff.value);
          }
        }
      }

      if (buff.remaining <= 0) {
        this.buffs.splice(i, 1);
      }
    }
  }
}
