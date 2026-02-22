# Testing Patterns

**Analysis Date:** 2026-02-22

## Test Framework

**Runner:** None — no test framework is installed or configured.

**Assertion Library:** None.

**Test Config:** No `jest.config.*`, `vitest.config.*`, or equivalent detected.

**Run Commands:** No test script defined in `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

## Test File Organization

**Location:** No test files exist anywhere in the codebase.

**Naming:** No established pattern — no `.test.ts`, `.spec.ts`, or `__tests__` directories detected.

## Test Coverage

**Requirements:** None enforced.

**Current coverage:** 0% — there are no tests of any kind.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## What Would Be Testable Without Phaser

The following classes/utilities contain pure logic fully decoupled from Phaser and could be unit tested immediately:

**`src/utils/MMRCalculator.ts`**
- `MMRCalculator.calculate(currentMMR, won, draw, playerData)` — pure ELO calculation
- Returns a number, no side effects, no dependencies

**`src/utils/StorageManager.ts`**
- `StorageManager.defaultData()` — returns default player state
- `StorageManager.saveMatchResult()` — state mutation logic (requires localStorage mock)

**`src/heroes/heroData.ts`**
- Data integrity assertions: all heroes have exactly 3 abilities, valid archetypes, positive stats

**`src/heroes/HeroRegistry.ts`**
- `HeroRegistry.getRandomHeroId(exclude)` — random selection from filtered list
- `HeroRegistry.getAllHeroIds()` — returns copy of hero IDs array
- `HeroRegistry.create()` throws on unknown hero ID

**`src/ai/AIPersonality.ts`**
- `AIPersonality.getProfile(archetype)` — pure switch/return mapping
- Each archetype returns a valid `AIProfile` shape

**`src/systems/MatchOrchestrator.ts`**
- `MatchOrchestrator.generateMatch()` — uses `TeamManager`, produces deterministic shape

## Phaser-Dependent Classes (Harder to Test)

These classes extend Phaser game objects or take `Phaser.Scene` as constructor argument, requiring a headless Phaser instance or heavy mocking:

- `src/entities/Hero.ts` — extends `Phaser.GameObjects.Container`
- `src/entities/Projectile.ts` — extends `Phaser.GameObjects.Arc`
- `src/entities/AreaEffect.ts` — extends Phaser objects
- `src/systems/CombatSystem.ts` — takes `Phaser.Scene`
- `src/systems/VFXManager.ts` — takes `Phaser.Scene`
- `src/scenes/BattleScene.ts` — extends `Phaser.Scene`
- `src/ui/HUD.ts`, `src/ui/AbilityBar.ts` — take scene as constructor

## Testing Gaps (Priority Order)

**High Priority:**
- `src/utils/MMRCalculator.ts` — ELO logic has no test coverage; bugs directly affect player progression
- `src/heroes/heroData.ts` — hero stat data has no validation; misconfigured heroes could cause runtime errors
- `src/utils/StorageManager.ts` — data persistence logic is untested

**Medium Priority:**
- `src/ai/AIPersonality.ts` — archetype-to-profile mapping is critical for AI behavior correctness
- `src/heroes/HeroRegistry.ts` — error path (`Unknown hero`) and random selection need coverage

**Low Priority (Phaser-coupled):**
- `src/systems/CombatSystem.ts` — damage/buff calculations are embedded in Phaser-dependent context
- `src/entities/Hero.ts` — game logic (takeDamage, heal, buff stacking) mixed with visual code

## Recommended Test Setup (If Adding Tests)

**Framework:** Vitest (consistent with Vite toolchain already in use)

**Install:**
```bash
npm install -D vitest
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

**Test file placement:** Co-located with source, e.g. `src/utils/MMRCalculator.test.ts`.

**Example test for immediately testable code:**
```typescript
// src/utils/MMRCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { MMRCalculator } from './MMRCalculator';

const basePlayerData = {
  mmr: 1000, wins: 0, losses: 0, draws: 0,
  gamesPlayed: 0, matchHistory: [],
};

describe('MMRCalculator', () => {
  it('returns positive change on win', () => {
    const change = MMRCalculator.calculate(1000, true, false, basePlayerData);
    expect(change).toBeGreaterThan(0);
  });

  it('returns negative change on loss', () => {
    const change = MMRCalculator.calculate(1000, false, false, basePlayerData);
    expect(change).toBeLessThan(0);
  });

  it('returns approximately 0 change on draw vs equal opponent', () => {
    const change = MMRCalculator.calculate(1000, false, true, basePlayerData);
    expect(Math.abs(change)).toBeLessThan(5);
  });
});
```

**Mocking localStorage for StorageManager:**
```typescript
// src/utils/StorageManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from './StorageManager';

beforeEach(() => {
  localStorage.clear();
});

describe('StorageManager', () => {
  it('returns default data when nothing stored', () => {
    const data = StorageManager.load();
    expect(data.mmr).toBe(1000); // MMR_INITIAL
    expect(data.gamesPlayed).toBe(0);
  });
});
```

---

*Testing analysis: 2026-02-22*
