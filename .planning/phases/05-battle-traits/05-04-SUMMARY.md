---
phase: 05-battle-traits
plan: 04
subsystem: ui
tags: [hud, trait-indicator, gem-indicator, visual-feedback]

# Dependency graph
requires:
  - phase: 05-01
    provides: getTraitById, getGemById, TraitDef/GemDef types with color/icon/name fields
  - phase: 05-02
    provides: matchConfig.traitId and matchConfig.gemAssignments populated by MatchOrchestrator
  - phase: 02-05
    provides: HUD stat panel layout with XP bar, level text, panel background
  - phase: 04-05
    provides: Tower indicators and boss health bar in HUD
provides:
  - Trait name+icon indicator below kill score with trait-colored background
  - Gem name+description indicator in bottom-left stat panel with gem-colored text
  - Expanded stat panel background (90px) to accommodate gem line
affects: [hud, visual-feedback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static HUD indicators: created once in constructor, no per-frame update needed"
    - "Color conversion: Phaser.Display.Color.IntegerToColor() for hex int to CSS string"
    - "Defensive optional chaining: matchConfig?.traitId and matchConfig?.gemAssignments for safe access"

# Key files
key-files:
  modified:
    - path: src/ui/HUD.ts
      changes: "Added trait/gem imports, traitText/gemText fields, trait indicator at y=68-84, gem indicator at GAME_HEIGHT-25, expanded panel to 90px"

# Decisions
decisions:
  - context: "Trait indicator placement relative to boss health bar"
    decision: "Place trait at y=68-84 (compact 16px), between kill score (y=56) and boss name text (y=66). Minor visual overlap with boss health bar when both visible."
    rationale: "Boss health bar only visible during boss fight; trait indicator always visible. Compact placement keeps top-center HUD tight."

# Metrics
metrics:
  duration: 2 min
  completed: 2026-02-23
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 5 Plan 4: HUD Trait & Gem Indicators Summary

Trait name+icon below kill score with color-coded background, gem name+description in stat panel with gem-colored text -- both static, no per-frame updates.

## What Was Built

### Task 1: Add trait and gem indicators to HUD (0481879)

**Trait indicator (top-center, below kill score):**
- Added `getTraitById` import from `../traits/traitData` and `getGemById` from `../gems/gemData`
- Added `traitText` and `gemText` nullable fields to HUD class
- In constructor: reads `(scene as any).matchConfig.traitId`, looks up TraitDef via `getTraitById()`
- Creates a semi-transparent rounded-rect background at y=68 using the trait's color at 12% opacity
- Creates bold text at y=76 showing `icon + name` (e.g., "!! Glass Cannon") in the trait's color
- Positioned at GAME_WIDTH/2, centered, 200px wide background

**Gem indicator (bottom-left stat panel, below XP bar):**
- Reads `matchConfig.gemAssignments[matchConfig.playerHero]` to find the player's gem ID
- Looks up GemDef via `getGemById()`, creates text at GAME_HEIGHT-25
- Shows `icon + name + description` (e.g., "R Ruby of Might: +15 damage") in the gem's color
- Expanded stat panel background from 78px to 90px height to accommodate the gem line

**Static design:** Both indicators are created once in the constructor and never updated per-frame, since trait and gem assignments don't change during a match.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` passes with zero errors
- `getTraitById` imported and used in HUD.ts (lines 7, 68)
- `getGemById` imported and used in HUD.ts (lines 8, 136)
- `traitText` field declared (line 36) and assigned (line 79)
- `gemText` field declared (line 37) and assigned (line 139)
- Trait indicator positioned at y=68-84 (below kill score at y=56)
- Gem indicator positioned at GAME_HEIGHT-25 (below XP bar at GAME_HEIGHT-36)
- Panel background expanded to 90px height (line 100)

## Commits

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | 0481879 | feat(05-04): add trait and gem indicators to HUD | src/ui/HUD.ts |

## Self-Check: PASSED

- src/ui/HUD.ts: FOUND
- 05-04-SUMMARY.md: FOUND
- Commit 0481879: FOUND
