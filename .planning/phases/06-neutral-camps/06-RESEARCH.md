# Phase 6: Neutral Camps & Arena - Research

**Researched:** 2026-02-23
**Domain:** Phaser 3 game entities, timer systems, buff architecture, HUD integration
**Confidence:** HIGH

## Summary

Phase 6 adds four neutral buff camps (Damage, Shield, Haste, Cooldown) to the arena, each guarded by a mob that respawns 60s after being cleared. Killing a camp grants a 30-second team-wide buff and 1 point to the scoring system. The existing codebase provides strong patterns for this: BossEntity and TowerEntity demonstrate how to extend BaseEntity with custom die() overrides, BossAISystem shows standalone mob AI, and the EventBus + HUD kill feed are already wired for event-driven notifications.

The primary technical risks are: (1) respawn timer cleanup on match restart (solved by tracking TimerEvents in a Map, same pattern as hero respawn timers), (2) buff type design (the existing BuffType enum needs a HASTE and COOLDOWN_REDUCTION type, while STAT_BUFF can serve for Damage and SHIELD already exists), and (3) integrating camp mobs into getNonHeroTargets() without breaking existing boss/tower targeting.

**Primary recommendation:** Follow the BossEntity pattern exactly for NeutralMob (custom die() emitting a new CAMP_CLEARED event, Team.NEUTRAL, simple aggro-only AI), use Phaser's `scene.time.delayedCall()` for respawn scheduling with explicit cleanup in shutdown(), and extend BuffType with two new values for Haste and CooldownReduction.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | Game framework | Already the project's core framework |
| TypeScript | 5.9.3 | Type system | Already configured |
| Vite | 6.4.1 | Bundler | Already configured |

### No New Dependencies Required
All Phase 6 functionality is built using existing Phaser APIs and project patterns. No new npm packages needed.

## Architecture Patterns

### Recommended File Structure for Phase 6
```
src/
  entities/
    NeutralMob.ts          # New: extends BaseEntity, entityType 'neutral_mob'
  systems/
    NeutralCampSystem.ts   # New: manages 4 camps, spawn/respawn, buff grants
    EventBus.ts            # Modified: add CAMP_CLEARED event
  types.ts                 # Modified: add CampType enum, BuffType.HASTE/COOLDOWN_REDUCTION
  constants.ts             # Modified: add camp constants
  scenes/
    BattleScene.ts         # Modified: instantiate NeutralCampSystem, extend getNonHeroTargets
  ui/
    HUD.ts                 # Modified: buff icon strip for team buffs
```

### Pattern 1: NeutralMob Entity (following BossEntity/TowerEntity pattern)

**What:** A new entity class extending BaseEntity with entityType `'neutral_mob'`, using Team.NEUTRAL. Overrides die() to emit CAMP_CLEARED instead of HERO_KILLED (same pattern as BossEntity emitting BOSS_KILLED and TowerEntity emitting TOWER_DESTROYED).

**When to use:** For all camp guardian mobs.

**Why this pattern (HIGH confidence):** Both BossEntity (line 267-280) and TowerEntity (line 284-296) use the identical pattern:
1. Override `die()` completely (do NOT call `super.die()`)
2. Duplicate the idempotent guard + physics disable
3. Emit a custom event (BOSS_KILLED / TOWER_DESTROYED / CAMP_CLEARED)
4. Call `this.onDeath(killerId)`

This is a deliberate architectural decision documented in [04-01]: "die() duplicates idempotent guard + physics disable instead of calling super.die() -- avoids HERO_KILLED emission."

**Example:**
```typescript
// NeutralMob.ts — death override (following BossEntity pattern exactly)
protected die(killerId?: string): void {
  if (!this.isAlive) return; // idempotent guard
  this.isAlive = false;

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
```

### Pattern 2: NeutralCampSystem (following BossAISystem + BattleScene boss management)

**What:** A standalone system that owns 4 NeutralMob instances, handles their simple AI, manages respawn timers, and listens for CAMP_CLEARED to grant team buffs.

**When to use:** Instantiated once in BattleScene.create(), updated in BattleScene.update(), cleaned up in BattleScene.shutdown().

