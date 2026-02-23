---
phase: 08-draft-ranked
plan: 02
subsystem: match-orchestration
tags: [typescript, match-orchestrator, team-manager, draft, hero-selection]

# Dependency graph
requires:
  - phase: 08-draft-ranked
    provides: Plan 01 types, PartialMatchConfig consumer (DraftScene)
provides:
  - PartialMatchConfig interface exported from MatchOrchestrator
  - generatePartialMatch() — generates teamB, arena, trait, teamB gems without committing to player hero
  - finalizeMatch(playerHeroId, partial) — completes MatchConfig after player picks hero
  - generateTeamBOnly(sizeB) in TeamManager — generates enemy team independently
affects: [08-03-draft-scene, 08-04-ranked-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step match generation: partial (team B + context) then finalize (player hero + team A)"
    - "PartialMatchConfig as internal boundary type between orchestrator and draft scene"
    - "Gem assignment split: teamB in partial step, teamA in finalize step"

key-files:
  created: []
  modified:
    - src/systems/MatchOrchestrator.ts
    - src/systems/TeamManager.ts

key-decisions:
  - "PartialMatchConfig exported from MatchOrchestrator (not types.ts) — internal boundary type for orchestrator/draft boundary only"
  - "HeroRegistry import added to MatchOrchestrator for teamA fill in finalizeMatch"
  - "teamA passive IDs excluded from trait blacklist check in finalizeMatch — trait is chosen before hero pick, matching Phase 5 draft-after-trait-reveal flow"
  - "generateTeams() and generateMatch() preserved unchanged — BattleScene fallback path unaffected"

patterns-established:
  - "Split match generation: generatePartialMatch() reveals match context without locking player hero, finalizeMatch() locks in player choice and fills remaining slots"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 8 Plan 02: Match Orchestrator Partial/Finalize Split Summary

**MatchOrchestrator split into two-step flow: generatePartialMatch() generates teamB/arena/trait/gems without player hero, finalizeMatch() takes player's draft pick and completes the MatchConfig**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T16:43:18Z
- **Completed:** 2026-02-23T16:44:47Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `generateTeamBOnly(sizeB)` to TeamManager — generates enemy team heroes independently with no player hero slot
- Added `PartialMatchConfig` exported interface defining the mid-draft match state (teamB, arena, trait, teamB gems, team sizes)
- Added `generatePartialMatch()` to MatchOrchestrator — assembles everything the DraftScene needs to show trait + match context before player picks
- Added `finalizeMatch(playerHeroId, partial)` to MatchOrchestrator — fills teamA around player's pick, assigns remaining gems, returns complete MatchConfig
- Preserved `generateMatch()` and `generateTeams()` unchanged for BattleScene backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add generateTeamBOnly to TeamManager** - `f3197d1` (feat)
2. **Task 2: Add generatePartialMatch + finalizeMatch to MatchOrchestrator** - `8bbf73b` (feat)

## Files Created/Modified
- `src/systems/TeamManager.ts` - Added `generateTeamBOnly(sizeB)` static method
- `src/systems/MatchOrchestrator.ts` - Added `PartialMatchConfig` interface, `generatePartialMatch()`, `finalizeMatch()`, and `HeroRegistry` import

## Decisions Made
- `PartialMatchConfig` exported from `MatchOrchestrator.ts` (not `types.ts`) — it is an internal contract between the orchestrator and DraftScene, not a shared game-wide type
- `HeroRegistry` import added to `MatchOrchestrator` — needed by `finalizeMatch()` to fill teamA slots with random heroes that avoid duplicates with teamB and player hero
- teamA passive IDs intentionally excluded from trait blacklist check in `finalizeMatch()` — trait is chosen before hero pick in draft flow, so post-hoc conflicts are acceptable by design (matches Phase 5 reasoning)
- Existing `generateTeams()` and `generateMatch()` left entirely unchanged — BattleScene uses `data?.matchConfig ?? MatchOrchestrator.generateMatch()` as fallback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- DraftScene (Plan 08-03) can now call `generatePartialMatch()` to get match context, show 3 random hero choices, then call `finalizeMatch(selectedHeroId, partial)` to complete the config
- `PartialMatchConfig` is exported and ready for DraftScene import
- TypeScript compiles with zero errors

---
*Phase: 08-draft-ranked*
*Completed: 2026-02-23*
