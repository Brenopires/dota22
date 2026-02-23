---
plan: "01-03"
phase: 01-foundation
subsystem: match-state
status: completed
tags: [phaser, typescript, state-machine, timer-cleanup, match-flow]
started: 2026-02-23T00:07:44Z
completed: 2026-02-23T00:10:47Z

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: EventBus singleton with HERO_KILLED, MATCH_STATE_CHANGE, MATCH_TIMER_TICK event constants
  - phase: 01-foundation plan 02
    provides: BaseEntity abstract class emitting HERO_KILLED on EventBus

provides:
  - MatchStateMachine class with PRE_MATCH/ACTIVE/ENDED FSM and 5-minute countdown timer
  - Confirmed timer leak fix — BattleScene.shutdown() fully cleans up MatchStateMachine and respawnTimers
  - IBattleScene interface with matchStateMachine field (typed, not any)

affects:
  - 01-foundation plan 04 (RespawnSystem will populate respawnTimers Map already declared on BattleScene)
  - 01-foundation plan 05 (HUD timer already reads matchStateMachine.getTimeRemaining() in MM:SS)
  - Any future MATCH_STATE_CHANGE subscribers can now listen for PRE_MATCH/ACTIVE/ENDED transitions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MatchStateMachine FSM: PRE_MATCH→ACTIVE→ENDED forward-only transitions via order index comparison"
    - "Timer ownership: MatchStateMachine owns its Phaser.Time.TimerEvent; BattleScene calls destroy() in shutdown()"
    - "scene.time.removeEvent(handle) — correct Phaser cleanup; NOT handle.destroy() (confirmed Phaser bug)"
    - "EventBus.on/off with context scope — enables precise per-listener cleanup without closures"

key-files:
  created:
    - src/systems/MatchStateMachine.ts
  modified:
    - src/scenes/BattleScene.ts
    - src/types.ts
    - src/ui/HUD.ts
    - src/constants.ts

key-decisions:
  - "endMatch() uses local endingMatch boolean guard (not matchOver) — MatchStateMachine transition() already prevents double-ENDED, endingMatch prevents double delayedCall"
  - "onHeroKill renamed from direct-call method to private EventBus handler taking { victim, killerId } — consistent with EventBus pattern from plan 01-02"
  - "HUD updated inline (not deferred to plan 01-05) — matchTimer/matchOver removal forced HUD update to compile; MM:SS format added as natural consequence"
  - "MATCH_DURATION = 300, RESPAWN_DURATION = 5000 both in constants.ts — single source of truth for Phase 1 timing values"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 1 Plan 03: MatchStateMachine and BattleScene Integration Summary

**PRE_MATCH→ACTIVE→ENDED FSM with 5-minute countdown timer — fixes confirmed tickTimer memory leak, removes instant-defeat-on-death, replaces matchOver boolean with typed MatchPhase enum**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T00:07:44Z
- **Completed:** 2026-02-23T00:10:47Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Created `src/systems/MatchStateMachine.ts` (66 lines) with PRE_MATCH/ACTIVE/ENDED FSM
- MatchStateMachine owns the 5-minute countdown timer via `scene.time.addEvent()` — `destroy()` calls `scene.time.removeEvent()` (not `.destroy()`) to prevent the confirmed Phaser timer leak
- MatchStateMachine listens to `HERO_KILLED` on EventBus for kill scoring, emits `SCORE_UPDATED` per kill and `MATCH_STATE_CHANGE` on transition
- BattleScene no longer has `matchOver` boolean or `tickTimer` method — all match state ownership moved to MatchStateMachine
- `endMatchAsDefeat()` removed — player death no longer ends the match (respawn system in plan 01-04)
- `checkWinCondition()` removed — timer is the only win trigger in Phase 1
- `shutdown()` fully cleans EventBus listeners, destroys MatchStateMachine (cleans its timer), clears respawnTimers Map
- `IBattleScene` updated: `matchTimer`/`matchOver` removed, `matchStateMachine: MatchStateMachine` added
- HUD updated to read `matchStateMachine.getTimeRemaining()` and display MM:SS format (was integer countdown from `scene.matchTimer`)
- `MATCH_DURATION` changed from 60 to 300; `RESPAWN_DURATION = 5000` added

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MatchStateMachine and update constants** - `9ab9dff` (feat)
2. **Task 2: Integrate MatchStateMachine into BattleScene** - `1457b87` (feat)

