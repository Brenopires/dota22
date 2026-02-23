import Phaser from 'phaser';
import { NeutralMob } from '../entities/NeutralMob';
import { Hero } from '../entities/Hero';
import { BaseEntity } from '../entities/BaseEntity';
import { CampType, BuffType, Team, ActiveBuff } from '../types';
import { EventBus, Events } from '../systems/EventBus';
import {
  CAMP_MOB_AGGRO_RADIUS,
  CAMP_MOB_LEASH_RADIUS,
  CAMP_MOB_ATTACK_RANGE,
  CAMP_MOB_ATTACK_INTERVAL,
  CAMP_RESPAWN_DELAY,
  CAMP_BUFF_DURATION,
  CAMP_BUFF_DAMAGE_VALUE,
  CAMP_BUFF_SHIELD_VALUE,
  CAMP_BUFF_HASTE_VALUE,
  CAMP_BUFF_COOLDOWN_VALUE,
} from '../constants';
import { HUD } from '../ui/HUD';

// ---------------------------------------------------------------------------
// Camp positions — cardinal positions around the boss at arena center (800, 600)
// West/East use 500/1100 for breathing room from towers at x=250/x=1350
// ---------------------------------------------------------------------------

const CAMP_POSITIONS: Record<CampType, { x: number; y: number; name: string }> = {
  [CampType.DAMAGE]:   { x: 800,  y: 250,  name: 'NORTH' },
  [CampType.SHIELD]:   { x: 800,  y: 950,  name: 'SOUTH' },
  [CampType.HASTE]:    { x: 500,  y: 600,  name: 'WEST' },
  [CampType.COOLDOWN]: { x: 1100, y: 600,  name: 'EAST' },
};

/**
 * NeutralCampSystem — orchestrates all 4 neutral buff camps.
 *
 * Responsibilities:
 *   - Spawns one NeutralMob per CampType at match start (N/S/E/W positions)
 *   - Drives simple aggro+leash AI for each mob (NO sticky target, NO phases, NO AoE)
 *   - Handles CAMP_CLEARED: grants team-wide buff, shows kill feed, schedules respawn
 *   - Manages respawn timers — all cleaned up in destroy() to prevent match restart leaks
 *   - Hooks into bossMinute timer for per-minute scaling via scaleCamps()
 */
export class NeutralCampSystem {
  private scene: Phaser.Scene;
  private heroes: Hero[];
  private hud: HUD;
  private mobs: Map<CampType, NeutralMob> = new Map();
  private respawnTimers: Map<CampType, Phaser.Time.TimerEvent> = new Map();
  private minutesElapsed = 0;

  constructor(scene: Phaser.Scene, heroes: Hero[], hud: HUD) {
    this.scene = scene;
    this.heroes = heroes;
    this.hud = hud;

    // Spawn all 4 camps
    for (const campType of Object.values(CampType)) {
      this.spawnCamp(campType);
    }

    // Subscribe to camp clear event
    EventBus.on(Events.CAMP_CLEARED, this.onCampCleared, this);
  }

  // ---------------------------------------------------------------------------
  // Spawn / respawn
  // ---------------------------------------------------------------------------

