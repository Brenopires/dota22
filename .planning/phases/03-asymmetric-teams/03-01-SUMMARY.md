---
phase: 03-asymmetric-teams
plan: "01"
subsystem: gameplay
tags: [teams, asymmetric, match-config, arena, types]

# Dependency graph
requires:
  - phase: 02-hero-identity
    provides: Hero entity with full stats, abilities, passives — used by TeamManager.generateTeams()
provides:
  - TeamSizes interface and getRandomTeamSizes() drawing sizeA/sizeB independently from 1-5
  - generateTeams(sizeA, sizeB) accepting separate sizes per side
  - MatchConfig interface in types.ts with teamSizeA, teamSizeB, backward-compat teamSize
  - MatchResult extended with optional teamSizeA/teamSizeB fields (BattleScene populates in 03-02)
  - MatchOrchestrator.generateMatch() returning full MatchConfig with both size fields
  - ArenaGenerator with 5 spawn points per side (up from 4)
affects:
  - 03-02 (BattleScene reads teamSizeA/teamSizeB from matchConfig to scale heroes and display HUD banner)
  - 03-03 (AI target distribution reads teamSizeA/teamSizeB to pick appropriate targets)
  - all subsequent Phase 3 plans

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MatchConfig as typed return object for MatchOrchestrator.generateMatch() — downstream consumers import from types.ts"
    - "Backward-compat teamSize = Math.max(teamSizeA, teamSizeB) pattern — allows BattleScene to continue reading legacy field until updated"
    - "Optional fields on MatchResult for new asymmetric data — avoids breaking existing endMatch() until 03-02"

key-files:
  created: []
  modified:
    - src/systems/TeamManager.ts
    - src/systems/MatchOrchestrator.ts
    - src/systems/ArenaGenerator.ts
    - src/types.ts

key-decisions:
  - "MatchResult teamSizeA/teamSizeB made optional (not required) — BattleScene.endMatch() still builds MatchResult without them; Plan 03-02 adds required population"
  - "TeamSizes interface exported from TeamManager (not types.ts) — keeps it co-located with the generator function that produces it"
  - "5th spawn point at x=80/ARENA_WIDTH-80, y=ARENA_HEIGHT/2 fans out symmetrically from base — minimal change, no obstacle interaction"

patterns-established:
  - "MatchConfig: single typed return object for all match setup — BattleScene destructures rather than reading raw fields"
  - "Backward-compat field pattern: teamSize = Math.max(sizeA, sizeB) until BattleScene migrates in 03-02"

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 3 Plan 01: Asymmetric Team Data Foundation Summary

**Independent 1-5v1-5 team sizes via TeamSizes interface, MatchConfig type with teamSizeA/teamSizeB/backward-compat teamSize, and 5 spawn points per arena side**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T01:54:25Z
- **Completed:** 2026-02-23T01:55:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TeamManager now draws sizeA and sizeB independently (any 1v1 through 5v5 combination)
- MatchConfig interface added to types.ts as typed contract for all match setup data
- MatchOrchestrator.generateMatch() returns full MatchConfig with teamSizeA, teamSizeB, and backward-compat teamSize
- ArenaGenerator expanded from 4 to 5 spawn points per side
- BattleScene untouched — all changes are in data-layer systems only

## Task Commits

Each task was committed atomically:

1. **Task 1: Rework TeamManager and expand types** - `3e266d2` (feat)
2. **Task 2: Update MatchOrchestrator and fix ArenaGenerator spawn points** - `a9abc80` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/systems/TeamManager.ts` - Replaced getRandomTeamSize()/generateTeams(n) with getRandomTeamSizes()/generateTeams(sizeA, sizeB); added TeamSizes interface export
- `src/systems/MatchOrchestrator.ts` - Updated to use new TeamManager API; return type is now MatchConfig; includes teamSizeA, teamSizeB, and backward-compat teamSize
- `src/systems/ArenaGenerator.ts` - Added 5th spawn point to spawnA and spawnB arrays
- `src/types.ts` - Added MatchConfig interface; added optional teamSizeA?/teamSizeB? to MatchResult

## Decisions Made
- `MatchResult.teamSizeA` and `teamSizeB` made optional (`?`) rather than required — BattleScene currently builds MatchResult without them; Plan 03-02 will populate them. Making them required would break BattleScene compilation before 03-02 runs, contradicting the plan's explicit "do not touch BattleScene" constraint.
- `TeamSizes` interface exported from TeamManager (not types.ts) — co-located with the function that produces it, following the existing pattern where system-internal types live in the system file.
- 5th spawn at `x: 80, y: ARENA_HEIGHT/2` (team A) and `x: ARENA_WIDTH-80, y: ARENA_HEIGHT/2` (team B) — symmetric center-line position fans out from the base cleanly without overlapping obstacles.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made MatchResult.teamSizeA/teamSizeB optional to prevent BattleScene compile error**
- **Found during:** Task 1 (types.ts expansion), confirmed by tsc after Task 1
- **Issue:** Plan specified adding `teamSizeA: number` and `teamSizeB: number` as required fields to MatchResult. BattleScene.endMatch() builds a MatchResult literal without these fields. Adding required fields broke tsc with TS2739. Plan also explicitly forbids touching BattleScene in this plan.
- **Fix:** Declared fields as `teamSizeA?: number` and `teamSizeB?: number` (optional). MatchConfig (used by all new code) still has them as required. MatchResult backward compat maintained until Plan 03-02 populates them.
- **Files modified:** src/types.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `3e266d2` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/compile error from required field on existing interface)
**Impact on plan:** Fix is necessary for correctness; does not affect Plan 03-02 which will make the fields non-optional when it populates them in BattleScene.endMatch().

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three fields (`teamSizeA`, `teamSizeB`, `teamSize`) available on `matchConfig` in BattleScene from Plan 03-02 onward
- ArenaGenerator supports up to 5-hero teams on either side
- Plan 03-02 can directly read `this.matchConfig.teamSizeA` and `this.matchConfig.teamSizeB` to scale hero spawning and display the HUD banner

---
*Phase: 03-asymmetric-teams*
*Completed: 2026-02-23*
