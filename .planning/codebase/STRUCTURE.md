# Codebase Structure

**Analysis Date:** 2026-02-22

## Directory Layout

```
dota22/
├── src/
│   ├── main.ts              # Phaser Game config and boot
│   ├── types.ts             # All shared TypeScript interfaces and enums
│   ├── constants.ts         # Numeric/string constants (dimensions, timings, colors)
│   ├── scenes/              # Phaser Scene classes (game flow)
│   │   ├── BootScene.ts     # Texture generation, loading screen
│   │   ├── MenuScene.ts     # Main menu with MMR display
│   │   ├── DraftScene.ts    # Match setup preview (teams + arena)
│   │   ├── BattleScene.ts   # Main gameplay scene
│   │   └── ResultScene.ts   # Post-match results display
│   ├── entities/            # Phaser GameObjects with embedded game logic
│   │   ├── Hero.ts          # Player and AI hero container
│   │   ├── Projectile.ts    # Projectile Arc game object
│   │   ├── AreaEffect.ts    # AoE zone Arc game object
│   │   └── HealthBar.ts     # Per-hero HP/mana Graphics component
│   ├── systems/             # Stateful manager classes (instantiated by BattleScene)
│   │   ├── CombatSystem.ts  # Auto-attacks, ability execution, projectile/area update
│   │   ├── VFXManager.ts    # Particle emitters, camera effects
│   │   ├── ParticlePresets.ts # Particle config factory by element type
│   │   ├── ArenaGenerator.ts  # Arena layout generation and rendering
│   │   ├── MatchOrchestrator.ts # Match config generation (delegates to TeamManager)
│   │   ├── TeamManager.ts   # Team composition randomisation
│   │   └── TextureGenerator.ts # Procedural hero and particle texture generation
│   ├── ai/                  # AI state machine
│   │   ├── AIController.ts  # Per-hero FSM (IDLE/CHASE/ATTACK/RETREAT/USE_ABILITY)
│   │   └── AIPersonality.ts # Archetype-based AI profile factory
│   ├── heroes/              # Static hero data registry
│   │   ├── heroData.ts      # Record<string, HeroStats> with all 13 hero definitions
│   │   └── HeroRegistry.ts  # Factory (create) and lookup (getRandomHeroId)
│   ├── ui/                  # In-battle HUD components
│   │   ├── HUD.ts           # Timer, kill feed, player HP/mana bars
│   │   └── AbilityBar.ts    # Three ability slot display (cooldowns, mana state)
│   └── utils/               # Stateless pure utilities (no Phaser dependency)
│       ├── MMRCalculator.ts  # ELO-based MMR change calculation
│       └── StorageManager.ts # localStorage read/write for PlayerData
├── dist/                    # Build output (Vite, committed to repo)
│   └── assets/
├── index.html               # Entry HTML (mounts Phaser canvas)
├── package.json             # Dependencies: phaser, vite, typescript
├── tsconfig.json            # TypeScript config
└── vite.config.ts           # Vite bundler config
```

## Directory Purposes

**`src/scenes/`:**
- Purpose: Game flow controllers; each scene is a discrete screen with its own `create()` and optional `update()` lifecycle
- Contains: One class per file, all extend `Phaser.Scene`
- Key files: `src/scenes/BattleScene.ts` (main gameplay, ~428 lines), `src/scenes/DraftScene.ts` (team preview, ~293 lines)

**`src/entities/`:**
- Purpose: Phaser `GameObject` subclasses that carry their own runtime state and visual representation
- Contains: `Hero` (extends `Container`), `Projectile` and `AreaEffect` (extend `Arc`), `HealthBar` (wraps `Graphics`)
- Key files: `src/entities/Hero.ts` (~529 lines, central game object)

**`src/systems/`:**
- Purpose: Service classes that manage complex logic spanning multiple entities; instantiated once per match
- Contains: Mixed — some are instantiated (`CombatSystem`, `VFXManager`), others are pure static (`ArenaGenerator`, `MatchOrchestrator`, `TeamManager`, `TextureGenerator`)
- Key files: `src/systems/CombatSystem.ts` (~468 lines), `src/systems/VFXManager.ts`

**`src/ai/`:**
- Purpose: Autonomous hero control logic decoupled from the Hero entity
- Contains: One `AIController` instance per non-player hero; `AIPersonality` provides archetype-based profiles
- Key files: `src/ai/AIController.ts` (~280 lines)

**`src/heroes/`:**
- Purpose: Data layer for hero definitions; separates static config from runtime entities
- Contains: `heroData.ts` with all 13 heroes' `HeroStats` and `AbilityDef[]` arrays inline
- Key files: `src/heroes/heroData.ts` (primary data source for all hero stats)

**`src/ui/`:**
- Purpose: Screen-space UI elements that overlay the game world during battle (scroll factor 0)
- Contains: `HUD` (aggregates all player-facing info) and `AbilityBar` (sub-component of HUD)
- Key files: `src/ui/HUD.ts`

**`src/utils/`:**
- Purpose: Pure TypeScript with no Phaser imports; reusable across any context
- Contains: Two classes, both with only static methods
- Key files: `src/utils/StorageManager.ts` (only persistence layer in the game)

## Key File Locations

**Entry Points:**
- `src/main.ts`: Phaser `Game` instantiation with scene list and physics config
- `index.html`: HTML shell that Vite serves; no script logic

