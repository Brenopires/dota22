# Codebase Concerns

**Analysis Date:** 2026-02-22

## Tech Debt

**Pervasive `as any` casting for scene access:**
- Issue: All entities and systems access BattleScene properties by casting `this.scene as any`. There is no typed scene interface, so every cross-system call bypasses TypeScript.
- Files: `src/entities/Hero.ts` (lines 295, 349), `src/entities/Projectile.ts` (lines 67, 89), `src/entities/AreaEffect.ts` (line 76), `src/systems/CombatSystem.ts` (lines 39, 103, 122, 174, 207, 232, 297, 374, 391, 462), `src/ai/AIController.ts` (lines 41, 206)
- Impact: 17 occurrences of `as any`. Refactors to BattleScene break silently. No autocomplete or compile-time checks on scene method/property access.
- Fix approach: Define a `IBattleScene` interface in `src/types.ts` (or a dedicated file) exposing `heroes`, `vfxManager`, `combatSystem`, `getEnemies()`, `getAllies()`, `onHeroKill()`, `obstacles`. Pass it explicitly to constructors or cast to the interface instead of `any`.

**HUD typed as `any` (BattleScene):**
- Issue: `HUD.ts` declares `private scene: any` and its constructor parameter is `any`. All BattleScene-specific property accesses inside HUD are untyped.
- Files: `src/ui/HUD.ts` (lines 11, 22)
- Impact: Any rename or restructure of BattleScene properties will compile successfully but break HUD at runtime with no warning.
- Fix approach: Import `BattleScene` or a typed interface and replace `any` with the concrete type.

**Duplicate button creation code:**
- Issue: `createButton()` is copy-pasted nearly identically across three scenes with minor style differences (colors, font sizes).
- Files: `src/scenes/MenuScene.ts` (lines 92-144), `src/scenes/ResultScene.ts` (lines 158-208), `src/scenes/DraftScene.ts` (lines 236-291)
- Impact: Any UI change (hover animation, hit area logic, font) must be applied in three places. Bug fixes in one may be missed in others.
- Fix approach: Extract a shared `createStyledButton(scene, x, y, label, callback, options)` utility, or a reusable Phaser `Container` class in `src/ui/`.

**`getRank()` duplicated across scenes:**
- Issue: Identical `getRank(mmr)` method implemented in both `MenuScene` and `ResultScene`.
- Files: `src/scenes/MenuScene.ts` (lines 146-152), `src/scenes/ResultScene.ts` (lines 210-216)
- Impact: Any change to rank logic (new tiers, formula) must be applied twice.
- Fix approach: Move to `src/utils/MMRCalculator.ts` or a new `src/utils/RankHelper.ts`.

**Magic number: projectile hit detection radius (25px):**
- Issue: Projectile-to-hero collision distance is hardcoded as `25` in two separate places within the same update loop, not derived from projectile or hero radius.
- Files: `src/systems/CombatSystem.ts` (lines 46, 57)
- Impact: If projectile or hero radius changes, collision will silently mismatch visuals.
- Fix approach: Derive from `PROJECTILE_RADIUS + HERO_RADIUS` constants, or use Arcade Physics overlap instead of manual distance checks.

**Magic number: AI delay clock increments hardcoded string `0.2`:**
- Issue: `AIController.update()` adds `0.2` as a hard-coded number representing 200ms, with a comment referencing `AI_UPDATE_INTERVAL`, but the constant is not used in the expression.
- Files: `src/ai/AIController.ts` (line 36)
- Impact: If `AI_UPDATE_INTERVAL` changes, the delay accumulation silently desynchronizes.
- Fix approach: Replace `0.2` with `AI_UPDATE_INTERVAL / 1000`.

**`directionalShake` ignores its `angle` parameter:**
- Issue: `VFXManager.directionalShake(angle, intensity, duration)` accepts an angle argument but never uses it — it calls `camera.shake()` which shakes in all directions equally.
- Files: `src/systems/VFXManager.ts` (lines 126-128)
- Impact: Callers (e.g. `CombatSystem.executeAbility` line 235) pass a meaningful angle expecting directional feedback that never happens.
- Fix approach: Implement true directional shake using `camera.setRotation` tween or manual offset per frame, or remove the `angle` parameter and rename the method.

**`AbilityDef.buffType` uses string `'shield'` literal instead of enum in retreat logic:**
- Issue: `AIController.executeRetreat()` compares `ability.buffType === 'shield'` instead of `ability.buffType === BuffType.SHIELD`. This bypasses the TypeScript enum.
- Files: `src/ai/AIController.ts` (line 235)
- Impact: If `BuffType.SHIELD` value ever changes, the AI retreat logic silently breaks. The TypeScript enum check is already imported.
- Fix approach: Replace string literal with `BuffType.SHIELD` enum reference.

