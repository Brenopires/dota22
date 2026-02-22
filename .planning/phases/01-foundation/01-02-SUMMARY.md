---
phase: 01-foundation
plan: "02"
subsystem: entities
tags: [phaser, typescript, entity-hierarchy, event-bus, death-system]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: EventBus singleton with HERO_KILLED event constant

provides:
  - BaseEntity abstract class — shared base for all damageable game objects
  - Canonical die() path that emits EventBus HERO_KILLED (decouples death notification)
  - Hero refactored to extend BaseEntity — onHeroKill() coupling removed

affects:
  - 01-foundation plan 04 (RespawnSystem intercepts HERO_KILLED event)
  - Any future entity types: boss, tower, neutral_mob (extend BaseEntity)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Abstract base class pattern: BaseEntity provides shared contract, subclasses implement abstract onDeath()"
    - "EventBus decoupling: die() emits HERO_KILLED instead of calling scene method directly"
    - "Hero override pattern: takeDamage/heal override adds visuals, delegates logic to super"

key-files:
  created:
    - src/entities/BaseEntity.ts
  modified:
    - src/entities/Hero.ts

key-decisions:
  - "Floating damage/heal numbers stay on Hero via override (not in BaseEntity — they are Hero-specific visuals)"
  - "Physics body setup stays in Hero constructor (HERO_RADIUS is Hero-specific; future entities will use different values)"
  - "getArmor() defaults to 0 in BaseEntity — Hero overrides with stats.armor (open for boss/tower overrides)"
  - "die() is idempotent via isAlive guard — prevents double-fire on AoE hits"

patterns-established:
  - "Entity death: takeDamage -> BaseEntity.die -> EventBus.emit(HERO_KILLED) -> subclass.onDeath()"
  - "Subclass visual hooks: override takeDamage/heal to add visuals, call super for shared logic"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 1 Plan 02: BaseEntity Abstract Class and Hero Refactor Summary

**BaseEntity abstract class with canonical EventBus die() path, Hero refactored to extend it — severs direct battleScene.onHeroKill() coupling that blocked respawn system**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T23:53:47Z
- **Completed:** 2026-02-22T23:56:14Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 refactored)

## Accomplishments
- Created BaseEntity abstract class (171 lines) extending Phaser.GameObjects.Container
- BaseEntity.die() emits HERO_KILLED on EventBus with idempotent guard — respawn system can intercept
- Hero.die() removed, replaced by protected onDeath() containing only visual/VFX logic
- battleScene.onHeroKill() call removed from Hero — EventBus event replaces the direct coupling
- Hero overrides takeDamage/heal to add floating number visuals, delegates combat logic to BaseEntity

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BaseEntity abstract class** - `aa5fe35` (feat)
2. **Task 2: Refactor Hero to extend BaseEntity** - `e74a772` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/entities/BaseEntity.ts` - Abstract base class for all damageable entities; die(), takeDamage, heal, addBuff, buff status methods, updateBuffs
- `src/entities/Hero.ts` - Refactored to extend BaseEntity; removed inherited fields/methods; onDeath() has visual logic only; no onHeroKill() call

## Decisions Made
- Floating damage/heal number visuals stay on Hero via override (not BaseEntity) — they are Hero-specific visual behavior, not shared combat logic
- Physics body setup stays in Hero constructor — HERO_RADIUS is Hero-specific; future entities (bosses, towers) will configure their own bodies
- getArmor() defaults to 0 in BaseEntity — Hero overrides with stats.armor, leaving clean extension point for future entity types
- die() has idempotent guard (`if (!this.isAlive) return`) — prevents double HERO_KILLED emission on AoE hits

## Deviations from Plan

None — plan executed exactly as written.

Note: The plan spec said Hero.takeDamage should be removed and BaseEntity.takeDamage should handle everything. However, Hero's showDamageNumber call was in takeDamage. The implementation chose to keep Hero.takeDamage as an override that calls super() and adds visuals — this is the cleanest approach and fully satisfies all plan truths (shared logic in BaseEntity, visual behavior in Hero). The plan explicitly allows "call an overridable hook instead, or keep in Hero by calling from Hero.takeDamage after super."

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- BaseEntity is ready for plan 01-03 (MatchStateMachine) and 01-04 (RespawnSystem)
- HERO_KILLED on EventBus is the integration point for RespawnSystem (plan 01-04)
- Future entity types (boss, tower, neutral_mob) can extend BaseEntity without changes

---
*Phase: 01-foundation*
*Completed: 2026-02-22*

## Self-Check: PASSED

- src/entities/BaseEntity.ts — FOUND
- src/entities/Hero.ts — FOUND
- .planning/phases/01-foundation/01-02-SUMMARY.md — FOUND
- Commit aa5fe35 (BaseEntity) — FOUND
- Commit e74a772 (Hero refactor) — FOUND
