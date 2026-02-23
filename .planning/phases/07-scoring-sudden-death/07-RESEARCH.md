# Phase 7: Scoring & Sudden Death - Research

**Researched:** 2026-02-23
**Domain:** Phaser 3 state machines, scoring systems, boss multi-kill progression, obstacle-aware pathfinding, HUD overlays
**Confidence:** HIGH

## Summary

Phase 7 completes the match lifecycle by wiring four score sources into a unified scoreboard, adding Boss Tiers 2 and 3 (persistent damage amp + roaming, then Sudden Death trigger), implementing the Sudden Death state transition at 5:00 tie or on the third boss kill, and building the HUD to communicate all of this clearly. The existing codebase provides strong foundations for every mechanic: `MatchStateMachine` already owns scoring and timer logic, `BossEntity` and `BossAISystem` are ready to extend for Tier 2 roaming behavior, `EventBus` decouples all cross-system communication, and `VFXManager.screenFlash()` exists for the red screen flash.

The highest technical risk is **Boss Tier 2 roaming with obstacle avoidance** (BOSS-03). The current `BossAISystem` leashes to a home position and makes straight-line velocity moves. Roaming requires the boss to traverse the full arena without getting stuck on obstacles. A full NavMesh (Phaser's pathfinding plugin or a-star library) would be overkill for this arena size; a **waypoint graph** approach using arena-specific patrol points that route around the fixed obstacle zones is recommended and sufficient. The second highest risk is the **5:00:000 boundary race condition** (FLOW-05): the match timer fires on 1-second `delayedCall` ticks in `MatchStateMachine.onTick()`. The transition to `SUDDEN_DEATH` must check the tie condition before `ENDED` is triggered, and any in-progress death animations cannot create respawning heroes after `SUDDEN_DEATH` is active.

The scoring system needs **four new score sources** beyond what `MatchStateMachine` currently tracks. Kill scoring (1pt/kill) already works via `HERO_KILLED`. Camp scoring (1pt/clear) already works via `CAMP_CLEARED`. Boss kill scoring (3pt/kill) and tower damage threshold scoring (2pt at threshold) must be added. All four sources feed the same `score` object via `SCORE_UPDATED` events, which the HUD reads.

**Primary recommendation:** Add `SUDDEN_DEATH` to `MatchPhase`, extend `MatchStateMachine` to handle the four-source score and the dual Sudden Death triggers, extend `BossAISystem` with a kill-count-driven roaming mode using arena waypoints, and build the Sudden Death HUD layer on top of existing HUD patterns.

## Standard Stack

### Core (already in project — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | Game framework, physics, tweens, cameras | Project core — all UI, VFX, timer patterns |
| TypeScript | 5.x | Type safety | Already configured |

### No New Dependencies Needed
All Phase 7 functionality is achievable with existing Phaser 3 APIs:
- `Phaser.Time.TimerEvent` — match timer, boss kill tracking
- `Phaser.Events.EventEmitter` (via EventBus) — all cross-system signals
- `Phaser.GameObjects.Graphics` — scoreboard, red border overlay
- `scene.cameras.main.flash()` — screen flash (already wrapped in `VFXManager.screenFlash()`)
- `Phaser.Math.Distance.Between()` — waypoint proximity checks for boss roaming

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Waypoint graph (manual patrol points) | `phaser3-rex-plugins` NavMesh, `easystarjs` A* | NavMesh/A* correct but heavyweight for 5 fixed obstacle patterns; waypoints sufficient for this arena |
| Single `score` object in `MatchStateMachine` | Separate `ScoreSystem` class | Score is tightly coupled to match state transitions — keeping it in MSM avoids circular dependencies |

## Architecture Patterns

### Recommended File Changes
```
src/
  types.ts                      # Add MatchPhase.SUDDEN_DEATH
  constants.ts                  # Add BOSS_KILL_SCORE, KILL_SCORE, TOWER_DAMAGE_THRESHOLD_SCORE, TOWER_DAMAGE_THRESHOLD_PCT, BOSS_ROAM_WAYPOINTS, SUDDEN_DEATH_SCREEN_COLOR, BOSS_ROAM_SPEED, BOSS_DAMAGE_AMP
  systems/
    MatchStateMachine.ts        # Add SUDDEN_DEATH state, boss kill scoring, tower threshold scoring, dual SD triggers
    EventBus.ts                 # Add BOSS_KILL_SCORED, TOWER_THRESHOLD_SCORED, SUDDEN_DEATH_TRIGGERED events
    BossAISystem.ts             # Add roaming mode (Tier 2), waypoint patrol, kill-count flag
  entities/
    BossEntity.ts               # Add permanent damage amp buff tracking, roaming flag, Tier tracking
  scenes/
    BattleScene.ts              # Wire bossKillCount, respawn guard for Sudden Death, Sudden Death banner
  ui/
    HUD.ts                      # Add live scoreboard breakdown, SUDDEN DEATH overlay, no-respawn warning
```

### Pattern 1: Adding SUDDEN_DEATH to MatchPhase FSM

**What:** Insert `SUDDEN_DEATH` between `ACTIVE` and `ENDED` in the state machine. The current `transition()` guard uses index-based ordering — adding `SUDDEN_DEATH` at index 2 (before `ENDED`) preserves all existing forward-only logic.

**When to use:** Two triggers: (A) timer reaches 0 with tied score, (B) third boss kill at any time.

**Example:**
```typescript
// Source: src/types.ts
export enum MatchPhase {
  PRE_MATCH    = 'pre_match',
  ACTIVE       = 'active',
  SUDDEN_DEATH = 'sudden_death',   // NEW — Phase 7
  ENDED        = 'ended',
}

// Source: src/systems/MatchStateMachine.ts — transition() guard
transition(next: MatchPhase): void {
  const order = [
    MatchPhase.PRE_MATCH,
    MatchPhase.ACTIVE,
    MatchPhase.SUDDEN_DEATH,   // NEW — inserted before ENDED
    MatchPhase.ENDED,
  ];
  if (order.indexOf(next) <= order.indexOf(this.phase)) return;
  this.phase = next;
  EventBus.emit(Events.MATCH_STATE_CHANGE, { phase: next, score: { ...this.score } });
}
```

**Critical:** `BattleScene.onMatchStateChange()` currently only handles `ENDED`. It must also handle `SUDDEN_DEATH` to disable respawns and trigger the HUD overlay.

### Pattern 2: Four-Source Score Tracking

**What:** Extend the `score` object in `MatchStateMachine` with boss kill tracking and tower threshold tracking. Kill points and camp points already work; boss and tower scoring must be wired.

**Score sources (FLOW-03):**
| Source | Points | Event trigger | Currently wired? |
|--------|--------|--------------|-----------------|
| Hero kill | 1 pt | `HERO_KILLED` | YES (in `onKill`) |
| Boss kill | 3 pt | `BOSS_KILLED` | NO — `MatchStateMachine` doesn't listen to `BOSS_KILLED` |
| Tower damage threshold | 2 pt | `TOWER_DAMAGED` (checked against threshold) | NO |
| Neutral camp control | 1 pt | `CAMP_CLEARED` | YES (in `onCampCleared`) |

**Example:**
```typescript
// Source: src/systems/MatchStateMachine.ts

// Extend score object
private score = {
  teamA: 0, teamB: 0,
  campClearsA: 0, campClearsB: 0,
  bossKillsA: 0, bossKillsB: 0,     // NEW
  towerThresholdA: false,             // NEW — one-time trigger per tower
  towerThresholdB: false,             // NEW
};

// Subscribe to BOSS_KILLED in start()
EventBus.on(Events.BOSS_KILLED, this.onBossKilled, this);

// Subscribe to TOWER_DAMAGED in start()
EventBus.on(Events.TOWER_DAMAGED, this.onTowerDamaged, this);

private onBossKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
  if (this.phase === MatchPhase.ENDED) return;
  // Determine team from killerId suffix (_A / _B)
  const isTeamA = killerId?.endsWith('_A');
  const isTeamB = killerId?.endsWith('_B');
  if (isTeamA) { this.score.teamA += BOSS_KILL_SCORE; this.score.bossKillsA++; }
  else if (isTeamB) { this.score.teamB += BOSS_KILL_SCORE; this.score.bossKillsB++; }
  EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
}

private onTowerDamaged({ tower, damage }: { tower: BaseEntity; damage: number }): void {
  if (this.phase === MatchPhase.ENDED) return;
  // tower.team is the DEFENDING team — if tower.team is A, then team B dealt the damage
  const hpRatio = (tower as any).currentHP / (tower as any).maxHP;
  if (tower.team === Team.A && !this.score.towerThresholdA && hpRatio <= TOWER_DAMAGE_THRESHOLD_PCT) {
    this.score.teamB += TOWER_DAMAGE_THRESHOLD_SCORE;
    this.score.towerThresholdA = true;
    EventBus.emit(Events.TOWER_THRESHOLD_SCORED, { scoringTeam: Team.B, tower });
    EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
  } else if (tower.team === Team.B && !this.score.towerThresholdB && hpRatio <= TOWER_DAMAGE_THRESHOLD_PCT) {
    this.score.teamA += TOWER_DAMAGE_THRESHOLD_SCORE;
    this.score.towerThresholdB = true;
    EventBus.emit(Events.TOWER_THRESHOLD_SCORED, { scoringTeam: Team.A, tower });
    EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
  }
}
```

### Pattern 3: Sudden Death Timer Boundary

**What:** When the timer reaches 0, `onTick()` currently calls `transition(MatchPhase.ENDED)`. For Phase 7, it must check the score first: tie → `SUDDEN_DEATH`, no tie → `ENDED`.

**Critical race condition:** `MatchStateMachine.onTick()` fires on a 1-second `delayedCall` loop. There is no sub-second precision. The existing design (`matchTimeRemaining--` then check `<= 0`) is safe as long as no other timer fires at exactly the same moment. The `endingMatch` guard in `BattleScene.endMatch()` (confirmed in `BattleScene.ts` line 814) prevents double-fire.

**Sudden Death respawn guard:** When `SUDDEN_DEATH` is active, `BattleScene.onHeroKilled()` must not schedule a respawn. The respawn logic in `onHeroKilled()` currently always schedules via `this.time.delayedCall`. A guard checking `matchStateMachine.getPhase() === MatchPhase.SUDDEN_DEATH` must be inserted before the respawn scheduling.

**Example:**
```typescript
// Source: src/systems/MatchStateMachine.ts

private onTick(): void {
  if (this.phase !== MatchPhase.ACTIVE) return;
  this.matchTimeRemaining--;
  EventBus.emit(Events.MATCH_TIMER_TICK, { remaining: this.matchTimeRemaining });
  if (this.matchTimeRemaining <= 0) {
    // FLOW-05: tie at 5:00 → Sudden Death; otherwise end match
    if (this.score.teamA === this.score.teamB) {
      this.transition(MatchPhase.SUDDEN_DEATH);
    } else {
      this.transition(MatchPhase.ENDED);
    }
  }
}

// BattleScene.onHeroKilled() respawn guard:
private onHeroKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
  // ... revival token check ...
  // ... kill counting ...

  // SUDDEN DEATH: no respawns — hero stays dead until match ends
  if (this.matchStateMachine.getPhase() === MatchPhase.SUDDEN_DEATH) {
    // No respawn scheduled. Player sees static "SUDDEN DEATH" overlay, not countdown.
    return;
  }

  // ... existing respawn scheduling ...
}
```

### Pattern 4: Boss Kill Count and Tier Progression

**What:** `BattleScene` must track how many times the boss has been killed (across all respawns). On the 2nd kill: grant permanent damage amp buff + enable roaming. On the 3rd kill: transition to `SUDDEN_DEATH`.

**Boss respawn:** The boss currently does not respawn after death (Phase 4 decision). For Phase 7, the boss MUST respawn for Tier 2 and Tier 3 to be possible. The boss respawn logic goes in `BattleScene.onBossKilled()`, using `scene.time.delayedCall` with a respawn delay (suggested 30s). The boss resets to NORMAL phase and BOSS_BASE_HP when respawned.

**Example:**
```typescript
// Source: src/scenes/BattleScene.ts

private bossKillCount = 0;

private onBossKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
  this.bossKillCount++;

  // ... existing Phase 1 rewards (team buff, revival token, XP, tower disable) ...

  if (this.bossKillCount === 2) {
    // BOSS-03: Tier 2 — permanent damage amp + roaming enabled
    this.applyBossTier2Rewards(killerId);
    this.scheduleBossRespawn(BossTier.TIER2);
  } else if (this.bossKillCount === 3) {
    // BOSS-04: Tier 3 — trigger Sudden Death
    this.matchStateMachine.triggerSuddenDeath('boss_tier3');
    // Boss does NOT respawn after Tier 3 kill
  } else {
    // Tier 1 (first kill) — existing Phase 4 behavior, schedule respawn as Tier 1
    this.scheduleBossRespawn(BossTier.TIER1);
  }
}

private applyBossTier2Rewards(killerId?: string): void {
  const killer = this.findHeroById(killerId);
  if (!killer) return;
  const team = killer.team;
  const allies = team === Team.A ? this.teamA : this.teamB;
  // Permanent damage amp: duration = Infinity (or match duration) — no expiry
  for (const ally of allies) {
    ally.addBuff({
      type: BuffType.STAT_BUFF,
      value: BOSS_TIER2_DAMAGE_AMP,
      duration: MATCH_DURATION,     // effectively permanent for match duration
      remaining: MATCH_DURATION,
      sourceId: 'boss_tier2_reward',
    });
  }
}
```

### Pattern 5: Boss Tier 2 Roaming (Obstacle-Aware)

**What:** After the second boss kill, when the boss respawns as Tier 2, `BossAISystem` should roam the arena instead of returning to a home position. Obstacle-aware movement means the boss should not path directly through wall/obstacle geometry.

**Roaming approach — waypoint graph (recommended):**
The arena has 5 layout types (`open`, `corridor`, `pillars`, `fortress`, `maze_light`). Each has known obstacle positions (see `ArenaGenerator.ts`). A static set of arena waypoints (cardinal midpoints: NW, N, NE, E, SE, S, SW, W, center) routes around all layouts without collision. The boss cycles through waypoints in order, using the existing straight-line velocity approach between each. This avoids the complexity of a full NavMesh while satisfying the "obstacle-aware" requirement.

**Why not full NavMesh:** NavMesh libraries (e.g., `navmesh`, `phaser3-rex-plugins`) require baking navigation meshes from static geometry. The obstacle data from `ArenaGenerator` is `ObstacleDef[]` (rectangles), not a Phaser tilemap, so automated NavMesh baking is not straightforward. Waypoints are simpler, testable, and sufficient for this arena scale (1600x1200).

**Example:**
```typescript
// Source: src/systems/BossAISystem.ts

// Roam waypoints: 8 cardinal/intercardinal positions around the arena
// Positioned to avoid tower zones (x<300, x>1300) and camp positions
const ROAM_WAYPOINTS = [
  { x: 800, y: 200 },   // North (above damage camp)
  { x: 1100, y: 350 },  // NE
  { x: 1250, y: 600 },  // East (between tower and camp)
  { x: 1100, y: 850 },  // SE
  { x: 800, y: 1000 },  // South (below shield camp)
  { x: 500, y: 850 },   // SW
  { x: 350, y: 600 },   // West (between tower and camp)
  { x: 500, y: 350 },   // NW
];

// In BossAISystem:
private isRoaming = false;
private roamWaypointIndex = 0;
private readonly WAYPOINT_REACH_DIST = 60;

enableRoaming(): void {
  this.isRoaming = true;
  this.roamWaypointIndex = 0;
}

// In update(), when isRoaming and no hero in aggro range:
private roamToNextWaypoint(): void {
  const target = ROAM_WAYPOINTS[this.roamWaypointIndex];
  const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, target.x, target.y);
  if (dist < this.WAYPOINT_REACH_DIST) {
    this.roamWaypointIndex = (this.roamWaypointIndex + 1) % ROAM_WAYPOINTS.length;
  }
  const next = ROAM_WAYPOINTS[this.roamWaypointIndex];
  const angle = Math.atan2(next.y - this.boss.y, next.x - this.boss.x);
  const body = this.boss.body as Phaser.Physics.Arcade.Body;
  body.setVelocity(
    Math.cos(angle) * BOSS_ROAM_SPEED,
    Math.sin(angle) * BOSS_ROAM_SPEED,
  );
}
```

**Why Phaser physics handles "obstacle-aware" automatically:** The boss already has `this.physics.add.collider(this.boss, this.obstacles)`. When moving toward a waypoint, the Arcade physics collider prevents penetration — the boss slides along obstacle edges. This gives passable obstacle-aware navigation for the arena's relatively simple geometry without any pathfinding library.

### Pattern 6: Sudden Death HUD

**What:** When `MatchPhase.SUDDEN_DEATH` is active, the HUD must show: (A) screen red flash on entry, (B) persistent red border, (C) "SUDDEN DEATH" text replacing/augmenting the timer, (D) "NO RESPAWNS" warning replacing the respawn countdown.

**Approach:** Follow the existing banner pattern from `BattleScene.showBossKillBanner()`. Create a `SuddenDeathOverlay` helper within `HUD.ts` or inline in `BattleScene`. The red border is a persistent `Phaser.GameObjects.Graphics` drawn as a `setScrollFactor(0)` rect with strokeStyle.

**Example:**
```typescript
// Source: src/ui/HUD.ts

// Called once when SUDDEN_DEATH state is detected
showSuddenDeathOverlay(): void {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;

  // Red border (persistent)
  const border = this.scene.add.graphics();
  border.lineStyle(6, 0xff0000, 0.8);
  border.strokeRect(3, 3, W - 6, H - 6);
  border.setScrollFactor(0).setDepth(295);
  // Store reference to clean up on scene shutdown if needed

  // "SUDDEN DEATH" text (persistent, top center replacing score)
  this.scene.add.text(W / 2, 56, 'SUDDEN DEATH', {
    fontSize: '22px',
    color: '#ff0000',
    fontFamily: 'monospace',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(296);
}

// In BattleScene.onMatchStateChange():
private onMatchStateChange({ phase }: { phase: MatchPhase }): void {
  if (phase === MatchPhase.SUDDEN_DEATH) {
    this.hud.showSuddenDeathOverlay();
    // Red screen flash via VFXManager
    this.vfxManager.screenFlash(0xff0000, 500, 0.6);
  } else if (phase === MatchPhase.ENDED) {
    this.endMatch();
  }
}
```

### Pattern 7: Sudden Death → ENDED Transition

**What:** In Sudden Death, respawns are disabled. The match ends when one team is completely dead (all heroes dead simultaneously). `BattleScene.onHeroKilled()` must check after every death in Sudden Death whether all heroes on either team are dead.

**Example:**
```typescript
// In BattleScene.onHeroKilled(), after kill counting:
if (this.matchStateMachine.getPhase() === MatchPhase.SUDDEN_DEATH) {
  // Check if a team has been wiped
  const teamAAllDead = this.teamA.every(h => !h.isAlive);
  const teamBAllDead = this.teamB.every(h => !h.isAlive);
  if (teamAAllDead || teamBAllDead) {
    this.matchStateMachine.transition(MatchPhase.ENDED);
  }
  // No respawn scheduling
  return;
}
```

### Anti-Patterns to Avoid
- **Using `HERO_KILLED` for boss kill scoring:** `MatchStateMachine.onKill()` filters by `entityType !== 'hero'` already (line 44). Boss kill scoring requires listening to `BOSS_KILLED` separately.
- **Making `towerThresholdA/B` a point value instead of a boolean:** The threshold is a one-time 2pt award. Using a boolean flag prevents double-awarding if the tower takes more damage later.
- **Blocking update loop during Sudden Death:** `BattleScene.update()` guards on `MatchPhase.ENDED` (line 435). During `SUDDEN_DEATH`, the update loop must continue so heroes and boss can fight. Only add `ENDED` to the guard, not `SUDDEN_DEATH`.
- **Boss roaming using home-position leash:** When roaming is active, the `returnToHome()` path in `BossAISystem` must be bypassed. Add a flag check: `if (this.isRoaming) { this.roamToNextWaypoint(); return; }` before the leash path.
- **Respawn timers firing after Sudden Death starts:** If a hero dies at the exact moment Sudden Death is triggered, a respawn `delayedCall` may already be scheduled. These in-flight timers must be cancelled when `SUDDEN_DEATH` is entered. Clear `this.respawnTimers` and call `time.removeEvent()` for each.
- **Applying Tier 2 damage amp on top of Tier 1 buff:** Tier 1 gives a 60s `STAT_BUFF` with `sourceId: 'boss_reward'`. Tier 2 should use a distinct `sourceId: 'boss_tier2_reward'` so they stack independently (the boss can be killed again before the Tier 1 buff expires).
- **Calling `transition(ENDED)` inside `onTick()` without checking for already-in-SUDDEN_DEATH:** If the match is already in `SUDDEN_DEATH` when the timer completes (because a mid-second transition happened), the `if (this.phase !== MatchPhase.ACTIVE) return;` guard in `onTick()` prevents a double-transition. This is already correctly guarded.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Obstacle avoidance for boss roaming | Custom pathfinding algorithm | Phaser Arcade colliders + waypoints | Colliders already on boss + obstacles; sliding handles edge cases; waypoints bypass complex A* baking |
| Score persistent overlay | DOM element outside canvas | `Phaser.GameObjects.Graphics` + `setScrollFactor(0)` | Existing pattern for all HUD elements; stays in canvas; survives scene transitions correctly |
| Screen red border | CSS outline | `scene.add.graphics().strokeRect()` + `setScrollFactor(0)` | Same pattern as all other overlays in this codebase |
| Timer-based match end | `setTimeout` | `scene.time.addEvent()` (already used) | Respects Phaser time scale; auto-cleanup on scene destroy |
| Boss kill count | External state store | `bossKillCount` field on `BattleScene` | Already owns `revivalTokenTeam`, `towerVictoryTeam`; consistent location |

**Key insight:** Every mechanism in Phase 7 is a composition of existing systems. The risk is integration correctness (ordering of event handlers, state guard placement), not capability gaps.

## Common Pitfalls

### Pitfall 1: In-Flight Respawn Timers During Sudden Death Transition
**What goes wrong:** A hero dies at t=4:59. The respawn `delayedCall` fires at t=5:04. The match transitions to `SUDDEN_DEATH` at t=5:00. The respawn fires during Sudden Death, reviving a hero who should stay dead.
**Why it happens:** `scene.time.delayedCall` fires even after state changes. The `respawnTimers` Map in `BattleScene` tracks active timers but they are only checked for cleanup on `shutdown()`, not on state change.
**How to avoid:** In `BattleScene.onMatchStateChange()`, when entering `SUDDEN_DEATH`, iterate `this.respawnTimers` and call `this.time.removeEvent()` for each. Clear the map. Set `this.playerRespawnEndTime = 0` to kill the countdown.
**Warning signs:** Heroes appear mid-Sudden Death with full HP; HUD shows "RESPAWNING IN" during Sudden Death.

### Pitfall 2: Boss Kill Scorer ID Format Mismatch
**What goes wrong:** `MatchStateMachine.onCampCleared()` extracts team from `killerId.endsWith('_A')` / `'_B'`. Boss kills from `BattleScene.onBossKilled()` call `this.findHeroById(killerId)` to get the killer hero. The MSM's `onBossKilled()` handler must use the same suffix convention to determine team, since it does not have access to hero objects.
**Why it happens:** `MatchStateMachine` has no reference to `Hero[]` — it is a standalone state machine. It can only determine team from the `killerId` string format.
**How to avoid:** Verify that `Hero.getUniqueId()` always returns a string ending in `_A` or `_B` (e.g., `iron_guard_A`). If confirmed, use the same endsWith pattern in MSM. Alternatively, emit team info directly in the `BOSS_KILLED` event payload from `BossEntity.die()`.
**Warning signs:** Boss kill does not award 3 points to the killing team; score doesn't update on boss kill.

### Pitfall 3: Double SUDDEN_DEATH Transition (Boss Tier 3 + Timer Coincidence)
**What goes wrong:** The boss is killed for the third time at exactly 5:00:000 and the timer also reaches 0 in the same tick. Both `onBossKilled` and `onTick` try to call `transition(SUDDEN_DEATH)`.
**Why it happens:** EventBus handlers fire synchronously in registration order. If both trigger in the same frame, transition() is called twice.
**How to avoid:** The `transition()` guard (`if (order.indexOf(next) <= order.indexOf(this.phase)) return;`) prevents the second call from doing anything — once in `SUDDEN_DEATH`, another `SUDDEN_DEATH` transition is rejected. This is safe by design. Verify this guard covers the case.
**Warning signs:** None (guard handles it silently). Just verify the guard is tested.

### Pitfall 4: Tower Damage Threshold on Destroyed Tower
**What goes wrong:** `TOWER_DAMAGED` fires as the tower hits 0 HP. `onTowerDamaged()` checks `hpRatio <= threshold`. If the threshold is e.g. 0.25, the last hit could take it from 0.3 to 0 HP, triggering both the threshold event AND `TOWER_DESTROYED` in the same damage call.
**Why it happens:** `BaseEntity.takeDamage()` calls `this.die()` when `currentHP <= 0`. `TowerEntity.takeDamage()` emits `TOWER_DAMAGED` before calling `super.takeDamage()` (line 268). Actually, looking at the code: it calls `super.takeDamage()` which internally calls `die()` via `BaseEntity.takeDamage()` (line 91). So `TOWER_DAMAGED` fires BEFORE `die()`, meaning the HP is set to 0 by `BaseEntity` but `TOWER_DAMAGED` fires with the pre-die HP value.
**How to avoid:** Check `tower.isAlive` in `onTowerDamaged()`. If the tower is being destroyed in this same tick, the `TOWER_DESTROYED` event will fire next and `endByTowerDestruction()` handles the match end — no need to also score the threshold. Add: `if (!(tower as any).isAlive) return;` at the start of the threshold check.
**Warning signs:** Tower destruction also awards 2 points for the threshold; score appears inflated on tower kill.

### Pitfall 5: SUDDEN_DEATH BattleScene.update() Guard
**What goes wrong:** Adding `MatchPhase.SUDDEN_DEATH` to the update guard that returns early: `if (matchStateMachine.getPhase() === MatchPhase.ENDED || matchStateMachine.getPhase() === MatchPhase.SUDDEN_DEATH) return;`
**Why it happens:** A well-intentioned "freeze everything" response to Sudden Death.
**How to avoid:** During Sudden Death, heroes must continue to fight, die, and trigger the win condition check. Only `ENDED` should stop the update loop. `SUDDEN_DEATH` is an ACTIVE sub-state, not a freeze.
**Warning signs:** All hero movement stops on Sudden Death entry; heroes are stuck and cannot fight.

### Pitfall 6: Boss Respawn for Tier 2 and 3 Progression
**What goes wrong:** The boss currently does not respawn (Phase 4 decision, documented in 04-RESEARCH open questions). Tier 2 and Tier 3 require the boss to be killable 2 and 3 times respectively. Without boss respawn logic, only Tier 1 rewards are achievable.
**Why it happens:** Boss respawn was explicitly deferred in Phase 4.
**How to avoid:** Add boss respawn to `BattleScene.onBossKilled()`. After Tier 1 and Tier 2 kills, schedule `scene.time.delayedCall(BOSS_RESPAWN_DELAY, () => { this.boss.respawn(); })`. Create a `respawn()` method on `BossEntity` that resets `isAlive`, `currentHP`, `phase`, re-enables the physics body, and makes the entity visible again.
**Warning signs:** Boss dies once and never returns; Sudden Death from boss is never achievable.

### Pitfall 7: Permanent Damage Amp Buff Expiry
**What goes wrong:** Tier 2 damage amp uses `duration: BOSS_KILL_BUFF_DURATION` (60s) like the Tier 1 buff. The buff expires after 60 seconds instead of being permanent for the match.
**Why it happens:** Reusing the Tier 1 buff constant without reading the requirement ("permanent damage amplification").
**How to avoid:** Use `duration: MATCH_DURATION` (300s, the full match length) for the Tier 2 buff. Since the match cannot last longer than 300s, this effectively makes it permanent. Use a distinct `sourceId: 'boss_tier2_reward'` to distinguish it from the Tier 1 buff.
**Warning signs:** Tier 2 damage amp disappears 60 seconds after the second boss kill.

## Code Examples

Verified patterns from existing codebase:

### Adding SUDDEN_DEATH to MatchPhase (types.ts)
```typescript
// Source: src/types.ts (current state — lines 258-262)
export enum MatchPhase {
  PRE_MATCH    = 'pre_match',
  ACTIVE       = 'active',
  SUDDEN_DEATH = 'sudden_death',  // ADD THIS — Phase 7
  ENDED        = 'ended',
}
```

### Existing VFXManager.screenFlash() for Sudden Death Flash
```typescript
// Source: src/systems/VFXManager.ts lines 122-124
screenFlash(color: number, duration: number = 200, intensity: number = 0.5): void {
  this.scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, false, undefined, intensity);
}

// Usage in BattleScene for Sudden Death (bright red, longer, more intense):
this.vfxManager.screenFlash(0xff0000, 600, 0.7);
```

### Existing Timer Pattern for Boss Respawn
```typescript
// Source: src/scenes/BattleScene.ts lines 424-427 (boss scale timer pattern)
this.bossScaleTimer = this.time.addEvent({
  delay: 60000,
  callback: () => { ... },
  loop: true,
});

// Boss respawn (one-shot, same scene.time API):
this.time.delayedCall(BOSS_RESPAWN_DELAY, () => {
  if (this.boss) {
    this.boss.respawnBoss(); // new method on BossEntity
    if (this.bossAI) this.bossAI.resetHome(bossX, bossY);
  }
});
```

### Existing endMatch() for Sudden Death Win Condition
```typescript
// Source: src/scenes/BattleScene.ts lines 813-870
// The endMatch() method already handles team alive comparisons.
// For Sudden Death win: one team is fully dead.
// endMatch() already checks teamAAlive vs teamBAlive (lines 817-818).
// This logic ALREADY WORKS for Sudden Death if called after one team is wiped.
// Only addition needed: who wins when the timer triggers SD (score-based, not alive-count).
```

### Existing Score Object (MatchStateMachine.ts)
```typescript
// Source: src/systems/MatchStateMachine.ts lines 12, 92
private score = { teamA: 0, teamB: 0, campClearsA: 0, campClearsB: 0 };
getScore(): { teamA: number; teamB: number; campClearsA: number; campClearsB: number } {
  return { ...this.score };
}
```

### Existing Respawn Timer Cleanup Pattern
```typescript
// Source: src/scenes/BattleScene.ts lines 890-893
for (const timer of this.respawnTimers.values()) {
  this.time.removeEvent(timer);
}
this.respawnTimers.clear();
// Apply same pattern in onMatchStateChange when entering SUDDEN_DEATH
```

### TOWER_DAMAGED Event (already wired)
```typescript
// Source: src/entities/TowerEntity.ts lines 268-273
override takeDamage(rawDamage: number, sourceId?: string): number {
  if (!this.isAlive) return 0;
  this.lastDamagedTime = this.scene.time.now;
  const finalDamage = super.takeDamage(rawDamage, sourceId);
  if (finalDamage > 0) {
    EventBus.emit(Events.TOWER_DAMAGED, { tower: this, damage: finalDamage });
  }
  return finalDamage;
}
// MatchStateMachine just needs to subscribe to this in start()
```

## Suggested New Constants

```typescript
// Add to src/constants.ts:

// --- Phase 7 — Scoring ---
export const KILL_SCORE = 1;                   // hero kill = 1pt (already implied, make explicit)
export const BOSS_KILL_SCORE = 3;              // boss kill = 3pt
export const TOWER_DAMAGE_THRESHOLD_SCORE = 2; // tower below threshold = 2pt
export const TOWER_DAMAGE_THRESHOLD_PCT = 0.50; // 50% HP threshold triggers score (tunable)
export const NEUTRAL_CONTROL_SCORE = 1;        // camp clear = 1pt (already CAMP_SCORE_POINTS=1)

// --- Phase 7 — Boss Tier 2 ---
export const BOSS_TIER2_DAMAGE_AMP = 25;       // +25 flat damage (permanent for match)
export const BOSS_RESPAWN_DELAY = 30000;       // ms — 30s respawn after kill
export const BOSS_ROAM_SPEED = 60;             // same as BOSS_MOVE_SPEED, explicit for roaming

// --- Phase 7 — Sudden Death ---
export const SUDDEN_DEATH_COLOR = 0xff0000;
export const SUDDEN_DEATH_FLASH_DURATION = 600; // ms
export const SUDDEN_DEATH_FLASH_INTENSITY = 0.7;

// --- Phase 7 — Boss Roam Waypoints (obstacle-aware patrol path) ---
export const BOSS_ROAM_WAYPOINTS: { x: number; y: number }[] = [
  { x: 800, y: 200 },   // North
  { x: 1150, y: 350 },  // NE
  { x: 1250, y: 600 },  // East
  { x: 1150, y: 850 },  // SE
  { x: 800, y: 1000 },  // South
  { x: 450, y: 850 },   // SW
  { x: 350, y: 600 },   // West
  { x: 450, y: 350 },   // NW
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PRE_MATCH → ACTIVE → ENDED` | `PRE_MATCH → ACTIVE → SUDDEN_DEATH → ENDED` | Phase 7 (this phase) | Enables no-respawn last-team-standing mode |
| No boss respawn | Boss respawns up to 2 times (Tier 2 and Tier 3) | Phase 7 (this phase) | Boss becomes a recurring match objective |
| Boss leashes to home only | Boss leashes (Tier 1) or roams arena (Tier 2+) | Phase 7 (this phase) | Tier 2 boss becomes a mobile threat |
| Kill-only score | Four-source score: kills + boss kills + tower threshold + camp control | Phase 7 (this phase) | Score reflects full objective play |
| `endingMatch` boolean guard | `endingMatch` guard + `SUDDEN_DEATH` phase guard | Phase 7 (this phase) | Prevents respawn/score processing after SD |

**Not deprecated:** The existing `transition()` forward-only guard, `endingMatch` local boolean, `BOSS_KILLED` event — all remain; Phase 7 extends them.

## Open Questions

1. **Tower damage threshold: what percentage triggers the 2pt award?**
   - What we know: FLOW-03 says "tower damage thresholds (2pt)" — no specific percentage in requirements.
   - What's unclear: 25%? 50%? The threshold must be high enough to reward meaningful tower damage without being trivially hit.
   - Recommendation: Use 50% HP remaining as the trigger (`hpRatio <= 0.50`). This rewards persistent tower aggression without requiring tower destruction. Make it a constant `TOWER_DAMAGE_THRESHOLD_PCT = 0.50` so it can be tuned.

2. **Boss respawn delay and Tier 2 boss stats — should Tier 2 be stronger than Tier 1?**
   - What we know: BOSS-03 says "second boss kill grants permanent damage amplification and boss begins roaming." No mention of stronger stats for Tier 2 respawn.
   - What's unclear: Does the Tier 2 boss respawn with the same base stats as Tier 1, or with enhanced stats?
   - Recommendation: Tier 2 boss respawns with the same base stats but is already past the scaling that would have accumulated. Use `boss.scalePower(this.bossMinute)` after respawn to apply current minute scaling. This keeps the boss relevant without requiring separate stat tuning.

3. **Sudden Death at 5:00 tie — who wins if one team immediately wipes the other?**
   - What we know: FLOW-05 says "no respawns, last team standing wins." Score comparison at tie entry is equal by definition.
   - What's unclear: After SD starts, does score matter at all? Or is it purely last-team-standing?
   - Recommendation: In Sudden Death, win condition is purely last-team-standing (all heroes on one team dead). Score is irrelevant during SD; it was equal when SD started. `endMatch()` already checks `teamAAlive vs teamBAlive` which handles this correctly.

4. **Boss roaming and camp mobs — can the roaming boss attack camp mobs?**
   - What we know: Boss has `Team.NEUTRAL`. Camp mobs have `Team.NEUTRAL`. Both have physics colliders. BossAISystem targets `Hero[]` only.
   - What's unclear: Should the roaming boss and camp mobs interact? They will physically collide (existing collider).
   - Recommendation: No change needed. Boss AI explicitly targets only `Hero[]` (line 56 in BossAISystem). Camp mobs won't be attacked by the boss. Physical collision (bump/push) will happen but that's acceptable and slightly interesting.

5. **Scoreboard breakdown in HUD — how much detail to show?**
   - What we know: "Live score for both teams tracking kills, boss kills, tower damage thresholds, and neutral camp control" (success criterion 1).
   - What's unclear: Should the breakdown show each category separately (e.g., "Kills: 3 | Boss: 3 | Tower: 2 | Camps: 1") or just a total score?
   - Recommendation: Show total score prominently (replacing the existing `teamAKills - teamBKills` display) with a compact breakdown below. The breakdown reinforces strategic objective play. Add to HUD's `killsText` replacement.

## Sources

### Primary (HIGH confidence)
- `src/systems/MatchStateMachine.ts` — full source read; score object, onKill, onCampCleared, transition guard, timer loop
- `src/systems/EventBus.ts` — full source read; all existing events, extension pattern
- `src/scenes/BattleScene.ts` — full source read; bossKillCount needs addition, onBossKilled, respawnTimers, endMatch, matchStateChange handler
- `src/entities/BossEntity.ts` — full source read; die(), onDeath(), updateBoss(), phase system, attackTimer
- `src/systems/BossAISystem.ts` — full source read; update loop, aggro targeting, returnToHome, velocity-based movement
- `src/entities/TowerEntity.ts` — full source read; TOWER_DAMAGED emission, die() path, isAlive guard
- `src/ui/HUD.ts` — full source read; existing overlay patterns, kill score text, respawn overlay
- `src/systems/VFXManager.ts` — full source read; screenFlash(), directionalShake(), overlay patterns
- `src/types.ts` — full source read; MatchPhase enum, Team enum, BuffType enum, ActiveBuff interface
- `src/constants.ts` — full source read; MATCH_DURATION, BOSS_*, TOWER_*, CAMP_*, all tunable values
- `src/entities/BaseEntity.ts` — full source read; die() canonical path, takeDamage, updateBuffs
- `.planning/REQUIREMENTS.md` — FLOW-03, FLOW-04b, FLOW-05, FLOW-06, BOSS-03, BOSS-04 exact text
- `.planning/research/ARCHITECTURE.md` — original SUDDEN_DEATH state machine design decision
- `.planning/phases/04-boss-towers/04-RESEARCH.md` — Phase 4 decisions (boss respawn deferred, BossAISystem standalone)

### Secondary (MEDIUM confidence)
- `src/systems/ArenaGenerator.ts` — obstacle positions per layout type; used to reason about waypoint safety
- Phaser 3 Arcade Physics collider sliding behavior — confirmed by existing boss/hero collider setup that boss slides along obstacles without getting stuck in existing game play

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing Phaser 3 APIs
- Architecture patterns: HIGH — directly derived from existing BossEntity, TowerEntity, MatchStateMachine, EventBus patterns in codebase
- Boss Tier 2 waypoint approach: MEDIUM-HIGH — waypoints avoid pathfinding library complexity; Phaser collider sliding provides obstacle avoidance passably; not verified in this specific arena but consistent with how boss already moves
- Pitfalls: HIGH — identified from direct codebase analysis (respawn timer race, entity type filtering, double-transition, buff expiry)
- Constants/tuning: MEDIUM — damage threshold at 50%, Tier 2 damage amp at +25, respawn delay at 30s are reasonable but need playtesting

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable codebase; Phaser 3 APIs stable)
