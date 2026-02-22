# Coding Conventions

**Analysis Date:** 2026-02-22

## Naming Patterns

**Files:**
- PascalCase for class files: `Hero.ts`, `CombatSystem.ts`, `BattleScene.ts`, `AIController.ts`
- camelCase for data/config modules: `heroData.ts`, `constants.ts`, `types.ts`
- PascalCase for UI components: `AbilityBar.ts`, `HUD.ts`

**Classes:**
- PascalCase always: `Hero`, `CombatSystem`, `VFXManager`, `MatchOrchestrator`, `StorageManager`
- Scene classes suffixed with `Scene`: `BattleScene`, `DraftScene`, `MenuScene`, `ResultScene`, `BootScene`
- System classes suffixed with `System`: `CombatSystem`
- Manager classes suffixed with `Manager`: `VFXManager`, `StorageManager`, `TeamManager`
- Entity classes are plain nouns: `Hero`, `Projectile`, `AreaEffect`, `HealthBar`
- AI classes prefixed with `AI`: `AIController`, `AIPersonality`

**Methods:**
- camelCase for all methods: `updateHero`, `takeDamage`, `executeAbility`, `tryAutoAttack`
- Boolean methods use `is`/`get` prefixes: `isAlive`, `isStunned`, `isRooted`, `isSilenced`, `isRanged`
- Getters follow `get` prefix: `getAttackDamage`, `getArmor`, `getAttackRange`, `getMoveSpeed`, `getUniqueId`
- Private visual helpers use `show` prefix: `showDamageNumber`, `showHealNumber`, `showMeleeSlash`, `showRangedAttack`
- Private execution helpers use `execute` prefix: `executeChase`, `executeAttack`, `executeRetreat`, `executeDash`
- `update` for frame-update methods, `create` for Phaser scene lifecycle

**Variables:**
- camelCase: `currentHP`, `currentMana`, `faceDirection`, `autoAttackTimer`, `teamAKills`
- SCREAMING_SNAKE_CASE for all exported constants in `src/constants.ts`: `HERO_RADIUS`, `MATCH_DURATION`, `AI_UPDATE_INTERVAL`
- `_` prefix for intentionally unused callback parameters: `(_cam: any, progress: number)`

**Types/Interfaces:**
- PascalCase for all types and interfaces: `HeroStats`, `AbilityDef`, `ActiveBuff`, `MatchResult`, `PlayerData`
- Enums are PascalCase with SCREAMING_SNAKE_CASE members: `HeroArchetype.TANK`, `AbilityType.PROJECTILE`, `BuffType.STUN`
- Interfaces are plain nouns (no `I` prefix): `HeroStats`, `ArenaConfig`, `ObstacleDef`, `AIProfile`

**Data Records:**
- `Record<string, T>` with `Map` suffix for lookup tables: `heroDataMap`, `HERO_ELEMENT_MAP`, `THEMES`
- Export constant arrays with plural `Ids` suffix: `heroIds`

## Code Style

**Formatting:**
- No dedicated formatter config detected (no `.prettierrc`, no `biome.json`)
- TypeScript `strict: true` enforced via `tsconfig.json`
- 2-space indentation consistently used
- Single quotes for strings throughout
- Trailing commas in multi-line object/array literals

**Linting:**
- No ESLint config detected
- TypeScript compiler is the primary type-checker (`tsc && vite build`)
- `skipLibCheck: true` to avoid checking node_modules types

## TypeScript Practices

**Strict Mode:** `strict: true` in `tsconfig.json` — all strict checks enabled.

**Type Escapes Pattern (common workaround):**
The codebase frequently casts `this.scene as any` to access Phaser scene subclass properties without full type coupling. This is the dominant cross-boundary access pattern:
```typescript
// Used ~15+ times across entities, systems, AI
const battleScene = this.scene as any;
const enemies = battleScene.getEnemies(hero.team) as Hero[];
const vfx = (this.scene as any).vfxManager as VFXManager | undefined;
```

