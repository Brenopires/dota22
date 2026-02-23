---
phase: 07-scoring-sudden-death
plan: 03
subsystem: ui
tags: [hud, scoreboard, scoring, tower-threshold, phaser]
dependency_graph:
  requires:
    - phase: 07-01
      provides: MatchStateMachine.getScore() with bossKillsA/B, towerThresholdA/B, campClearsA/B
  provides:
    - HUD live four-source scoreboard (K/B/T/C per team)
    - Tower threshold visual cue (gold accent + [!2pt] label)
    - scoreText and scoreBreakdownText fields in HUD
  affects:
    - 07-04 (Sudden Death display may reference HUD patterns)
    - 07-05 (End-game result screen may reference score display)
tech-stack:
  added: []
  patterns:
    - Poll matchStateMachine.getScore() each frame (consistent with HP/mana polling pattern)
    - thresholdTriggered boolean parameter for visual cue — no state stored in HUD
    - Score breakdown rendered as compact K:N B:N T:N C:N string (no rich text)
key-files:
  created: []
  modified:
    - src/ui/HUD.ts
key-decisions:
  - "scoreText replaces killsText — total score now comes from MatchStateMachine.getScore().teamA/B, not teamAKills/teamBKills directly"
  - "scoreBreakdownText placed at y=92 (trait present) or y=76 (no trait) — y-position decided at constructor time via hasTraitIndicator flag"
  - "Breakdown text color is single-color tint toward player's team (left=blue for team A, left=red for team B) — full per-segment coloring would require Phaser rich text"
  - "Tower threshold cue is gold accent line below bar + [!2pt] label — only shows when tower is alive and threshold triggered"
  - "Fallback to teamAKills/teamBKills when score unavailable — defensive pattern for frames before matchStateMachine starts"
duration: 3 min
completed: 2026-02-23
---

# Phase 7 Plan 03: Live Scoreboard HUD Summary

**Four-source live scoreboard replacing kill-only HUD — total score + K/B/T/C breakdown per team, gold threshold cue on tower indicators.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T15:20:31Z
- **Completed:** 2026-02-23T15:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced `killsText` with `scoreText` (total score) + `scoreBreakdownText` (compact K/B/T/C per team)
- Live polling of `matchStateMachine.getScore()` each frame for all four scoring sources
- Color-tinted breakdown toward player's team (blue for team A, red for team B)
- `updateTowerIndicator()` extended with `thresholdTriggered` boolean parameter
- Gold accent line below tower health bar and `[!2pt]` label suffix when tower has been scored

## Task Commits

1. **Task 1: Replace kill score with live four-source scoreboard** - `15a782e` (feat — included in 07-02 commit as pre-existing fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/ui/HUD.ts` — scoreText + scoreBreakdownText fields, getScore() polling, thresholdTriggered tower cue

## Decisions Made

- `scoreText` replaces `killsText` completely — total score sourced from `MatchStateMachine.getScore().teamA/B`, not raw kill counters
- Breakdown y-position (y=92 with trait, y=76 without) decided once at constructor time via `hasTraitIndicator` flag — avoids per-frame conditional
- Breakdown text uses single-color tint per frame (not per-segment) — Phaser text doesn't support inline color runs without a rich text plugin
- Tower threshold visual cue uses gold fill rect + `[!2pt]` label — visible while tower is alive; suppressed after tower destruction

## Deviations from Plan

None — plan executed exactly as written. Note: changes were already present in HEAD (included in 07-02 commit as a pre-existing bug fix for parameter count mismatch). This plan verified the implementation is complete and correct.

## Issues Encountered

The HUD.ts changes specified in this plan were already committed in the 07-02 commit (`15a782e`). That commit included a note: "Fix HUD.ts updateTowerIndicator() parameter count mismatch (pre-existing bug from 07-01)." The 07-02 executor had implemented the full 07-03 scope as part of fixing a build error. This plan confirms the implementation matches the spec and TypeScript compiles cleanly.

## Next Phase Readiness

- HUD scoreboard complete — plans 07-04 (Sudden Death trigger) and 07-05 (end-game result) can proceed
- `matchStateMachine.getScore()` polling pattern established for any future HUD extensions

## Self-Check: PASSED

- `src/ui/HUD.ts` — FOUND
- `07-03-SUMMARY.md` — FOUND
- Commit `15a782e` — FOUND
- `scoreBreakdownText` in HUD.ts — FOUND
- `getScore` in HUD.ts — FOUND
- `killsText` in src/ — CONFIRMED absent (0 occurrences)
- `npx tsc --noEmit` — zero errors

---
*Phase: 07-scoring-sudden-death*
*Completed: 2026-02-23*