---

## Known Bugs

**Projectile healing logic hits ally + enemy simultaneously:**
- Symptoms: A healing projectile (e.g. Holy Priest's `hp_q`) checks for ally healing and enemy damage in the same collision block. If an ally is within 25px of the enemy, both branches can execute before `break`, resulting in the projectile healing an ally AND dealing damage in the same frame.
- Files: `src/systems/CombatSystem.ts` (lines 42-81)
- Trigger: Fire a healing projectile when an ally and enemy are close together.
- Workaround: None currently.

**Dead hero killer fallback uses arbitrary nearest enemy, not last-hitting hero:**
- Symptoms: If `killerId` is undefined or no matching hero is found, `die()` assigns the kill to whichever living enemy happens to be closest. This can misattribute kills and inflate the wrong hero's stats in the kill feed.
- Files: `src/entities/Hero.ts` (lines 376-392)
- Trigger: Any death where `killerId` is not passed (e.g. DoT ticks do pass `sourceId`, but area effects may not).
- Workaround: None.

**Match timer uses `setInterval`-equivalent (Phaser `time.addEvent`) that persists after `matchOver = true`:**
- Symptoms: `tickTimer` in `BattleScene` loops forever with a guard check (`if (this.matchOver) return`), but the event itself is never destroyed. On scene restart, stale timer events may accumulate if shutdown does not clean them.
- Files: `src/scenes/BattleScene.ts` (lines 150-155)
- Trigger: Rapid scene restarts ("Play Again") in quick succession.
- Workaround: Phaser auto-destroys scene timers on scene shutdown, but explicit cleanup is safer.

**Slow-motion time scale restoration uses `duration * timeScale` delay:**
- Symptoms: `VFXManager.slowMotion()` schedules restoration using `delayedCall(duration * timeScale, ...)`. Since `delayedCall` uses the scene's time scale, this double-applies the scale factor, causing the slow-motion to restore prematurely.
- Files: `src/systems/VFXManager.ts` (line 135)
- Trigger: Player death triggering slow-motion (`Hero.ts` line 370-371).
- Workaround: None. The effect cancels too early.

---

## Security Considerations

**Unvalidated localStorage data:**
- Risk: `StorageManager.load()` calls `JSON.parse()` and casts the result directly to `PlayerData` without any schema validation. A corrupted or hand-crafted localStorage value could produce objects with unexpected types or values.
- Files: `src/utils/StorageManager.ts` (lines 8-17)
- Current mitigation: The `try/catch` block catches JSON parse errors and falls back to defaults.
- Recommendations: Add structural validation (check for required fields, numeric types, history array bounds) before using loaded data. This is a browser game, so the risk is primarily self-exploitation, but it can cause runtime errors if fields are missing.

---

## Performance Bottlenecks

**Vignette rendered as 320 individual `fillRect` calls every scene creation:**
- Problem: `BattleScene.createVignette()` renders a vignette by drawing 80+80+80+80 = 320 single-pixel rectangles using a Graphics object loop.
- Files: `src/scenes/BattleScene.ts` (lines 158-191)
- Cause: No batching; each fillRect is a separate draw operation on the graphics object.
- Improvement path: Replace with a pre-generated texture using a radial gradient, or use a single large semi-transparent overlay with a shader/mask. Since vignette is static, generate it once in `BootScene` and reuse.

**TextureGenerator runs ~13 hero texture generations + 7 particle textures synchronously at boot:**
- Problem: All procedural textures are generated in `BootScene` using `scene.make.graphics()` loops — including elaborate per-hero shapes with multiple draw passes (archetype shape, dome shading, element accent, border, symbol).
- Files: `src/systems/TextureGenerator.ts` (lines 11-105), `src/scenes/BootScene.ts`
- Cause: 20 separate Graphics objects created, drawn, converted to texture, and destroyed in one synchronous burst.
- Improvement path: Stagger generation across frames using a queue, or pre-bake textures to a sprite atlas at build time rather than at runtime.

**`CombatSystem.update()` performs O(projectiles × heroes) distance checks every frame:**
- Problem: Every frame, each active projectile is tested against every hero via `Phaser.Math.Distance.Between`. With 8 heroes and 10+ projectiles this is 80+ distance calculations per frame, done manually instead of using Arcade Physics.
- Files: `src/systems/CombatSystem.ts` (lines 31-99)
- Cause: Projectiles are `Phaser.GameObjects.Arc` with physics bodies, but collision is checked manually rather than using `physics.add.overlap`.
- Improvement path: Register projectile-hero overlaps with `this.scene.physics.add.overlap(projGroup, heroGroup, onHit)` to use the spatial hash built into Arcade Physics.

**ArenaGenerator dot grid renders up to 380 individual `fillCircle` calls per arena:**
- Problem: The dot grid in `ArenaGenerator.render()` draws 1.5px dots at 80px intervals across a 1600x1200 arena, resulting in `(1600/80) × (1200/80) = 20 × 15 = 300` dot draw calls on a single Graphics object.
- Files: `src/systems/ArenaGenerator.ts` (lines 110-118)
- Cause: Decorative only; no batching or texture use.
- Improvement path: Pre-generate as a texture once in BootScene and tile it, or reduce grid density.

---

## Fragile Areas

**`BattleScene` is a God Object accessed via `as any` from all systems:**
- Files: `src/scenes/BattleScene.ts`, `src/systems/CombatSystem.ts`, `src/entities/Hero.ts`, `src/entities/Projectile.ts`, `src/entities/AreaEffect.ts`, `src/ai/AIController.ts`
- Why fragile: Any property rename, removal, or restructure in `BattleScene` will compile without error (due to `as any`) but fail at runtime across 5+ files.
- Safe modification: Always search for `battleScene.X` when renaming any public property of BattleScene. Add the `IBattleScene` interface before making changes.
- Test coverage: No tests exist; all verification is manual runtime observation.

**`Hero.die()` triggers `onHeroKill` which calls `checkWinCondition` which can call `endMatch` re-entrantly:**
- Files: `src/entities/Hero.ts` (line 374), `src/scenes/BattleScene.ts` (lines 310, 347-356, 358-410)
- Why fragile: `onHeroKill` is called from within `Hero.die()` which is called from `takeDamage`. The kill handler then checks win condition and may trigger `endMatch`. If multiple heroes die in the same frame (e.g. area AoE), `endMatch` can be entered multiple times — mitigated by the `if (this.matchOver) return` guard, but the re-entrant call chain is hard to reason about.
- Safe modification: Defer `onHeroKill` via `this.scene.time.delayedCall(0, ...)` so it runs after the current frame's physics/update completes.
- Test coverage: None.

**`DraftScene.startBattle()` can be triggered by both SPACE key and button click, with no debounce:**
- Files: `src/scenes/DraftScene.ts` (lines 115-127)
- Why fragile: If SPACE is pressed at the exact same moment a pointer down fires on the button, `startBattle()` can be called twice in the same frame, triggering two camera fade-outs and two scene starts.
- Safe modification: Set a boolean `this.battleStarted = false` guard and flip it on first call. The existing `removeAllKeys()` call partially mitigates this for the keyboard path, but not the pointer path.
- Test coverage: None.

---

## Scaling Limits

**Hero roster capped by hardcoded `heroDataMap` object:**
- Current capacity: 13 heroes defined in `src/heroes/heroData.ts`.
- Limit: `TeamManager.getRandomHeroId()` draws from this fixed list. With team sizes up to 4v4 (8 heroes needed from 13), a 5v5 or larger team size would deplete the unique hero pool (13 heroes for 10 slots works, but 7v7 would fail as only 13 heroes exist).
- Scaling path: Adding heroes requires adding entries to `heroDataMap`, `COLORS` constant, `HERO_ELEMENT_MAP`, and a symbol case in `TextureGenerator.drawHeroSymbol()` — four separate edits per hero.

**Match history capped at 20 entries in localStorage:**
- Current capacity: Last 20 matches stored.
- Limit: Hard-coded in `StorageManager.saveMatchResult()` (`data.matchHistory.slice(0, 20)`).
- Scaling path: Increase limit or implement pagination; no server-side persistence exists.

---

## Dependencies at Risk

**No package lock integrity enforcement:**
- Risk: `package-lock.json` is present but there is no CI pipeline checking integrity. `npm install` without `--frozen-lockfile` could silently update transitive dependencies.
- Impact: Phaser or Vite minor/patch updates could introduce breaking changes undetected.
- Migration plan: Add `npm ci` to any deployment or build script; add a CI step with `npm ci --dry-run` to catch drift.

---

## Test Coverage Gaps

**No tests exist anywhere in the codebase:**
- What's not tested: All game logic — combat calculations, buff application/expiry, AI state transitions, MMR calculation, shield absorption math, team generation, arena layout generation.
- Files: All files under `src/` — no `*.test.ts` or `*.spec.ts` files found.
- Risk: Balance changes to hero stats or ability values, changes to `MMRCalculator`, or refactors to `CombatSystem` carry zero safety net. Regressions are only discovered through manual play.
- Priority: High

**`MMRCalculator` has untestable side-effect coupling:**
- What's not tested: The ELO calculation uses `playerData.matchHistory` for streak detection — a side-effecting read mixed into a pure calculation. Hard to unit test without mocking the full `PlayerData` shape.
- Files: `src/utils/MMRCalculator.ts`
- Risk: Incorrect streak counting or boundary conditions go undetected.
- Priority: Medium

---

*Concerns audit: 2026-02-22*
