# Project Research Summary

**Project:** Rift Clash — Asymmetric Hero Brawler Milestone
**Domain:** Short-format arena combat game (MOBA-lite) with AI opponents
**Researched:** 2026-02-22
**Confidence:** MEDIUM — Strong patterns on established genres and technologies; novel combination (asymmetric 1vN + boss tiers + battle traits + 5-min cap) lacks direct competitive precedent for validation

---

## Executive Summary

Rift Clash is expanding from a baseline arena brawler into a competitive asymmetric team game where match outcomes depend on skill expression under unequal odds — not fairness-based handicapping. The recommended technical approach leverages Phaser 3.90 (final v3 release, already locked), TypeScript, and a data-driven modifier system rather than heavy external libraries. The core risk is not technology but design: asymmetric scaling, boss economy, and battle trait interactions must prevent rubber-banding (helping weaker players instead of challenging stronger ones), dominant strategies (rush the boss, ignore skill), and combinatorial explosion (one trait breaks the match). Success requires explicit state machines for match phases (ACTIVE → SUDDEN_DEATH → ENDED), event-driven architecture to decouple systems, and rigorous playtesting of cross-system interactions.

The milestone is high-complexity but achievable within a single 3-4 month cycle if phases are ordered by dependency rather than feature priority. The largest technical risk is boss roaming pathfinding (Tier 2) — consider deferring this to v1.x if timeline pressure emerges. The largest design risk is rolling out asymmetric team matchmaking without MMR-aware scaling that correctly challenges high-MMR players rather than handicapping them.

---

## Key Findings

### Recommended Stack

Phaser 3.90.x (final v3 stable release) with TypeScript 5.7+ is locked and the right choice — no Phaser v4 migration. **New optional dependency:** `mistreevous` v4.2.0 for boss behavior tree (only if boss has 4+ attack patterns; skip for simple 2-3 phase design). **Lightweight plugins:** `phaser3-rex-plugins` for FSM utilities and UI helpers (actively maintained, 10K weekly downloads). **No backend:** localStorage is sufficient for MMR, match history, and high scores. Build score tracking, trait effects, neutral camps, and all match logic with zero new npm packages beyond mistreevous/rex if needed.

**Critical decision:** Do NOT implement boss as a Hero subclass or add items/gold system. Boss scales in power per minute (progressive difficulty), not through farming. XP-only leveling makes the 5-minute window feel dense with progression without resource management complexity.

### Expected Features

**Must ship (v1.0, table stakes):**
- Respawn system (10s max timer) — replaces instant-defeat on death
- 5-minute hard match timer with scoring fallback
- Asymmetric team sizes (1v3, 2v3, etc., not symmetric NvN)
- Tower entities per team (destruction = instant win)
- Boss system Tier 1 (spawn, kill mechanics, revival token + stat buff drop)
- XP leveling with ability unlock gates (ultimates unlock at level threshold)
- Ultimate ability (R slot) per hero — 60–120s cooldown, high-impact moments
- Passive ability per hero — event-triggered or stat-based, reinforces archetype identity
- Battle Traits (1 random per match) — modifiers that interact with combat systems
- Pick-from-3 random draft (replaces current all-heroes view)
- Combat event hook architecture — fires on-hit, on-kill, on-damage-taken for passives/traits
- Scoring system (kills, boss, tower thresholds, neutral control) with visible HUD tracking

**Should add post-launch validation (v1.x, differentiators):**
- Boss Tier 2 (roaming behavior with pathfinding around obstacles)
- Boss Tier 3 (Sudden Death trigger on third kill; no respawns)
- Sudden Death as secondary win condition at 5:00 if tied
- Neutral camps (4 types: Damage, Shield, Haste, Cooldown; 60s respawn)
- Random Gem power-up (one unique item per match with variable effect)
- MMR-adaptive scaling (scale AI aggression by MMR tier, not helper power)
- Arena map rework with named strategic zones (boss area, tower positions, camp positions)

**Explicitly deferred (v2+, out of scope):**
- Online multiplayer / networking
- Full hero ban/pick draft (too much pre-game overhead for 5-min matches)
- Item shop or gold farming (breaks "pure skill test" identity)
- Creep waves or lane structure (contradicts arena-only design)
- Surrender votes (5-min hard timer IS the exit mechanism)

