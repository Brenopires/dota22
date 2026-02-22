# Technology Stack

**Analysis Date:** 2026-02-22

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code in `src/`

**Secondary:**
- HTML5 - Entry point at `index.html`
- CSS (inline) - Minimal reset styles in `index.html`

## Runtime

**Environment:**
- Browser (target: ES2020 via `tsconfig.json`)
- Node.js 23.10.0 (development/build tooling only)

**Package Manager:**
- npm 10.9.2
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Phaser 3.90.0 (`phaser: ^3.87.0`) - Game engine providing scene management, physics, rendering, particles, input handling, and UI primitives. Used across all `src/scenes/`, `src/entities/`, and `src/systems/`.

**Build/Dev:**
- Vite 6.4.1 (`vite: ^6.0.0`) - Dev server and bundler. Config at `vite.config.ts`.
  - `base: './'` for relative asset paths (important for static deployment)
  - Output: `dist/`, assets in `dist/assets/`

## Key Dependencies

**Critical:**
- `phaser` ^3.87.0 (installed 3.90.0) - The entire game is built on Phaser 3. Provides:
  - `Phaser.Scene` - Base class for all scenes (`src/scenes/`)
  - `Phaser.Physics.Arcade` - Collision and movement physics
  - `Phaser.GameObjects.Graphics` - Procedural texture generation (`src/systems/TextureGenerator.ts`)
  - `Phaser.GameObjects.Particles` - Particle system VFX (`src/systems/VFXManager.ts`, `src/systems/ParticlePresets.ts`)
  - `Phaser.Scale` - Responsive canvas scaling (FIT + CENTER_BOTH)
  - `Phaser.Types.Core.GameConfig` - Core game configuration in `src/main.ts`

**Dev Only:**
- `typescript` ^5.7.0 (installed 5.9.3) - Compile-time type checking
- `vite` ^6.0.0 (installed 6.4.1) - Build and dev server

## Configuration

**TypeScript (`tsconfig.json`):**
- `target: ES2020` - Modern browser syntax output
- `module: ESNext` - Native ES modules
- `moduleResolution: bundler` - Vite-compatible resolution
- `strict: true` - Full strict mode enabled
- `sourceMap: true` - Source maps in output
- `outDir: ./dist`
- `include: ["src"]` - Only compiles `src/` directory

**Build (`vite.config.ts`):**
- `base: './'` - Relative paths for portable deployment
- `build.outDir: 'dist'`
- `build.assetsDir: 'assets'`

**Environment:**
- No `.env` files detected
- No environment variables required
- No runtime secrets or API keys

**Game Entry (`src/main.ts`):**
- Phaser renderer: `Phaser.AUTO` (WebGL with Canvas fallback)
- Physics: Arcade physics, no gravity (`{ x: 0, y: 0 }`)
- Canvas: 1280x720 (`GAME_WIDTH` x `GAME_HEIGHT` from `src/constants.ts`)
- Arena world: 1600x1200 (camera scrolls within)
- Scenes registered: `BootScene`, `MenuScene`, `DraftScene`, `BattleScene`, `ResultScene`

## Platform Requirements

**Development:**
- Node.js (any recent LTS, tested on v23.10.0)
- npm
- Modern browser with WebGL support

**Production:**
- Static file hosting only (no server required)
- Build output: `dist/` directory
- Run: `npm run build`, then serve `dist/`
- Dev server: `npm run dev`

---

*Stack analysis: 2026-02-22*