**Why standalone system (HIGH confidence):** BossAISystem is a standalone class (not an AIController extension) because the boss has fundamentally different behavior from heroes. Camp mobs are even simpler than the boss -- they just need:
- Aggro-radius targeting (like BossAISystem lines 55-91)
- Move-to-target + attack (like BossAISystem lines 93-110)
- No phase transitions, no AoE, no leash-to-home
- Respawn scheduling (new, but follows hero respawn pattern from BattleScene lines 719-723)

### Pattern 3: Event-Driven Buff Distribution

**What:** When CAMP_CLEARED fires, the NeutralCampSystem looks up the killer's team, iterates all alive heroes on that team, and calls `hero.addBuff()` with the appropriate buff.

**Why (HIGH confidence):** This is the exact pattern used for boss kill rewards (BattleScene.onBossKilled lines 526-545): find killer by ID, get team, iterate allies, call addBuff(). The buff system on BaseEntity (addBuff/updateBuffs) already handles duration tracking and automatic removal.

### Anti-Patterns to Avoid

- **DO NOT call super.die() from NeutralMob.die():** This would emit HERO_KILLED, triggering hero kill counting, respawn scheduling, XP grants, and score tracking -- all wrong for a neutral camp mob.

- **DO NOT use the existing AIController for camp mob AI:** AIController is tightly coupled to Hero (uses Hero-specific methods like distanceTo(), useAbility(), hero.stats.archetype). Camp mobs need only basic pursuit + melee attack.

- **DO NOT create timers without cleanup references:** The project already hit this -- BattleScene.shutdown() carefully removes bossScaleTimer and respawnTimers. Camp respawn timers MUST be tracked and cleaned up identically.

- **DO NOT store camp respawn state as a running counter:** Use Phaser's `scene.time.delayedCall()` which returns a `TimerEvent` that can be cleanly removed. The BattleScene already uses this pattern for hero respawns (line 719).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Buff duration tracking | Custom timer per buff | BaseEntity.updateBuffs() (already exists, line 139-170) | Handles shield, DoT, HoT, auto-removal. Battle-tested across all heroes. |
| Timer cleanup on scene restart | Manual tracking of setTimeout/setInterval | Phaser's `scene.time.delayedCall()` + store TimerEvent ref | Phaser auto-pauses timers on scene pause, provides `.destroy()` for cleanup |
| Kill feed notifications | Custom UI component | HUD.showKill() (already exists, line 406-450) | Already handles max 4 entries, auto-dismiss with fade, right-aligned display |
| Damage numbers on camp mobs | Custom floating text system | Follow BossEntity.showBossDamageNumber() pattern (line 312-335) | Simple red floating text, proven pattern |
| Physics collision with camps | Manual distance checks | `scene.physics.add.collider()` / `scene.physics.add.overlap()` | Phaser's physics already handles hero-entity collisions (BattleScene lines 256-259) |

**Key insight:** This phase's power comes from composing existing systems (BaseEntity, EventBus, CombatSystem, HUD), not building new ones. The only truly new code is the NeutralMob entity, the NeutralCampSystem orchestrator, and the HUD buff icons.

## Common Pitfalls

### Pitfall 1: HERO_KILLED Emission from Camp Mobs
**What goes wrong:** If NeutralMob calls `super.die()`, it emits HERO_KILLED. This causes: (a) MatchStateMachine.onKill increments team score, (b) XPSystem.onKill awards kill XP as if a hero died, (c) hero passives with `on_kill` trigger fire, (d) BattleScene.onHeroKilled tries to schedule a respawn for the mob.
**Why it happens:** BaseEntity.die() emits HERO_KILLED by default (line 59).
**How to avoid:** Override die() completely, duplicating guard + physics disable, emitting CAMP_CLEARED instead. Both BossEntity and TowerEntity do this.
**Warning signs:** Camp kills incrementing the kill score display, respawn timer appearing for camp mobs.

### Pitfall 2: Timer Accumulation Across Match Restarts
**What goes wrong:** SC-2 requires "no timer accumulation across match restarts." If camp respawn timers are not cleaned up in shutdown(), they leak across scene restarts (EventBus is a module-level singleton that survives scene restarts per [01-01]).
**Why it happens:** Phaser scene lifecycle: when a scene restarts, `create()` runs again but stale TimerEvent callbacks from the previous scene still reference destroyed objects.
**How to avoid:** Store all camp respawn TimerEvents in a Map or array. In BattleScene.shutdown(), iterate and call `this.time.removeEvent(timer)` on each (matching the pattern at BattleScene line 851-853). Also remove EventBus listeners.
**Warning signs:** Console errors about destroyed objects, camps spawning at wrong times after rematch.