### Architecture Approach

Replace the monolithic BattleScene (which owns all logic directly with `as any` casting) with a layered system: **Entity layer** (BaseEntity abstract class that Hero, Boss, Tower extend with shared HP/buff/death logic), **System layer** (CombatSystem, BossAISystem, MatchStateMachine, TraitSystem, XPSystem, NeutralCampSystem—each isolated, no cross-system references), **Event bus** (singleton Phaser.Events.EventEmitter for all cross-system communication). This prevents the existing `battleScene as any` anti-pattern from propagating and makes new systems independently testable.

**Major components to build:**
1. **BaseEntity** — Shared damageable entity interface (Hero, BossEntity, TowerEntity, NeutralMob all extend it)
2. **MatchStateMachine** — Formal FSM replacing ad-hoc booleans; states: PRE_MATCH → ACTIVE → SUDDEN_DEATH → ENDED
3. **TraitSystem** — Data-driven modifier registry; traits hook into EventBus events without touching combat code
4. **BossAISystem** — Phase-aware FSM for boss with health-threshold phase transitions
5. **EventBus** — Central typed event dispatcher; all systems subscribe/emit through it

**Build order is critical:** EventBus first (all systems depend on it), BaseEntity second (Hero/Boss/Tower extend it), MatchStateMachine third (required before scoring/sudden death), TraitSystem fourth (both passives and traits use it), XPSystem/BossEntity/TowerEntity in parallel, then UI extensions. Building out of order forces rework.

### Critical Pitfalls

1. **Asymmetric Scaling Inversion** — High-MMR solo players accidentally receive weaker opponents or smarter allies instead of harder challenges. This feels like rubber-banding and invalidates the skill-test identity. Avoid by: making scaling affect AI aggression/coordination, not hero stats; expose scaling as named constants so direction is legible; test that 1v3 at max MMR feels harder than at low MMR, not equal.

2. **Battle Trait Combinatorial Explosion** — One modifier (e.g., "blink reset on kill" + "lifesteal→shield") cascades into match-breaking exploits by eliminating core constraints (respawn, mana, cooldown). Prevent by: hard-capping single trait power to ~20% match-outcome swing; categorizing traits as stat/mechanic/rule-change and limiting rule-change traits to one per match; implementing incompatibility blacklists in trait registry.

3. **Boss as Dominant Strategy** — Boss grants 3 points, so rational play becomes "rush boss, ignore skill." Avoid by: requiring contested windows (both teams alert, killer must survive 5s post-kill to get credit); capping boss points when one team already winning; scaling boss health so solo players cannot out-race teams; designing boss as a triangle (threatens heroes, creates vulnerability window opponents can exploit).

4. **Scene Restart Memory Accumulation** — After "Play Again," timers from previous match stack (tickTimer bug confirmed). Respawn timer, boss timer, neutral camp respawn all leak listeners. Prevent by: storing every `time.addEvent()` handle and destroying in shutdown; never using anonymous event listeners; adding explicit `cleanupTimers()` call at start of create().

5. **AI All-Targeting One Enemy** — In 3v1, all three AIs pick the same target, solo player dies in 3 seconds before skill expression. Prevent by: implementing basic team-level target distribution (count active targets per enemy, de-prioritize over-targeted ones); rotating objectives when one ally already engaging; adding decision jitter (15% re-evaluation chance) to prevent perfect convergence.

6. **Scoring Tie + Sudden Death Edge State** — Rare code path, most likely to be broken. Ties at 5:00 require switching respawn off before processing death events at exact same timestamp. Prevent by: modeling match state as explicit enum (no invalid transitions); setting Sudden Death flag via timer event (safer than kill event); adding visual test (HUD "Sudden Death in 5s" countdown); unit testing tie detection at boundary timestamps.

---

## Implications for Roadmap

Based on research, the dependency graph and technical architecture suggest this phase structure:

### Phase 1: Foundation & Core Systems (4 weeks)
**Rationale:** Everything else depends on EventBus, BaseEntity, and MatchStateMachine. Respawn system is the keystone — without it, no other feature is meaningful. This phase unblocks all downstream work.

