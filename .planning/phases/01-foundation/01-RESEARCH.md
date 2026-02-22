# Phase 1: Foundation - Research

**Researched:** 2026-02-22
**Domain:** Phaser 3 event system, abstract entity hierarchy, match state machines, timer lifecycle, respawn systems
**Confidence:** HIGH — All core Phaser APIs verified against official docs; codebase read directly; architectural patterns cross-verified with prior project research

---

## Summary

Phase 1 installs four foundational systems that every subsequent phase depends on: a typed EventBus singleton, a BaseEntity abstract class, a MatchStateMachine, and a respawn system. The codebase already has all the raw ingredients — Phaser's built-in EventEmitter3, a Container-based Hero class, timer infrastructure — but they are wired together through direct method calls, `as any` casts, and ad-hoc booleans. This phase replaces those shortcuts with formal abstractions.

The single most critical change is replacing `Hero.die() → endMatchAsDefeat()` with `Hero.die() → EventBus.emit(HERO_KILLED) → respawn timer`. This unlocks 5-minute matches because heroes no longer end the match on death. Every other plan in this phase supports or depends on that change: the EventBus makes the decoupled notification possible, BaseEntity gives Hero and future entities a shared `die()` implementation, MatchStateMachine replaces the `matchOver` boolean with a formal `PRE_MATCH → ACTIVE → ENDED` transition, and the HUD extension shows the countdown timer in MM:SS format.

