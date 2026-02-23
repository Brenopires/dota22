---
phase: 06-neutral-camps
plan: 01
subsystem: types
tags: [typescript, enums, events, constants]

# Dependency graph
requires:
  - phase: 05-battle-traits
    provides: "EventBus singleton and Events object pattern for extending with new events"
provides:
  - "CampType enum (DAMAGE, SHIELD, HASTE, COOLDOWN) — shared vocabulary for all Phase 6 plans"
  - "BuffType.HASTE and BuffType.COOLDOWN_REDUCTION — new buff types consumed by NeutralMob buff application"
  - "17 neutral camp constants in constants.ts (mob stats, radii, timers, buff values, score)"
  - "CAMP_CLEARED, CAMP_BUFF_GRANTED, CAMP_RESPAWNED events in EventBus"
affects:
  - "06-02 through 06-05 — all import CampType, camp constants, and EventBus camp events"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase-scoped constant block pattern (same as Phase 4 Boss/Tower blocks) applied to neutral camps"
    - "Phase-comment annotation on EventBus additions for traceability"

key-files:
  created: []
  modified:
    - src/types.ts
    - src/constants.ts
    - src/systems/EventBus.ts

key-decisions:
  - "CampType.COOLDOWN uses value 'cooldown' (not 'cdr') — enum keys describe the camp type, not the buff abbreviation"
  - "BuffType.COOLDOWN_REDUCTION uses value 'cdr' — consistent with existing BuffType short-value convention"

patterns-established:
  - "Camp type enum follows same structure as BossPhase — placed in types.ts after existing game-state enums"

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 6 Plan 01: Type Foundation Summary

**CampType enum, BuffType extensions (HASTE, COOLDOWN_REDUCTION), 17 camp constants, and 3 EventBus events establishing the shared vocabulary for all Phase 6 neutral camp plans**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T14:02:24Z
- **Completed:** 2026-02-23T14:03:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added CampType enum with 4 values (DAMAGE, SHIELD, HASTE, COOLDOWN) after BossPhase in types.ts
- Extended BuffType enum with HASTE and COOLDOWN_REDUCTION — no existing values changed
- Added 17 neutral camp constants covering mob stats, movement, aggro/leash radii, respawn timing, buff values, and scoring
- Added CAMP_CLEARED, CAMP_BUFF_GRANTED, CAMP_RESPAWNED to EventBus Events object

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CampType enum and extend BuffType in types.ts** - `f32fc61` (feat)
2. **Task 2: Add camp constants and EventBus events** - `fd2c34f` (feat)

## Files Created/Modified
- `src/types.ts` - Added CampType enum (4 values) and BuffType.HASTE + BuffType.COOLDOWN_REDUCTION
- `src/constants.ts` - Added Phase 6 neutral camp constants block (17 constants)
- `src/systems/EventBus.ts` - Added CAMP_CLEARED, CAMP_BUFF_GRANTED, CAMP_RESPAWNED to Events object

## Decisions Made
- CampType.COOLDOWN uses value `'cooldown'` (not `'cdr'`) — enum keys describe the camp type, not the buff abbreviation; consistency with CampType.DAMAGE, SHIELD, HASTE
- BuffType.COOLDOWN_REDUCTION uses value `'cdr'` — consistent with the short-value convention in BuffType (e.g. DOT, CDR)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 6 plans can now import CampType, camp constants, and EventBus camp events
- No blockers; type foundation complete and project compiles cleanly

---
*Phase: 06-neutral-camps*
*Completed: 2026-02-23*

## Self-Check: PASSED

- FOUND: src/types.ts
- FOUND: src/constants.ts
- FOUND: src/systems/EventBus.ts
- FOUND: 06-01-SUMMARY.md
- FOUND commit f32fc61 (Task 1)
- FOUND commit fd2c34f (Task 2)
- PASS: CampType in types.ts
- PASS: COOLDOWN_REDUCTION in types.ts
- PASS: CAMP_MOB_HP in constants.ts
- PASS: CAMP_CLEARED in EventBus.ts
