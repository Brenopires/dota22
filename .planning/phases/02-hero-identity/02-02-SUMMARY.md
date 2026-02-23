---
phase: 02-hero-identity
plan: "02"
subsystem: gameplay

tags: [typescript, abilities, input, ai, heroes]

# Dependency graph
requires:
  - phase: 02-hero-identity
    plan: "01"
    provides: AbilityDef.slot widened to include 'R', isUltimate field, type infrastructure
provides:
  - 13 R-slot ultimate ability definitions in heroData.ts
  - Hero.abilityCooldowns expanded to 4 slots (index [3] tracks R cooldown)
  - R key input binding in BattleScene (KeyCodes.R → useAbility(3, x, y))
  - AI shouldUseUltimate() method with 30% probability gate
affects:
  - 02-hero-identity (02-03 onward — all heroes now have 4 abilities)
  - 02-04 (passive field is next requirement; R-slot data complete)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - abilityOrder array in executeUseAbility includes slot 3 — AI naturally picks R as highest priority
    - shouldUseUltimate() extracted as dedicated method — separates ultimate gating logic from general ability readiness

key-files:
  created: []
  modified:
    - src/heroes/heroData.ts
    - src/entities/Hero.ts
    - src/scenes/BattleScene.ts
    - src/ai/AIController.ts

key-decisions:
  - "abilityOrder updated to [3, 2, 0, 1] in executeUseAbility — R ultimate is highest AI priority when available"
  - "shouldUseUltimate() is checked before shouldUseAbility() random gate — ensures ultimate fires at 30% on its own probability regardless of abilityPriority profile value"

patterns-established:
  - "AI ultimate check extracted to dedicated shouldUseUltimate() method — clean separation for future complexity (e.g., distance/target health conditions)"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 2 Plan 02: R-Slot Ultimate Abilities Summary

**13 hero ultimates defined in heroData.ts with distinct mechanics (stun, dash, DOT, slow, shield, buff), R key wired for player input, and AI ultimate usage at 30% probability**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T00:51:06Z
- **Completed:** 2026-02-23T00:54:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added R-slot ultimate (`isUltimate: true`, cooldown 60-120s) to all 13 heroes in heroData.ts
- Expanded Hero.abilityCooldowns from `[0, 0, 0]` to `[0, 0, 0, 0]` — index [3] tracks R cooldown
- Added R key to BattleScene input declaration and initialization; handler calls `player.useAbility(3, worldPoint.x, worldPoint.y)` inside the existing `isAlive` guard
- Added `shouldUseUltimate()` to AIController with 30% probability gate; ultimate is first in `executeUseAbility()` priority order

## Task Commits

Each task was committed atomically:

1. **Task 1: Add R-slot ultimate to all 13 heroes and expand abilityCooldowns** - `100b9d7` (feat)
2. **Task 2: Add R key input for player and AI ultimate logic** - `92a29bb` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/heroes/heroData.ts` - 13 R-slot ultimate entries added at index [3] of each hero's abilities array
- `src/entities/Hero.ts` - abilityCooldowns expanded from 3 to 4 slots
- `src/scenes/BattleScene.ts` - R key type declaration, initialization, and JustDown handler added
- `src/ai/AIController.ts` - shouldUseUltimate() method added; abilityOrder updated to [3, 2, 0, 1]

## Decisions Made
- `abilityOrder` in `executeUseAbility()` updated to `[3, 2, 0, 1]` — R ultimate is highest AI priority when available, consistent with hero design intent
- `shouldUseUltimate()` is checked at the top of `shouldUseAbility()` before the `abilityPriority` random gate — ensures ultimates fire at their own 30% probability regardless of personality profile

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 13 heroes now have Q/W/E/R abilities — complete 4-slot ability set per hero
- Hero.abilityCooldowns has 4 slots — ready for any future slot tracking
- R key input live — player can immediately test ultimates in game
- Plan 02-04 is next to add passive field definitions to all 13 heroes (TypeScript is already enforcing this with 13 errors)

---
*Phase: 02-hero-identity*
*Completed: 2026-02-23*
