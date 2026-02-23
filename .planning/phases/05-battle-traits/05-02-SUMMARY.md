---
phase: 05-battle-traits
plan: 02
subsystem: gameplay
tags: [trait-system, gem-system, event-bus, match-orchestrator, stat-modification]

# Dependency graph
requires:
  - phase: 05-01
    provides: TraitDef/GemDef types, TRAITS array, GEMS array, getTraitById/getGemById
  - phase: 02-hero-identity
    provides: HERO_HIT, DAMAGE_TAKEN, HERO_KILLED events and payload shapes
  - phase: 04-boss-towers
    provides: Revival token system in BattleScene.onHeroKilled
provides:
  - TraitSystem class with event-driven mechanic handlers for all trait types
  - MatchOrchestrator returns traitId and gemAssignments in every MatchConfig
  - BattleScene applies trait stat mods + gem stat mods before hero creation
  - Mana regen bonus from traits applied in BattleScene update loop
  - TRAIT_APPLIED event on EventBus
affects: [05-battle-traits, 06-draft-scene, hud]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static helper pattern: TraitSystem.selectTrait() and TraitSystem.applyStatMods() as pure static methods"
    - "Handler subscription ordering: TraitSystem subscribes AFTER BattleScene for revival token ordering"
    - "Stat modification pipeline: baseStats -> TeamBalancer -> TraitSystem.applyStatMods -> gem mods -> HeroRegistry.create"

key-files:
  created:
    - src/traits/TraitSystem.ts
  modified:
    - src/systems/MatchOrchestrator.ts
    - src/systems/EventBus.ts
    - src/scenes/BattleScene.ts

key-decisions:
  - "TraitSystem only instantiated for mechanic/rule_change traits with event hooks; stat-only traits handled via applyStatMods"
  - "HP floor Math.max(100, ...) in applyStatMods prevents glass_cannon exploit on low-HP heroes"
  - "handleOnDamageTaken uses payload.victim (not payload.entity) matching DAMAGE_TAKEN event shape from Hero.takeDamage()"
  - "Reflect damage only targets heroes (not bosses/towers) to prevent boss damage loop"
  - "sudden_valor tracks elapsed minutes from matchStateMachine.getTimeRemaining() for first-kill-per-minute rule"

patterns-established:
  - "Stat mod pipeline: trait and gem modifiers applied to scaledStats copy before HeroRegistry.create(), never to heroDataMap"
  - "TraitSystem subscription ordering: always after BattleScene EventBus subscriptions for revival token ordering"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 5 Plan 2: TraitSystem Runtime Summary

**Event-driven TraitSystem with mechanic handlers for lifesteal/reflect/DoT/kill-buffs, trait+gem stat pipeline in BattleScene, and blacklist-aware trait selection in MatchOrchestrator**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T11:50:50Z
- **Completed:** 2026-02-23T11:53:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TraitSystem with event-driven mechanic handlers for all 4 mechanic traits + sudden_valor rule_change
- MatchOrchestrator selects random trait (respecting incompatibility blacklists) and assigns random gems to all heroes
- BattleScene applies trait stat mods + gem stat mods to scaledStats copy before HeroRegistry.create()
- Mana regen bonus from arcane_surge trait applied in BattleScene update loop
- Full cleanup in BattleScene.shutdown() and TraitSystem.destroy()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TraitSystem class and update MatchOrchestrator** - `8c1f291` (feat)
2. **Task 2: Integrate TraitSystem into BattleScene lifecycle** - `864af7f` (feat)

## Files Created/Modified
- `src/traits/TraitSystem.ts` - TraitSystem class with mechanic event handlers, static selectTrait() and applyStatMods()
- `src/systems/MatchOrchestrator.ts` - Extended generateMatch() with trait selection and gem assignment
- `src/systems/EventBus.ts` - Added TRAIT_APPLIED event constant
- `src/scenes/BattleScene.ts` - Trait/gem stat application, TraitSystem instantiation, mana regen, cleanup

## Decisions Made
- TraitSystem only instantiated when trait has mechanic hooks (onHitEffect, onKillEffect, onDamageTakenEffect) -- stat-only traits are fully handled by applyStatMods at init time
- HP floor of Math.max(100, ...) prevents glass_cannon from reducing low-HP heroes below 100 HP
- Reflect damage in thorns_aura only targets heroes (source.entityType === 'hero') to prevent infinite damage loops with boss/tower
- sudden_valor tracks elapsed minutes via 300 - timeRemaining to correctly identify first kill per minute
- handleOnDamageTaken uses payload.victim matching the DAMAGE_TAKEN event shape { victim, sourceId, damage } from Hero.takeDamage()

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TraitSystem is fully operational for all 8 traits and 8 gems
- DraftScene (future plan) can display traitId and gemAssignments from MatchConfig
- HUD integration for trait/gem display is ready as a downstream consumer
- TypeScript compiles with zero errors

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 05-battle-traits*
*Completed: 2026-02-23*
