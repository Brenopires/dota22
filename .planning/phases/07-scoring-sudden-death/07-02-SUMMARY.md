---
phase: 07-scoring-sudden-death
plan: 02
subsystem: boss-mechanics
tags: [boss, respawn, roaming, tier-progression, sudden-death, buffs]

dependency_graph:
  requires:
    - phase: 07-01
      provides: "BOSS_TIER2_DAMAGE_AMP, BOSS_RESPAWN_DELAY, BOSS_ROAM_WAYPOINTS, BOSS_ROAM_SPEED constants; BOSS_RESPAWNED event; triggerSuddenDeath() method on MatchStateMachine"
  provides:
    - BossEntity.respawnBoss() — resets HP, phase, physics, visibility, tint; emits BOSS_RESPAWNED
    - BossAISystem.enableRoaming() — enables arena-wide waypoint patrol after Tier 2 kill
    - BossAISystem.resetForRespawn() — clears aggro/sticky state without resetting roaming
    - BossAISystem waypoint patrol via BOSS_ROAM_WAYPOINTS cycling
    - BattleScene.bossKillCount tracking (1=Tier1, 2=Tier2, 3+=Tier3/SuddenDeath)
    - BattleScene.scheduleBossRespawn() — 30s delayed respawn with minute scaling + AI reset
    - Tier 1 kill: standard rewards + boss respawn
    - Tier 2 kill: standard rewards + permanent damage amp (MATCH_DURATION) + enable roaming + respawn
    - Tier 3 kill: standard rewards + triggerSuddenDeath('boss_tier3'), no respawn
  affects:
    - 07-03 through 07-05 — Sudden Death UI/timer plans use the SUDDEN_DEATH state triggered here

tech_stack:
  added: []
  patterns:
    - "respawnBoss() mirrors respawnHero() pattern: physics restore + visual reset + event emit"
    - "isRoaming flag persists across respawns — once enabled after Tier 2, boss always roams"
    - "bossKillCount uses >= 3 guard (not === 3) for defensive coverage of edge cases"
    - "scheduleBossRespawn() guards on MatchPhase.ENDED to avoid post-match respawn"
    - "Tier 2 buff uses distinct sourceId 'boss_tier2_reward' to stack independently with 'boss_reward'"

key_files:
  created: []
  modified:
    - src/entities/BossEntity.ts — added respawnBoss() method
    - src/systems/BossAISystem.ts — added enableRoaming(), resetForRespawn(), roamToNextWaypoint(), isRoaming field
    - src/scenes/BattleScene.ts — added bossKillCount, rewritten onBossKilled() with tiers, added scheduleBossRespawn()
    - src/ui/HUD.ts — fixed updateTowerIndicator() parameter count mismatch (pre-existing bug)

key_decisions:
  - "respawnBoss() uses setCircle(BOSS_RADIUS, -BOSS_RADIUS, -BOSS_RADIUS) matching constructor — ensures collision radius is restored after die() zeros it"
  - "roamToNextWaypoint() re-reads current waypoint after index increment — prevents one-frame skip on waypoint arrival"
  - "bossKillCount >= 3 guard for Tier 3 — defensive, handles any future edge case of count exceeding 3"
  - "MATCH_DURATION used as duration for Tier 2 permanent buff — effectively permanent for remainder of match"
  - "Tier 2 buff sourceId 'boss_tier2_reward' distinct from 'boss_reward' — independent stacking"

patterns_established:
  - "BossAISystem isRoaming persists across respawns — once enabled, always enabled"
  - "scheduleBossRespawn() always applies scalePower(bossMinute) after respawn — boss difficulty stays current"

duration: 3 min
completed: 2026-02-23
tasks_completed: 2
files_modified: 4
---

# Phase 7 Plan 02: Boss Respawn Mechanics, Tier Progression Summary

