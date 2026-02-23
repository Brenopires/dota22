---
phase: 07-scoring-sudden-death
plan: 01
subsystem: types-constants-state-machine
tags: [scoring, sudden-death, match-phase, events, constants]
dependency_graph:
  requires: []
  provides:
    - MatchPhase.SUDDEN_DEATH enum value
    - Phase 7 scoring constants (KILL_SCORE, BOSS_KILL_SCORE, TOWER_DAMAGE_THRESHOLD_SCORE, TOWER_DAMAGE_THRESHOLD_PCT)
    - Phase 7 Boss Tier 2 constants (BOSS_TIER2_DAMAGE_AMP, BOSS_RESPAWN_DELAY, BOSS_ROAM_SPEED, BOSS_ROAM_WAYPOINTS)
    - Phase 7 Sudden Death constants (SUDDEN_DEATH_COLOR, SUDDEN_DEATH_FLASH_DURATION, SUDDEN_DEATH_FLASH_INTENSITY)
    - EventBus events: TOWER_THRESHOLD_SCORED, SUDDEN_DEATH_TRIGGERED, BOSS_RESPAWNED
    - MatchStateMachine four-source scoring (kills, boss kills, tower thresholds, camp clears)
    - MatchStateMachine.triggerSuddenDeath(reason) public method
    - MatchStateMachine.transition() supporting 4-state order with SUDDEN_DEATH
  affects:
    - All Phase 7 plans (07-02 through 07-05) depend on these foundations
tech_stack:
  added: []
  patterns:
    - killerId suffix (_A/_B) for team determination in event handlers
    - Boolean flag (towerThresholdA/B) for one-time score awards
    - EventBus.on/off symmetry in start()/destroy()
    - Forward-only FSM with indexed order array
key_files:
  created: []
  modified:
    - src/types.ts
    - src/constants.ts
    - src/systems/EventBus.ts
    - src/systems/MatchStateMachine.ts
decisions:
  - "SUDDEN_DEATH inserted at index 2 in transition() order array — preserves forward-only guard for all existing ACTIVE→ENDED transitions"
  - "onTowerDamaged guards on tower.isAlive to avoid scoring on destruction frame (Pitfall 4 from research)"
  - "towerThresholdA/B uses boolean flag (not point value) — prevents double-awarding if tower takes more damage after threshold"
  - "onBossKilled uses killerId.endsWith(_A/_B) — consistent with onCampCleared pattern, no Hero[] reference needed in MSM"
  - "getScore() returns { ...this.score } spread — callers get new fields automatically without API change"
  - "onTick() NOT modified — Sudden Death timer trigger is plan 04 responsibility as specified"
metrics:
  duration: 2 min
  completed: 2026-02-23
  tasks_completed: 2
  files_modified: 4
---

# Phase 7 Plan 01: Foundation — Scoring Types, Constants, Events, and MatchStateMachine Summary

**One-liner:** Four-source scoring (kills + boss kills + tower thresholds + camps) wired into MatchStateMachine with SUDDEN_DEATH state and triggerSuddenDeath() API.

## What Was Built

### Task 1: SUDDEN_DEATH enum + Phase 7 constants + events

Added `MatchPhase.SUDDEN_DEATH = 'sudden_death'` between ACTIVE and ENDED in `src/types.ts`.

Added a "Phase 7" section to `src/constants.ts` with 12 new constants covering:
- **Scoring:** `KILL_SCORE` (1), `BOSS_KILL_SCORE` (3), `TOWER_DAMAGE_THRESHOLD_SCORE` (2), `TOWER_DAMAGE_THRESHOLD_PCT` (0.50)
- **Boss Tier 2:** `BOSS_TIER2_DAMAGE_AMP` (25), `BOSS_RESPAWN_DELAY` (30000ms), `BOSS_ROAM_SPEED` (60), `BOSS_ROAM_WAYPOINTS` (8 cardinal/intercardinal arena positions)
- **Sudden Death:** `SUDDEN_DEATH_COLOR` (0xff0000), `SUDDEN_DEATH_FLASH_DURATION` (600ms), `SUDDEN_DEATH_FLASH_INTENSITY` (0.7)

Added 3 events to `src/systems/EventBus.ts`:
- `TOWER_THRESHOLD_SCORED: 'tower:threshold_scored'` — emitted when tower crosses 50% HP threshold
- `SUDDEN_DEATH_TRIGGERED: 'sudden_death:triggered'` — emitted when Sudden Death state is entered
- `BOSS_RESPAWNED: 'boss:respawned'` — emitted when boss respawns (used in plans 03+)

### Task 2: MatchStateMachine four-source scoring + SUDDEN_DEATH support

Extended `MatchStateMachine` with:

1. **score object** expanded to include `bossKillsA`, `bossKillsB`, `towerThresholdA` (boolean), `towerThresholdB` (boolean)

2. **onBossKilled handler** — subscribes to `BOSS_KILLED` in `start()`, awards `BOSS_KILL_SCORE` (3pt) to the killing team, increments `bossKillsA`/`bossKillsB`, emits `SCORE_UPDATED`. Guards on `phase === ENDED`. Uses `killerId.endsWith('_A'/'_B')` pattern consistent with `onCampCleared`.

3. **onTowerDamaged handler** — subscribes to `TOWER_DAMAGED` in `start()`. Guards on `phase === ENDED` and `tower.isAlive` (avoids double-scoring on destruction frame). Computes `hpRatio = currentHP / maxHP`. Awards `TOWER_DAMAGE_THRESHOLD_SCORE` (2pt) to the opposing team when tower crosses 50% HP. Sets boolean flag to prevent re-awarding. Emits `TOWER_THRESHOLD_SCORED` then `SCORE_UPDATED`.

4. **transition() order** updated to 4 entries: `[PRE_MATCH, ACTIVE, SUDDEN_DEATH, ENDED]`. The existing index-based forward-only guard continues to work — SUDDEN_DEATH at index 2 means ACTIVE→SUDDEN_DEATH and SUDDEN_DEATH→ENDED are valid; backward transitions still rejected.

5. **triggerSuddenDeath(reason: string)** public method — calls `this.transition(MatchPhase.SUDDEN_DEATH)` and emits `SUDDEN_DEATH_TRIGGERED` with `{ reason }`. Called by BattleScene in plan 04.

6. **destroy()** updated to unsubscribe `BOSS_KILLED` and `TOWER_DAMAGED`.

7. **getScore()** returns `{ ...this.score }` spread — includes all new fields automatically.

## Commits

| Hash | Message |
|------|---------|
| e1506b5 | feat(07-01): add SUDDEN_DEATH phase + Phase 7 constants + events |
| 7aa21b0 | feat(07-01): extend MatchStateMachine with four-source scoring and SUDDEN_DEATH |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files confirmed present:
- `src/types.ts` — MatchPhase.SUDDEN_DEATH: FOUND
- `src/constants.ts` — BOSS_KILL_SCORE, BOSS_ROAM_WAYPOINTS: FOUND
- `src/systems/EventBus.ts` — SUDDEN_DEATH_TRIGGERED: FOUND
- `src/systems/MatchStateMachine.ts` — onBossKilled, onTowerDamaged, triggerSuddenDeath, SUDDEN_DEATH in transition order: FOUND

Commits confirmed:
- e1506b5: FOUND
- 7aa21b0: FOUND

TypeScript: `npx tsc --noEmit` — zero errors
