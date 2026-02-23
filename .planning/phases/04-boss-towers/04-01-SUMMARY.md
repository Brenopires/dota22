---
phase: 04-boss-towers
plan: 01
subsystem: entities
tags: [boss, phaser, fsm, phase-transitions, combat]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "BaseEntity class, EventBus singleton, combat methods (takeDamage/heal/buffs)"
provides:
  - "BossEntity class extending BaseEntity with phase FSM and stat scaling"
  - "Team.NEUTRAL enum value for non-team entities"
  - "BossPhase enum (NORMAL/ENRAGED/DYING) for health-threshold transitions"
  - "Boss constants (HP, damage, armor, scaling, thresholds, intervals)"
  - "Tower constants (HP, damage, range, regen)"
  - "Phase 4 EventBus events (BOSS_KILLED, BOSS_PHASE_CHANGED, BOSS_SCALED, TOWER_*, REVIVAL_TOKEN_USED)"
affects: [04-02, 04-03, 04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Boss die() overrides canonical path to emit BOSS_KILLED instead of HERO_KILLED"
    - "Health-threshold phase FSM: check DYING before ENRAGED to handle massive-damage skip"
    - "Scaling without full-heal: only add HP delta from new maxHP"

key-files:
  created:
    - "src/entities/BossEntity.ts"
  modified:
    - "src/types.ts"
    - "src/constants.ts"
    - "src/systems/EventBus.ts"

key-decisions:
  - "die() duplicates idempotent guard and physics disable instead of calling super.die() -- avoids HERO_KILLED emission that would trigger hero scoring/respawn/XP"
  - "DYING threshold checked before ENRAGED in checkPhaseTransition() -- handles massive damage that skips ENRAGED entirely"
  - "scalePower() heals only the HP delta (newMaxHP - oldMaxHP), not a full heal -- prevents boss from becoming unkillable on scaling"
  - "getArmor() returns BOSS_BASE_ARMOR + minutesElapsed -- armor grows linearly each minute for increasing difficulty"

patterns-established:
  - "Boss entity overrides die() to emit entity-specific death event (BOSS_KILLED) rather than HERO_KILLED"
  - "Phase FSM uses HP-ratio thresholds with visual feedback (tint change, floating text, screen shake)"
  - "Team.NEUTRAL as third team value for non-player/non-enemy entities"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 4 Plan 1: Boss Entity & Type Foundations Summary

**BossEntity class with 3-phase FSM (Normal/Enraged/Dying), per-minute stat scaling, Team.NEUTRAL, and all Phase 4 type/event/constant foundations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T05:07:54Z
- **Completed:** 2026-02-23T05:11:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created BossEntity extending BaseEntity with entityType 'boss' and Team.NEUTRAL
- Implemented 3-phase FSM with HP-threshold transitions (60% ENRAGED, 25% DYING) and visual/audio feedback
- Added scalePower() that increases boss stats per minute without full-healing
- Overrode die() to emit BOSS_KILLED (not HERO_KILLED), preventing hero scoring/respawn/XP contamination
- Added all Phase 4 shared types, constants, and events for boss, tower, and revival systems

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 4 type foundations and constants** - `074aa29` (feat)
2. **Task 2: Create BossEntity class** - `5d77f15` (feat)

## Files Created/Modified
- `src/entities/BossEntity.ts` - BossEntity class with phase FSM, scaling, combat overrides, procedural visuals
- `src/types.ts` - Team.NEUTRAL enum value, BossPhase enum (NORMAL/ENRAGED/DYING)
- `src/constants.ts` - 16 boss constants + 8 tower constants
- `src/systems/EventBus.ts` - 8 Phase 4 events (boss, tower, revival)

## Decisions Made
- die() duplicates the idempotent guard and physics disable rather than calling super.die() -- this is the critical pattern to prevent HERO_KILLED emission from boss death
- DYING threshold checked before ENRAGED in checkPhaseTransition() -- handles edge case of massive damage skipping ENRAGED
- scalePower() only heals the HP delta from new scaling, preventing boss from full-healing each minute
- Boss armor grows linearly (base + minutesElapsed) for increasing difficulty over time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BossEntity is ready for integration with BossSystem (04-02) which handles spawning, aggro, leashing, and combat AI
- Tower constants are defined for TowerEntity (04-03)
- All EventBus events are defined for boss/tower interaction systems

## Self-Check: PASSED

- [x] src/entities/BossEntity.ts exists
- [x] 04-01-SUMMARY.md exists
- [x] Commit 074aa29 found
- [x] Commit 5d77f15 found

---
*Phase: 04-boss-towers*
*Completed: 2026-02-23*
