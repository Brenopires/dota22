---
phase: 08-draft-ranked
plan: 01
subsystem: ui
tags: [mmr, rank, constants, typescript]

# Dependency graph
requires:
  - phase: 07-scoring-sudden-death
    provides: Completed game loop with scoring system — foundation for MMR updates
provides:
  - 5-tier RANK_THRESHOLDS (Bronze/Silver/Gold/Platinum/Apex) in constants.ts
  - Flat ±40 MMR calculation in MMRCalculator.ts
  - Shared getRank() utility in RankUtils.ts
  - DRAFT_PICK_TIMEOUT = 25 constant for Phase 8 draft timer
affects: [08-02, 08-03, 08-04, 08-05, DraftScene, LeaderboardScene]

# Tech tracking
tech-stack:
  added: []
  patterns: [Shared utility extraction, const-only utility module]

key-files:
  created:
    - src/utils/RankUtils.ts
  modified:
    - src/constants.ts
    - src/utils/MMRCalculator.ts
    - src/scenes/MenuScene.ts
    - src/scenes/ResultScene.ts

key-decisions:
  - "RANK_THRESHOLDS 5-tier: Gold starts at 1000 MMR (matching MMR_INITIAL) so new players land in Gold — intentional design, not a bug"
  - "getRank() extracted to RankUtils as named function (not class) — pure utility, consistent with functional style"
  - "MMRCalculator.calculate() keeps identical 4-param signature — unused params prefixed _ for TypeScript compliance, call sites unchanged"
  - "DRAFT_PICK_TIMEOUT = 25 placed in Phase 8 section in constants.ts — 25s gives 5s margin under 30s spec requirement"

patterns-established:
  - "Shared rank logic: getRank() in RankUtils.ts, imported by any scene that displays rank"
  - "Flat MMR: always ±40, never complex ELO formula — simplicity by design for Phase 8 spec"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 8 Plan 01: Rank System Foundation Summary

**5-tier Bronze/Silver/Gold/Platinum/Apex rank system with flat ±40 MMR and shared getRank() utility extracted from duplicate scene implementations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T16:43:11Z
- **Completed:** 2026-02-23T16:44:38Z
- **Tasks:** 2
- **Files modified:** 5 (4 modified + 1 created)

## Accomplishments
- Replaced 6-tier rank system (Bronze/Silver/Gold/Platinum/Diamond/Master) with spec-required 5-tier system ending at Apex (1500 MMR)
- Replaced ELO formula in MMRCalculator with flat +40 win / -40 loss / 0 draw — all future plans get correct MMR out of the box
- Extracted duplicated getRank() method from MenuScene and ResultScene into shared RankUtils.ts utility

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace RANK_THRESHOLDS (5 tiers) + flat ±40 MMR + add DRAFT_PICK_TIMEOUT** - `36fe25f` (feat)
2. **Task 2: Extract getRank() to shared RankUtils + update MenuScene and ResultScene** - `353d0ec` (feat)

## Files Created/Modified
- `src/constants.ts` - 5-tier RANK_THRESHOLDS, removed MMR_K_FACTOR, added DRAFT_PICK_TIMEOUT = 25
- `src/utils/MMRCalculator.ts` - Flat ±40 MMR logic, removed ELO formula and constants import
- `src/utils/RankUtils.ts` - NEW: shared getRank() utility function
- `src/scenes/MenuScene.ts` - Removed private getRank(), now imports from RankUtils
- `src/scenes/ResultScene.ts` - Removed private getRank(), now imports from RankUtils

## Decisions Made
- Gold starts at 1000 MMR matching MMR_INITIAL — new players start in Gold by design (spec requires this)
- getRank() is a named export function (not a class method) — pure utility, no state needed
- MMRCalculator.calculate() keeps 4-param signature with _ prefixes on unused params — zero call-site breakage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Foundation complete: correct rank tiers and flat MMR are in place for all Phase 8 plans
- getRank() shared utility ready for DraftScene and any new scenes that display rank
- DRAFT_PICK_TIMEOUT = 25 available for plan 08-02 draft timer implementation

---
*Phase: 08-draft-ranked*
*Completed: 2026-02-23*
