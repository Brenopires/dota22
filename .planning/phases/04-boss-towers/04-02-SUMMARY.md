---
phase: 04-boss-towers
plan: 02
subsystem: entities
tags: [tower, phaser, defense, aoe-attack, regen, team-structure]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "BaseEntity class, EventBus singleton, combat methods (takeDamage/heal/buffs)"
  - phase: 04-boss-towers
    provides: "Tower constants, TOWER_DESTROYED/TOWER_DISABLED/TOWER_ENABLED/TOWER_DAMAGED events, Team.NEUTRAL enum"
provides:
  - "TowerEntity class extending BaseEntity with periodic AoE attack, out-of-combat regen, and disable lifecycle"
affects: [04-03, 04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tower die() overrides canonical path to emit TOWER_DESTROYED instead of HERO_KILLED"
    - "Team.NEUTRAL filter in attack targeting to exclude boss from tower aggro"
    - "Out-of-combat regen gated by lastDamagedTime tracking in takeDamage override"

key-files:
  created:
    - "src/entities/TowerEntity.ts"
  modified: []

key-decisions:
  - "die() duplicates idempotent guard and physics disable instead of calling super.die() -- same pattern as BossEntity to avoid HERO_KILLED emission"
  - "getArmor() returns flat 10 -- higher than heroes but no scaling over time (towers are static structures)"
  - "Health bar uses HealthBar class with mana ratio 0 -- towers have no mana bar"
  - "Attack VFX uses scene.add.graphics line (not container child) -- line endpoints are world-space coordinates"

patterns-established:
  - "Tower entity overrides die() to emit entity-specific death event (TOWER_DESTROYED) rather than HERO_KILLED"
  - "Disable/enable lifecycle with visual feedback: alpha dimming on disable, restoration on enable"
  - "Out-of-combat regen pattern: track lastDamagedTime in takeDamage override, check elapsed time in update loop"

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 4 Plan 2: Tower Entity Summary

**TowerEntity class with periodic AoE attack (boss-excluded), out-of-combat HP regen after 5s delay, disable/enable lifecycle, and team-colored procedural visuals**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T05:13:37Z
- **Completed:** 2026-02-23T05:15:09Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created TowerEntity extending BaseEntity with entityType 'tower' and team assignment (A or B)
- Implemented periodic AoE attack on nearest enemy hero in range, excluding Team.NEUTRAL (boss)
- Added out-of-combat HP regeneration gated by TOWER_REGEN_DELAY (5000ms) since last damage taken
- Implemented disable()/enable() lifecycle that pauses attack and regen for a configurable duration
- Overrode die() to emit TOWER_DESTROYED (not HERO_KILLED), preventing hero scoring contamination
- Built procedural team-colored visuals: range indicator, rounded-rect base, pulsing glow, health bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TowerEntity class** - `18dddb5` (feat)

## Files Created/Modified
- `src/entities/TowerEntity.ts` - TowerEntity class with attack/regen/disable lifecycle, team-colored visuals, physics body

## Decisions Made
- die() duplicates idempotent guard and physics disable (same pattern as BossEntity) to avoid HERO_KILLED emission
- getArmor() returns flat 10 (no scaling) -- towers are static structures with consistent defense
- Health bar passes mana ratio 0 since towers have no mana system
- Attack VFX line drawn in world-space (not container child) since endpoints span tower-to-target positions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TowerEntity is ready for integration with tower placement and match orchestration (04-04)
- Disable lifecycle ready for boss kill rewards / revival token mechanics (04-03, 04-05)
- TOWER_DESTROYED event ready for win condition wiring (04-04)

## Self-Check: PASSED

- [x] src/entities/TowerEntity.ts exists
- [x] 04-02-SUMMARY.md exists
- [x] Commit 18dddb5 found

---
*Phase: 04-boss-towers*
*Completed: 2026-02-23*
