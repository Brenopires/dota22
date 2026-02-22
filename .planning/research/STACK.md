# Stack Research

**Domain:** Asymmetric hero brawler (Phaser 3 + TypeScript milestone expansion)
**Researched:** 2026-02-22
**Confidence:** MEDIUM — locked stack verified HIGH, new additions verified MEDIUM via official docs and npm

---

## Context: What Is Already Locked

The following are non-negotiable — this milestone expands an existing game, not a greenfield project:

| Technology | Version | Status |
|------------|---------|--------|
| Phaser | ^3.87.0 (3.90.0 "Tsugumi" is the latest stable) | LOCKED |
| TypeScript | ^5.7.0 | LOCKED |
| Vite | ^6.0.0 | LOCKED |

**Note on Phaser 3.90:** This is confirmed the final Phaser v3 release. All forward development is on Phaser v4, which is not yet production-ready. Stay on 3.90.x for this milestone. Do not upgrade to v4.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Phaser 3 | ^3.90.0 | Game engine (locked) | Already in use; 3.90 is final stable v3 release — no migration cost |
| TypeScript | ^5.7.0 | Type safety (locked) | Already in use; strong typing essential for complex game state |
| Vite | ^6.0.0 | Build tooling (locked) | Already in use; fast HMR for iterative game development |
| mistreevous | ^4.2.0 | Behavior tree execution for boss AI | Only actively maintained TypeScript-native behavior tree library for browsers; supports JSON/MDSL definition formats so boss attack phases are data-driven, not hard-coded; works in browsers via dist/mistreevous.min.js |

**Confidence for mistreevous:** MEDIUM — verified via GitHub + npm that it is TypeScript-native, browser-compatible, and last published 8 months ago (active). No Context7 verification available.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| phaser3-rex-plugins | ^1.80.18 | FSM plugin, UI components, tween helpers | Use for boss phase FSM (`rexFSM`) instead of rolling a custom one; 10K weekly downloads, published 13 days ago (actively maintained) |
| phaser-navmesh | ^2.3.1 | Polygon navmesh pathfinding | Use only if boss or neutral camp AI needs to navigate around obstacles intelligently; 5-20x faster than EasyStar for longer paths; may be low-activity repo — evaluate if needed |

**Confidence for phaser3-rex-plugins:** MEDIUM — npm shows v1.80.18 published 13 days ago, 10K weekly downloads. HIGH activity.
**Confidence for phaser-navmesh:** LOW — v2.3.1 exists, Phaser 3 compatible, but last publish date flagged as stale by package health tools. Treat as optional; evaluate before adopting.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript strict mode | Catch type errors in modifier/trait data structures | Already configured; ensure `strict: true` in tsconfig |
| Vite HMR | Fast iteration on boss AI tuning and balance values | No config needed; works with existing setup |
| Browser DevTools Performance tab | Profile game loop under increased entity count (boss + neutral camps + towers) | Use when boss + 8+ entities are active simultaneously |

---

## No New External Dependencies Needed For These Systems

The following features should be implemented with **zero new npm packages** using Phaser 3's built-in APIs:

| Feature | Built-in Phaser 3 API to Use | Rationale |
|---------|------------------------------|-----------|
| Boss phase transitions | `scene.time.addEvent()` + `scene.tweens.add()` + manual FSM | `TimerEvent` is frame-accurate; `Tweens` handle phase-in animations |
| Dynamic difficulty / asymmetric balance | Pure TypeScript logic — stat multipliers on hero spawn | No library needed; DDA is a coefficient applied at spawn time, not a runtime engine |
| Neutral camp respawn | `scene.time.addEvent({ delay: 30000, callback: respawn })` | Native timer is sufficient; no library needed |
| Scoring system | `StorageManager` (already exists) + `localStorage` | Extend existing `StorageManager.ts`; no backend, no library |
| Battle traits / modifiers | Plain TypeScript objects + `ActiveBuff` system (already exists) | The `ActiveBuff` type in `types.ts` already models per-entity modifiers; extend the enum |
| XP system | Plain TypeScript on `Hero` entity | Add `currentXP`, `level` fields; XP is a scalar, not a library |
| Tower entities | `Phaser.Physics.Arcade.StaticGroup` + `Phaser.GameObjects.Container` | Mirrors existing obstacle system; towers are static bodies with a timer-based attack |
| Gem power-ups | `Phaser.GameObjects.Group` + overlap detection | Same pattern as existing projectiles/area effects |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| mistreevous (behavior tree) | XState v5 (actor-based FSM) | XState is better for UI state orchestration and app-level flows; for boss combat AI, behavior trees are the industry standard because they support parallel execution and conditional fallback naturally. XState's actor model adds indirection that doesn't map cleanly to per-frame game AI ticks |
| mistreevous (behavior tree) | Hand-rolled hierarchical FSM (extending existing AIController) | Acceptable for simple bosses with 2-3 phases. If boss has 4+ distinct attack pattern trees with fallback priority, mistreevous prevents spaghetti. Choose based on boss design complexity |
| phaser3-rex-plugins FSM | XState | XState is too heavyweight for a single boss entity; rex FSM is already used in community Phaser 3 patterns, lightweight, and integrates directly with Phaser's scene lifecycle |
| Built-in `scene.time.addEvent` | A dedicated scheduling library | No scheduling library is needed. Phaser's TimerEvent is frame-accurate, supports loop/repeat, and handles pause/resume — sufficient for boss telegraphing and neutral camp respawn |
| localStorage (existing StorageManager) | IndexedDB or a cloud backend | This is a browser-only, AI-only game. localStorage is sufficient for match history, MMR, and high scores. 5MB limit is far beyond what this game will consume |
| Pure TypeScript modifier objects | ECS library (bitecs, etc.) | ECS overhead is unjustified. The existing Hero class + ActiveBuff array already implements the data side of components. Adding an ECS framework for modifiers would require a full codebase rewrite with no gameplay benefit |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| behavior3js | Last published 9 years ago; unmaintained | mistreevous |
| @crowdedjs/behavior-tree-js | Minimal documentation; unclear TypeScript support quality | mistreevous |
| EasyStar.js | 5-20x slower than navmesh for path-following in an open arena; designed for tile grids | phaser-navmesh (only if pathfinding actually needed) |
| XState for boss AI | Actor model adds async/event indirection; game AI is synchronous per-frame tick logic; XState shines in UI workflows, not combat loops | mistreevous behavior tree or rex FSM |
| Phaser v4 | Not production-ready as of Feb 2026; breaking API changes from v3 | Stay on Phaser 3.90.x |
| Any multiplayer library (Colyseus, etc.) | The project spec is AI-only, no multiplayer | N/A |
| React/Vue UI overlay | The existing HUD is Phaser-native; mixing DOM UI frameworks with Phaser causes z-index and event conflicts | Phaser 3 GameObjects (Text, Container, Graphics) |

