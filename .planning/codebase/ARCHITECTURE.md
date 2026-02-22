# Architecture

**Analysis Date:** 2026-02-22

## Pattern Overview

**Overall:** Scene-based game loop with a component/system hybrid

**Key Characteristics:**
- Phaser 3 scene graph drives all lifecycle (create → update → shutdown)
- Systems are stateful manager classes instantiated per-BattleScene
- Entities are Phaser `GameObjects` (Container, Arc) with embedded game logic
- No event bus or reactive state — all communication is direct method calls or `as any` scene casts
- Persistent state lives exclusively in `localStorage` via `StorageManager`

## Layers

**Scenes (orchestrators):**
- Purpose: Own the game loop, wire all systems together, handle scene transitions
- Location: `src/scenes/`
- Contains: `BootScene`, `MenuScene`, `DraftScene`, `BattleScene`, `ResultScene`
- Depends on: Everything — entities, systems, ai, ui, utils
- Used by: `src/main.ts` (registered in Phaser config)

**Entities (game objects):**
- Purpose: Stateful, visual game objects that live in the Phaser scene graph
- Location: `src/entities/`
- Contains: `Hero`, `Projectile`, `AreaEffect`, `HealthBar`
- Depends on: `src/types.ts`, `src/constants.ts`, `src/systems/VFXManager.ts`
- Used by: `BattleScene`, `CombatSystem`, `AIController`

**Systems (logic managers):**
- Purpose: Stateful service classes instantiated by BattleScene; handle cross-entity logic
- Location: `src/systems/`
- Contains: `CombatSystem`, `VFXManager`, `ArenaGenerator`, `MatchOrchestrator`, `TeamManager`, `TextureGenerator`, `ParticlePresets`
- Depends on: `src/entities/`, `src/types.ts`, `src/constants.ts`
- Used by: `BattleScene`; `ArenaGenerator` and `MatchOrchestrator` are also used by `DraftScene`

**AI (autonomous agents):**
- Purpose: Per-hero state machines controlling non-player heroes
- Location: `src/ai/`
- Contains: `AIController` (state machine), `AIPersonality` (profile factory)
- Depends on: `src/entities/Hero.ts`, `src/types.ts`
- Used by: `BattleScene` (holds array of `AIController[]`)

**Heroes (data registry):**
- Purpose: Static data definitions for all playable heroes
- Location: `src/heroes/`
- Contains: `heroData.ts` (data map), `HeroRegistry` (factory + lookup)
- Depends on: `src/types.ts`, `src/constants.ts`
- Used by: `BattleScene`, `DraftScene`, `TeamManager`, `TextureGenerator`

**UI (HUD components):**
- Purpose: Screen-space UI overlaid on the game viewport during battle
- Location: `src/ui/`
- Contains: `HUD` (timer, kill feed, player stat bars), `AbilityBar` (three ability slots)
- Depends on: `src/entities/Hero.ts`
- Used by: `BattleScene`

**Utils (pure helpers):**
- Purpose: Stateless logic utilities with no Phaser dependency
- Location: `src/utils/`
- Contains: `MMRCalculator` (ELO algorithm), `StorageManager` (localStorage wrapper)
- Depends on: `src/types.ts`, `src/constants.ts`
- Used by: `BattleScene`, `MenuScene`, `ResultScene`

**Config (globals):**
- Purpose: Shared constants and type definitions consumed across all layers
- Location: `src/constants.ts`, `src/types.ts`
- Depends on: Nothing
- Used by: Everything

## Data Flow

**Full match lifecycle:**

1. `main.ts` boots Phaser with scene order: `[BootScene, MenuScene, DraftScene, BattleScene, ResultScene]`
2. `BootScene.create()` calls `TextureGenerator.generate(this)` to produce procedural textures, then transitions to `MenuScene`
3. `MenuScene` reads `StorageManager.load()` to show MMR/rank, player clicks PLAY → transitions to `DraftScene`
4. `DraftScene.create()` calls `MatchOrchestrator.generateMatch()` → `TeamManager.generateTeams()` → `HeroRegistry.getRandomHeroId()` to produce a match config with hero IDs and arena parameters
5. Player clicks START BATTLE → `DraftScene` passes `matchConfig` as scene data to `BattleScene`
6. `BattleScene.create()` instantiates `VFXManager`, `CombatSystem`, calls `ArenaGenerator.generate/render()`, calls `HeroRegistry.create()` for each hero, creates one `AIController` per non-player hero, and constructs the `HUD`
7. Every frame `BattleScene.update()` runs: player input → `hero.updateHero()` per hero → `AIController.update()` per AI (at 200ms interval) → `combatSystem.update()` for projectiles/area effects → `hud.update()`
8. Hero death calls `hero.die()` → `battleScene.onHeroKill()` → `checkWinCondition()` or `endMatchAsDefeat()` → `StorageManager.saveMatchResult()` → transitions to `ResultScene`
9. `ResultScene` reads updated `StorageManager.load()` and displays results. Player navigates back to `DraftScene` or `MenuScene`

**Combat sub-flow:**

1. Player/AI calls `hero.useAbility(slot, targetX, targetY)` → validates mana/cooldown → `combatSystem.executeAbility()`
2. `CombatSystem.executeAbility()` dispatches to `fireProjectile`, `createAreaEffect`, `applyBuff`, `executeDash`, or `applySelfBuff` based on `AbilityType`
3. Projectiles/areas are updated each frame in `combatSystem.update()`; on hit, `hero.takeDamage()` is called directly
4. `hero.takeDamage()` applies shield absorption, armor reduction, decrements HP, spawns damage number text, and calls `hero.die()` at zero HP