### Pitfall 3: getNonHeroTargets Not Including Camp Mobs
**What goes wrong:** Heroes can't auto-attack or use projectiles/area effects on camp mobs, because CombatSystem.tryAutoAttack (line 160) and projectile collision (line 88) only check `getNonHeroTargets()`.
**Why it happens:** getNonHeroTargets() currently returns only boss + enemy tower (BattleScene lines 874-887). Camp mobs are neutral, so they should be attackable by ALL teams -- same as the boss.
**How to avoid:** Extend getNonHeroTargets() to include alive camp mob entities from the NeutralCampSystem. Since camps are Team.NEUTRAL, the same logic as the boss applies (neutral is a valid target for everyone).
**Warning signs:** Heroes standing next to camp mobs without attacking, projectiles passing through camp mobs.

### Pitfall 4: Buff Applied to Dead Heroes
**What goes wrong:** When a camp is cleared, iterating team allies and calling addBuff() on dead heroes wastes buffs and may cause visual artifacts.
**Why it happens:** Heroes can be dead (isAlive = false) when a camp is cleared.
**How to avoid:** Filter for `ally.isAlive` before calling addBuff(), matching the pattern in BattleScene.onBossKilled (line 537: `if (ally.isAlive)`).
**Warning signs:** Buff durations that seem wrong, buffs appearing on dead heroes after respawn.

### Pitfall 5: Camp Mob Collisions with Boss/Towers
**What goes wrong:** Without physics colliders between camp mobs and boss/towers, they can overlap.
**Why it happens:** Phaser requires explicit collider setup between game objects.
**How to avoid:** Add `scene.physics.add.collider()` between each camp mob and obstacles, boss, towers, and other heroes -- following the pattern in BattleScene.create() lines 250-259.
**Warning signs:** Camp mobs walking through walls or other entities.

### Pitfall 6: Camp Buff Stacking
**What goes wrong:** Multiple Damage buffs stack additively, making heroes deal extreme damage.
**Why it happens:** addBuff() pushes a new buff object every time. If a team clears the same camp type before the previous buff expires, both are active. STAT_BUFF values stack because Hero.getAttackDamage() (line 429-434) sums ALL active STAT_BUFF entries.
**How to avoid:** Before adding a camp buff, remove any existing buff with the same camp source (e.g., sourceId = 'camp_damage'). Or simply allow stacking as a strategic reward (killing the same camp again within 30s is hard since it respawns after 60s -- no overlap possible). Given the 60s respawn and 30s buff duration, this is a non-issue: the buff always expires before the camp respawns.
**Warning signs:** N/A for Phase 6 (mathematically impossible with 60s respawn / 30s buff duration).

## Code Examples

### Example 1: Camp Constants
```typescript
// constants.ts additions
export const CAMP_MOB_HP = 600;
export const CAMP_MOB_DAMAGE = 25;
export const CAMP_MOB_ARMOR = 3;
export const CAMP_MOB_RADIUS = 22;
export const CAMP_MOB_AGGRO_RADIUS = 150;
export const CAMP_MOB_ATTACK_RANGE = 60;
export const CAMP_MOB_ATTACK_INTERVAL = 1.2;
export const CAMP_MOB_MOVE_SPEED = 60;
export const CAMP_MOB_SCALING_PER_MINUTE = 0.10;
export const CAMP_RESPAWN_DELAY = 60000; // ms
export const CAMP_BUFF_DURATION = 30;    // seconds
export const CAMP_BUFF_DAMAGE_VALUE = 15;
export const CAMP_BUFF_SHIELD_VALUE = 200;
export const CAMP_BUFF_HASTE_VALUE = 0.25;    // +25% move speed
export const CAMP_BUFF_COOLDOWN_VALUE = 0.20; // -20% cooldowns
```

