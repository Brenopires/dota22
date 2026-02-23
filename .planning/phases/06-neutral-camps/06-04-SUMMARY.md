---
phase: 06-neutral-camps
plan: 04
subsystem: game-systems,combat
tags: [neutral-camps, ai-system, buff-system, phaser, combat-integration]

dependency_graph:
  requires:
    - phase: 06-01
      provides: CampType enum, CAMP_* constants, CAMP_BUFF_* constants, Events.CAMP_CLEARED/CAMP_BUFF_GRANTED/CAMP_RESPAWNED
    - phase: 06-02
      provides: NeutralMob entity with spawnCamp/respawn/updateMob/moveToward/returnToHome/showMeleeVFX API
    - phase: 06-03
      provides: Hero.addBuff() HASTE/CDR mechanics; MatchStateMachine CAMP_CLEARED scoring
  provides:
    - NeutralCampSystem orchestrator: spawn, aggro+leash AI, buff grant, respawn scheduling
    - BattleScene.getNonHeroTargets() extended with alive camp mobs
    - Camp scaling hooked into bossMinute timer
    - Camp mob physics colliders (obstacles, boss, towers, heroes, inter-mob)
    - Full match restart cleanup via destroy()
  affects: ["06-05", "07-scoring"]

tech-stack:
  added: []
  patterns:
    - "Simplified aggro+leash AI (no sticky target, no AoE) — reduced complexity vs BossAISystem"
    - "CAMP_POSITIONS module-level constant keeps camp coordinates co-located with system"
    - "bossMinute++ moved outside boss alive check — match clock scales camps regardless of boss state"

key-files:
  created:
    - src/systems/NeutralCampSystem.ts
  modified:
    - src/scenes/BattleScene.ts

key-decisions:
  - "NeutralCampSystem uses CAMP_POSITIONS for leash origin — same coordinates used to spawn mobs, no need to expose homePosition from NeutralMob"
  - "bossMinute++ moved outside boss alive check — camp mobs scale by match elapsed minutes, not boss lifetime"
  - "Camp mob physics colliders added at create() time for initial spawn only — respawned mobs reuse existing Phaser body"

duration: 2min
completed: 2026-02-23
---

# Phase 6 Plan 04: NeutralCampSystem Summary

**NeutralCampSystem orchestrates 4 camp mobs (N/S/E/W) with aggro+leash AI, team-wide buff grants on clear, 60s respawn scheduling, and full BattleScene lifecycle integration including getNonHeroTargets() and per-minute scaling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T00:09:29Z
- **Completed:** 2026-02-23T00:11:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- NeutralCampSystem (290 lines) spawns 4 NeutralMob instances at N/S/E/W cardinal positions around boss
- Simple aggro+leash AI: closest hero within 150px aggro, leash at 200px from spawn with full-heal on return
- CAMP_CLEARED handler grants team-wide typed buffs (DAMAGE/SHIELD/HASTE/CDR), shows kill feed, schedules 60s respawn
- BattleScene fully integrated: create/update/shutdown lifecycle, physics colliders, getNonHeroTargets() extension, camp scaling hook

## Task Commits

1. **Task 1: Create NeutralCampSystem** - `8941eb9` (feat)
2. **Task 2: Integrate NeutralCampSystem into BattleScene** - `4f45858` (feat)

## Files Created/Modified

- `src/systems/NeutralCampSystem.ts` - Camp spawn, aggro+leash AI, buff grant, respawn scheduling, destroy() cleanup
- `src/scenes/BattleScene.ts` - NeutralCampSystem lifecycle + getNonHeroTargets() extension + bossScaleTimer camp scaling hook

## Decisions Made

- `NeutralCampSystem` uses `CAMP_POSITIONS` module-level constant for leash origin — same coordinates used to create NeutralMob instances, no need to expose `homePosition` as a public field on NeutralMob
- `bossMinute++` moved outside the `boss?.isAlive` guard in the scale timer — camp mobs should scale by match time elapsed, not boss lifetime (boss may be dead, camps are still active)
- Camp mob physics colliders registered at `create()` time for the 4 initial mobs; Phaser arcade physics body persists across `respawn()` calls so no re-registration needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 05 (HUD camp status indicators) can read `neutralCampSystem.getAliveMobs()` and `mobs` Map for camp state
- All 4 camps functional: spawn, combat, buff, respawn, scaling, cleanup
- Heroes can auto-attack and use abilities on camp mobs via `getNonHeroTargets()`

---
*Phase: 06-neutral-camps*
*Completed: 2026-02-23*

## Self-Check: PASSED
