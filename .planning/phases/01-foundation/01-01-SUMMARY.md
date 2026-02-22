---
phase: 01-foundation
plan: "01"
subsystem: foundation
tags: [phaser, typescript, event-bus, types, interfaces]

# Dependency graph
requires: []
provides:
  - EventBus singleton (Phaser.Events.EventEmitter, module-level, survives scene restarts)
  - Events typed constants object (6 event keys: hero:killed, hero:respawned, match:state_change, match:timer_tick, respawn:tick, score:updated)
  - EventKey derived union type
  - MatchPhase enum (PRE_MATCH, ACTIVE, ENDED)
  - IBattleScene interface (heroes, teamA, teamB, player, spawnA, spawnB, kills, matchTimer, matchOver, getEnemies, getAllies)
affects:
  - 01-02 (RespawnSystem will import EventBus and Events)
  - 01-03 (MatchStateMachine adds to IBattleScene)
  - All later phases using cross-system events

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level EventEmitter singleton for cross-system events (not game.events)
    - Typed event constants (as const object + derived union type) instead of raw strings
    - Context-scoped on/off subscription to prevent listener leaks
    - import type for circular-dep-safe type references across modules

key-files:
  created:
    - src/systems/EventBus.ts
  modified:
    - src/types.ts
    - src/ui/HUD.ts
    - src/scenes/BattleScene.ts

key-decisions:
  - "Use Phaser.Events.EventEmitter (not EventEmitter3 directly) — already bundled in Phaser 3.90.0, no extra dependency"
  - "Module-level singleton over game.events — survives scene restarts cleanly"
  - "Added matchOver to IBattleScene — HUD reads it, must be part of the interface contract"
  - "Added spawnA/spawnB to BattleScene fields (copied from arenaConfig at create time) — required by IBattleScene interface"

patterns-established:
  - "Event subscription: EventBus.on(Events.X, handler, this) — always pass context scope as third arg"
  - "Event cleanup: EventBus.off(Events.X, handler, this) — match scope exactly, never removeAllListeners()"
  - "Scene typing: IBattleScene & Phaser.Scene — use intersection type, not any, for scene references in UI"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 1 Plan 01: EventBus + IBattleScene Foundation Summary

**Phaser.Events.EventEmitter singleton with typed Events constants and IBattleScene interface eliminating 'as any' casts in HUD and AI**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-22T23:47:46Z
- **Completed:** 2026-02-22T23:51:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `src/systems/EventBus.ts` with a module-level EventEmitter singleton and 6 typed event constants
- Added `MatchPhase` enum (PRE_MATCH, ACTIVE, ENDED) and `IBattleScene` interface to `src/types.ts`
- Typed `HUD.ts` scene field as `IBattleScene & Phaser.Scene`, removing `any`
- Added `spawnA`/`spawnB` as first-class BattleScene fields (populated from arenaConfig at create time)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EventBus singleton and typed Events constants** - `10d9072` (feat)
2. **Task 2: Extend types.ts with IBattleScene and MatchPhase; type HUD scene** - `1f78171` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified
- `src/systems/EventBus.ts` - Module-level EventBus singleton and typed Events constants with EventKey type
- `src/types.ts` - Added MatchPhase enum and IBattleScene interface at bottom of file
- `src/ui/HUD.ts` - Imported IBattleScene, typed `scene` field as `IBattleScene & Phaser.Scene`
- `src/scenes/BattleScene.ts` - Added `spawnA` and `spawnB` fields, populated during `create()`

## Decisions Made
- Used `Phaser.Events.EventEmitter` (not bare EventEmitter3) since Phaser 3.90.0 already bundles it — no new dependency
- Module-level singleton chosen over `game.events` so the bus survives Phaser scene restarts without re-initialization
- `matchOver` added to IBattleScene because HUD.ts accesses it — the interface must cover all HUD-accessed properties
- `spawnA`/`spawnB` stored as BattleScene instance fields (not just in arenaConfig) to satisfy IBattleScene contract

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `matchOver` to IBattleScene**
- **Found during:** Task 2 (typing HUD.ts scene field)
- **Issue:** HUD.ts line 152 accesses `scene.matchOver` but the plan's IBattleScene definition omitted it, causing a TS2339 error
- **Fix:** Added `matchOver: boolean` to IBattleScene in types.ts
- **Files modified:** `src/types.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `1f78171` (Task 2 commit)

**2. [Rule 1 - Bug] Added `spawnA`/`spawnB` as BattleScene instance fields**
- **Found during:** Task 2 (BattleScene must satisfy IBattleScene)
- **Issue:** IBattleScene requires `spawnA`/`spawnB` but BattleScene only had them inside arenaConfig (local variable), causing TS2345 error when passing `this` to HUD constructor
- **Fix:** Declared `spawnA` and `spawnB` as BattleScene class fields; assigned from arenaConfig after arena generation in `create()`
- **Files modified:** `src/scenes/BattleScene.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `1f78171` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug: required for IBattleScene contract to compile)
**Impact on plan:** Both fixes were necessary for TypeScript correctness — the interface cannot be satisfied without them. No scope creep.

## Issues Encountered
None beyond the two auto-fixed type errors above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EventBus singleton is ready for import in plan 01-02 (RespawnSystem)
- IBattleScene interface is ready; 01-03 will add `matchStateMachine` field when MatchStateMachine class exists
- All files compile cleanly with zero TypeScript errors

---
*Phase: 01-foundation*
*Completed: 2026-02-22*

## Self-Check: PASSED

- src/systems/EventBus.ts: FOUND
- src/types.ts: FOUND
- src/ui/HUD.ts: FOUND
- src/scenes/BattleScene.ts: FOUND
- .planning/phases/01-foundation/01-01-SUMMARY.md: FOUND
- Commit 10d9072: FOUND
- Commit 1f78171: FOUND