---

## Installation

```bash
# Only new dependency (optional, for boss behavior tree)
npm install mistreevous

# Optional: rex plugins (FSM utilities, UI helpers)
npm install phaser3-rex-plugins

# Optional: navmesh pathfinding (only if boss/neutral AI needs obstacle avoidance)
npm install phaser-navmesh
```

**Minimal footprint recommendation:** Start the milestone without any new packages. The first phase (asymmetric balancing, tower entities, neutral camps, scoring) requires zero new dependencies. Adopt `mistreevous` only when implementing boss AI with 3+ attack pattern trees. Adopt `phaser3-rex-plugins` FSM only if the boss state machine becomes unmanageable as a plain TypeScript class.

---

## Stack Patterns by Variant

**If boss has 2-3 distinct phases (simple):**
- Use plain TypeScript class extending/mirroring `AIController`
- Add `phase: 'normal' | 'enraged' | 'dying'` field
- Threshold: HP drops below 50%, switch to enraged; below 20%, dying
- No library needed

**If boss has 4+ attack patterns with priority fallback (complex):**
- Use `mistreevous` behavior tree
- Define tree in JSON: Selector → [CanUseAbility? → UseAbility, IsEnraged? → ChargeAttack, DefaultAttack]
- Call `tree.step()` from the boss's update loop (same 200ms interval as existing AIController)

**If boss or neutral camps need obstacle-aware navigation:**
- Use `phaser-navmesh` to build a mesh from the ArenaGenerator's obstacle layout
- Call `mesh.findPath(from, to)` and drive Phaser's Arcade velocity toward each waypoint
- Fallback: simple direct-vector movement (existing pattern) works fine for open arena layouts

**If asymmetric team balance needs tuning at runtime:**
- Use a `BALANCE_MULTIPLIERS` constant object (pure TypeScript)
- Apply stat multipliers at hero spawn time in TeamManager: `{ hp: 1.2, damage: 1.1 }` for the smaller team
- Do not implement as a runtime adaptive system in Phase 1; static tuned values are sufficient and predictable

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| phaser@3.90.0 | phaser3-rex-plugins@^1.80.18 | Confirmed by rex maintainer for v3.x; verify on bump |
| phaser@3.90.0 | phaser-navmesh@^2.3.1 | Confirmed v2.x targets Phaser 3 |
| mistreevous@^4.2.0 | TypeScript@^5.7.0 | TypeScript-native; no separate @types needed |
| mistreevous@^4.2.0 | Vite@^6.0.0 | ESM-compatible build; works with Vite module resolution |

---

## Sources

- https://phaser.io/news/2025/05/phaser-v390-released — Phaser 3.90.0 "Tsugumi" is the final v3 release (MEDIUM confidence — news post, official source)
- https://github.com/nikkorn/mistreevous — mistreevous v4.2.0, TypeScript-native, browser-compatible (MEDIUM confidence — official GitHub)
- https://www.npmjs.com/package/phaser3-rex-plugins — v1.80.18, 10K weekly downloads, published 13 days ago (MEDIUM confidence — npm registry)
- https://github.com/mikewesthad/navmesh/blob/master/packages/phaser-navmesh/README.md — phaser-navmesh v2.3.1, Phaser 3 wrapper (MEDIUM confidence — official GitHub; maintenance status LOW)
- https://stately.ai/blog/2023-12-01-xstate-v5 — XState v5 actor model details; confirms it is app-level orchestration, not per-frame game AI (HIGH confidence — official Stately blog)
- https://rexrainbow.github.io/phaser3-rex-notes/docs/site/fsm/ — Rex FSM plugin API (MEDIUM confidence — official plugin docs)
- https://dota2.fandom.com/wiki/Roshan — Roshan phase mechanics reference for boss design inspiration (LOW confidence — fan wiki)

---

*Stack research for: Rift Clash — asymmetric hero brawler milestone (boss AI, towers, neutral camps, modifiers)*
*Researched: 2026-02-22*