**Delivers:**
- EventBus singleton (typed event dispatcher)
- BaseEntity abstract class (Hero refactored to extend it)
- MatchStateMachine (PRE_MATCH → ACTIVE → SUDDEN_DEATH → ENDED)
- Respawn system (10s timer, re-spawn at team base)
- 5-minute match timer + scoring fallback at 5:00
- Visible scoreboard with kill tracking

**Implements features from FEATURES.md:**
- Respawn system
- 5-minute hard timer
- Scoring as tie-break (basic tracking)

**Avoids pitfalls:**
- Prevents scene restart memory leaks (explicit timer cleanup established early)
- Prevents scoring tie edge case (state machine avoids boolean combinations)

**Success criteria:** Match can run to full 5 minutes, respawned heroes re-enter combat, score correctly reflects kills and accumulates at 5:00.

---

### Phase 2: Hero Progression & Combat Identity (3 weeks)
**Rationale:** XP system and passives both require the event hook architecture. Ultimate abilities unlock at level thresholds, so XP must exist first. This phase makes each hero feel distinct via passives (archetype identity) and ultimates (high-impact moments).

**Delivers:**
- XP leveling system (kill = 50 XP, boss = 150 XP, objective = 100 XP; fixed milestones, no curve)
- Ultimate ability (R slot) per hero with long cooldown (60–120s)
- Passive ability per hero (event-triggered or stat-based)
- Combat event hook architecture (on-hit, on-kill, on-damage-taken, etc.)

**Implements features:**
- Ultimate ability (R)
- Passive ability
- XP leveling within match
- Combat event hook architecture (enabler for both)

**Uses architecture from ARCHITECTURE.md:**
- Extends Hero to support `level` and `currentXP` fields
- Builds event hook system that TraitSystem will reuse

**Avoids pitfalls:**
- Makes hero ability feel complete (no more "E is basically the ultimate")
- Establishes event architecture before trait system complexity

**Success criteria:** Each hero has a functional R with clear impact, passives visibly trigger with VFX, XP bar shows progression, heroes reach level 5+ in a typical 5-minute match.

---

### Phase 3: Asymmetric Teams & Balancing (3 weeks)
**Rationale:** TeamManager must generate different team sizes. Asymmetry is the core differentiator—but without proper scaling, it feels broken. TeamBalancer runs once at match start and applies stat multipliers. This phase validates the design pillar.

**Delivers:**
- TeamManager rework (generates 1v3, 2v3, etc., not symmetric NvN)
- TeamBalancer system (pre-match stat scaling: smaller team gets +20–50% HP/damage depending on ratio)
- MMR-adaptive scaling prototype (data-driven AI aggression multipliers in constants.ts, not yet tuned)
- Match composition visible in HUD

**Implements features:**
- Asymmetric team sizes
- MMR-situational adaptive scaling (v1.0 version: basic implementation, full tuning deferred to v1.x)

**Avoids pitfalls:**
- Makes clear that scaling affects AI, not hero power (prevents rubber-banding confusion)
- Exposes scaling as constants so it's auditable and testable

**Success criteria:** 1v3 teams generate successfully, smaller team noticeably stronger per capita, winrate doesn't converge to 50% across MMR tiers (high MMR solo player loses more in 1v3 than low MMR).

---

### Phase 4: Boss System & Objectives (4 weeks)
**Rationale:** Boss is the centerpiece. Tier 1 (spawn, kill mechanics, stat buff drop) is high-complexity but independent. Tier 2 (roaming) requires pathfinding and is the most technically risky; Tier 3 (Sudden Death trigger) is low-complexity once Tier 2 works. Split into Tier 1 this phase, Tier 2/3 in v1.x.

**Delivers:**
- BossEntity class extending BaseEntity
- BossAISystem with phase FSM (3 phases with HP thresholds: Normal → Enraged → Dying)
- Boss Tier 1: spawn, combat, kill detection, revival token drop, stat buff grant
- Boss economy: 3 points per kill on scoring, not dominant strategy yet
- Boss health bar UI with phase visualization
- CombatSystem extensions to handle boss damage (boss is Team.NEUTRAL)

