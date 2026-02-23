---
phase: 06-neutral-camps
plan: 03
subsystem: hero-mechanics,scoring
tags: [buff-system, haste, cooldown-reduction, camp-scoring, match-state]
dependency_graph:
  requires: ["06-01"]
  provides: ["hero-haste-buff", "hero-cdr-buff", "camp-clear-scoring"]
  affects: ["06-04", "06-05"]
tech_stack:
  added: []
  patterns: ["multiplicative-buff-stacking", "event-driven-scoring"]
key_files:
  modified:
    - src/entities/Hero.ts
    - src/systems/MatchStateMachine.ts
decisions:
  - "HASTE stacks multiplicatively with slow factor — slowed 50% + hasted 25% = 62.5% speed (intentional, slow still meaningful)"
  - "getCooldownReductionFactor() is private — only called from updateHero() cooldown loop"
  - "campClears tracked separately (campClearsA/campClearsB) from kill score for Phase 7 scoring breakdown"
  - "killerId suffix '_A'/'_B' used to determine scoring team — consistent with Hero.getUniqueId() format"
metrics:
  duration: "2 min"
  completed: "2026-02-23"
  tasks_completed: 2
  files_modified: 2
---

# Phase 6 Plan 03: Hero Buff Mechanics and Camp Scoring Summary

HASTE buff speed scaling and CDR buff cooldown acceleration wired into Hero, plus CAMP_CLEARED scoring in MatchStateMachine using killerId team suffix detection.

## What Was Built

### Task 1: Hero HASTE and CDR Buff Mechanics (eee40f5)

**File:** `src/entities/Hero.ts`

`getMoveSpeed()` now iterates active buffs for `BuffType.HASTE` and applies multiplicative speed scaling:

```typescript
getMoveSpeed(): number {
  if (this.isStunned() || this.isRooted()) return 0;
  let speed = this.stats.moveSpeed * this.getSlowFactor();
  for (const buff of this.buffs) {
    if (buff.type === BuffType.HASTE && buff.remaining > 0) {
      speed *= (1 + buff.value);
    }
  }
  return speed;
}
```

`updateHero()` cooldown loop now calls `getCooldownReductionFactor()` before ticking:

```typescript
const cdrFactor = this.getCooldownReductionFactor();
for (let i = 0; i < this.abilityCooldowns.length; i++) {
  if (this.abilityCooldowns[i] > 0) {
    this.abilityCooldowns[i] = Math.max(0, this.abilityCooldowns[i] - dt * cdrFactor);
  }
}
```

New private method `getCooldownReductionFactor()` computes multiplicative CDR from all active `COOLDOWN_REDUCTION` buffs:

```typescript
private getCooldownReductionFactor(): number {
  let factor = 1;
  for (const buff of this.buffs) {
    if (buff.type === BuffType.COOLDOWN_REDUCTION && buff.remaining > 0) {
      factor *= (1 + buff.value);
    }
  }
  return factor;
}
```

### Task 2: MatchStateMachine Camp Scoring (ad0caff)

**File:** `src/systems/MatchStateMachine.ts`

- `score` object extended: `{ teamA, teamB, campClearsA, campClearsB }`
- `CAMP_SCORE_POINTS` imported from constants
- `onCampCleared()` handler subscribed in `start()`, unsubscribed in `destroy()`
- Team detection via `killerId.endsWith('_A')` / `killerId.endsWith('_B')` — matches `Hero.getUniqueId()` format
- `getScore()` return type updated to include `campClearsA`/`campClearsB` fields

## Verification Checklist

- [x] `npx tsc --noEmit` passes with zero errors
- [x] `Hero.getMoveSpeed()` contains `BuffType.HASTE` loop
- [x] `Hero.updateHero()` cooldown loop uses `cdrFactor`
- [x] `Hero` has `getCooldownReductionFactor()` method
- [x] `MatchStateMachine` subscribes to `CAMP_CLEARED` in `start()`
- [x] `MatchStateMachine` unsubscribes from `CAMP_CLEARED` in `destroy()`
- [x] `MatchStateMachine.score` has `campClearsA` and `campClearsB` fields

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