**Configuration:**
- `src/constants.ts`: All numeric tuning values (arena size, hero physics, timers, MMR thresholds)
- `src/types.ts`: All TypeScript interfaces and enums (source of truth for shared data shapes)
- `tsconfig.json`: Strict TypeScript settings
- `vite.config.ts`: Vite build configuration

**Core Logic:**
- `src/scenes/BattleScene.ts`: Coordinates all runtime systems; the most complex file
- `src/entities/Hero.ts`: Central entity with combat, buff, and visual logic
- `src/systems/CombatSystem.ts`: All combat resolution and ability execution
- `src/heroes/heroData.ts`: All hero and ability definitions; edit here to add/rebalance heroes

**AI:**
- `src/ai/AIController.ts`: FSM logic; edit here to tune AI behavior
- `src/ai/AIPersonality.ts`: Archetype profiles; edit here to adjust AI personality per archetype

**Persistence:**
- `src/utils/StorageManager.ts`: The sole read/write point for player data (`localStorage` key `dota22_player_data`)

## Naming Conventions

**Files:**
- PascalCase for classes: `BattleScene.ts`, `Hero.ts`, `CombatSystem.ts`
- camelCase for data modules: `heroData.ts`, `constants.ts`, `types.ts`

**Classes:**
- PascalCase: `Hero`, `BattleScene`, `AIController`, `VFXManager`

**Methods:**
- camelCase: `updateHero()`, `takeDamage()`, `useAbility()`, `spawnBurst()`
- Private methods prefixed with `private` keyword (not `_`): `private die()`, `private showDamageNumber()`

**Constants:**
- SCREAMING_SNAKE_CASE for top-level exports in `constants.ts`: `GAME_WIDTH`, `AI_UPDATE_INTERVAL`, `MATCH_DURATION`
- Object constant groups in SCREAMING_SNAKE_CASE with PascalCase keys: `COLORS.IRON_GUARD`, `RANK_THRESHOLDS`

**Types/Interfaces:**
- PascalCase interfaces: `HeroStats`, `AbilityDef`, `ActiveBuff`, `MatchResult`
- PascalCase enums: `HeroArchetype`, `AbilityType`, `BuffType`, `AIState`, `Team`
- Enum values: SCREAMING_SNAKE_CASE: `HeroArchetype.TANK`, `AbilityType.PROJECTILE`

**Hero IDs:**
- snake_case strings matching the data map keys: `'iron_guard'`, `'shadow_blade'`, `'flame_witch'`
- Texture keys derived as: `` `hero_${heroId}` `` e.g. `'hero_iron_guard'`

## Where to Add New Code

**New Hero:**
- Add `HeroStats` entry to `src/heroes/heroData.ts` `heroDataMap` record
- Add entry to `heroIds` array in `src/heroes/heroData.ts`
- Add hero color to `COLORS` in `src/constants.ts`
- Add element mapping to `HERO_ELEMENT_MAP` in `src/constants.ts`
- Add hero-specific symbol case in `TextureGenerator.drawHeroSymbol()` in `src/systems/TextureGenerator.ts`
- No other files require changes — `HeroRegistry` picks up new heroes automatically

**New Ability Type:**
- Add enum value to `AbilityType` in `src/types.ts`
- Add case to `CombatSystem.executeAbility()` switch in `src/systems/CombatSystem.ts`
- Add corresponding private method to `CombatSystem`

**New Arena Layout:**
- Add layout name to `ARENA_LAYOUTS` const in `src/constants.ts`
- Add case to `generateLayout()` in `src/systems/ArenaGenerator.ts`

**New Arena Theme:**
- Add theme name to `ARENA_THEMES` const in `src/constants.ts`
- Add theme colors entry to `THEMES` in `src/systems/ArenaGenerator.ts`

**New Buff Effect:**
- Add enum value to `BuffType` in `src/types.ts`
- Add handling case in `Hero.updateBuffs()` in `src/entities/Hero.ts`
- Add status visual in `Hero.updateStatusVisuals()` if it needs a persistent indicator

**New Scene:**
- Create class extending `Phaser.Scene` in `src/scenes/NewScene.ts`
- Register in `src/main.ts` scene array before `new Phaser.Game(config)`

**New VFX Effect:**
- Add preset method to `src/systems/ParticlePresets.ts`
- Expose API method on `VFXManager` in `src/systems/VFXManager.ts`

**New HUD Element:**
- Add to `HUD` constructor or as a new sub-component class in `src/ui/`
- Set `setScrollFactor(0)` and appropriate `setDepth()` (199–202 range for HUD)

**Shared constants or types:**
- Constants → `src/constants.ts`
- Interfaces/enums → `src/types.ts`
- Do not scatter type definitions into individual module files

## Special Directories

**`dist/`:**
- Purpose: Compiled output from `npm run build` (Vite)
- Generated: Yes (from build command)
- Committed: Yes (present in repo, not in `.gitignore`)

**`node_modules/`:**
- Purpose: npm package dependencies
- Generated: Yes
- Committed: No (in `.gitignore`)

**`.planning/`:**
- Purpose: GSD planning documents for AI-assisted development
- Generated: No (manually/AI-created)
- Committed: Yes

---

*Structure analysis: 2026-02-22*
