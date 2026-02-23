---
phase: 02-hero-identity
plan: "04"
subsystem: gameplay

tags: [typescript, eventbus, passive, heroes, vfx, combat]

# Dependency graph
requires:
  - phase: 02-hero-identity
    plan: "01"
    provides: PassiveDef interface, HeroStats.passive required field, HERO_HIT/DAMAGE_TAKEN/HERO_KILLED events
  - phase: 02-hero-identity
    plan: "02"
    provides: abilityCooldowns[4], hero ability definitions
  - phase: 02-hero-identity
    plan: "03"
    provides: passiveCooldownTimer field in Hero.ts ready for use
provides:
  - passive field on all 13 heroes in heroData.ts
  - Hero.subscribePassive() — EventBus subscription based on trigger type
  - Hero.onPassiveTrigger() — ownership guards + cooldown gate
  - Hero.applyPassiveEffect() — routes 9 effect types across 3 trigger categories
  - Hero.showPassiveVFX() — gold burst + hero alpha flash on every trigger
  - Hero.destroy() override — EventBus.off cleanup, no memory leak on scene restart
affects:
  - 02-05 (HUD XP bar — passives are now wired, hero identity fully functional)
  - 05-trait-system (passive EventBus pattern reused)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EventBus subscription via stored handler ref for correct cleanup
    - Ownership guard pattern: payload.killerId/attacker/victim checked against this hero before applying effects
    - Internal cooldown timer (passiveCooldownTimer) gating passive re-trigger frequency
    - Single handler ref per hero stored for deterministic unsubscribe

key-files:
  created: []
  modified:
    - src/heroes/heroData.ts
    - src/entities/Hero.ts

key-decisions:
  - "buffOnKill field reused for war_drummer on_damage_taken trigger — applyPassiveEffect routes by trigger type check, not field name alone"
  - "healOnKill field reused as healAmount for holy_priest on_damage_taken — same routing pattern, comment documents intent"
  - "blade_dancer lifesteal uses damageReturnRatio field repurposed — on_hit branch heals attacker instead of reflecting to enemy"
  - "passiveCooldown: 0 for phantom_knight Pain Redirect — explicit zero means every hit reflects (no cooldown gate applied)"
  - "destroy() override uses stored passiveHandlerRef (not inline arrow) — ensures EventBus.off matches the exact function reference used in .on()"

patterns-established:
  - "Passive handler stored as class field: store arrow wrapper in passiveHandlerRef for deterministic unsubscribe"
  - "Effect routing by trigger: applyPassiveEffect checks passive.trigger before applying field values — same field can mean different things by trigger type"

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 2 Plan 04: Passive Ability System Summary

**EventBus-driven passive ability system for all 13 heroes — on_kill/on_hit/on_damage_taken handlers with ownership guards, internal cooldowns, gold burst VFX, and leak-free destroy() cleanup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T01:01:31Z
- **Completed:** 2026-02-23T01:04:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `passive` field to all 13 heroes in heroData.ts, resolving all 13 TypeScript compiler errors from Plan 02-01
- Implemented `subscribePassive()`, `onPassiveTrigger()`, `applyPassiveEffect()`, `showPassiveVFX()` in Hero.ts
- `destroy()` override unsubscribes passive EventBus listeners via stored handler ref — zero memory leak on scene restart
- All 9 passive effect types supported: heal, shield buff, speed burst, cooldown reset, mana restore, on-hit debuff, lifesteal, damage reflect, armor stacking
- Gold burst VFX + hero alpha flash fires on every passive trigger providing required visual feedback

## Task Commits

Each task was committed atomically:

1. **Task 1: Add passive definitions to all 13 heroes in heroData.ts** - `e83847d` (feat)
2. **Task 2: Implement passive subscription, applyPassiveEffect(), and destroy() in Hero.ts** - `2236561` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/heroes/heroData.ts` - PassiveDef import added; passive field added to all 13 heroes with unique calibrated effects per archetype
- `src/entities/Hero.ts` - PassiveDef import, passiveHandlerRef/armorStackCount/MAX_ARMOR_STACKS fields, subscribePassive call in constructor, full passive method suite, destroy() override

## Decisions Made
- `buffOnKill` field reused for war_drummer's `on_damage_taken` trigger — `applyPassiveEffect()` branches by `passive.trigger` before checking field presence, so the same field can represent different semantics across trigger types
- `healOnKill` field reused as `healAmount` for holy_priest's damage-taken trigger — documented with comment, consistent routing pattern
- blade_dancer lifesteal uses `damageReturnRatio` repurposed in the `on_hit` branch (heals self rather than reflecting to enemy)
- `passiveCooldown: 0` for phantom_knight is an explicit no-cooldown declaration — the guard `passive.passiveCooldown && timer > 0` correctly skips the gate when value is falsy
- `destroy()` stores the exact arrow function from `subscribePassive` in `passiveHandlerRef` — Phaser EventEmitter requires the same reference to match `.on()` for removal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 13 heroes have mechanically distinct passives wired to EventBus
- TypeScript compiles with zero errors across entire project
- Passive VFX (gold burst + alpha flash) gives visual confirmation passives are firing
- Hero identity system (abilities + passives + XP/leveling) is feature-complete — ready for Plan 02-05 (HUD XP bar)
- EventBus passive pattern established — Phase 5 TraitSystem can reuse the same on/off lifecycle

## Self-Check: PASSED
- `src/heroes/heroData.ts` — FOUND
- `src/entities/Hero.ts` — FOUND
- Commit `e83847d` — FOUND
- Commit `2236561` — FOUND

---
*Phase: 02-hero-identity*
*Completed: 2026-02-23*