## Files Created/Modified

- `src/systems/MatchStateMachine.ts` — New FSM class; PRE_MATCH→ACTIVE→ENDED transitions, 5-min timer, onKill score tracking, destroy() cleanup
- `src/scenes/BattleScene.ts` — Removed matchOver/matchTimer/tickTimer/endMatchAsDefeat/checkWinCondition; added matchStateMachine field; onHeroKill refactored to EventBus handler; shutdown() extended with full cleanup
- `src/types.ts` — IBattleScene: matchTimer/matchOver removed, matchStateMachine added; import type added for MatchStateMachine
- `src/ui/HUD.ts` — Timer reads matchStateMachine.getTimeRemaining(), MM:SS format via formatTime(); match-over overlay checks matchStateMachine.getPhase()
- `src/constants.ts` — MATCH_DURATION 60→300, RESPAWN_DURATION = 5000 added

## Decisions Made

- `endMatch()` uses a local `endingMatch` boolean guard rather than relying solely on MatchStateMachine's transition guard — the transition guard prevents double-ENDED but `endMatch()` can be called from `onMatchStateChange` and potentially other paths; belt-and-suspenders is appropriate here
- `onHeroKill` converted to private EventBus handler taking `{ victim, killerId }` — consistent with the EventBus pattern established in plan 01-02, replaces the direct `battleScene.onHeroKill(killer, victim)` call coupling
- HUD updated in this plan rather than deferred to plan 01-05 — removing `matchTimer` and `matchOver` from IBattleScene forced the HUD update to compile cleanly; MM:SS format was the natural outcome
- `MatchPhase` enum stays in `types.ts` (not moved to `MatchStateMachine.ts`) — it was already declared there in plan 01-01's foundation work; no value in moving it

## Deviations from Plan

**1. [Rule 2 - Missing functionality] HUD updated inline in Task 2**
- **Found during:** Task 2, when IBattleScene lost matchTimer and matchOver fields
- **Issue:** HUD.update() referenced `scene.matchTimer` (line 89) and `scene.matchOver` (line 152) — both removed from IBattleScene as part of Task 2. Without updating HUD, TypeScript would fail to compile.
- **Fix:** Updated HUD.update() to read `matchStateMachine.getTimeRemaining()` and check `matchStateMachine.getPhase() === 'ended'`. Added `formatTime()` helper for MM:SS display. This work was planned for 01-05 but had to be pulled forward.
- **Files modified:** `src/ui/HUD.ts`
- **Commit:** `1457b87`

## Issues Encountered

None beyond the HUD deviation documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `respawnTimers: Map<string, Phaser.Time.TimerEvent>` is declared and initialized on BattleScene — plan 01-04 (RespawnSystem) can populate it directly
- `spawnA` and `spawnB` fields already present on BattleScene and in IBattleScene — plan 01-04 can use them for respawn positioning
- `RESPAWN_DURATION = 5000` constant is ready for plan 01-04 to reference
- MatchStateMachine emits `MATCH_TIMER_TICK` every second with `{ remaining }` — plan 01-05 HUD can subscribe to this if EventBus approach preferred over polling

---
*Phase: 01-foundation*
*Completed: 2026-02-23*

## Self-Check: PASSED

- src/systems/MatchStateMachine.ts — FOUND
- src/scenes/BattleScene.ts — FOUND
- src/constants.ts — FOUND
- src/types.ts — FOUND
- src/ui/HUD.ts — FOUND
- .planning/phases/01-foundation/01-03-SUMMARY.md — FOUND
- Commit 9ab9dff (MatchStateMachine + constants) — FOUND
- Commit 1457b87 (BattleScene integration, types, HUD) — FOUND