### Example 2: CampType Enum and BuffType Extensions
```typescript
// types.ts additions
export enum CampType {
  DAMAGE = 'damage',
  SHIELD = 'shield',
  HASTE = 'haste',
  COOLDOWN = 'cooldown',
}

// BuffType enum extensions (add to existing enum)
export enum BuffType {
  // ... existing values ...
  HASTE = 'haste',               // increases move speed by value%
  COOLDOWN_REDUCTION = 'cdr',     // reduces ability cooldowns by value%
}
```

### Example 3: Camp Positions on Arena (1600x1200)
```typescript
// NeutralCampSystem — camp positions
// Arena: 1600w x 1200h. Boss at center (800, 600).
// Towers at (250, 600) and (1350, 600).
// Camps at compass points, ~300px from center, avoiding spawn/tower areas.

const CAMP_POSITIONS: Record<CampType, { x: number; y: number; name: string }> = {
  [CampType.DAMAGE]:   { x: 800,  y: 200,  name: 'North Camp' },   // top center
  [CampType.SHIELD]:   { x: 800,  y: 1000, name: 'South Camp' },   // bottom center
  [CampType.HASTE]:    { x: 400,  y: 600,  name: 'West Camp' },    // left, between tower A and boss
  [CampType.COOLDOWN]: { x: 1200, y: 600,  name: 'East Camp' },    // right, between boss and tower B
};
```

**Position rationale:**
- North/South camps (y=200, y=1000) are equidistant from both teams, creating contested objectives.
- West camp (x=400) is near Team A's tower (x=250), giving Team A proximity advantage.
- East camp (x=1200) is near Team B's tower (x=1350), giving Team B proximity advantage.
- All positions avoid the 20px border walls (arena borders at edges).
- Boss is at center (800, 600) -- camps at 200-400px distance create natural strategic zones.

**NOTE:** West/East camp positions may be too close to towers. Consider x=500/x=1100 for more breathing room. The planner should finalize based on playtesting feel, but the N/S/E/W symmetry principle is the right pattern.

### Example 4: EventBus Extensions
```typescript
// EventBus.ts additions
export const Events = {
  // ... existing events ...
  // Phase 6 additions:
  CAMP_CLEARED:     'camp:cleared',     // { victim: NeutralMob, killerId, campType }
  CAMP_BUFF_GRANTED:'camp:buff_granted', // { campType, team, duration }
  CAMP_RESPAWNED:   'camp:respawned',   // { campType }
} as const;
```

### Example 5: Respawn Timer Pattern (from existing codebase)
```typescript
// NeutralCampSystem — respawn scheduling
// Follows BattleScene hero respawn pattern (line 719-723)
private respawnTimers: Map<CampType, Phaser.Time.TimerEvent> = new Map();

private scheduleCampRespawn(campType: CampType): void {
  const timer = this.scene.time.delayedCall(CAMP_RESPAWN_DELAY, () => {
    this.spawnCamp(campType);
    this.respawnTimers.delete(campType);
    EventBus.emit(Events.CAMP_RESPAWNED, { campType });
  });
  this.respawnTimers.set(campType, timer);
}

// Cleanup in destroy() — matches BattleScene.shutdown() pattern (line 851-853)
destroy(): void {
  for (const timer of this.respawnTimers.values()) {
    this.scene.time.removeEvent(timer);
  }
  this.respawnTimers.clear();
  EventBus.off(Events.CAMP_CLEARED, this.onCampCleared, this);
}
```

### Example 6: Camp Mob AI (Simplified BossAISystem)
```typescript
// NeutralCampSystem — updateCampAI (simplified BossAISystem pattern)
// No leash, no phase transitions, no AoE. Just aggro + pursue + melee.
private updateCampAI(mob: NeutralMob, dt: number, heroes: Hero[]): void {
  if (!mob.isAlive) return;
  mob.updateMob(dt); // tick buffs + attack timer

  // Find closest hero in aggro radius
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

  if (!closest) {
    // Return to home position (camp spawn point)
    mob.returnToHome();
    return;
  }

  // Move toward target or attack if in range
  if (closestDist > CAMP_MOB_ATTACK_RANGE) {
    mob.moveToward(closest.x, closest.y);
  } else {
    mob.stopMoving();
    if (mob.attackTimer <= 0) {
      closest.takeDamage(mob.getAttackDamage(), mob.getUniqueId());
      mob.attackTimer = CAMP_MOB_ATTACK_INTERVAL;
      mob.showMeleeVFX(closest);
    }
  }
}
```

