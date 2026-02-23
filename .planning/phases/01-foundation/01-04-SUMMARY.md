---
plan: "01-04"
phase: 01-foundation
subsystem: respawn-system
status: completed
tags: [phaser, typescript, respawn, eventbus, physics, hero-lifecycle]
started: 2026-02-23T00:13:11Z
completed: 2026-02-23T00:14:54Z

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: EventBus singleton with HERO_KILLED and HERO_RESPAWNED event constants
  - phase: 01-foundation plan 02
    provides: BaseEntity.die() emitting HERO_KILLED on EventBus; Hero.onDeath() visual behavior
  - phase: 01-foundation plan 03
    provides: respawnTimers Map + spawnA/spawnB fields on BattleScene; RESPAWN_DURATION constant; HERO_RADIUS constant

provides:
  - BattleScene.onHeroKilled() — EventBus handler that schedules respawn timer (Math.min(RESPAWN_DURATION, 10000))
  - BattleScene.respawnHero() — full hero state reset + physics body restoration with setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS)
  - BattleScene.playerRespawnEndTime — ms timestamp field for HUD countdown overlay (plan 01-05)
  - BattleScene.findHeroById() — helper for killer lookup by unique ID

affects:
  - 01-foundation plan 05 (HUD can read playerRespawnEndTime to display respawn countdown overlay)
  - All future combat plans — hero death now leads to respawn, not match-over

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Respawn via EventBus HERO_KILLED listener — BattleScene is decoupled from Hero death; EventBus bridges the gap"
    - "Physics body restoration: body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS) required after die() zeroes the radius via setCircle(0)"
    - "FLOW-02 cap: Math.min(RESPAWN_DURATION, 10000) — ensures max 10s respawn regardless of constant value"
    - "playerRespawnEndTime = Date.now() + delay pattern — computable remaining time without a separate timer event"

key-files:
  created: []
  modified:
    - src/scenes/BattleScene.ts
    - src/types.ts

key-decisions:
  - "onHeroKill renamed to onHeroKilled in this plan — consistent with EventBus payload naming convention established in plan 01-02"
  - "Physics body setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS) must be called on respawn (not just setEnable) — die() calls setCircle(0) which zeroes the radius"
  - "playerRespawnEndTime uses Date.now() timestamp approach rather than a dedicated Phaser timer event — simpler and eliminates an extra cleanup concern"
  - "Respawn timer stored in respawnTimers Map before completing — existing shutdown() loop already cleans it"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 1 Plan 04: Respawn System Summary

**Hero respawn wired via EventBus HERO_KILLED listener — physics body fully restored with setCircle on respawn; match continues after any hero death**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T00:13:11Z
- **Completed:** 2026-02-23T00:14:54Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `onHeroKill` renamed to `onHeroKilled` — now a full respawn scheduler (not just kill counter + kill feed)
- `onHeroKilled` schedules respawn via `this.time.delayedCall(Math.min(RESPAWN_DURATION, 10000), ...)` — enforces FLOW-02's max 10-second cap
- `respawnHero()` fully restores hero state: HP/mana/buffs reset, repositioned at random team spawn point, physics body re-enabled with `body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS)` to restore collision radius
- `findHeroById()` helper added for killer lookup by unique ID
- `playerRespawnEndTime` field added — set to `Date.now() + respawnDelay` when player dies, reset to `0` on respawn; plan 01-05 HUD reads this for countdown overlay
- `IBattleScene` interface updated with `playerRespawnEndTime: number` — plan 01-05 can access it via typed scene reference
- `shutdown()` updated to unregister `onHeroKilled` (was `onHeroKill`) — listener cleanup is exact
- `HERO_RADIUS` and `RESPAWN_DURATION` imported in BattleScene.ts
- TypeScript compiles with zero errors

## Task Commits

1. **Task 1: Wire HERO_KILLED listener and implement respawn logic in BattleScene** - `23c62f0` (feat)

## Files Created/Modified

- `src/scenes/BattleScene.ts` — `onHeroKill` renamed to `onHeroKilled` and extended with respawn scheduling; `respawnHero()`, `findHeroById()` added; `playerRespawnEndTime` field added; imports updated; EventBus subscription/unsubscription updated
- `src/types.ts` — `IBattleScene.playerRespawnEndTime: number` field added

## Decisions Made

- `onHeroKill` renamed to `onHeroKilled` in this plan — plan 01-03 converted it to an EventBus handler; plan 01-04 completes the naming alignment with the EventBus payload convention
- Physics body `setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS)` called on respawn (not just `setEnable(true)`) — `die()` in BaseEntity calls `setCircle(0)` which zeroes the body radius; without restoring it, projectiles pass through the respawned hero
- `playerRespawnEndTime` uses `Date.now() + delay` timestamp rather than a separate Phaser `addEvent` countdown timer — simpler, no additional cleanup required, and plan 01-05 HUD can compute remaining seconds on each frame

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean on first attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `playerRespawnEndTime` field is on both `BattleScene` and `IBattleScene` — plan 01-05 HUD can read it to display respawn countdown overlay
- `Events.HERO_RESPAWNED` is emitted by `respawnHero()` — future systems can subscribe to this for any post-respawn logic
- Respawn timer cleanup is fully handled in `shutdown()` — no timer leaks across scene restarts

---
*Phase: 01-foundation*
*Completed: 2026-02-23*

## Self-Check: PASSED

- src/scenes/BattleScene.ts — FOUND
- src/types.ts — FOUND
- .planning/phases/01-foundation/01-04-SUMMARY.md — FOUND
- Commit 23c62f0 (respawn system wired into BattleScene) — FOUND