The confirmed Phaser timer leak bug (timers not destroyed on scene restart) is a direct threat to the success criteria for "Play Again." The correct fix is `this.time.removeEvent(handle)` called from `BattleScene.shutdown()` — NOT `.destroy()` on the event object (which doesn't actually remove it from the clock).

**Primary recommendation:** Build in strict dependency order — EventBus first, BaseEntity second, Hero refactor third, MatchStateMachine fourth, respawn fifth, HUD timer last. Any other order requires rework.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser.Events.EventEmitter | Built into Phaser 3.87+ | Typed event bus singleton | Already bundled — zero new dependencies; uses EventEmitter3 under the hood; official cross-system communication mechanism per Phaser docs |
| TypeScript | ^5.7.0 | Type-safe event constants and entity hierarchy | Already in use; `as const` objects for event name typing prevent typo bugs |
| Phaser.Time.Clock | Built into Phaser | Scene-scoped timer management | `scene.time.addEvent()` — already used; fix is in cleanup, not a new API |

### No New Dependencies Required

This entire phase uses zero new npm packages. Every API needed already exists in Phaser 3 or TypeScript.

---

## Architecture Patterns

### Recommended Project Structure for Phase 1

```
src/
├── systems/
│   ├── EventBus.ts          # NEW: module-level singleton emitter + Events constants
│   └── MatchStateMachine.ts # NEW: PRE_MATCH → ACTIVE → ENDED FSM
├── entities/
│   ├── BaseEntity.ts        # NEW: abstract class (HP, mana, buffs, die(), respawn hook)
│   └── Hero.ts              # REFACTOR: extend BaseEntity, remove duplicated logic
├── ui/
│   └── HUD.ts               # EXTEND: MM:SS timer display, respawn countdown overlay
├── scenes/
│   └── BattleScene.ts       # REFACTOR: shutdown cleanup, spawn points, respawn dispatch
└── types.ts                 # EXTEND: MatchPhase enum, IBattleScene interface, Events type
```

---

### Pattern 1: EventBus Singleton

**What:** A single `Phaser.Events.EventEmitter` instance exported as a module-level constant. Event names are typed string constants in a co-located `Events` object. All cross-system communication goes through it — no more `battleScene as any` for kill notifications.

**When to use:** Any time two systems need to react to each other's state changes without holding a direct reference.

**Why Phaser's EventEmitter:** Phaser 3 bundles EventEmitter3 (HIGH confidence, official docs confirmed). It supports `on(event, callback, context)` — the context parameter is critical for proper cleanup because it lets `off(event, callback, context)` remove the correct listener without a closure reference. The standalone emitter pattern avoids the documented pitfall of using `game.events` (which survives scene restarts and accumulates listeners).

**Example:**
```typescript
// src/systems/EventBus.ts
import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
  HERO_KILLED:        'hero:killed',
  HERO_RESPAWNED:     'hero:respawned',
  MATCH_STATE_CHANGE: 'match:state_change',
  RESPAWN_TICK:       'respawn:tick',
  SCORE_UPDATED:      'score:updated',
} as const;

export type EventKey = typeof Events[keyof typeof Events];
```

**Cleanup pattern — critical for Phase 1:**
```typescript
// In any class that subscribes:
class MatchStateMachine {
  init(): void {
    EventBus.on(Events.HERO_KILLED, this.onKill, this);  // 'this' is the context
  }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this); // removes ONLY this listener
    // OR: EventBus.removeAllListeners() — nuclear option, clears everything
  }
}
```

**Confidence:** HIGH — `Phaser.Events.EventEmitter` verified in official Phaser docs. The `on(name, callback, scope)` signature with matching `off(name, callback, scope)` is confirmed to remove only the specific scoped listener.

---

### Pattern 2: BaseEntity Abstract Class

**What:** An abstract class that `Hero` refactors to extend. Houses the shared contract for all damageable game objects: `takeDamage()`, `heal()`, `addBuff()`, `isAlive`, physics body, death VFX hook, and EventBus emission on death.

**Key design decision:** `die()` in BaseEntity emits `HERO_KILLED` on the EventBus, then calls `onDeath()` — a protected abstract hook for subclass-specific visual behavior (Hero's shrink-and-disappear tween). This separates match logic (handled by MatchStateMachine listening on EventBus) from visual behavior (handled in Hero.onDeath()).

**Why this matters for Phase 1:** The respawn system needs to intercept the death event without Hero knowing anything about respawn. The clean separation is: `BaseEntity.die() → EventBus.emit(HERO_KILLED)` → MatchStateMachine/BattleScene schedules respawn. Hero.die() never calls `onHeroKill()` directly again.

**Example:**
```typescript
// src/entities/BaseEntity.ts
import Phaser from 'phaser';
import { EventBus, Events } from '../systems/EventBus';
import { ActiveBuff, BuffType, Team } from '../types';

export abstract class BaseEntity extends Phaser.GameObjects.Container {
  abstract readonly entityType: 'hero' | 'boss' | 'tower' | 'neutral_mob';
  team: Team;
  isAlive = true;
  currentHP: number;
  maxHP: number;
  buffs: ActiveBuff[] = [];
  shield = 0;

  takeDamage(rawDamage: number, sourceId?: string): number {
    if (!this.isAlive) return 0;
    // shield absorption, armor, decrement HP...
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die(sourceId);
    }
    return finalDamage;
  }

  heal(amount: number): void { /* shared logic */ }
  addBuff(buff: ActiveBuff): void { /* shared logic */ }
  isStunned(): boolean { /* shared logic */ }

  protected die(killerId?: string): void {
    if (!this.isAlive) return;   // guard: Hero.takeDamage calls die; must be idempotent
    this.isAlive = false;
    this.body?.setEnable(false);
    EventBus.emit(Events.HERO_KILLED, { victim: this, killerId });
    this.onDeath(killerId);      // visual/subclass behavior
  }

  protected abstract onDeath(killerId?: string): void;
  abstract getUniqueId(): string;
}
```

**Hero refactor surface:**
- Hero extends BaseEntity instead of Phaser.GameObjects.Container
- `private die()` becomes `protected onDeath()` — visual tween only, no kill notification
- `takeDamage()`, `heal()`, `addBuff()`, `isStunned()`, `isRooted()`, `isSilenced()`, `getSlowFactor()` all move to BaseEntity
- `updateBuffs()` moves to BaseEntity
- Hero constructor passes `maxHP` and `team` to super

**Confidence:** HIGH — pattern verified against existing codebase (Hero.ts read directly); extends Phaser.GameObjects.Container with super(scene, x, y) is confirmed working pattern in existing code.

---

### Pattern 3: MatchStateMachine

**What:** A class that owns the match phase enum and enforces valid transitions. Replaces `this.matchOver: boolean` on BattleScene. Listens on EventBus for kill events; drives timer via `scene.time`; emits `MATCH_STATE_CHANGE` when state changes.

**States for Phase 1:** `PRE_MATCH → ACTIVE → ENDED` (SUDDEN_DEATH is Phase 7, do not add now)

**Key responsibilities:**
- Count kills per team (replaces `teamAKills`/`teamBKills` raw fields — though they can stay on BattleScene for HUD compatibility)
- Own the 5-minute countdown timer handle (so it can be destroyed on shutdown)
- Transition to ENDED when timer reaches 0
- Guard against double-end (replaces the `if (this.matchOver) return` pattern)

**Example:**
```typescript
// src/systems/MatchStateMachine.ts
import { EventBus, Events } from './EventBus';
import { Team } from '../types';
import { BaseEntity } from '../entities/BaseEntity';

export enum MatchPhase {
  PRE_MATCH = 'pre_match',
  ACTIVE    = 'active',
  ENDED     = 'ended',
}

export class MatchStateMachine {
  private phase: MatchPhase = MatchPhase.PRE_MATCH;
  private scene: Phaser.Scene;
  private matchTimerEvent: Phaser.Time.TimerEvent | null = null;
  private matchTimeRemaining: number; // seconds
  private score = { teamA: 0, teamB: 0 };

  constructor(scene: Phaser.Scene, matchDurationSeconds: number) {
    this.scene = scene;
    this.matchTimeRemaining = matchDurationSeconds;
  }

  start(): void {
    if (this.phase !== MatchPhase.PRE_MATCH) return;
    this.transition(MatchPhase.ACTIVE);
    EventBus.on(Events.HERO_KILLED, this.onKill, this);

    // Store timer handle for cleanup
    this.matchTimerEvent = this.scene.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      loop: true,
    });
  }

  private onTick(): void {
    if (this.phase !== MatchPhase.ACTIVE) return;
    this.matchTimeRemaining--;
    EventBus.emit(Events.MATCH_TIMER_TICK, { remaining: this.matchTimeRemaining });
    if (this.matchTimeRemaining <= 0) {
      this.transition(MatchPhase.ENDED);
    }
  }

  private onKill({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    if (this.phase === MatchPhase.ENDED) return;
    if (victim.team === Team.A) this.score.teamB++;
    else this.score.teamA++;
    EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
    // DO NOT check win condition here — respawn system handles that
  }

  transition(next: MatchPhase): void {
    // Only allow forward transitions
    const order = [MatchPhase.PRE_MATCH, MatchPhase.ACTIVE, MatchPhase.ENDED];
    if (order.indexOf(next) <= order.indexOf(this.phase)) return;
    this.phase = next;
    EventBus.emit(Events.MATCH_STATE_CHANGE, { phase: next, score: this.score });
  }

  getPhase(): MatchPhase { return this.phase; }
  getTimeRemaining(): number { return this.matchTimeRemaining; }
  getScore(): { teamA: number; teamB: number } { return { ...this.score }; }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this);
    if (this.matchTimerEvent) {
      this.scene.time.removeEvent(this.matchTimerEvent); // correct cleanup - not .destroy()
      this.matchTimerEvent = null;
    }
  }
}
```

**Confidence:** HIGH — state enum pattern from Game Programming Patterns; `scene.time.removeEvent()` verified as correct cleanup via Phaser discourse.

---

### Pattern 4: Respawn System

**What:** Logic in BattleScene that intercepts `HERO_KILLED` events, starts a per-hero respawn timer (max 10 seconds), and re-enters the hero at their team's spawn point.

**Architecture decision:** Respawn logic lives in BattleScene (or a thin `RespawnSystem` class), NOT in BaseEntity or Hero. Heroes should be ignorant of whether they will respawn — that is a match-rule decision, not an entity decision. For Phase 1, inline in BattleScene is acceptable; refactor to RespawnSystem in a later phase if it grows complex.

**Spawn points:** The `ArenaConfig` already has `spawnA: {x,y}[]` and `spawnB: {x,y}[]` arrays. BattleScene already stores the arenaConfig result from `ArenaGenerator.generate()`. Store spawn points as a BattleScene field for respawn to reference.

**Respawn sequence:**
1. `HERO_KILLED` fires — BattleScene listener starts respawn timer for victim hero
2. Hero becomes invisible (already done by death tween), `isAlive = false`, physics disabled
3. Respawn countdown ticks (emit `RESPAWN_TICK` for HUD to show)
4. On timer complete: reset HP/mana, re-enable physics body, position at spawn, fade in, `isAlive = true`
5. Re-add hero to collision groups if removed during death

**Example:**
```typescript
// In BattleScene, inside EventBus.on(Events.HERO_KILLED) handler:
private onHeroKilled({ victim, killerId }: { victim: BaseEntity }): void {
  const hero = victim as Hero;

  // Update kill count tracking
  if (hero.team === Team.A) this.teamBKills++;
  else this.teamAKills++;
  if (hero === this.player) this.playerDeaths++;

  const killerHero = this.findHeroById(killerId);
  if (killerHero === this.player) this.playerKills++;
  this.hud.showKill(killerHero?.stats.name ?? 'Unknown', hero.stats.name);

  // Respawn — NOT instant defeat
  const respawnDelay = Math.min(hero.getRespawnTime(), 10000); // max 10s
  const respawnTimer = this.time.delayedCall(respawnDelay, () => {
    this.respawnHero(hero);
  });
  this.respawnTimers.set(hero.getUniqueId(), respawnTimer);
}

private respawnHero(hero: Hero): void {
  const spawnPoints = hero.team === Team.A ? this.spawnA : this.spawnB;
  const spawn = spawnPoints[0]; // could randomize among spawns

  hero.currentHP = hero.maxHP;
  hero.currentMana = hero.stats.maxMana;
  hero.buffs = [];
  hero.shield = 0;
  hero.setPosition(spawn.x, spawn.y);
  hero.setScale(1);
  hero.setAlpha(0);
  hero.setVisible(true);
  hero.isAlive = true;

  const body = hero.body as Phaser.Physics.Arcade.Body;
  body.setEnable(true);
  body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
  body.setVelocity(0, 0);

  // Fade in
  this.tweens.add({
    targets: hero,
    alpha: 1,
    duration: 500,
    ease: 'Power2',
  });

  EventBus.emit(Events.HERO_RESPAWNED, { hero });
  this.respawnTimers.delete(hero.getUniqueId());
}
```

**Respawn timer storage (for shutdown cleanup):**
```typescript
// In BattleScene class fields:
private respawnTimers: Map<string, Phaser.Time.TimerEvent> = new Map();

// In BattleScene.shutdown():
for (const timer of this.respawnTimers.values()) {
  this.time.removeEvent(timer);
}
this.respawnTimers.clear();
```

**Confidence:** HIGH — pattern consistent with codebase's existing `time.delayedCall` pattern; spawn points already in `ArenaConfig` type; `scene.time.removeEvent()` confirmed correct API.

---

### Pattern 5: IBattleScene Interface

**What:** A TypeScript interface in `types.ts` that replaces all `as any` casts in Hero, CombatSystem, AIController, etc. Hero's `useAbility()` and `die()` currently do `const battleScene = this.scene as any`. With IBattleScene, they cast to the interface instead.

**Why now:** Phase 1 adds `matchStateMachine` and `spawnA`/`spawnB` to BattleScene. Continuing to add properties behind `as any` is the exact anti-pattern identified in CONCERNS.md. Defining IBattleScene before adding new properties establishes the typed contract for all future phases.

**Minimal Phase 1 interface (add properties as phases add them):**
```typescript
// src/types.ts — add this interface
export interface IBattleScene {
  heroes: Hero[];
  teamA: Hero[];
  teamB: Hero[];
  player: Hero;
  combatSystem: CombatSystem;
  vfxManager: VFXManager;
  matchStateMachine: MatchStateMachine;
  spawnA: { x: number; y: number }[];
  spawnB: { x: number; y: number }[];
  getEnemies(team: Team): Hero[];
  getAllies(team: Team, excludeSelf?: Hero): Hero[];
}
```

**Cast pattern (replaces `as any`):**
```typescript
// In Hero.ts (and CombatSystem.ts, AIController.ts):
const battleScene = this.scene as unknown as IBattleScene;
// `as unknown as IBattleScene` is the TypeScript-safe alternative to `as any`
```

**Confidence:** HIGH — pure TypeScript; no Phaser API involved; this is the documented fix for the CONCERNS.md issue.

---

### Pattern 6: Timer Cleanup in BattleScene.shutdown()

**What:** A complete audit of all timers in BattleScene, with explicit `scene.time.removeEvent(handle)` calls in `shutdown()`. This fixes the confirmed `tickTimer` accumulation bug.

**Correct API (verified):** `this.time.removeEvent(timerEvent)` — not `timerEvent.remove()`, not `timerEvent.destroy()`. The discourse forum confirms `.destroy()` doesn't actually remove the event from the Clock's internal list.

**Complete shutdown pattern:**
```typescript
// BattleScene class fields:
private respawnTimers: Map<string, Phaser.Time.TimerEvent> = new Map();

// BattleScene.shutdown():
shutdown(): void {
  // Destroy EventBus listeners that this scene registered
  EventBus.off(Events.HERO_KILLED, this.onHeroKilled, this);
  EventBus.off(Events.MATCH_STATE_CHANGE, this.onMatchStateChange, this);

  // Destroy MatchStateMachine (removes its timer + listeners)
  if (this.matchStateMachine) {
    this.matchStateMachine.destroy();
  }

  // Destroy all respawn timers
  for (const timer of this.respawnTimers.values()) {
    this.time.removeEvent(timer);
  }
  this.respawnTimers.clear();

  // Existing VFX cleanup
  if (this.vfxManager) {
    this.vfxManager.destroy();
  }
}
```

**Note on Phaser's auto-cleanup:** Phaser DOES clear all scene-scoped timers when a scene is stopped AND restarted (scene lifecycle). However, the discourse thread confirms the documented bug in `time.addEvent` where the timer remains "updated by the Clock" even after `.destroy()` is called on it directly. Explicit `removeEvent()` is the safe pattern regardless.

**Confidence:** MEDIUM-HIGH — `removeEvent()` verified as correct in Phaser discourse; the auto-cleanup behavior on scene stop is not fully documented and should not be relied upon.

---

### Pattern 7: 5-Minute Countdown HUD

**What:** HUD displays remaining time in `MM:SS` format. Timer updates are driven by the `MATCH_TIMER_TICK` event from MatchStateMachine, not by polling `matchTimer` directly.

**Current state:** HUD polls `scene.matchTimer` in its `update()` method and shows the integer value. It needs to be changed to show `MM:SS` and receive updates via EventBus or direct method call.

**For Phase 1, two acceptable approaches:**
1. HUD subscribes to `MATCH_TIMER_TICK` on EventBus (cleanest)
2. HUD continues polling `matchStateMachine.getTimeRemaining()` from `scene.matchStateMachine` (simpler, no EventBus subscription cleanup needed for HUD)

Approach 2 is recommended for Phase 1 since it minimizes blast radius. HUD can be migrated to EventBus in a later phase.

**MM:SS format utility:**
```typescript
// In HUD.update() or a helper:
private formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
// Example: 300 → "5:00", 65 → "1:05", 9 → "0:09"
```

**Respawn overlay:** When `this.scene.player.isAlive === false`, show a center-screen countdown. The respawn timer value comes from BattleScene tracking `playerRespawnRemaining`. HUD polls this in `update()`.

**Confidence:** HIGH — pure TypeScript/Phaser; no external API.

---

### Anti-Patterns to Avoid

- **Putting respawn logic in Hero.die():** Hero.die() should remain ignorant of respawn. Respawn is a match rule, not an entity responsibility. Keep it in BattleScene (or RespawnSystem).
- **Calling `timerEvent.destroy()` for cleanup:** This does NOT remove the event from the Clock. Use `this.time.removeEvent(handle)`.
- **Adding `isRespawning: boolean` to BattleScene:** The `respawnTimers` Map is sufficient. Checking `respawnTimers.has(heroId)` replaces any boolean flag.
- **Using `game.events` instead of standalone EventBus:** `game.events` persists across scene restarts; a standalone singleton that is explicitly cleaned in shutdown is safer.
- **Implementing SUDDEN_DEATH in Phase 1:** This is Phase 7. The MatchStateMachine for Phase 1 has only PRE_MATCH → ACTIVE → ENDED. Do not add SUDDEN_DEATH now.
- **Using `EventBus.removeAllListeners()` in shutdown:** This is a nuclear option that removes ALL listeners globally, including ones registered by other systems. Use `EventBus.off(event, callback, context)` to remove only what this class registered.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event emitter | Custom pub/sub system | `Phaser.Events.EventEmitter` (already in bundle) | EventEmitter3 handles edge cases (scope, memory, once); already battle-tested in Phaser codebase |
| Timer management | Custom `setInterval`/`setTimeout` | `scene.time.addEvent()` / `scene.time.delayedCall()` | Phaser timers pause with scene, respect time scale (slowmo), and integrate with the game loop |
| State validation | Multiple boolean guards | `MatchPhase` enum + transition whitelist | Booleans create implicit invalid combinations; enum makes states explicit and exhaustive |
| Spawn point math | Calculating safe respawn positions | Already in `ArenaConfig.spawnA`/`spawnB` — use them | ArenaGenerator already generates collision-free spawn points; don't duplicate |
| Physics body reset on respawn | Manual body reconfiguration | Existing pattern: `setEnable(true)` + `setCircle()` + `setVelocity(0,0)` | Matches exactly how the body was configured in Hero constructor |

---

## Common Pitfalls

### Pitfall 1: Timer Accumulation on Scene Restart

**What goes wrong:** Every "Play Again" call to `BattleScene.create()` adds a new `time.addEvent` tick handler without removing the previous one. By match 3, three tick handlers fire per second.

**Why it happens:** Phaser scene restart runs `shutdown` followed by `create`. If `shutdown()` doesn't explicitly remove the timer handle via `this.time.removeEvent(handle)`, the timer persists.

**How to avoid:**
1. Store every `Phaser.Time.TimerEvent` returned by `time.addEvent` in a class field or Map
2. Call `this.time.removeEvent(handle)` in `BattleScene.shutdown()` for every stored handle
3. MatchStateMachine owns its own timer handle and removes it in its `destroy()` method
4. BattleScene calls `this.matchStateMachine.destroy()` in `BattleScene.shutdown()`

**Warning signs:** Match timer counts down twice as fast after "Play Again"; kill feed events fire multiple times for one kill.

---

### Pitfall 2: Re-entrant Death Call Chain

**What goes wrong:** `Hero.die()` calls `battleScene.onHeroKill()` which calls `endMatch()`. If two heroes die in the same frame (AoE), `endMatch()` runs twice. The `if (this.matchOver) return` guard partially protects but the call stack is fragile.

**How to avoid:** The EventBus pattern solves this naturally. `BaseEntity.die()` emits `HERO_KILLED`. MatchStateMachine's `onKill` handler has `if (this.phase === MatchPhase.ENDED) return` as the guard. Multiple rapid emissions are safe because the guard is in the listener, not the emitter. The transition function also enforces forward-only state changes.

**Warning signs:** ResultScene is visited twice; or match never ends because the second `endMatch` was swallowed.

---

### Pitfall 3: Hero Physics Body Not Re-enabled on Respawn

**What goes wrong:** After `Hero.die()` calls `body.setEnable(false)` and `body.setCircle(0)`, respawn must reverse these exactly. If only `setEnable(true)` is called without `setCircle(HERO_RADIUS, ...)`, the hero is physically invisible to the collision system — they can walk through walls and other heroes.

**How to avoid:**
```typescript
// On respawn, re-apply the exact constructor configuration:
body.setEnable(true);
body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
body.setVelocity(0, 0);
body.setDrag(800);
body.setMaxVelocity(hero.stats.moveSpeed);
```

**Warning signs:** Respawned hero passes through obstacles; projectiles don't hit the respawned hero.

---

### Pitfall 4: EventBus Listeners Not Cleaned Up Between Matches

**What goes wrong:** MatchStateMachine and BattleScene subscribe to EventBus events on `start()`/`create()`. On scene restart, the new instances subscribe again without the old subscriptions being removed. After 3 matches, six listeners fire for every `HERO_KILLED`.

**How to avoid:** Every class that calls `EventBus.on(event, callback, this)` MUST call `EventBus.off(event, callback, this)` in its cleanup/destroy path. The `this` context parameter is critical — it scopes the listener so `off` can precisely target it.

**Warning signs:** HUD shows duplicate kill feed entries; score increments by 2 per kill.

---

### Pitfall 5: Dead Hero Included in Team Check

**What goes wrong:** After respawn is added, `checkWinCondition()` (if kept) checks `this.teamA.filter(h => h.isAlive).length`. If this runs while all heroes are temporarily dead but some are still in the respawn timer, it could trigger a premature match end.

**How to avoid:** Phase 1 removes `checkWinCondition()` as a win trigger from hero deaths. The MatchStateMachine's timer is the only win trigger in Phase 1. An all-dead-team state is just "all heroes are in respawn queue" — normal gameplay. MatchStateMachine ends the match by score at 5:00.

**Warning signs:** Match ends 30 seconds in when all heroes happen to die simultaneously.

---

### Pitfall 6: MATCH_DURATION Still Set to 60 Seconds in constants.ts

**What goes wrong:** `MATCH_DURATION` is currently `60` (one minute). Phase 1 goal is 5 minutes (300 seconds). If this constant isn't updated, the match ends in 60 seconds regardless of the new MatchStateMachine.

**How to avoid:** Change `MATCH_DURATION = 300` in `constants.ts`. The HUD currently shows an integer — it will need the `MM:SS` format update or will show `300` counting down to `0`.

---

## Code Examples

### EventBus — Subscribing with Context

```typescript
// Source: https://docs.phaser.io/phaser/concepts/events
// Context parameter enables precise cleanup with off()
EventBus.on(Events.HERO_KILLED, this.onKill, this);
// ...in destroy():
EventBus.off(Events.HERO_KILLED, this.onKill, this);
```

### Timer Cleanup — Correct Pattern

```typescript
// Source: https://phaser.discourse.group/t/time-addevent-remove-wont-actually-remove-it/9757
// WRONG: does not remove from Clock's internal list
timerEvent.destroy();

// CORRECT: removes from all internal Clock lists
this.time.removeEvent(timerEvent);
timerEvent = null;
```

### Hero Physics Reset on Respawn

```typescript
// Source: Codebase — Hero constructor (lines 143-148)
// Must match constructor exactly to restore collision behavior
const body = hero.body as Phaser.Physics.Arcade.Body;
body.setEnable(true);
body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
body.setCollideWorldBounds(true);
body.setBounce(0);
body.setDrag(800);
body.setMaxVelocity(hero.stats.moveSpeed);
```

### MatchPhase Transition Guard

```typescript
// Source: Game Programming Patterns — State chapter
// Enforce forward-only transitions to prevent invalid state
transition(next: MatchPhase): void {
  const order = [MatchPhase.PRE_MATCH, MatchPhase.ACTIVE, MatchPhase.ENDED];
  if (order.indexOf(next) <= order.indexOf(this.phase)) return; // ignore backward/same
  this.phase = next;
  EventBus.emit(Events.MATCH_STATE_CHANGE, { phase: next });
}
```

### IBattleScene — Safe Cast Pattern

```typescript
// Source: TypeScript docs — type assertion with intermediate unknown
// Safer than `as any` because it will error if IBattleScene interface is wrong
const battleScene = this.scene as unknown as IBattleScene;
const enemies = battleScene.getEnemies(this.team);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `matchOver: boolean` | `MatchPhase` enum in MatchStateMachine | Phase 1 | Eliminates invalid state combinations; enables SUDDEN_DEATH addition in Phase 7 |
| `hero.die() → endMatchAsDefeat()` | `BaseEntity.die() → EventBus.emit(HERO_KILLED) → respawn` | Phase 1 | Unlocks 5-minute matches; removes instant-defeat behavior |
| `scene as any` everywhere | `IBattleScene` typed interface | Phase 1 | TypeScript catches stale references; enables safe rename/refactor |
| Single `tickTimer` addEvent (leaking) | MatchStateMachine owns timer, destroys in shutdown | Phase 1 | Eliminates confirmed memory leak across Play Again restarts |
| `MATCH_DURATION = 60` | `MATCH_DURATION = 300` (5 minutes) | Phase 1 | Matches FLOW-01 requirement |
| Timer displayed as integer | `MM:SS` format | Phase 1 | Matches FLOW-01 UX requirement |

---

## Existing Code That Must Change

These specific files and locations require modification in Phase 1. Documented here so plans can reference exact surgery sites.

| File | Location | What Changes |
|------|----------|-------------|
| `src/constants.ts` | Line 6: `MATCH_DURATION = 60` | Change to `300` |
| `src/scenes/BattleScene.ts` | Line 25: `matchOver = false` | Remove — replaced by MatchStateMachine |
| `src/scenes/BattleScene.ts` | Lines 150–155: `time.addEvent(tickTimer)` | Remove — MatchStateMachine owns this timer |
| `src/scenes/BattleScene.ts` | Lines 282–288: `tickTimer()` method | Remove |
| `src/scenes/BattleScene.ts` | Lines 290–311: `onHeroKill()` | Replace with EventBus listener + respawn dispatch |
| `src/scenes/BattleScene.ts` | Lines 313–345: `endMatchAsDefeat()` | Remove (subsumed by MatchStateMachine ENDED state) |
| `src/scenes/BattleScene.ts` | Lines 347–356: `checkWinCondition()` | Remove kill-based check (timer-only win in Phase 1) |
| `src/scenes/BattleScene.ts` | Lines 412–416: `shutdown()` | Extend with timer + EventBus cleanup |
| `src/entities/Hero.ts` | Lines 342–394: `private die()` | Rename to `protected onDeath()`, remove kill notification |
| `src/entities/Hero.ts` | Line 6: `extends Phaser.GameObjects.Container` | Change to `extends BaseEntity` |
| `src/ui/HUD.ts` | Lines 84–90: `update()` timer display | Change to `MM:SS` format |
| `src/ui/HUD.ts` | Line 11: `private scene: any` | Change to `private scene: IBattleScene & Phaser.Scene` |

---

## Open Questions

1. **Respawn timer duration formula**
   - What we know: "max 10 seconds" from requirements; no formula specified
   - What's unclear: Should respawn time scale with match time (shorter early, longer late)? Or flat?
   - Recommendation: Flat 5-second respawn for all heroes in Phase 1 (simple, predictable); scaling can be added later. Add `RESPAWN_DURATION = 5000` constant in `constants.ts`.

2. **PRE_MATCH phase usage**
   - What we know: Phase 1 includes PRE_MATCH in the enum but the requirements only mandate PRE_MATCH → ACTIVE → ENDED
   - What's unclear: Should there be an actual pre-match countdown delay, or does PRE_MATCH transition immediately to ACTIVE on BattleScene create?
   - Recommendation: For Phase 1, MatchStateMachine starts in PRE_MATCH and immediately transitions to ACTIVE in `start()`. PRE_MATCH is a placeholder state for future use (draft countdown, etc.). No delay needed now.

3. **Kill attribution during respawn death window**
   - What we know: A hero can die and be in respawn when another hero dies — the `killer` lookup may find a dead hero
   - What's unclear: Should kills by dead heroes still count?
   - Recommendation: Yes, kill credit is based on who dealt the killing blow (killerId). The killer's alive status at point of kill doesn't need to be re-checked.

4. **HUD respawn timer display scope**
   - What we know: Success criteria says "respawn timer counts down" — visible to the player
   - What's unclear: Show for ALL heroes or only the player?
   - Recommendation: Show respawn countdown only for the player hero (center-screen overlay). AI heroes' respawn state is implicitly visible because they disappear and reappear.

---

## Sources

### Primary (HIGH confidence)

- Phaser official docs — Events: https://docs.phaser.io/phaser/concepts/events — EventEmitter API, `on/off/emit/once/removeAllListeners`, scope parameter
- Phaser official docs — Cross-Scene Communication: https://docs.phaser.io/phaser/concepts/scenes/cross-scene-communication — standalone emitter as recommended pattern
- Phaser official docs — Scenes: https://docs.phaser.io/phaser/concepts/scenes — shutdown vs destroy lifecycle, when cleanup must be manual
- Game Programming Patterns — State: https://gameprogrammingpatterns.com/state.html — FSM transition guards, enum-based state machines
- Codebase (read directly) — `src/entities/Hero.ts`, `src/scenes/BattleScene.ts`, `src/ui/HUD.ts`, `src/types.ts`, `src/constants.ts`, `src/systems/` — all existing code patterns, field names, call sites
- Prior project research — `.planning/research/ARCHITECTURE.md` — EventBus pattern, BaseEntity pattern, MatchStateMachine pattern (HIGH confidence — verified against Phaser docs)
- Prior project research — `.planning/codebase/CONCERNS.md` — exact bug locations (tickTimer accumulation, `as any` blast radius, re-entrant kill chain)

### Secondary (MEDIUM confidence)

- Phaser discourse — timer.addEvent remove: https://phaser.discourse.group/t/time-addevent-remove-wont-actually-remove-it/9757 — confirms `removeEvent()` is correct, `destroy()` is NOT sufficient
- Prior project research — `.planning/research/PITFALLS.md` — timer stacking pattern, Phaser GitHub #4028 reference

### Tertiary (LOW confidence)

- WebSearch results — Phaser 3 abstract class TypeScript — general TypeScript class extension patterns; no new Phaser-specific findings (already known from codebase)

---

## Metadata

**Confidence breakdown:**
- EventBus pattern: HIGH — official Phaser docs verified, `on/off/emit/scope` confirmed
- BaseEntity pattern: HIGH — direct code read + prior architecture research
- MatchStateMachine: HIGH — FSM pattern from Game Programming Patterns; timer API from official docs + discourse
- Respawn system: HIGH — all APIs used already exist in codebase; only new logic is timer + position
- Timer cleanup: MEDIUM-HIGH — `removeEvent()` confirmed correct via discourse; Phaser auto-cleanup behavior not fully documented
- IBattleScene: HIGH — pure TypeScript, no Phaser API

**Research date:** 2026-02-22
**Valid until:** 2026-04-22 (stable Phaser 3 APIs; Phaser 3.90.0 is final v3 release — no API churn expected)