### Example 7: Buff Grant on Camp Clear
```typescript
// NeutralCampSystem — onCampCleared handler
private onCampCleared({ victim, killerId, campType }: {
  victim: BaseEntity; killerId?: string; campType: CampType;
}): void {
  const killer = this.heroes.find(h => h.getUniqueId() === killerId);
  if (!killer) return;

  const allies = this.heroes.filter(h => h.team === killer.team && h.isAlive);
  const buff = this.createCampBuff(campType);

  for (const ally of allies) {
    ally.addBuff(buff);
  }

  // Kill feed notification
  this.hud.showKill(`TEAM ${killer.team}`, `${campType.toUpperCase()} CAMP`);

  // Scoring: 1 point per camp clear
  // Emit score event for MatchStateMachine or Phase 7 scoring system
  EventBus.emit(Events.SCORE_UPDATED, { team: killer.team, source: 'camp', campType });

  // Schedule respawn
  this.scheduleCampRespawn(campType);
}
```

### Example 8: HUD Buff Icon Strip
```typescript
// HUD — team buff indicators (compact icon strip near player stats panel)
// Position: above the ability bar or to the right of the player stat panel
// Each active camp buff shows: colored icon + remaining seconds
//
// Layout concept:
//   [DMG +15] [SHD 200] [HST +25%] [CDR -20%]
//   green      white      cyan       purple
//
// Implementation: Check player's buffs array each frame for camp-specific sourceIds
// (e.g., sourceId starts with 'camp_'). Display small colored rectangles with text.
```

## Detailed Technical Analysis

### 1. NeutralMob Entity Design

**BaseEntity already declares `entityType: 'neutral_mob'`** (line 17: `readonly abstract entityType: 'hero' | 'boss' | 'tower' | 'neutral_mob'`). This was added in anticipation of this phase.

**Constructor pattern:** Follow BossEntity constructor (lines 41-105):
- Call `super(scene, x, y, HP, Team.NEUTRAL)`
- Create visual children (circle + label, simpler than boss)
- `scene.add.existing(this)` + `scene.physics.add.existing(this)`
- Configure physics body with setCircle