**Implements features:**
- Boss system Tier 1
- Tower system (static damageable entity; destruction = instant win—easier than boss)
- Scoring system (boss kill = 3 pts source)

**Uses architecture:**
- BossEntity extends BaseEntity
- BossAISystem runs in parallel with AIController, 200ms update interval
- EventBus emits BOSS_PHASE_CHANGE for HUD updates

**Avoids pitfalls:**
- Boss economy tested before Tier 2 adds complexity; if "rush boss" is dominant, tuning is isolated
- Tier 2 roaming deferred; team validates Tier 1 first
- Prevents boss-as-super-hero (BossEntity is distinct class, not Hero subclass)

**Success criteria:** Boss spawns, takes damage, reaches phase thresholds and transitions visibly, grants correct rewards on kill, can be damaged by all heroes' abilities, does not instantly kill solo players.

---

### Phase 5: Battle Traits & Dynamic Match Variance (2 weeks)
**Rationale:** Traits hook into the event system built in Phase 2. Single trait per match (no stacking) limits combinatorial explosion. This phase adds replay variance without new heroes/maps.

**Delivers:**
- TraitRegistry with ~8–12 initial traits (stat modifiers, mechanic replacements, rule changes with constraints)
- TraitSystem event-listener hooks
- DraftScene trait selection UI (draft phase shows selected trait for the match)
- Trait incompatibility blacklists in registry (e.g., "blink reset" blacklisted for heroes with dash passives)
- Single trait application per match (enforced in match initialization)

**Implements features:**
- Battle Traits (1 per match)
- Combat event hook architecture (already built in Phase 2; reused here)

**Avoids pitfalls:**
- Categorizes traits (stat/mechanic/rule-change); rule-changes limited to 1 per match
- Incompatibility registry prevents obvious exploits
- Traits selected at draft, not random at match start (player agency)

**Success criteria:** Trait applies correctly to killer/team, no trait breaks a test match through edge case (test at least 5 different trait × hero combinations), incompatible traits filtered from pool.

---

### Phase 6: Neutral Camps & Map Strategy (2 weeks)
**Rationale:** Camps add secondary objective layer and map interaction. NeutralCampSystem reuses BaseEntity (for camp mobs), EventBus, and buff system already in place. Relatively low-complexity once foundation is solid.

**Delivers:**
- NeutralMob entity (extends BaseEntity, simple AI pursuit FSM)
- NeutralCampSystem with spawn timers, buff grants, respawn scheduling
- 4 camp types (Damage, Shield, Haste, Cooldown) with 60s respawn
- Camp spawn positions on arena (arena layout rework with named zones)
- Neutral control scoring: 1 pt per camp clear, visible in kill feed

**Implements features:**
- Neutral buff pickups
- Arena map rework (named zones for boss, towers, camps)

**Uses architecture:**
- NeutralCampSystem listens to HERO_KILLED events, detects camp mobs, schedules respawn
- Camps grant buffs via buff application system (already exists)

**Success criteria:** Camps spawn, have independent respawn timers, buff applies to clearing team, respawn timing is accurate (no accumulation on scene restart), camps visible on map.

---

### Phase 7: Sudden Death & Edge Cases (2 weeks)
**Rationale:** Boss Tier 3 (Sudden Death trigger on third kill) and Sudden Death at 5:00 tie are rare code paths requiring careful state machine. Both depend on MatchStateMachine and respawn system. This phase completes match closure logic.

**Delivers:**
- Boss Tier 3: third kill triggers Sudden Death, no respawns after
- Sudden Death at 5:00 tie: if score tied, transition to SUDDEN_DEATH phase, disable respawns
- Visual/audio signal for Sudden Death onset (screen flash, HUD red border, countdown)
- Comprehensive HUD state display (current match phase, no-respawn warning during SD)
- Unit tests for tie-detection edge cases (4:59, 5:00:000, 5:00:016)

**Implements features:**
- Boss Tier 3 (Sudden Death trigger)
- Sudden Death mode
- Sudden Death at 5:00 tie

**Avoids pitfalls:**
- State machine prevents double-end match or respawn-after-SD bugs
- Visual test ensures timer fires at 5:00, not on next frame
- Automated scenario tests cover boundary timestamps

