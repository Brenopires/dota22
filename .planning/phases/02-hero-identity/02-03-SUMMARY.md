---
phase: 02-hero-identity
plan: "03"
subsystem: gameplay

tags: [typescript, xp, leveling, events, vfx, phaser]

# Dependency graph
requires:
  - phase: 02-hero-identity
    plan: "01"
    provides: HeroStats.passive required field, HERO_HIT/DAMAGE_TAKEN/HERO_LEVELED_UP events in EventBus
provides:
  - XPSystem class subscribing to HERO_KILLED for 50 XP per kill
  - XP_THRESHOLDS array: level 5 at 320 XP (6-7 kills in 5-min match)
  - Hero.level, Hero.currentXP, Hero.gainXP(), Hero.levelUp() with base-stat scaling
  - Level-up VFX: gold burst + floating "LEVEL N!" text
  - Hero.passiveCooldownTimer field and update loop for Plan 02-04
  - BattleScene.xpSystem created in create(), destroyed in shutdown()
affects:
  - 02-04 (passive implementations can read hero.level for scaling)
  - 02-05 (HUD XP bar subscribes to HERO_LEVELED_UP event)
  - 03-ai (AI heroes now level up and scale with kills)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - XPSystem uses EventBus.on/off with context scope — matches singleton pattern from 01-01
    - base-stat snapshot at construction (baseMaxHP/baseDamage) prevents exponential scaling runaway
    - levelUp() emits HERO_LEVELED_UP before VFX — event-first ordering for clean subscriber decoupling

key-files:
  created:
    - src/systems/XPSystem.ts
  modified:
    - src/entities/Hero.ts
    - src/scenes/BattleScene.ts

key-decisions:
  - "XP_THRESHOLDS uses cumulative XP not delta — simplifies levelUp() loop (compare currentXP >= THRESHOLDS[level])"
  - "baseMaxHP/baseDamage snapshot at construction — prevents compound growth when levelUp() uses current stat as base"
  - "passiveCooldownTimer added in same task as XP fields — Plan 02-04 can use it immediately without a separate Hero.ts edit"

patterns-established:
  - "Base-stat snapshotting pattern: store original value at construction for all percentage-based scaling to avoid exponential runaway"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 2 Plan 03: XP System Summary

**XPSystem class with kill-XP event subscriptions, Hero level/XP fields, base-stat scaling on levelup, and gold burst VFX + floating text feedback after each kill**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T00:56:24Z
- **Completed:** 2026-02-23T00:58:34Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created XPSystem.ts: subscribes to HERO_KILLED via EventBus, awards 50 XP to killer, unsubscribes cleanly in destroy() to prevent memory leaks on scene restart
- Added Hero.level, Hero.currentXP, Hero.gainXP(), Hero.levelUp() — level-up scales maxHP +6% base, damage +4% base, armor +0.5 flat per level using snapshotted base stats
- Level-up VFX fires immediately: vfxManager.spawnBurst (gold, 16 particles) + floating "LEVEL N!" text with tween fade-up
- BattleScene instantiates XPSystem after all heroes are created, and calls xpSystem.destroy() in shutdown()
- Added passiveCooldownTimer to Hero.updateHero() for Plan 02-04 passive implementations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create XPSystem.ts with level thresholds and kill-XP logic** - `c512324` (feat)
2. **Task 2: Add level/XP fields and gainXP()/levelUp() to Hero, instantiate XPSystem in BattleScene** - `52b096c` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/systems/XPSystem.ts` - XP accumulation, level threshold constants, HERO_KILLED subscription with destroy() cleanup
- `src/entities/Hero.ts` - level/currentXP fields, baseMaxHP/baseDamage snapshots, gainXP()/levelUp()/showLevelUpVFX() methods, passiveCooldownTimer
- `src/scenes/BattleScene.ts` - XPSystem import, xpSystem property, instantiation in create(), destroy in shutdown()

## Decisions Made
- XP_THRESHOLDS stores cumulative XP (not delta per level) — levelUp loop uses `currentXP >= THRESHOLDS[level]`, which handles multi-level jumps from objective XP cleanly
- baseMaxHP and baseDamage are snapshotted at Hero construction time — levelUp() scales from these values to prevent exponential runaway on multiple level-ups
- passiveCooldownTimer field added alongside XP fields — avoids a second Hero.ts edit in Plan 02-04; the update loop is already present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All heroes now gain XP from kills and level up with stat scaling
- HERO_LEVELED_UP event fires on every level-up — Plan 02-05 HUD XP bar can subscribe immediately
- passiveCooldownTimer is live in Hero.updateHero() — Plan 02-04 passive logic can use it without Hero.ts modifications
- XPSystem.awardObjectiveXP(heroId) available for future objective integration (Phase 4)

---
*Phase: 02-hero-identity*
*Completed: 2026-02-23*