**Scaling:** Camps should scale with match time like the boss does. BossEntity.scalePower() (line 115-125) provides the pattern. Camp mobs are weaker than the boss, so use a lower scaling coefficient (0.10 vs boss's 0.15).

**getUniqueId():** Return `'camp_' + campType` (e.g., `'camp_damage'`). This is used as sourceId for buffs and as the killerId tracking.

### 2. Camp Positioning Strategy

**Arena dimensions:** 1600 x 1200, with 20px borders on all sides.
**Existing positions:**
- Boss: center (800, 600)
- Tower A: (250, 600)
- Tower B: (1350, 600)
- Spawn A: cluster around (120-180, 500-700)
- Spawn B: cluster around (1420-1480, 500-700)

**Recommended camp layout (N/S/E/W compass):**
```
        DAMAGE (800, 250)
            |
   HASTE ---+--- COOLDOWN
  (500,600) BOSS (1100,600)
            |
        SHIELD (800, 950)
```

North and South camps are equidistant from both teams (true neutral). West camp slightly favors Team A, East slightly favors Team B -- this is intentional to create asymmetric strategic decisions.

**Obstacle avoidance:** The ArenaGenerator creates obstacles based on layout (open, corridor, pillars, fortress, maze_light). Camp positions should avoid the densest obstacle clusters. The suggested positions (200-250px from center axes) are clear in all standard layouts.

### 3. Respawn Timer Architecture

**Use `scene.time.delayedCall()`** (HIGH confidence):
- The project already uses this for hero respawns (BattleScene line 719)
- Returns a `Phaser.Time.TimerEvent` that can be stored and cleaned up
- Automatically pauses when the scene pauses
- Cleanup via `scene.time.removeEvent(timer)` (BattleScene line 852)

**NOT a looping timer:** Each camp gets a one-shot delayed call after being cleared. When it fires, the camp respawns and the timer reference is deleted. New timer is created on next clear.

**Match restart safety:** Store all active respawn timers in a `Map<CampType, Phaser.Time.TimerEvent>`. In the system's `destroy()` method (called from BattleScene.shutdown()), iterate and remove all. This matches the existing respawnTimers cleanup pattern.

**Boss scaling timer pattern is NOT appropriate here:** The boss uses `scene.time.addEvent({ loop: true })` for 60s scaling ticks. Camp respawns are event-triggered (on clear), not periodic. Use one-shot timers.

### 4. Buff Type Design

**Existing BuffType enum has 8 values:** STUN, ROOT, SLOW, DOT, SHIELD, STAT_BUFF, HEAL_OVER_TIME, SILENCE.

**Camp buffs need:**

| Camp | Buff Effect | Can Use Existing BuffType? | Decision |
|------|-------------|---------------------------|----------|
| Damage (+15 flat dmg) | +damage for 30s | YES: BuffType.STAT_BUFF (Hero.getAttackDamage sums all STAT_BUFF values) | Use STAT_BUFF with sourceId 'camp_damage' |
| Shield (200 HP shield) | Absorb 200 dmg for 30s | YES: BuffType.SHIELD (BaseEntity.takeDamage handles shield absorb) | Use SHIELD with sourceId 'camp_shield' |
| Haste (+25% move speed) | +speed for 30s | NO existing type. SLOW reduces speed via getSlowFactor(). Need inverse. | NEW: BuffType.HASTE |
| Cooldown (-20% CDR) | Reduce cooldowns for 30s | NO existing type. Cooldown reduction has no buff mechanism. | NEW: BuffType.COOLDOWN_REDUCTION |

**New BuffType values needed:** HASTE and COOLDOWN_REDUCTION.

**HASTE implementation:** Add to Hero.getMoveSpeed():
```typescript
getMoveSpeed(): number {
  if (this.isStunned() || this.isRooted()) return 0;
  let speed = this.stats.moveSpeed * this.getSlowFactor();
  // Apply haste buffs
  for (const buff of this.buffs) {
    if (buff.type === BuffType.HASTE && buff.remaining > 0) {
      speed *= (1 + buff.value); // value = 0.25 means +25%
    }
  }
  return speed;
}
```

**COOLDOWN_REDUCTION implementation:** Add to Hero.updateHero() cooldown tick:
```typescript
// In updateHero cooldown loop:
const cdrFactor = this.getCooldownReductionFactor(); // 1.0 = normal, 1.2 = 20% faster
for (let i = 0; i < this.abilityCooldowns.length; i++) {
  if (this.abilityCooldowns[i] > 0) {
    this.abilityCooldowns[i] = Math.max(0, this.abilityCooldowns[i] - dt * cdrFactor);
  }
}
```

### 5. CombatSystem Integration

**getNonHeroTargets() must be extended** to include camp mobs. Current implementation (BattleScene lines 874-887):
```typescript
getNonHeroTargets(attackerTeam: Team): BaseEntity[] {
  const targets: BaseEntity[] = [];
  if (this.boss?.isAlive) targets.push(this.boss);
  if (attackerTeam === Team.A && this.towerB?.isAlive) targets.push(this.towerB);
  else if (attackerTeam === Team.B && this.towerA?.isAlive) targets.push(this.towerA);
  return targets;
}
```

**Extension:** Add all alive camp mobs from NeutralCampSystem. Since camps are Team.NEUTRAL, they're valid targets for everyone (same as boss):
```typescript
// Add after boss check:
if (this.neutralCampSystem) {
  for (const mob of this.neutralCampSystem.getAliveMobs()) {
    targets.push(mob);
  }
}
```

**This enables:** Auto-attacks on camp mobs (CombatSystem.tryAutoAttack line 160), projectile hits (CombatSystem.update line 88-99), and area effect damage (AreaEffect.updateEffect line 121-129).

**Note from [04-03]:** "Buffs not applied to boss/tower from projectile or area effect hits -- buff system is hero-only." Camp mobs should follow the same rule: take damage from projectiles/AoE but do NOT receive debuffs. This is already enforced in CombatSystem (line 94: "Do NOT apply buffs to boss/tower").

### 6. Camp Mob AI

**Recommendation:** The simplest possible AI, even simpler than BossAISystem.

| Feature | BossAISystem | Camp Mob AI |
|---------|-------------|-------------|
| Aggro radius | 250px | 150px |
| Leash to home | Yes (400px leash, no heal) | Yes (200px leash, full heal on reset) |
| Phase transitions | 3 phases (Normal/Enraged/Dying) | None |
| AoE attacks | Yes (Enraged/Dying phases) | No |
| Sticky target timer | 2s (prevents ping-pong) | No (always attack closest) |
| Scaling | Per minute | Per minute (lower coefficient) |

**Leash with heal:** Unlike the boss (which does NOT heal when returning to prevent leash exploits), camp mobs SHOULD full-heal on leash reset. This prevents cheese strategies where players kite the mob away and slowly whittle it down with ranged attacks.

**AI lives in NeutralCampSystem, not a separate class:** The camp AI is simple enough (~20 lines) to be a method on NeutralCampSystem rather than a separate class file. The BossAISystem is a separate class because it has phase-based attack patterns.

### 7. Kill Feed

**Already exists and works well.** HUD.showKill() (lines 406-450) accepts `killerName` and `victimName` strings, displays up to 4 entries, auto-dismisses after 4 seconds with fade.

**For camp clears:** Call `this.hud.showKill('TEAM ' + team, 'DAMAGE CAMP')` -- matching the boss kill pattern (BattleScene line 560: `this.hud.showKill('TEAM ' + team, 'ANCIENT GUARDIAN')`).

### 8. Scoring Integration

**Current scoring system:** MatchStateMachine.onKill() (line 39-45) listens for HERO_KILLED and increments team scores. BattleScene tracks teamAKills/teamBKills separately (lines 699-700).

**Camp scoring challenge:** SC-4 says "1 point per camp clear." But the existing score system only tracks hero kills. Phase 7 is planned for "full scoring" which likely refactors this.

**Recommendation for Phase 6 (prepare without over-building):**
1. Emit a SCORE_UPDATED event from NeutralCampSystem when a camp is cleared.
2. Have MatchStateMachine listen for CAMP_CLEARED and add 1 to the appropriate team's score.
3. This minimally extends the existing score mechanism without needing Phase 7's full scoring system.

**Alternative:** Simply increment BattleScene.teamAKills or teamBKills by 1 on camp clear. Quick, dirty, but the HUD kill score display (line 194) already reads these values. The downside is mixing hero kills with camp clears in the same counter.

**Best approach:** Add a `campClears` field to the score object in MatchStateMachine, and have the score display show total (kills + camp clears). This keeps data clean for Phase 7 to consume.

### 9. HUD Buff Icon Display

**Current HUD layout (screen-space, all setScrollFactor(0)):**
- Top center: Timer (circle bg at y=28)
- Below timer: Kill score (y=56)
- Below score: Trait indicator (y=76)
- Below trait: Boss health bar (y=80)
- Left/right of score: Tower indicators (y=46-62)
- Bottom left: Player stat panel (y=GAME_HEIGHT-100, 200x90 rect)
- Bottom center: Ability bar
- Right side: Kill feed (top-right corner)

**Buff icon placement options:**
1. **Above ability bar (recommended):** A horizontal strip showing active team buffs, positioned between the stat panel and the ability bar area. Width ~200px, showing up to 4 small icons.
2. **Below the boss health bar:** Would cluster too much info at the top.
3. **Right side of stat panel:** Space is tight but possible.

**Buff icon implementation:** For each active camp buff on the player hero (detected by sourceId prefix 'camp_'), render a small colored rectangle (~24x24) with a 1-2 letter abbreviation and remaining seconds.

**Color scheme per camp type:**
- Damage: Red/Orange (0xFF4444) -- "DMG"
- Shield: White (0xFFFFFF) -- "SHD"
- Haste: Cyan (0x00FFFF) -- "HST"
- Cooldown: Purple (0xAA44FF) -- "CDR"

**Update pattern:** In HUD.update(), iterate player.buffs looking for camp buff sourceIds. Show/hide icons accordingly. This is a per-frame check but very cheap (max 4 buffs to scan).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BaseEntity.die() was the only death path | Each entity type overrides die() with custom event | Phase 04 | CAMP_CLEARED follows this pattern |
| All entities shared HERO_KILLED event | Boss: BOSS_KILLED, Tower: TOWER_DESTROYED | Phase 04 | Camp needs CAMP_CLEARED |
| getNonHeroTargets() returned only boss | Returns boss + enemy tower | Phase 04 | Must extend to include camp mobs |
| Score = hero kills only | Score = hero kills (MatchStateMachine) | Phase 01 | Must extend for camp clears |

## Open Questions

1. **Camp Mob Visual Design**
   - What we know: Heroes use procedural textures (TextureGenerator), boss is a dark red circle with "B" label, towers are rounded rectangles with "T" label.
   - What's unclear: Should camp mobs use unique textures per camp type, or simple colored circles with camp-type abbreviations (D, S, H, C)?
   - Recommendation: Simple colored circles with 1-letter labels, matching the minimalist style. Use camp-type-specific colors (red/white/cyan/purple). Add a colored glow ring to distinguish from boss.

2. **Camp Buff Values Balance**
   - What we know: Boss kill gives +20 damage for 60s. Camp buffs should be weaker (30s duration, smaller values).
   - What's unclear: Exact values for shield HP, haste %, and CDR % need playtesting.
   - Recommendation: Start with Damage=+15, Shield=200HP, Haste=+25%, CDR=-20%. These are meaningful but not game-breaking.

3. **Camp Mob HP Scaling Formula**
   - What we know: Boss scales at +15% per minute. Camp mobs should scale slower.
   - What's unclear: Whether scaling should be linear or match the boss formula.
   - Recommendation: Use same formula as boss but with 0.10 coefficient. At minute 3: mob HP = 600 * 1.30 = 780.

4. **Arena Zone Labels**
   - What we know: Plan 06-01 mentions "named zones: boss area, tower positions, N/S/E/W camp positions."
   - What's unclear: Are zone labels visible on the map as text, or just conceptual for code organization?
   - Recommendation: Add subtle zone name labels on the arena floor (very low alpha, large font). These help players orient. Example: faint "NORTH" text near the Damage camp.

5. **AI Hero Behavior Toward Camps**
   - What we know: AI heroes currently target enemy heroes, boss, and towers (via getNonHeroTargets). Adding camp mobs to getNonHeroTargets makes them auto-attackable.
   - What's unclear: Should AI heroes proactively seek out and clear camps? Or only attack camps when they wander into aggro range?
   - Recommendation: For Phase 6, camps are "passive" AI targets -- heroes only engage them when in range, not through goal-seeking. AI camp-seeking behavior is a Phase 7+ enhancement.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all source files in `/Users/brenopires/Projetos/games/dota22/src/`
- BaseEntity.ts: die() pattern, buff system, entityType union
- BossEntity.ts: die() override pattern, scaling, constructor, Team.NEUTRAL usage
- TowerEntity.ts: die() override pattern, attack AI, HealthBar usage
- BossAISystem.ts: standalone AI pattern, aggro/leash/attack cycle
- CombatSystem.ts: getNonHeroTargets usage, projectile/AoE collision with non-hero entities
- BattleScene.ts: getNonHeroTargets implementation, timer cleanup, boss/tower lifecycle
- EventBus.ts: event naming conventions, module-level singleton
- HUD.ts: kill feed implementation, layout coordinates, update pattern
- Hero.ts: buff application, getMoveSpeed, getAttackDamage, updateHero cooldown tick
- MatchStateMachine.ts: score tracking, HERO_KILLED listener
- types.ts: BuffType enum, Team enum, ActiveBuff interface
- constants.ts: arena dimensions, boss/tower constants patterns

### Secondary (MEDIUM confidence)
- Phaser 3.90.0 Time plugin: `scene.time.delayedCall()` returns TimerEvent, `scene.time.removeEvent()` for cleanup. Based on project's existing usage patterns (verified in codebase).
- Phaser 3.90.0 Physics: `scene.physics.add.collider()` for entity-entity collision. Based on project's existing collider setup (BattleScene lines 250-259).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns from existing codebase
- Architecture: HIGH - directly extends proven BossEntity/TowerEntity/BossAISystem patterns
- Pitfalls: HIGH - identified from actual code analysis (die() event emission, timer cleanup, getNonHeroTargets)
- Buff design: HIGH for Damage/Shield (existing BuffType), MEDIUM for Haste/CDR (new BuffType values, straightforward implementation)
- HUD layout: MEDIUM - positioning is educated guess based on current layout analysis, may need adjustment
- Camp positions: MEDIUM - geometrically sound but untested for gameplay feel

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable codebase, no external dependency changes)