**Success criteria:** Match never runs past 5:00 + death animations, Sudden Death triggers visually and functionally (no respawns), no race conditions on hero death at exact 5:00:000.

---

### Phase 8 (v1.x): Boss Tier 2 & Advanced AI
**Rationale:** Roaming pathfinding is the highest technical complexity. Deferred to v1.x post-launch validation. Requires NavMesh or waypoint graph, depends on BossEntity stability from Phase 4.

**Delivers:**
- Boss roaming behavior with obstacle-aware pathfinding
- Boss Tier 2 (health threshold) transitions boss from arena-center to roaming the map
- Boss threat escalation (roaming phase increases tension, forces teams to defend/regroup)
- Optional: NavMesh-based pathfinding or waypoint graph fallback
- Optional: Elite camps spawn on boss Tier 2/3 (higher difficulty, better rewards)

**Consider alternatives if timeline pressure:**
- Skip roaming; boss stays center, phases just increase stats/ability frequency
- Pre-compute waypoint routes around obstacles in arena

---

### Phase 9 (v1.x): Draft UI & Pick-from-3
**Rationale:** UI feature, low implementation complexity. Depends on nothing new; ready anytime after Phase 1. Deferred to polish pass if earlier phases consume timeline.

**Delivers:**
- Draft Scene UI rework (shows 3 random heroes per player, one-pick-lock mechanic)
- Trait draft display (shows selected trait name + tooltip)
- Ready status indicator

**Success criteria:** Draft completes in <30s, heroes display correctly, transition to BattleScene passes correct selections.

---

### Phase 10 (v1.x): MMR Adaptive Scaling Deep Tuning
**Rationale:** Phase 3 implements basic structure; this phase tunes via observation data. Only do after playtesting asymmetric matches at scale.

**Delivers:**
- MMR tier thresholds (Bronze/Silver/Gold/Plat/Apex) mapped to AI aggression/coordination curves
- Per-team-size scaling (1v2 gets different curve than 1v4)
- Playtesting data: winrate curves across MMR tiers, confirming skill test (not handicap)

---

## Phase Ordering Rationale

1. **Foundation before features:** EventBus, BaseEntity, MatchStateMachine must be in place before any feature can be built cleanly. These are not user-facing but enable everything else.

2. **Dependency chains:** XP → Ultimates (unlock at level). Respawn → Scoring (respawn unlocks scoring). Traits → Combat hooks (reuse). NeutralCamps → Maps (needs named zones from Phase 4 boss work).

3. **Risk mitigation:**
   - Boss Tier 1 (Phase 4) validates boss economy before Tier 2 complexity
   - Traits (Phase 5) constrained early (incompatibility lists) to prevent explosion
   - Sudden Death (Phase 7) builds on stable MatchStateMachine, not rushed

4. **Playtesting gates:**
   - After Phase 1: verify respawn/timer doesn't crash
   - After Phase 3: verify asymmetry doesn't feel broken/unfair
   - After Phase 4: verify boss isn't dominant strategy
   - After Phase 5: verify traits don't exploit edge cases
   - After Phase 7: verify Sudden Death edge states don't occur

---

## Research Flags

**Phases needing deeper research during planning:**

- **Phase 4 (Boss System):** Roaming pathfinding algorithm choice (NavMesh vs. waypoint graph vs. simple direct-vector movement) requires deeper research if Phase 4 will include Tier 2. Recommend deferring Tier 2 to v1.x to allow experimentation. NavMesh integration with existing obstacle arena is non-trivial.

- **Phase 7 (Sudden Death Edge Cases):** State machine transitions at timestamp boundaries (4:59 vs. 5:00:000) need formal specification before implementation. Recommend writing explicit state transition rules as a mini-specification.

**Phases with standard patterns (skip research):**

