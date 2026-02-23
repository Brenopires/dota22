---
phase: 06-neutral-camps
plan: 02
subsystem: entities
tags: [phaser, typescript, gameobjects, physics, neutralmob, camps]

# Dependency graph
requires:
  - phase: 06-01
    provides: "CampType enum, CAMP_MOB_* constants, Events.CAMP_CLEARED in EventBus"
  - phase: 04-boss-towers
    provides: "BaseEntity die() pattern, BossEntity as implementation template"
provides:
  - "NeutralMob entity class for all 4 camp guardian types (Damage/Shield/Haste/Cooldown)"
  - "Camp-type-specific visuals: colored circle with glow/pulse rings and D/S/H/C letter label"
  - "die() override emitting CAMP_CLEARED (not HERO_KILLED) — safe for NeutralCampSystem"
  - "respawn() method for NeutralCampSystem to revive mobs after 60s delay"
  - "Per-minute HP/damage scaling via scalePower() following BossEntity pattern"
affects:
  - "06-04-NeutralCampSystem (instantiates and manages NeutralMob)"
  - "06-03-CampAI (calls updateMob, moveToward, stopMoving, returnToHome, showMeleeVFX)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "die() override without super.die() to emit custom event (CAMP_CLEARED not HERO_KILLED) — established by BossEntity in 04-01"
    - "respawn() method on entity class — NeutralCampSystem calls this after delayedCall fires"
    - "Per-minute scaling without full-heal (scalePower heals only HP delta)"

key-files:
  created:
    - src/entities/NeutralMob.ts
  modified: []

key-decisions:
  - "NeutralMob.die() does NOT call super.die() — duplicates idempotent guard + physics disable, emits CAMP_CLEARED, same pattern as BossEntity/TowerEntity (decision 04-01)"
  - "getUniqueId() returns 'camp_' + campType — serves as sourceId for camp buffs and killerId tracking in NeutralCampSystem"
  - "returnToHome() full-heals mob on arrival (unlike BossAISystem leash which does not heal) — prevents kiting exploit where players slowly whittle mob with ranged attacks"
  - "showMobDamageNumber uses camp type color (not generic red) — visually distinguishes camp damage from hero/boss damage numbers"

patterns-established:
  - "Entity respawn pattern: respawn() restores isAlive, HP, buffs, shield, attackTimer; resets position, scale, alpha, angle; re-enables + reconfigures physics body; fade-in tween"
  - "Static color/label maps on entity class: NeutralMob.CAMP_COLORS and NeutralMob.CAMP_LABELS as Record<CampType, ...>"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 6 Plan 02: NeutralMob Summary

**BaseEntity subclass NeutralMob with camp-type-specific visuals (D/S/H/C colored circles), CAMP_CLEARED death event, per-minute scaling, and respawn capability for the four neutral buff camps**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T14:05:17Z
- **Completed:** 2026-02-23T14:06:53Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `NeutralMob` entity following BossEntity pattern exactly: extends BaseEntity, entityType 'neutral_mob', Team.NEUTRAL
- die() override emits CAMP_CLEARED (not HERO_KILLED) — safe from hero scoring/respawn/XP side-effects
- Camp-type visuals: glow ring (ADD blend + pulse), outer stroke ring (alpha pulse), main colored circle, single-letter label (D/S/H/C)
- respawn() fully restores mob state including physics body re-configuration and fade-in tween
- All 10 required methods implemented: getUniqueId, getAttackDamage, getArmor, scalePower, updateMob, moveToward, stopMoving, returnToHome, showMeleeVFX, respawn

## Task Commits

1. **Task 1: Create NeutralMob entity class** - `0dab426` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `src/entities/NeutralMob.ts` - NeutralMob entity: 397 lines, extends BaseEntity with camp-specific death event, visuals, scaling, and respawn

## Decisions Made

- **die() does NOT call super.die():** Duplicates idempotent guard + physics disable + calls onDeath(), emits CAMP_CLEARED instead of HERO_KILLED. Same as BossEntity and TowerEntity — avoids hero kill counting, respawn scheduling, XP grants.
- **returnToHome() full-heals on arrival:** Unlike boss leash (no heal), mobs full-heal when returning to prevent kiting exploit with ranged attackers.
- **getUniqueId() returns 'camp_' + campType:** Acts as sourceId for buff tracking and killerId for event payload. NeutralCampSystem will look up killer via this ID.
- **showMobDamageNumber uses camp color:** Floating damage text uses the camp's color (red/grey/cyan/purple) rather than generic red, providing visual clarity about which entity is being damaged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- NeutralMob is ready for NeutralCampSystem (Plan 04) to instantiate: `new NeutralMob(scene, x, y, CampType.DAMAGE)`
- Plan 03 (CampAI system) can call all movement/combat methods: moveToward, stopMoving, returnToHome, showMeleeVFX, updateMob
- Camp mobs must be added to `getNonHeroTargets()` in BattleScene (Plan 04 or 05) for heroes to auto-attack them
- No blockers.

## Self-Check: PASSED

- FOUND: src/entities/NeutralMob.ts
- FOUND: 06-02-SUMMARY.md
- FOUND: commit 0dab426
- TSC: PASS (zero errors)

---
*Phase: 06-neutral-camps*
*Completed: 2026-02-23*