**State Management:**
- Match state lives in `BattleScene` fields (`matchTimer`, `teamAKills`, `teamBKills`, `heroes[]`, etc.)
- Hero runtime state lives in `Hero` instance fields (`currentHP`, `currentMana`, `buffs[]`, `abilityCooldowns[]`)
- Persistent player state lives in `localStorage` via `StorageManager` (MMR, match history)
- No shared store, no events — state is passed by reference through direct method calls

## Key Abstractions

**Hero (entity):**
- Purpose: A playable character with HP, mana, stats, buffs, and visual components
- Examples: `src/entities/Hero.ts`
- Pattern: Phaser `Container` with child game objects (visual, health bar, label, rings); game logic mixed directly into the game object class

**HeroStats (data interface):**
- Purpose: Immutable descriptor of a hero's base attributes and abilities
- Examples: `src/types.ts` (interface), `src/heroes/heroData.ts` (data), `src/heroes/HeroRegistry.ts` (factory)
- Pattern: Plain data objects in a `Record<string, HeroStats>` map; `HeroRegistry.create()` is the single instantiation path

**AbilityDef (data interface):**
- Purpose: Configuration for a single ability: type, costs, damage, buffs, projectile params
- Examples: `src/types.ts` (interface), embedded in each hero's `abilities[]` array in `src/heroes/heroData.ts`
- Pattern: Discriminated by `AbilityType` enum; `CombatSystem.executeAbility()` switches on `ability.type`

**ActiveBuff (runtime state):**
- Purpose: A timed effect applied to a hero (stun, slow, shield, DOT, etc.)
- Examples: `src/types.ts` (interface), `Hero.buffs[]` array
- Pattern: Duration-based countdown in `Hero.updateBuffs(dt)` each frame; `Hero.addBuff()` pushes, `splice` removes on expiry

**CombatSystem (system):**
- Purpose: Owns all combat resolution — auto-attacks, ability execution, projectile/area lifecycle, collision setup
- Examples: `src/systems/CombatSystem.ts`
- Pattern: Instantiated once per `BattleScene`; polls `battleScene.heroes` via `as any` cast (no typed interface)

**AIController (agent):**
- Purpose: Finite state machine (IDLE → CHASE → ATTACK → RETREAT → USE_ABILITY) controlling one AI hero
- Examples: `src/ai/AIController.ts`, personality profiles in `src/ai/AIPersonality.ts`
- Pattern: One `AIController` per non-player `Hero`; updated at 200ms polling interval with randomised decision delay

**VFXManager (system):**
- Purpose: Centralized particle emitter factory and camera effect controller
- Examples: `src/systems/VFXManager.ts`, configs in `src/systems/ParticlePresets.ts`
- Pattern: Instantiated once per `BattleScene`; destroyed in `BattleScene.shutdown()`

## Entry Points

**Application boot:**
- Location: `src/main.ts`
- Triggers: Browser loads `index.html`, Vite bundles and executes module
- Responsibilities: Creates Phaser `Game` instance with config (dimensions, physics, scene list, scale)

**BootScene:**
- Location: `src/scenes/BootScene.ts`
- Triggers: First scene in Phaser's scene list, auto-started
- Responsibilities: Generates all procedural textures via `TextureGenerator.generate()`, transitions to `MenuScene` after 500ms

**BattleScene.create():**
- Location: `src/scenes/BattleScene.ts` line 52
- Triggers: `this.scene.start('BattleScene', { matchConfig })` from `DraftScene`
- Responsibilities: Full match setup — arena, heroes, AI, collisions, HUD, camera, input, match timer

**BattleScene.update():**
- Location: `src/scenes/BattleScene.ts` line 193
- Triggers: Phaser game loop, called every frame (~60fps)
- Responsibilities: Player input, hero updates, AI polling, combat system update, HUD update, win condition check

## Error Handling

**Strategy:** Fail-silent with fallbacks

**Patterns:**
- `StorageManager.load()` wraps `localStorage` in try/catch, returns `defaultData()` on any error
- `HeroRegistry.create()` throws `Error` for unknown hero IDs (only internal code path, not user-facing)
- `TextureGenerator` generates fallback circle textures; `Hero` constructor uses texture-key check with circle fallback: `if (scene.textures.exists(heroTextureKey))`
- `DraftScene` card rendering: `if (!heroData) return;` — silently skips unknown heroes
- No global error boundary or error logging

## Cross-Cutting Concerns

**Logging:** None — no console logging in production paths (only implicit browser console output)

**Validation:** Input validated inline at usage sites; `hero.useAbility()` guards mana/cooldown before delegating to `CombatSystem`

**Scene communication:** Data passed via Phaser's `scene.start(key, data)` object parameter (typed loosely). Cross-system access within `BattleScene` uses `as any` casts on `this.scene` (e.g., `battleScene.combatSystem`, `battleScene.heroes`) — a deliberate coupling choice, not an abstraction

**Depth layering (Z-order):** Managed via `setDepth()` constants:
- `-10` background, `-9` grid, `-1` border glow
- `0–5` gameplay objects (obstacles, area effects, projectiles)
- `6` melee slash VFX
- `10` burst particles
- `50` death flash
- `100` floating damage numbers
- `150` vignette overlay
- `199–202` HUD elements (scroll factor 0)
- `300` match-over overlay

---

*Architecture analysis: 2026-02-22*
