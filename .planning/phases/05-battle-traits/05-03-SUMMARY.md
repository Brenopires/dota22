---
phase: 05-battle-traits
plan: 03
subsystem: ui
tags: [phaser, draft-scene, trait-display, gem-display, hud]

# Dependency graph
requires:
  - phase: 05-01
    provides: traitData.ts (getTraitById) and gemData.ts (getGemById) registries
  - phase: 05-02
    provides: MatchOrchestrator returns traitId and gemAssignments in MatchConfig
provides:
  - Trait banner display in DraftScene between arena header and team labels
  - Per-hero gem info display on each hero card below abilities
affects: [05-04, 05-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [color-from-integer hex conversion for trait/gem display, banner layout insertion between existing elements]

key-files:
  created: []
  modified:
    - src/scenes/DraftScene.ts

key-decisions:
  - "Trait banner at y=42-64 with rounded rect background using trait color at 15% alpha"
  - "Gem line uses 11px font (vs 12px abilities) to visually distinguish gem info from ability descriptions"
  - "Card height increased from 120 to 136px and spacing from 130 to 146px to accommodate gem line"

patterns-established:
  - "Color hex string conversion: '#' + Phaser.Display.Color.IntegerToColor(color).color.toString(16).padStart(6, '0')"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 5 Plan 3: DraftScene Trait Banner & Gem Display Summary

**Trait banner with colored background between arena header and team labels, plus per-hero gem info line on every hero card**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T11:56:30Z
- **Completed:** 2026-02-23T11:58:09Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Trait banner displays trait name, icon, description in trait color between arena header and team labels
- Each hero card shows assigned gem name and description below ability lines using gem color
- Layout adjusted with shifted team labels (+10px), increased card height (+16px), and wider card spacing (+16px)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add trait banner and per-hero gem display to DraftScene** - `a836ff4` (feat)

## Files Created/Modified
- `src/scenes/DraftScene.ts` - Added trait banner between arena header and team labels; added gem info line below abilities on each hero card; adjusted layout spacing

## Decisions Made
- Trait banner positioned at y=42 with 500px wide rounded rect background using trait color at 15% opacity
- Team labels shifted from y=65 to y=75 and cardStartY from 100 to 110 to make room for trait banner
- Card height increased from 120 to 136px to fit gem line; card spacing increased from 130 to 146px
- Gem text rendered at 11px font (vs 12px for abilities) for visual hierarchy distinction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DraftScene now shows trait and gem info before battle starts
- Ready for Plan 05-04 (HUD trait/gem indicators during battle) and Plan 05-05 (phase verification)

## Self-Check: PASSED

- FOUND: src/scenes/DraftScene.ts
- FOUND: .planning/phases/05-battle-traits/05-03-SUMMARY.md
- FOUND: a836ff4 (task 1 commit)

---
*Phase: 05-battle-traits*
*Completed: 2026-02-23*