  private spawnCamp(campType: CampType): void {
    const pos = CAMP_POSITIONS[campType];

    if (this.mobs.has(campType)) {
      // Mob already exists — call respawn() to revive it in place
      const mob = this.mobs.get(campType)!;
      mob.respawn();
      if (this.minutesElapsed > 0) {
        mob.scalePower(this.minutesElapsed);
      }
      EventBus.emit(Events.CAMP_RESPAWNED, { campType });
    } else {
      // First spawn — create new NeutralMob instance
      const mob = new NeutralMob(this.scene, pos.x, pos.y, campType);
      if (this.minutesElapsed > 0) {
        mob.scalePower(this.minutesElapsed);
      }
      this.mobs.set(campType, mob);

      // Subtle zone label: faint text above camp to help players orient
      const label = this.scene.add.text(pos.x, pos.y - 30, pos.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      });
      label.setOrigin(0.5);
      label.setAlpha(0.15);
      label.setDepth(1);

      EventBus.emit(Events.CAMP_RESPAWNED, { campType });
    }
  }

  // ---------------------------------------------------------------------------
  // Public API for BattleScene
  // ---------------------------------------------------------------------------

  /**
   * Returns all alive camp mobs. Used by BattleScene.getNonHeroTargets().
   */
  getAliveMobs(): NeutralMob[] {
    const alive: NeutralMob[] = [];
    for (const mob of this.mobs.values()) {
      if (mob.isAlive) {
        alive.push(mob);
      }
    }
    return alive;
  }

  /**
   * Per-frame update — drives AI for all alive mobs.
   */
  update(dt: number, heroes: Hero[]): void {
    for (const mob of this.mobs.values()) {
      if (mob.isAlive) {
        this.updateCampAI(mob, dt, heroes);
      }
    }
  }

  /**
   * Scale all alive camp mobs to match current match minute.
   * Called by BattleScene bossScaleTimer callback.
   */
  scaleCamps(minute: number): void {
    this.minutesElapsed = minute;
    for (const mob of this.mobs.values()) {
      if (mob.isAlive) {
        mob.scalePower(minute);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Camp AI — simplified BossAISystem pattern (NO sticky target, NO AoE)
  // ---------------------------------------------------------------------------

  private updateCampAI(mob: NeutralMob, dt: number, heroes: Hero[]): void {
    // 1. Tick buffs + attack timer
    mob.updateMob(dt);

    // 2. Find closest alive hero within aggro radius
    let closest: Hero | null = null;
    let closestDist = Infinity;
    for (const h of heroes) {
      if (!h.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(mob.x, mob.y, h.x, h.y);
      if (dist <= CAMP_MOB_AGGRO_RADIUS && dist < closestDist) {
        closest = h;
        closestDist = dist;
      }
    }

    // 3. No hero in range — return to home
    if (!closest) {
      mob.returnToHome();
      return;
    }

    // 4. Leash check — too far from spawn point, return
    // We use CAMP_POSITIONS (same coordinates used to spawn the mob) for the leash origin
    const campPos = CAMP_POSITIONS[mob.campType];
    const leashDist = Phaser.Math.Distance.Between(mob.x, mob.y, campPos.x, campPos.y);
    if (leashDist > CAMP_MOB_LEASH_RADIUS) {
      mob.returnToHome();
      return;
    }

    // 5. Move toward target or attack
    if (closestDist > CAMP_MOB_ATTACK_RANGE) {
      mob.moveToward(closest.x, closest.y);
    } else {
      // In attack range
      mob.stopMoving();
      if (mob.attackTimer <= 0) {
        closest.takeDamage(mob.getAttackDamage(), mob.getUniqueId());
        mob.attackTimer = CAMP_MOB_ATTACK_INTERVAL;
        mob.showMeleeVFX(closest);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Camp cleared handler
  // ---------------------------------------------------------------------------

  private onCampCleared({ victim, killerId, campType }: { victim: BaseEntity; killerId?: string; campType: CampType }): void {
    // Find killer hero
    const killer = this.heroes.find(h => h.getUniqueId() === killerId);
    if (!killer) return; // Edge case: killed by DoT with no source

    // Get alive allies on killer's team
    const allies = this.heroes.filter(h => h.team === killer.team && h.isAlive);

    // Create and apply buff
    const buff = this.createCampBuff(campType);
    for (const ally of allies) {
      ally.addBuff({ ...buff });
    }

    // Emit buff granted event
    EventBus.emit(Events.CAMP_BUFF_GRANTED, { campType, team: killer.team, duration: CAMP_BUFF_DURATION });

    // Kill feed notification
    this.hud.showKill('TEAM ' + killer.team, campType.toUpperCase() + ' CAMP');

    // Schedule respawn
    this.scheduleCampRespawn(campType);
  }

  // ---------------------------------------------------------------------------
  // Buff factory
  // ---------------------------------------------------------------------------

  private createCampBuff(campType: CampType): ActiveBuff {
    switch (campType) {
      case CampType.DAMAGE:
        return {
          type: BuffType.STAT_BUFF,
          value: CAMP_BUFF_DAMAGE_VALUE,
          duration: CAMP_BUFF_DURATION,
          remaining: CAMP_BUFF_DURATION,
          sourceId: 'camp_damage',
        };
      case CampType.SHIELD:
        return {
          type: BuffType.SHIELD,
          value: CAMP_BUFF_SHIELD_VALUE,
          duration: CAMP_BUFF_DURATION,
          remaining: CAMP_BUFF_DURATION,
          sourceId: 'camp_shield',
        };
      case CampType.HASTE:
        return {
          type: BuffType.HASTE,
          value: CAMP_BUFF_HASTE_VALUE,
          duration: CAMP_BUFF_DURATION,
          remaining: CAMP_BUFF_DURATION,
          sourceId: 'camp_haste',
        };
      case CampType.COOLDOWN:
        return {
          type: BuffType.COOLDOWN_REDUCTION,
          value: CAMP_BUFF_COOLDOWN_VALUE,
          duration: CAMP_BUFF_DURATION,
          remaining: CAMP_BUFF_DURATION,
          sourceId: 'camp_cooldown',
        };
    }
  }

  // ---------------------------------------------------------------------------
  // Respawn scheduling
  // ---------------------------------------------------------------------------

  private scheduleCampRespawn(campType: CampType): void {
    const timer = this.scene.time.delayedCall(CAMP_RESPAWN_DELAY, () => {
      this.spawnCamp(campType);
      this.respawnTimers.delete(campType);
    });
    this.respawnTimers.set(campType, timer);
  }

  // ---------------------------------------------------------------------------
  // Cleanup — CRITICAL: must remove all timers and listeners on match restart
  // ---------------------------------------------------------------------------

  destroy(): void {
    // Remove EventBus listener
    EventBus.off(Events.CAMP_CLEARED, this.onCampCleared, this);

    // Clear all pending respawn timers
    for (const timer of this.respawnTimers.values()) {
      this.scene.time.removeEvent(timer);
    }
    this.respawnTimers.clear();

    // Clear mobs map (NeutralMob GameObjects are owned by Phaser scene, cleaned up on scene shutdown)
    this.mobs.clear();
  }
}
