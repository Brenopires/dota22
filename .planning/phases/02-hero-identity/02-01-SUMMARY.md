---
phase: 02-hero-identity
plan: "01"
subsystem: types

tags: [typescript, eventbus, combat, types, passive, abilities]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: EventBus singleton, Events object, Hero.takeDamage override, CombatSystem.tryAutoAttack
provides:
  - AbilityDef.slot union widened to include 'R' for ultimate abilities
  - PassiveDef interface exported from types.ts
  - HeroStats.passive required field (compiler-enforced)
  - Events.HERO_HIT event constant and CombatSystem emission
  - Events.DAMAGE_TAKEN event constant and Hero.takeDamage emission
  - Events.HERO_LEVELED_UP event constant
affects:
  - 02-hero-identity (all subsequent plans depend on these types and events)
  - 02-02 (heroData.ts passive fields)
  - 02-03 (passive trigger logic uses HERO_HIT, DAMAGE_TAKEN)
  - 02-04 (heroData.ts uses PassiveDef and 'R' slot)
  - 05-trait-system (combat event hooks referenced in roadmap)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EventBus emission after combat actions (HERO_HIT from CombatSystem, DAMAGE_TAKEN from Hero)
    - Required fields on shared interfaces to enforce compiler-guided implementation in subsequent plans

key-files:
  created: []
  modified:
    - src/types.ts
    - src/systems/EventBus.ts
    - src/systems/CombatSystem.ts
    - src/entities/Hero.ts

key-decisions:
  - "HeroStats.passive is required (not optional) so TypeScript flags all 13 heroData.ts entries — compiler guides Plan 02-04 executor"
  - "HERO_HIT emitted in CombatSystem.tryAutoAttack after takeDamage call, unconditionally on hit connect (not gated on finalDamage > 0)"
  - "DAMAGE_TAKEN emitted inside finalDamage > 0 guard in Hero.takeDamage — zero-damage hits (shielded/overkill) do not emit"

patterns-established:
  - "Events.* constants pattern extended: Phase 2 events follow same 'domain:action' naming as Phase 1"
  - "EventBus import added per-file rather than globally — CombatSystem and Hero each import directly"

# Metrics
duration: 1min
completed: 2026-02-22
---

# Phase 2 Plan 01: Type and Event Infrastructure Summary

**PassiveDef interface, widened AbilityDef slot union ('R' added), required HeroStats.passive field, and three new EventBus events (HERO_HIT, DAMAGE_TAKEN, HERO_LEVELED_UP) wired into combat code**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-22T04:27:36Z
- **Completed:** 2026-02-22T04:28:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Widened `AbilityDef.slot` to include `'R'` and added optional `isUltimate?: boolean` field
- Added `PassiveTrigger` type and `PassiveDef` interface with all effect fields to types.ts
- Made `HeroStats.passive` a required field — TypeScript now errors on all 13 heroData.ts entries (expected, guides Plan 02-04)
- Added `HERO_HIT`, `DAMAGE_TAKEN`, `HERO_LEVELED_UP` constants to EventBus
- Wired `EventBus.emit(Events.HERO_HIT)` into `CombatSystem.tryAutoAttack` after each auto-attack connects
- Wired `EventBus.emit(Events.DAMAGE_TAKEN)` into `Hero.takeDamage` inside the `finalDamage > 0` guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen AbilityDef and add PassiveDef to types.ts** - `baf77dd` (feat)
2. **Task 2: Add HERO_HIT/DAMAGE_TAKEN/HERO_LEVELED_UP events and wire emissions** - `3c329a6` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/types.ts` - AbilityDef.slot widened, isUltimate added, PassiveTrigger + PassiveDef added, HeroStats.passive required
- `src/systems/EventBus.ts` - HERO_HIT, DAMAGE_TAKEN, HERO_LEVELED_UP constants added
- `src/systems/CombatSystem.ts` - EventBus import added; HERO_HIT emitted in tryAutoAttack
- `src/entities/Hero.ts` - EventBus import added; DAMAGE_TAKEN emitted in takeDamage when finalDamage > 0

## Decisions Made
- `HeroStats.passive` is required (not optional) so TypeScript flags all 13 `heroData.ts` entries — compiler guides Plan 02-04 executor without any manual tracking
- `HERO_HIT` is emitted unconditionally after every auto-attack hit connects, regardless of final damage amount — passive triggers should react to "hit landing" not only damage
- `DAMAGE_TAKEN` is emitted only when `finalDamage > 0` — zero-damage hits (fully shielded or overkill) must not trigger passive effects

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All type infrastructure in place for Plans 02-02 through 02-05
- TypeScript errors in heroData.ts are intentional guard rails for Plan 02-04
- HERO_HIT and DAMAGE_TAKEN events ready for passive trigger system in Plan 02-03
- 'R' slot available for heroData.ts ultimate ability declarations in Plan 02-04

---
*Phase: 02-hero-identity*
*Completed: 2026-02-22*
