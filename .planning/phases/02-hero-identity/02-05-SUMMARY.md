---
phase: 02-hero-identity
plan: "05"
subsystem: ui

tags: [typescript, hud, xp-bar, ability-bar, phaser, level-display]

# Dependency graph
requires:
  - phase: 02-hero-identity
    plan: "03"
    provides: XP_THRESHOLDS array, Hero.level/currentXP fields, HERO_LEVELED_UP event
  - phase: 02-hero-identity
    plan: "02"
    provides: 4-ability hero definitions with isUltimate flag on R slot
provides:
  - HUD XP bar (gold, 6px) below mana bar with proportional fill and LV N text
  - AbilityBar 4-slot layout with R slot gold border (0xFFD700) when ready
  - Visual separation between Q/W/E and R slot via 16px extra gap
affects:
  - 03-ai (AI heroes now visually distinct with R slot gold — consistent with player HUD)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - XP bar reads player.level/currentXP per frame in update() — same polling pattern as HP/mana bars, no event subscription needed
    - isUltimate flag on AbilityDef drives color branching in AbilityBar.update() — avoids hardcoding slot index 3

key-files:
  created: []
  modified:
    - src/ui/HUD.ts
    - src/ui/AbilityBar.ts

key-decisions:
  - "HUD XP bar polls player.level/currentXP each frame — no EventBus subscription needed, consistent with HP/mana polling pattern"
  - "AbilityBar gold color driven by ability.isUltimate flag (not slot index) — future-proof if slot order changes"
  - "Panel background expanded from 62px to 78px height — 16px added for XP bar row, keeps layout compact"
  - "R slot x-position uses 16px rGap beyond Q/W/E spacing — visual separation communicates ultimate distinction without a separate panel"

patterns-established:
  - "UI polling pattern: read game state each frame in update() vs subscribing to events — simpler, no cleanup needed"
  - "Ability slot color branching via isUltimate flag — gold for ultimates, green for regular abilities"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 2 Plan 05: HUD XP Bar + 4-Slot Ability Bar Summary

**Gold XP bar below mana in HUD polling player.level/currentXP each frame, plus 4-slot AbilityBar with R slot gold border driven by isUltimate flag**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T01:06:48Z
- **Completed:** 2026-02-23T01:09:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- HUD now shows a thin gold XP bar (6px) below the mana bar, filling proportionally with XP progress toward next level threshold; "LV N" text updates each frame
- Panel background expanded to 78px height to accommodate the XP row cleanly without overlap
- AbilityBar expanded from 3 to 4 slots (I/O/P/R keys); R slot has a 16px wider gap and gold (0xFFD700) border + glow when ready, green for Q/W/E
- Gold vs green color selection driven by `ability.isUltimate === true` flag — works for all 13 heroes already tagged in heroData.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add XP bar and level display to HUD.ts** - `89f66e1` (feat)
2. **Task 2: Expand AbilityBar to 4 slots with gold R slot styling** - `b7a556d` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/ui/HUD.ts` - Added xpGraphics/levelText fields, XP_THRESHOLDS import, XP bar rendering in update(), panel height 62→78px
- `src/ui/AbilityBar.ts` - 4-slot layout with rGap=16 before R slot, isUltimate-driven gold/green color branching in update()

## Decisions Made
- HUD XP bar polls `player.level`/`player.currentXP` each frame in update() — no EventBus subscription needed; consistent with how HP and mana bars work; no cleanup risk
- AbilityBar color selection uses `ability.isUltimate === true` flag rather than hardcoding slot index 3 — if slot order ever changes, gold follows the ability definition
- Panel background height increased from 62 to 78px — 16px for XP bar row (6px bar height + 10px padding), keeps layout compact within existing bottom-left panel
- R slot gap `rGap=16` beyond Q/W/E standard `gap=8` — doubles the spacing to communicate "this is different" without requiring a separate panel container

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 complete: all 5 plans done — hero identity (stats/types), 4-ability definitions for 13 heroes, XP/leveling system, passive triggers, HUD XP bar and ability bar
- Phase 3 (AI system) can now read hero.level for AI scaling decisions and see the R slot gold border as visual confirmation ultimates are wired
- AbilityBar 4-slot layout is final — Phase 3 AI ability priority (abilityOrder [3,2,0,1]) aligns with slot 3 being the ultimate

## Self-Check: PASSED

- src/ui/HUD.ts — FOUND
- src/ui/AbilityBar.ts — FOUND
- .planning/phases/02-hero-identity/02-05-SUMMARY.md — FOUND
- Commit 89f66e1 (feat: XP bar in HUD) — FOUND
- Commit b7a556d (feat: 4-slot AbilityBar) — FOUND

---
*Phase: 02-hero-identity*
*Completed: 2026-02-23*