- **Phase 1 (Foundation):** EventBus singleton and BaseEntity patterns are established in Phaser docs. No research needed.
- **Phase 2 (Progression):** XP and passive systems are standard MOBA mechanics. Phaser event architecture is well-documented.
- **Phase 3 (Asymmetric Teams):** TeamManager rework is straightforward; stat scaling is basic math. No research needed.
- **Phase 5 (Traits):** Data-driven trait registry is a standard pattern. No research needed.
- **Phase 6 (Neutral Camps):** Camp respawn timers and buff grants are standard. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | MEDIUM | Phaser 3.90 confirmed as final v3 release (HIGH confidence from official news). mistreevous v4.2.0 TypeScript-native confirmed (MEDIUM — last published 8 months ago, active but not recent). phaser3-rex-plugins actively maintained (10K weekly downloads, published 13 days ago—HIGH). Overall: locked core stack is stable; optional libraries are verified but not heavily integrated into community yet. |
| **Features** | MEDIUM | Table stakes (respawn, timer, towers) are well-established MOBA patterns (HIGH). Differentiators (asymmetric team sizes, battle traits, boss tiers) have no direct competitor analog to validate against (LOW). Feature dependencies charted correctly but some cross-system interactions unknown without playtesting (e.g., trait × boss × asymmetry combinations). |
| **Architecture** | HIGH | Current codebase read directly; patterns (BaseEntity, EventBus, MatchStateMachine) are established in Phaser docs and game architecture literature. Build order is logically sound (each step unblocks dependents). No architectural surprises expected. |
| **Pitfalls** | MEDIUM | Critical pitfalls (asymmetric scaling inversion, trait explosion, boss economy) derived from published game design postmortems and academic sources (Game Wisdom, GDC). Phaser-specific pitfalls (scene restart leaks, Container overhead) verified against official GitHub issues and discourse. Recovery strategies are sound but assume proper instrumentation (logging, metrics). |

**Overall confidence: MEDIUM** — Technical stack and architecture are high-confidence; design novelty (asymmetric 1vN + boss + traits in 5 min) requires validation through playtesting. Recommendations are sound but cross-system balance will emerge only during active play.

### Gaps to Address

- **Asymmetric scaling tuning:** Research defined direction (scale AI, not hero power) but exact multipliers unknown. Playtesting required to calibrate by MMR tier. Plan for iterative balance passes.

- **Boss roaming pathfinding:** Research recommends NavMesh but integration complexity with existing arena is uncertain. Recommend prototype in Phase 4 spike (1 week) before committing to Tier 2 in Phase 8.

- **Trait synergy testing:** Research identified combinatorial explosion risk but cannot enumerate all edge cases. Plan for formal trait interaction matrix (trait × ability, trait × passive, trait × boss) in Phase 5 planning.

- **Performance under load:** Research estimates 15 max entities (boss + 2 towers + 4-6 camp mobs + 8 heroes). Recommend FPS profiling in Phase 1 (baseline), Phase 4 (boss added), and Phase 6 (camps added) to confirm no performance cliffs.

- **Player learning curve:** Asymmetry + traits + boss + XP + passives is a lot of systems. Research did not evaluate tutorial/onboarding. Recommend UI/UX spike in Phase 1 to clarify HUD for new players.

---

## Sources

### Primary Research Files

- **STACK.md:** Phaser 3.90, TypeScript 5.7, mistreevous 4.2.0 (behavior tree), phaser3-rex-plugins 1.80.18 (FSM), no new backend dependencies
- **FEATURES.md:** Feature landscape, dependencies, MVP definition, competitor analysis, implementation risk assessment
- **ARCHITECTURE.md:** Current architecture audit, recommended refactoring (EventBus, BaseEntity, MatchStateMachine), 7 architectural patterns, build order, integration points
- **PITFALLS.md:** 6 critical pitfalls with prevention strategies, technical debt patterns, integration gotchas, performance traps, UX pitfalls, recovery strategies

### Secondary Sources (Verification)

- Phaser 3 official documentation: EventBus pattern, Container costs, scene lifecycle
- Game Programming Patterns: State machine patterns, pushdown automata for boss phases
- Game Wisdom / Game Developer: Asymmetric game design, boss battle design, roguelite modifier balance
- MOBA design: Dota 2 Roshan mechanics, LoL Arena mode, Brawl Stars modifiers
- Codebase analysis: Direct reads of `/src/` to verify architecture observations and confirm existing bugs (tickTimer leak, scene restart pattern)

---

*Research synthesized: 2026-02-22*
*Ready for roadmap planning: yes*
