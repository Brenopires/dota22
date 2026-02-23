---
phase: 08-draft-ranked
plan: 03
subsystem: ui
tags: [phaser, draft, hero-select, countdown, partial-match]

# Dependency graph
requires:
  - phase: 08-02
    provides: generatePartialMatch, finalizeMatch, PartialMatchConfig interface
  - phase: 08-01
    provides: DRAFT_PICK_TIMEOUT constant, HeroRegistry.getAllHeroIds
provides:
  - Interactive pick-from-3 hero selection in DraftScene
  - 25-second countdown with auto-pick on expiry
  - traitId flows through PartialMatchConfig into final MatchConfig via finalizeMatch
affects: [BattleScene, MatchOrchestrator, 08-04, 08-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fisher-Yates shuffle for hero candidate pool (excluding teamB)"
    - "_picked boolean guard prevents double-pick race condition"
    - "Both _countdownEvent and _autoPick cancelled on manual pick"
    - "PartialMatchConfig generated before player hero pick; finalized via finalizeMatch"

key-files:
  created: []
  modified:
    - src/scenes/DraftScene.ts

key-decisions:
  - "Tasks 1 and 2 implemented in single pass — both tasks write to same file, splitting into two separate file states would require an intermediate stub commit that adds no value"
  - "_renderPickCards uses hitArea rectangle with setInteractive (not card graphics) — ensures clean click boundary matching visible card dimensions"
  - "Card border redrawn in pointerover/pointerout handlers (clear + redraw) rather than alpha tween — graphics objects cannot tween their lineStyle alpha directly"
  - "Hint text shows 'auto-pick in Xs' updated each tick — keeps player informed of remaining time"

patterns-established:
  - "Draft flow: generatePartialMatch() on scene create → player picks hero → finalizeMatch() on confirm → BattleScene start"
  - "traitId display reads from partialConfig.traitId, not a separate state variable"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 8 Plan 03: DraftScene Rewrite Summary

**Pick-from-3 interactive hero draft with 25-second auto-pick countdown, replacing DraftScene passive team viewer with player-agency hero selection using PartialMatchConfig/finalizeMatch pipeline**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T16:46:55Z
- **Completed:** 2026-02-23T16:48:39Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- DraftScene now calls `generatePartialMatch()` to get teamB, arena, and traitId before the player's hero pick
- Three random hero candidates displayed as interactive pick cards (excluded from teamB pool, Fisher-Yates shuffled)
- 25-second countdown timer auto-picks `candidates[0]` if no manual pick; both timers cancelled on manual pick
- `_picked` boolean guard prevents double-pick race condition (e.g., click + auto-pick firing simultaneously)
- `finalizeMatch(heroId, partialConfig)` called in `_confirmPick()` — builds full MatchConfig including player hero, teamA fill, and gem assignments
- Trait banner displayed using `partialConfig.traitId` — traitId flows correctly into the final MatchConfig passed to BattleScene

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Rewrite DraftScene (structure + pick cards + countdown)** - `103cf02` (feat)

Note: Both tasks modify the same file. Implementation was done in a single pass — the structural rewrite (Task 1) and interactive rendering (Task 2) were written together to avoid an intermediate state with stub methods.

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/scenes/DraftScene.ts` — Complete rewrite: interactive pick-from-3 draft scene with countdown, candidate generation, card rendering, hover effects, and PartialMatchConfig/finalizeMatch integration

## Decisions Made

- Tasks 1 and 2 implemented in a single pass: both tasks write to the same file — splitting into a stub state (Task 1) + fill-in (Task 2) adds commit overhead with no correctness benefit
- Card border hover handled with `graphics.clear()` + redraw rather than tween on alpha: Phaser `Graphics` objects don't support tweening line style alpha directly
- Hit area is an invisible `Rectangle` with `setInteractive({ useHandCursor: true })` placed over each card — clean separation between visual and interactive layers
- Hint text updates each countdown tick to show remaining seconds — better UX than static text

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

Note on implementation approach: Tasks 1 and 2 were implemented in a single file write (single commit) rather than stub → fill-in across two commits. This is consistent with the plan's own note: "stub `_renderPickCards` and `_startCountdown` as empty private methods if needed for compilation" — since both methods were implemented immediately, no stub was needed.

## Issues Encountered

None — TypeScript compiled with zero errors on first pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DraftScene is fully functional as the Phase 8 interactive hero selection screen
- MatchConfig passed to BattleScene contains correct `playerHero`, `teamA`, `teamB`, `traitId`, `gemAssignments`
- Plan 08-04 (ranked matchmaking / MMR display) can proceed — DraftScene now connects to the full PartialMatchConfig pipeline
- Plan 08-05 (ResultScene ranked display) ready to consume MatchConfig output from this draft flow

---
*Phase: 08-draft-ranked*
*Completed: 2026-02-23*
