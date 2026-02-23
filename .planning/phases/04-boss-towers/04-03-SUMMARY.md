---
phase: 04-boss-towers
plan: 03
subsystem: systems
tags: [boss-ai, aggro, leash, fsm, combat-targeting, area-effects, phaser]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "BaseEntity class, EventBus singleton, combat methods (takeDamage/heal/buffs)"
  - phase: 04-boss-towers
    provides: "BossEntity with phase FSM, TowerEntity with AoE attack, Team.NEUTRAL, boss/tower constants and events"
provides:
  - "BossAISystem driving boss aggro, leash, and phase-based attack patterns"
  - "BattleScene integration: boss + tower spawning, update loops, physics colliders, 60s scaling timer, cleanup"
  - "CombatSystem targeting boss and towers via getNonHeroTargets (auto-attack, projectiles, area effects)"
  - "AreaEffect support for damaging non-hero BaseEntity targets"
affects: [04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BossAISystem is standalone (not AIController subclass) -- boss has no abilities/mana/hero target selection"
    - "Sticky aggro timer prevents ping-pong target switching (2s cooldown before re-evaluating)"
    - "getNonHeroTargets() pattern: BattleScene exposes targetable non-hero entities filtered by attacker team"
    - "Generic attack VFX for non-Hero targets (showGenericAttack) -- separate from Hero-specific VFX methods"

key-files:
  created:
    - "src/systems/BossAISystem.ts"
  modified:
    - "src/scenes/BattleScene.ts"
    - "src/systems/CombatSystem.ts"
    - "src/entities/AreaEffect.ts"
    - "src/entities/BossEntity.ts"

key-decisions:
  - "BossEntity.attackTimer changed from private to public for BossAISystem access (Rule 3 blocking fix)"
  - "Boss AI is standalone system, not AIController extension -- fundamentally different behavior model (aggro-based, no abilities/mana)"
  - "getNonHeroTargets() returns boss (always) + enemy tower (team-filtered) -- used by auto-attack, projectiles, and area effects"
  - "Buffs not applied to boss/tower from projectile or area effect hits -- buff system is hero-only"

patterns-established:
  - "BossAISystem drives boss via aggro radius + sticky target timer + leash-to-home (no heal on return)"
  - "getNonHeroTargets(team) as the canonical API for CombatSystem to find non-hero targetable entities"
  - "showGenericAttack() provides VFX for attacking non-Hero BaseEntity targets"

# Metrics
duration: 9min
completed: 2026-02-23
---

# Phase 4 Plan 3: Boss AI System & Scene Integration Summary

**BossAISystem with aggro/leash/3-phase attacks, BattleScene boss+tower lifecycle (spawn, update, colliders, 60s scaling, cleanup), and CombatSystem+AreaEffect wired to damage boss and towers**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-23T05:17:25Z
- **Completed:** 2026-02-23T05:26:49Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created BossAISystem with aggro-radius targeting, sticky timer, leash-to-home (without healing), and 3 phase-based attack patterns (single melee / melee+AoE / rapid+AoE)
- Integrated boss and towers into BattleScene: spawning, per-frame update loops, physics colliders, 60-second scaling timer, and shutdown cleanup
- Updated CombatSystem so hero auto-attacks, projectiles, and area effects can hit boss and towers via getNonHeroTargets()
- Added generic attack VFX (showGenericAttack) for non-Hero targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BossAISystem** - `85ed049` (feat)
2. **Task 2: Integrate boss and towers into BattleScene** - `aacda67` (feat)
3. **Task 3: Update CombatSystem and AreaEffect to target boss and towers** - `b3f4972` (feat)

## Files Created/Modified
- `src/systems/BossAISystem.ts` - Standalone boss AI: aggro, leash, phase-based attacks with VFX
- `src/scenes/BattleScene.ts` - Boss + tower spawning, update loop wiring, physics colliders, scaling timer, getNonHeroTargets(), cleanup
- `src/systems/CombatSystem.ts` - Auto-attack, projectile, and area effect targeting for boss/towers; showGenericAttack VFX
- `src/entities/AreaEffect.ts` - updateEffect() accepts optional nonHeroTargets parameter for boss/tower damage
- `src/entities/BossEntity.ts` - attackTimer changed from private to public for BossAISystem access

## Decisions Made
- BossEntity.attackTimer changed from private to public -- BossAISystem needs to check and reset it directly (Rule 3 auto-fix)
- Boss AI is a standalone system (not AIController) -- boss has no abilities, mana, or hero target selection logic
- getNonHeroTargets() returns boss (always targetable, neutral) + the enemy team's tower -- this single API is used by auto-attack, projectiles, and area effects
- Buffs from projectiles and area effects are NOT applied to boss/tower -- buff system is hero-only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] BossEntity.attackTimer visibility**
- **Found during:** Task 1 (Create BossAISystem)
- **Issue:** BossEntity.attackTimer was private; BossAISystem needs to check `boss.attackTimer <= 0` and reset it
- **Fix:** Changed field from `private attackTimer = 0` to `attackTimer = 0` (public)
- **Files modified:** src/entities/BossEntity.ts
- **Verification:** TypeScript compiles, BossAISystem can access attackTimer
- **Committed in:** 85ed049 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- single visibility change required for cross-system access. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Boss spawns at center, attacks heroes with phase-based patterns, and scales every minute
- Towers spawn near each team's spawn and attack enemies in range
- Heroes can auto-attack, shoot projectiles at, and use area effects on boss and towers
- Ready for 04-04 (win conditions, boss kill rewards, tower destruction effects)

## Self-Check: PASSED

- [x] src/systems/BossAISystem.ts exists
- [x] 04-03-SUMMARY.md exists
- [x] Commit 85ed049 found
- [x] Commit aacda67 found
- [x] Commit b3f4972 found

---
*Phase: 04-boss-towers*
*Completed: 2026-02-23*
