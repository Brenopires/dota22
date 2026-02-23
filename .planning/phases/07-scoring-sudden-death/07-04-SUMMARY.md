---
phase: 07-scoring-sudden-death
plan: 04
subsystem: state-machine-ui
tags: [sudden-death, match-phase, respawn, team-wipe, hud, overlay]

# Dependency graph
requires:
  - phase: 07-01
    provides: MatchPhase.SUDDEN_DEATH, triggerSuddenDeath() API, SUDDEN_DEATH_COLOR/FLASH constants, SUDDEN_DEATH_TRIGGERED event
  - phase: 07-02
    provides: scheduleBossRespawn(), bossKillCount tracking, boss Tier 3 trigger
  - phase: 07-03
    provides: HUD scoreboard patterns, showKill() API, respawnOverlay container
provides:
  - MatchStateMachine.onTick routes to SUDDEN_DEATH on score tie at timer zero (FLOW-05)
  - BattleScene SUDDEN_DEATH state handler: cancels in-flight respawn timers, screen flash, HUD overlay
  - BattleScene onHeroKilled SUDDEN_DEATH guard: no new respawns, team wipe detection -> ENDED
  - BattleScene scheduleBossRespawn callback guards against SUDDEN_DEATH
  - HUD.showSuddenDeathOverlay(): persistent red border, "SUDDEN DEATH" text, "NO RESPAWNS" warning
  - HUD.update() ELIMINATED overlay for dead player in Sudden Death (no countdown)
affects:
  - 07-05 (end-game result screen — match now ends via SD team wipe or timer non-tie)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Timer-zero tie check in onTick before transitioning to ENDED
    - In-flight timer cancellation via respawnTimers.values() iteration on state entry
    - Team wipe detection via Array.every(h => !h.isAlive) after each kill in SD
    - isSuddenDeath flag in HUD controls overlay branching per frame
    - Persistent Phaser Graphics border drawn once on state entry (not recreated each frame)

key-files:
  created: []
  modified:
    - src/systems/MatchStateMachine.ts
    - src/scenes/BattleScene.ts
    - src/ui/HUD.ts

key-decisions:
  - "onTick tie check uses this.score.teamA === this.score.teamB — both routes (SD and ENDED) handled in single guard block"
  - "respawnTimers.clear() called on SUDDEN_DEATH entry — in-flight timers removed before any kills can trigger respawn race"
  - "playerRespawnEndTime reset to 0 on SD entry — HUD countdown clears even if player was mid-respawn countdown"
  - "teamAAllDead/teamBAllDead check runs after every SD kill — O(n) but n<=5, no perf concern"
  - "scheduleBossRespawn callback guards !== SUDDEN_DEATH alongside !== ENDED — boss does not respawn after SD entry"
  - "isSuddenDeath flag set once on showSuddenDeathOverlay() call — no EventBus subscription needed in HUD, consistent with polling pattern"
  - "ELIMINATED overlay created lazily (first dead frame) — consistent with existing respawn overlay creation pattern"
  - "update() guard only blocks on ENDED (not SUDDEN_DEATH) — heroes must continue fighting through SD"

patterns-established:
  - "Pattern: State entry handler cancels all in-flight timers before any new state logic runs"
  - "Pattern: HUD receives state flag via method call (not EventBus) — keeps HUD decoupled from specific event shapes"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 7 Plan 04: Sudden Death Triggers, Respawn Cancellation, Team Wipe Detection, and HUD Overlay Summary

**Complete Sudden Death system: 5:00 tie routes to SD, respawns cancelled on entry, team wipe ends match, HUD shows red border + "SUDDEN DEATH" + "ELIMINATED" overlay for dead player.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T15:26:33Z
- **Completed:** 2026-02-23T15:28:43Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `MatchStateMachine.onTick()` now checks for score tie at timer zero — tied score routes to SUDDEN_DEATH, non-tie routes to ENDED (FLOW-05)
- `BattleScene.onMatchStateChange()` handles SUDDEN_DEATH: clears all in-flight respawn timers, resets player respawn time, fires screen flash, calls HUD overlay
- `BattleScene.onHeroKilled()` guards new respawn scheduling during SUDDEN_DEATH; detects team wipe (`teamA.every(!h.isAlive)` or `teamB.every(!h.isAlive)`) and transitions to ENDED
- `BattleScene.scheduleBossRespawn()` callback guards against both ENDED and SUDDEN_DEATH — boss stays dead after SD starts
- `HUD.showSuddenDeathOverlay()` draws persistent red border (6px, 0xff0000), "SUDDEN DEATH" text (22px bold red, stroke) at y=110, "NO RESPAWNS" warning (12px, y=134)
- `HUD.update()` respawn overlay section branches on `isSuddenDeath`: dead player sees "ELIMINATED" + "No respawns in Sudden Death" instead of countdown

## Task Commits

Each task was committed atomically:

1. **Task 1: Sudden Death timer trigger in MatchStateMachine** - `c37484f` (feat)
2. **Task 2: BattleScene Sudden Death state handler + respawn guard + team wipe detection** - `22c0416` (feat)
3. **Task 3: HUD Sudden Death overlay + respawn override** - `6df1e79` (feat)

## Files Created/Modified

- `src/systems/MatchStateMachine.ts` — onTick tie check routes to triggerSuddenDeath('timer_tie') or ENDED
- `src/scenes/BattleScene.ts` — SUDDEN_DEATH handler in onMatchStateChange, respawn guard + team wipe in onHeroKilled, SD guard in scheduleBossRespawn
- `src/ui/HUD.ts` — showSuddenDeathOverlay(), isSuddenDeath flag, ELIMINATED overlay branch in update()

## Decisions Made

- `onTick` tie check uses `this.score.teamA === this.score.teamB` — both routes (SD and ENDED) handled in single guard block at timer zero
- `respawnTimers.clear()` called on SUDDEN_DEATH entry — in-flight timers cancelled before any new kills can trigger respawn race condition
- `playerRespawnEndTime` reset to 0 on SD entry — HUD countdown clears even if player was mid-respawn countdown when SD starts
- Team wipe check (`teamAAllDead / teamBAllDead`) runs after every SD kill — O(n) with n<=5, no performance concern
- `isSuddenDeath` flag set once via method call rather than EventBus subscription — consistent with HUD's polling-first pattern

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sudden Death is fully functional: 5:00 tie triggers SD, boss Tier 3 triggers SD (implemented in plan 02), respawns blocked, team wipe ends match, HUD communicates state
- Plan 07-05 (end-game result screen / MMR calculation) can proceed — match now terminates cleanly via all three paths: timer non-tie, tower destruction, SD team wipe

---
*Phase: 07-scoring-sudden-death*
*Completed: 2026-02-23*