**Non-null assertions:** Used where Phaser guarantees initialization:
```typescript
body!: Phaser.Physics.Arcade.Body;
this.input.keyboard!.addKey(...)
const body = this.player.body!;
```

**Optional chaining for nullable Phaser objects:**
```typescript
this.body?.setVelocity(0, 0);
this.glowImage?.active
dashTrail?.active
```

## Import Organization

**Order (consistent across all files):**
1. External packages (`import Phaser from 'phaser'`)
2. Internal constants (`'../constants'`)
3. Internal types (`'../types'`)
4. Sibling entities/classes (`'../entities/Hero'`, `'./VFXManager'`)
5. No path aliases — all relative paths with `../` traversal

**Example from `src/systems/CombatSystem.ts`:**
```typescript
import Phaser from 'phaser';
import { AUTO_ATTACK_COOLDOWN } from '../constants';
import { AbilityDef, AbilityType, BuffType, Team } from '../types';
import { Hero } from '../entities/Hero';
import { Projectile } from '../entities/Projectile';
import { AreaEffect } from '../entities/AreaEffect';
import { VFXManager } from './VFXManager';
```

## Error Handling

**Strategy:** Minimal — errors are silenced or handled inline.

**Patterns:**
- `try/catch` with empty catch blocks (silent ignore) in `StorageManager`:
  ```typescript
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PlayerData;
  } catch {
    // ignore
  }
  return this.defaultData();
  ```
- Guard clauses with early `return`/`return false` for invalid state:
  ```typescript
  if (!this.isAlive || this.isStunned() || this.isSilenced()) return false;
  if (slot < 0 || slot >= this.stats.abilities.length) return false;
  ```
- `throw new Error()` for programmer errors (unknown hero ID):
  ```typescript
  throw new Error(`Unknown hero: ${heroId}`);
  ```
- `Math.max` / `Math.min` for clamping to avoid boundary error states rather than throwing

**No error logging** — `console.log/error` is absent throughout the codebase.

## Logging

No logging framework used. No `console.*` calls anywhere in `src/`. Errors are silently swallowed or handled via default fallback values.

## Comments

**When to Comment:**
- Block comments before logical sections within methods (not function-level JSDoc):
  ```typescript
  // Glow behind hero
  // Team indicator ring
  // Shield absorb
  // Apply armor
  ```
- Single-line explanations for non-obvious magic values or intent
- No JSDoc/TSDoc on any functions — no `@param`, `@returns` anywhere

**Inline data comments:**
- Type annotations on interface fields serve as documentation:
  ```typescript
  label: string; // 2-letter abbreviation
  cooldown: number; // seconds
  ```

## Function Design

**Size:** Methods range from 2-line helpers (`getArmor`) to 80+ line gameplay methods (`updateHero`, `executeDash`). No enforced size limit.

**Parameters:** Direct named parameters, no options objects. Constructor parameters match the field they initialize directly.

**Return Values:**
- `void` for side-effect methods
- `boolean` for action-attempted methods (`useAbility`, `tryAutoAttack` via guard clause)
- `number` for computed stats and damage results
- Methods that can fail return early with `false` or `0`

## Module Design

**Exports:**
- One class per file, named export matching filename: `export class Hero`, `export class CombatSystem`
- Data files export named constants: `export const heroDataMap`, `export const heroIds`
- Types file (`src/types.ts`) exports all shared interfaces and enums
- Constants file (`src/constants.ts`) exports all magic numbers/strings as named constants
- No default exports anywhere (all named)

**Barrel Files:** Not used — each import references the direct file path.

## Class Organization

**Member order within classes (consistent pattern):**
1. Public fields / state
2. Private fields / Phaser objects
3. `constructor`
4. Public lifecycle methods (`update`, `create`)
5. Public action methods
6. Private helper methods (grouped by concern)

**Static utility classes:** Pure static methods, no instance state — `HeroRegistry`, `MMRCalculator`, `StorageManager`, `AIPersonality`, `MatchOrchestrator`, `ArenaGenerator`.

---

*Convention analysis: 2026-02-22*