**Boss Tier 1/2/3 kill system: respawnBoss() resets full state, BossAISystem gains waypoint roaming after Tier 2, BattleScene tracks kill count and triggers Sudden Death on third kill.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T15:20:28Z
- **Completed:** 2026-02-23T15:23:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- BossEntity can be fully respawned (HP, phase, physics, visuals reset) via respawnBoss()
- BossAISystem supports arena-wide waypoint roaming when enableRoaming() is called after Tier 2
- BattleScene tracks boss kill count and applies tier-specific rewards: Tier 1 respawn, Tier 2 permanent +25 damage amp + roaming + respawn, Tier 3 triggerSuddenDeath()

## Task Commits

Each task was committed atomically:

1. **Task 1: BossEntity respawnBoss() + BossAISystem waypoint roaming** - `15a782e` (feat)
2. **Task 2: BattleScene boss kill count tracking and tier progression** - `644ae39` (feat)

## Files Created/Modified
- `src/entities/BossEntity.ts` — added respawnBoss() resetting HP/phase/physics/visibility/tint; emits BOSS_RESPAWNED
- `src/systems/BossAISystem.ts` — added enableRoaming(), resetForRespawn(), private roamToNextWaypoint(); isRoaming/roamWaypointIndex/WAYPOINT_REACH_DIST fields; imported BOSS_ROAM_WAYPOINTS/BOSS_ROAM_SPEED; updated update() to check isRoaming before returnToHome()
- `src/scenes/BattleScene.ts` — added bossKillCount field + reset; imported BOSS_TIER2_DAMAGE_AMP and BOSS_RESPAWN_DELAY; rewrote onBossKilled() with tier logic; added scheduleBossRespawn()
- `src/ui/HUD.ts` — fixed updateTowerIndicator() missing 7th parameter (thresholdScored: boolean) that callers were already passing

## Decisions Made
- `respawnBoss()` calls `setCircle(BOSS_RADIUS, -BOSS_RADIUS, -BOSS_RADIUS)` matching the constructor — `die()` zeros the physics radius via `setCircle(0)`, so without restoring it the respawned boss has no collision (same pattern as hero respawn decision from 01-04)
- `roamToNextWaypoint()` re-reads the waypoint after advancing the index to avoid a one-frame skip on arrival
- `bossKillCount >= 3` (not `=== 3`) for Tier 3 guard — defensive coverage
- Tier 2 buff uses `MATCH_DURATION` (300s) as duration — effectively permanent for remainder of match
- Distinct `sourceId: 'boss_tier2_reward'` ensures Tier 2 buff stacks independently with Tier 1 `'boss_reward'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed HUD.ts updateTowerIndicator() parameter count mismatch**
- **Found during:** Task 1 (TypeScript compile verification)
- **Issue:** Plan 07-01 added `towerThresholdA/B` boolean flags and updated the callers to pass them as the 7th argument, but did not update the `updateTowerIndicator()` method signature to accept the 7th parameter — causing TS2554 errors
- **Fix:** Added `_thresholdScored: boolean = false` as the 7th parameter to `updateTowerIndicator()` (auto-applied by linter)
- **Files modified:** `src/ui/HUD.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `15a782e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing bug from 07-01)
**Impact on plan:** Fix was necessary for compilation. No scope creep.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Boss kill tier progression is complete through Tier 3
- `matchStateMachine.triggerSuddenDeath('boss_tier3')` is wired up and ready
- Plans 07-03 through 07-05 can proceed with Sudden Death UI, timer, and end-game logic

---
*Phase: 07-scoring-sudden-death*
*Completed: 2026-02-23*

## Self-Check: PASSED

Files confirmed present:
- `src/entities/BossEntity.ts` — respawnBoss(): FOUND
- `src/systems/BossAISystem.ts` — enableRoaming(): FOUND
- `src/scenes/BattleScene.ts` — bossKillCount, scheduleBossRespawn: FOUND

Commits confirmed:
- 15a782e: FOUND
- 644ae39: FOUND

TypeScript: `npx tsc --noEmit` — zero errors
