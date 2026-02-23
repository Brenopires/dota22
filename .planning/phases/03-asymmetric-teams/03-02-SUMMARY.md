---
phase: 03-asymmetric-teams
plan: "02"
subsystem: gameplay
tags: [teams, asymmetric, balancing, scaling, mmr, hero-stats]

# Dependency graph
requires:
  - phase: 03-asymmetric-teams/03-01
    provides: MatchConfig type with teamSizeA/teamSizeB, MatchResult optional teamSizeA/teamSizeB fields, ArenaGenerator with 5 spawn points
  - phase: 02-hero-identity
    provides: Hero entity with full HeroStats, HeroRegistry.create() factory, heroDataMap
provides:
  - TeamBalancer.computeMultiplier() — MMR-adaptive stat multiplier for smaller team (1.0–2.5x)
  - TeamBalancer.applyToStats() — returns new HeroStats copy with maxHP/damage scaled; armor untouched
  - TEAM_BALANCE config block in constants.ts (BASE_SCALE_FACTOR, MMR thresholds, caps)
  - HeroRegistry.create() optional 7th param statsOverride for injecting pre-scaled stats
  - BattleScene spawn loops applying scaled stats to the smaller team before instantiation
  - MatchResult now fully populated with teamSizeA, teamSizeB, and backward-compat teamSize
affects:
  - 03-03 (AI target distribution reads teamSizeA/teamSizeB; hero HP affects AI threat assessment)
  - All subsequent Phase 3+ plans that read MatchResult team size fields

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stats copy pattern: TeamBalancer.applyToStats() spreads HeroStats then overwrites maxHP/damage — heroDataMap never mutated"
    - "Single multiplier computation before spawn loops: scalingMultiplier derived once, applied per-hero in each team loop"
    - "statsOverride replaces lookup entirely (not merges) — full HeroStats copy from applyToStats() has all required fields"

key-files:
  created:
    - src/systems/TeamBalancer.ts
  modified:
    - src/constants.ts
    - src/heroes/HeroRegistry.ts
    - src/scenes/BattleScene.ts

key-decisions:
  - "Armor intentionally excluded from scaling — avoids compounding with level-up armor gains; only maxHP and damage scale"
  - "statsOverride replaces heroDataMap lookup entirely — applyToStats() returns complete HeroStats; no merge needed"
  - "Backward-compat teamSize = Math.max(teamSizeA, teamSizeB) kept in MatchResult — localStorage readers unaffected"
  - "TEAM_BALANCE.MMR_SCALE_REDUCTION=0.7 caps raw bonus so even at MMR floor (1000), only 70% of rawBonus applies — prevents extreme handicapping"
  - "matchConfig field type changed from ReturnType<typeof MatchOrchestrator.generateMatch> to explicit MatchConfig — cleaner coupling, removes ReturnType indirection"

patterns-established:
  - "Scaling injection point: stats computed before instantiation, injected via factory param — no post-spawn mutation"
  - "MMR-adaptive scaling formula: rawBonus * mmrFactor * reductionCap ensures high-MMR players face fair odds"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 3 Plan 02: TeamBalancer and Asymmetric Stat Scaling Summary

**MMR-adaptive TeamBalancer that scales smaller team's maxHP and damage before hero instantiation, using a copy-based pattern that never mutates heroDataMap**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T01:58:17Z
- **Completed:** 2026-02-23T02:00:22Z
- **Tasks:** 3 (Task 1, Task 2a, Task 2b)
- **Files modified:** 4 (created 1, modified 3)

## Accomplishments
- TeamBalancer system created with computeMultiplier() (MMR-adaptive) and applyToStats() (copy-based, armor excluded)
- TEAM_BALANCE constants block added to constants.ts as single source of truth for scaling parameters
- HeroRegistry.create() accepts optional 7th param statsOverride — enables pre-scaled stats injection without touching heroDataMap
- BattleScene spawn loops now compute scalingMultiplier once before spawning and apply it to the smaller team
- MatchResult fully populated with teamSizeA, teamSizeB, and backward-compat teamSize = Math.max(...)
- matchConfig field type updated to explicit MatchConfig import (removes ReturnType indirection)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add TEAM_BALANCE constants and create TeamBalancer** - `02b7c3a` (feat)
2. **Task 2a: Wire HeroRegistry statsOverride parameter** - `50d0e32` (feat)
3. **Task 2b: Update BattleScene spawn loops and endMatch with scaling** - `0963032` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/systems/TeamBalancer.ts` - New: computeMultiplier() and applyToStats() static methods; imports TEAM_BALANCE from constants
- `src/constants.ts` - Added TEAM_BALANCE config block after RANK_THRESHOLDS
- `src/heroes/HeroRegistry.ts` - Added optional statsOverride?: HeroStats as 7th parameter; HeroStats imported from types
- `src/scenes/BattleScene.ts` - Added TeamBalancer/heroDataMap/MatchConfig imports; matchConfig typed as MatchConfig; scaling computation before spawn loops; both team loops use scaledStats; MatchResult includes teamSizeA/teamSizeB/teamSize

## Decisions Made
- Armor excluded from scaling — level-up grants armor stacks; scaling armor would compound unpredictably with passive gains. Only maxHP and damage scale.
- statsOverride replaces heroDataMap lookup entirely — applyToStats() always returns a complete HeroStats copy with all fields; merging would be redundant and risked partial overwrites.
- TEAM_BALANCE.MMR_SCALE_REDUCTION = 0.7 acts as a global cap — even at MMR floor (1000), the effective bonus is 70% of raw. For a 3v1 at MMR 1000: rawBonus=0.70, effectiveBonus=0.49, multiplier=1.49. At MMR 2000: multiplier=1.0 (no bonus).
- Backward-compat teamSize = Math.max(teamSizeA, teamSizeB) kept in MatchResult — existing localStorage entries and any readers expecting teamSize remain unaffected.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TeamBalancer is ready for use by any system needing team-size-aware stat scaling
- MatchResult.teamSizeA and teamSizeB are now required-populated (the optional `?` in types.ts can be made required if desired)
- BattleScene fully migrated: no legacy matchConfig.teamSize references remain in spawn logic
- Plan 03-03 (AI target distribution) can read teamSizeA/teamSizeB directly from matchConfig and reference scaled hero HP for threat calculations

## Self-Check: PASSED

- FOUND: src/systems/TeamBalancer.ts
- FOUND: src/constants.ts (TEAM_BALANCE block)
- FOUND: src/heroes/HeroRegistry.ts (statsOverride param)
- FOUND: src/scenes/BattleScene.ts (scaling in spawn loops + endMatch)
- FOUND commit: 02b7c3a (feat: TEAM_BALANCE constants and TeamBalancer system)
- FOUND commit: 50d0e32 (feat: HeroRegistry statsOverride parameter)
- FOUND commit: 0963032 (feat: BattleScene spawn loops and endMatch scaling)

---
*Phase: 03-asymmetric-teams*
*Completed: 2026-02-23*
