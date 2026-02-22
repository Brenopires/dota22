# Feature Research

**Domain:** Asymmetric hero brawler / arena combat game (MOBA-lite)
**Researched:** 2026-02-22
**Confidence:** MEDIUM — genre patterns drawn from WebSearch + official wikis + direct codebase inspection. Training data corroborated for well-established patterns. Novel Rift Clash-specific combinations (asymmetric team + short cap + boss tiers) have no direct competitor analog to verify against.

---

## Context: What Is Already Shipped

The existing Rift Clash codebase already ships the following (treat as baseline, not scope):

- Hero entity system: HP, mana, stats, buffs, visuals
- 12 heroes with 3 abilities each (Q/W/E — no ultimate, no passive)
- 5 archetypes: TANK, ASSASSIN, MAGE, CARRY, SUPPORT
- Combat system: projectiles, AoE, dashes, buffs (stun, root, slow, DOT, shield, silence)
- AI FSM: IDLE / CHASE / ATTACK / RETREAT / USE_ABILITY with personality profiles
- Draft scene (shows hero cards; pick-from-3-random mechanic not yet done)
- Match flow: Menu → Draft → Battle → Results (ends on player death — no respawn yet)
- MMR/ELO (localStorage, ±40/match, Bronze/Silver/Gold/Platinum/Apex)
- VFX: particles, camera shake
- Arena: procedural obstacles, 2 arena themes, 2 layouts
- HUD: timer, kill feed, ability bar

Everything below describes what is NOT yet built.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any arena brawler. Missing them makes the game feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **5-minute hard match timer** | Short-match games always show a visible countdown; player must never wonder "when does this end?" | LOW | Timer logic + win condition trigger at 0:00. HUD timer widget already exists — needs to actually cap the match. |
| **Respawn system** | Death-as-instant-defeat kills engagement in timed matches; Dota, LoL Arena, Brawl Stars all respawn within the match window | MEDIUM | 10s max respawn timer per spec. Needs: death state, timer countdown, re-spawn at team base. Death must NOT end the match. |
| **Visible scoreboard / kill feed** | Players need to know who is winning at a glance; this is table stakes in every competitive brawler | LOW | Kill feed already exists. Add kill-point counter per team visible at all times (not just on death). |
| **Win condition clarity** | Players must always know: how to win right now. Ambiguous win states cause confusion and abandonment. | LOW | Tower destruction = instant win; scoring fallback at 5:00 must be clearly telegraphed in HUD. |
| **Tower / base objective** | Every arena-to-MOBA game has a structural objective to push toward — without it, the game has no strategic anchor | MEDIUM | Core Tower per team: high HP, passive damage to nearby enemies, disabled by boss kill. Needs map placement, health state, destruction trigger. |
| **Distinct hero archetypes with readable identities** | Players expect heroes to feel different — a tank should feel like a tank, not just a slower assassin | MEDIUM | Archetypes defined (TANK, ASSASSIN, MAGE, CARRY, SUPPORT). Need passives + ultimates to reinforce identity; right now all heroes have same ability structure (Q/W/E) with only value differences distinguishing them. |
| **Ultimate ability (R slot) per hero** | Standard MOBA expectation: 3 basic abilities + 1 high-impact ultimate with long cooldown. The E slot currently acts as "sort-of-ultimate" (long cooldown, high damage) but is structurally a 3rd regular ability. | HIGH | Needs: new ability slot type `ULTIMATE`, longer cooldowns (60–120s), higher impact, locked until level threshold. Requires data schema change in `AbilityDef` and AI reasoning for when to pop R. |
| **Passive ability per hero** | Passive traits give heroes depth without adding button complexity; missing passives make heroes feel mechanically thin | HIGH | Needs: new passive system — always-active effects triggered by events (on-hit, on-kill, on-taking-damage, etc.). No `AbilityType` for PASSIVE exists yet in `types.ts`. Requires event hook architecture. |
| **XP leveling within match** | Players expect to feel progression inside a match — killing enemies, taking objectives should make you stronger | HIGH | XP-only spec (no gold). Needs: XP grant system (kills, boss, objectives), level thresholds, stat scaling per level, HUD XP bar. Currently no in-match leveling exists. |
| **Neutral buff pickups / camps** | Roaming objectives create movement incentives; without them players just slug it out with no map interaction | MEDIUM | 4 neutral camps per spec (Damage, Shield, Haste, Cooldown), respawn every 60s. Needs: map-placed camps, camp state (alive/dead/respawning), pickup logic, buff application. |
| **Pick-from-3 random draft** | Random hero selection is expected in casual arena brawlers to reduce ramp-up and add variance | LOW | Draft scene exists. Currently shows all heroes. Needs: random 3-hero selection per player, one-pick-then-lock mechanic. |

---

### Differentiators (Competitive Advantage)

Features that make Rift Clash distinct. Not generically expected, but they define its identity.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Asymmetric team sizes (e.g., 1v3, 4v1, 2v3)** | The core hook. No mainstream arena brawler ships truly random unequal team sizes as a ranked feature. Brawl Stars, LoL Arena, Dota all use symmetric teams. | HIGH | `TeamManager.getRandomTeamSize()` currently creates equal sizes (NvN). Must generate different sizes per team. MMR scaling must compensate — solo player on a 1v3 must get a harder skill test, not a balanced handicap that removes the pressure. |
| **MMR-situational adaptive scaling** | High-MMR players get harder asymmetric matchups with less scaling help; low-MMR players get gentler introduction. This makes asymmetry feel like a skill test rather than a coin flip. | HIGH | Needs: MMR thresholds → asymmetry table → per-match stat adjustment. E.g., at high MMR: 1v3 means the solo gets minimal stat bonuses. At low MMR: 1v3 gives the solo meaningful survivability boost. |
| **Boss system with 3 kill tiers (Roshan-inspired)** | The boss is the primary objective pivot of each match. Roshan in Dota has the same role — it's the reason teams contest a specific location. 3-tier escalation adds urgency. | HIGH | Kill 1: Revival token (bonus respawn) + stat buff. Kill 2: Damage amplification + boss starts roaming the map (threat escalates). Kill 3: Sudden Death mode triggered (no more respawns). Boss scales in power per minute — progressively harder to solo but more rewarding. Needs: BossEntity class, kill-tier state machine, AI boss behavior, roaming pathfinding (tier 2). |
| **Battle Traits (random per-match modifiers)** | Per-match modifiers dramatically increase replay variance without requiring more heroes or maps. Brawl Stars uses map-permanent modifiers; LoL Arena uses per-round augments. Rift Clash's battle traits are one random modifier for the whole match, making each game feel unique. | MEDIUM | Examples from spec: double stun duration, lifesteal converts to shield, spell burn (abilities deal partial HP damage), blink reset on kill, all abilities cost no mana. Needs: TraitRegistry, random selection at match start, trait effect system that hooks into combat events. |
| **Sudden Death mode** | Creates a hard climax after boss kill 3 or 5:00 tie. No respawns = every action has maximum consequence. Creates memorable moments. | MEDIUM | Triggered by boss tier 3 kill OR score tie at 5:00. Needs: mode flag, respawn system disabled, visual signal (HUD change, screen effect). Sudden Death itself is low complexity — it's the trigger conditions that need care. |
| **Random Gem power-up (one per match)** | A single map-placed power-up item that has a unique effect each match (not static). Adds a secondary contest point beyond the boss. Low complexity, high moment-to-moment value. | MEDIUM | Needs: GemRegistry (pool of gem effects), random selection per match, map spawn point, pickup logic, effect application. Different from neutral camps — this is one unique item, not recurring resource nodes. |
| **Scoring as tie-break not primary win** | Most arena games make scoring the primary win condition; Rift Clash makes tower destruction the primary win and scoring the fallback. This keeps aggression incentivized without making kills the only thing that matters. | LOW | Scoring table: kill=1pt, boss kill=3pt, tower damage threshold=2pt, neutral control=1pt. Score evaluated only at 5:00 if no tower is destroyed. Needs: score tracking system, per-event grant logic. |
| **Archetype-based passive abilities** | Rather than generic stats, passives reinforce each hero's archetype identity. A TANK passive is about damage mitigation. An ASSASSIN passive fires on first-strike. This makes heroes more distinct with minimal button overhead. | HIGH | Examples: TANK — reduces damage when below 30% HP. ASSASSIN — first hit after being unseen deals bonus damage. MAGE — spell hits stack and explode on 3rd hit. CARRY — attacks gain speed as HP drops. SUPPORT — ally kills grant the support a heal. Requires event hook system. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but actively harm Rift Clash's core design, scope, or identity.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Item shop / gold system** | Every Dota-inspired game has it; players may expect farming | Farming removes the "pure skill test" identity. Gold creates snowball loops that make a 1v3 mathematically unwinnable regardless of skill. Also requires 10x more balance work. | XP-only leveling + random gem pickup. Progression without farming. |
| **Creep / minion waves** | MOBAs have creeps; feels like missing content | Waves require lane structure, which contradicts the arena-only design. Creeps with asymmetric team sizes create chaotic math (who last-hits? do AI teammates farm?). Adds scope without serving the 5-minute format. | Neutral camps serve the "bonus objective" role without waves or lanes. |
| **Balanced symmetric team matchmaking** | Seems "fairer"; players conditioned by LoL/Dota to expect 5v5 | Symmetric teams eliminate the core differentiator. If asymmetry is the hook, forcing symmetry kills the concept. | MMR-situational scaling ensures asymmetry feels like a test, not a punishment. |
| **Full hero ban/pick draft** | Competitive MOBAs have banning phases; feels more "esports" | In a 5-minute casual AI-only game, a full ban phase adds 3–5 minutes of pre-game overhead that exceeds the match itself. Kills session pacing. | Pick-from-3 random offers variance without overhead. Bans can be a future ranked feature. |
| **Surrender vote** | Players who fall behind may want to quit | 5-minute matches are their own surrender mechanic — just wait it out. Adding surrender removes the tension of Sudden Death and late-game comebacks. | Hard match timer cap (5 min) IS the surrender system. |
| **Multiple random modifiers per match** | "More is better"; roguelite games often stack modifiers | Multiple conflicting modifiers create unpredictable interaction explosions that are nearly impossible to balance and can feel arbitrary rather than skilled. Brawl Stars limits active modifiers per mode for the same reason. | Single Battle Trait per match. One clear modifier = learnable, strategizable. |
| **Visible enemy stats / abilities before match** | Transparency feels fair | In asymmetric matchups, knowing enemy full stats in advance enables pure math optimization, not adaptation. Part of the skill test is reading your opponent in real-time. | Kill feed + visual feedback during combat communicate enemy strength implicitly. |
| **Multiplayer / networking** | Online play feels like the natural next step | Adds 10–20x implementation scope to a browser game. AI-only v1 lets the team focus on making asymmetry feel good before adding network variance. | AI personality profiles already create behavioral variance. Network multiplayer is explicitly v2. |

---

## Feature Dependencies

```
[XP Leveling System]
    └──requires──> [Death / Respawn System]
                       └──requires──> [Match Timer (non-death-ending)]

[Ultimate Ability (R)]
    └──requires──> [XP Leveling System] (unlocked at level threshold)
    └──requires──> [AbilityDef schema extension] (new slot type)

[Passive Ability System]
    └──requires──> [Combat Event Hook Architecture]
                       (on-hit, on-kill, on-damage-taken events)

[Boss System — Kill Tier 2 (Roaming)]
    └──requires──> [Boss Kill Tier 1 working]
    └──requires──> [Boss pathfinding / AI behavior]

[Boss System — Kill Tier 3 (Sudden Death)]
    └──requires──> [Boss Kill Tier 2 working]
    └──requires──> [Sudden Death mode flag]
    └──requires──> [Respawn System] (to disable it)

[Sudden Death via Tie at 5:00]
    └──requires──> [Scoring System]
    └──requires──> [Match Timer]
    └──requires──> [Respawn System] (to disable it)

[Battle Traits]
    └──requires──> [Combat Event Hook Architecture] (for trait effects)
    └──requires──> [Match initialization flow] (trait selected at match start)

[Asymmetric Team Sizes]
    └──requires──> [TeamManager rework] (different sizes per team)
    └──enhances──> [MMR Adaptive Scaling] (scaling makes asymmetry meaningful)

[MMR Adaptive Scaling]
    └──requires──> [Asymmetric Team Sizes] (without asymmetry, scaling has nothing to scale)
    └──requires──> [PlayerData.mmr] (already exists in localStorage)

[Scoring System]
    └──requires──> [Boss System] (boss kill = 3pt source)
    └──requires──> [Neutral Camps] (neutral control = 1pt source)
    └──requires──> [Tower System] (tower damage threshold = 2pt source)

[Tower System]
    └──requires──> [Arena map rework] (towers need fixed positions)
    └──enhances──> [Boss System] (boss kill 1 disables tower)

[Neutral Camps]
    └──requires──> [Arena map rework] (camps need fixed spawn positions)
    └──requires──> [Buff Application System] (camp pickup applies buff to hero)

[Random Gem]
    └──requires──> [Arena map rework] (gem needs a map spawn point)
    └──requires──> [Buff Application System]

[Pick-from-3 Draft]
    └──requires──> [Draft Scene rework] (random 3 selection + one-pick-lock)
```

### Dependency Notes

- **Respawn System is the keystone dependency**: Almost everything else (boss tiers, scoring, XP, Sudden Death) assumes heroes can respawn. The current "death = match over" must be changed first before any other feature is meaningful.
- **Combat Event Hooks unlock two major systems**: Both passives AND battle traits need the ability to react to combat events (on-hit, on-kill, on-damage-taken). Building this hook architecture once enables both features without duplication.
- **Arena map rework is a shared prerequisite**: Towers, neutral camps, boss spawn area, and gem spawn all require fixed strategic positions on the map. The current arena (random obstacles) must evolve to have named zones.
- **Boss System tiers are sequential**: Tier 3 cannot be built before Tier 2, which cannot be built before Tier 1. The roaming AI behavior (Tier 2) is the most technically complex — pathfinding a large entity around obstacles and toward contested areas.
- **AbilityDef schema must be extended before ultimates can be implemented**: The `slot` field is currently typed as `'Q' | 'W' | 'E'`. Adding `'R'` requires schema change + AI ability selection logic update + HUD slot update.

---

## MVP Definition

### Launch With (v1) — The Milestone

Minimum feature set to make the new milestone's concept testable and feel complete.

- [x] **Respawn system (max 10s timer)** — Without this, nothing else works. Death-as-instant-defeat must be replaced.
- [x] **5-minute hard timer with scoring fallback** — Match must end at 5:00 with a winner via score.
- [x] **Asymmetric team sizes (different sizes per team)** — Core differentiator. TeamManager rework.
- [x] **Tower per team (destruction = instant win)** — Structural objective giving matches direction.
- [x] **Boss system — Tier 1 (spawn + kill + revival token drop + stat buff)** — Minimum viable boss. Roaming and Sudden Death can come in v1.x.
- [x] **Scoring system (kills, boss, objectives)** — Required for 5:00 tie resolution.
- [x] **Ultimate ability (R slot) per hero** — Without ultimates, the "6-10 heroes with 5 abilities" spec is incomplete. This is the largest single task.
- [x] **Passive ability per hero** — Required for archetype identity. Needs combat event hooks.
- [x] **XP leveling within match** — Required for ultimates to have a meaningful unlock gate.
- [x] **Pick-from-3 random draft** — Low complexity, high perceived quality.
- [x] **Battle Traits (1 per match)** — Core differentiator. Select at match start, apply through event hooks.

### Add After Validation (v1.x)

Features to add once the core loop is confirmed working and fun.

- [ ] **Boss Tier 2 — roaming behavior** — Complex AI pathfinding for roaming boss. Add after Tier 1 is stable.
- [ ] **Boss Tier 3 — Sudden Death trigger** — Depends on Tier 2. Add after Tier 2 confirmed.
- [ ] **Sudden Death at 5:00 tie** — Depends on Tier 3 trigger or can be standalone via timer.
- [ ] **Neutral camps (4 types, 60s respawn)** — Enhances map interaction. Not required for core loop validation.
- [ ] **Random Gem power-up** — Single-item contest point. Enhances, not required.
- [ ] **MMR-situational adaptive scaling** — Refines asymmetry. Requires observing actual asymmetric match feel first to calibrate scaling values.
- [ ] **Arena map rework with named zones** — Boss area, tower positions, camp positions. Can be done iteratively.

### Future Consideration (v2+)

- [ ] **Online multiplayer** — Explicit v2 scope. Requires networking infrastructure.
- [ ] **Full hero ban/pick draft** — Only makes sense once hero pool exceeds 15.
- [ ] **Replay system** — Requires match serialization infrastructure.
- [ ] **Spectator / observer mode** — Requires multiplayer first.
- [ ] **Additional hero archetypes** — Once 6-10 are shipped and balanced.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Respawn system | HIGH | MEDIUM | P1 |
| 5-minute timer + scoring fallback | HIGH | LOW | P1 |
| Tower system | HIGH | MEDIUM | P1 |
| Asymmetric team sizes (TeamManager rework) | HIGH | MEDIUM | P1 |
| Ultimate ability (R) per hero | HIGH | HIGH | P1 |
| Passive ability per hero | HIGH | HIGH | P1 |
| XP leveling within match | HIGH | HIGH | P1 |
| Battle Traits (1 per match) | HIGH | MEDIUM | P1 |
| Pick-from-3 draft | MEDIUM | LOW | P1 |
| Boss system — Tier 1 | HIGH | HIGH | P1 |
| Combat event hook architecture | HIGH | MEDIUM | P1 — enabler for passives + traits |
| Arena map rework (named zones) | MEDIUM | MEDIUM | P2 |
| Boss system — Tier 2 (roaming) | HIGH | HIGH | P2 |
| Boss system — Tier 3 (Sudden Death) | MEDIUM | LOW | P2 |
| Neutral camps (4 types) | MEDIUM | MEDIUM | P2 |
| Random Gem | MEDIUM | LOW | P2 |
| Sudden Death at 5:00 tie | MEDIUM | LOW | P2 |
| MMR adaptive scaling | MEDIUM | HIGH | P2 |

**Priority key:**
- P1: Must have for this milestone's launch
- P2: Should have, add when core loop validated
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Research note: No direct competitor ships all of: asymmetric team sizes + boss kill tiers + random match trait + short timer + XP-only + AI-only in one package. Analysis draws from closest analogs.

| Feature | Dota 2 (Roshan) | LoL Arena (2v2v2v2) | Brawl Stars | Rift Clash Approach |
|---------|-----------------|---------------------|-------------|---------------------|
| Match length | 25–60 min | 15–20 min | 2–3 min | 5 min hard cap |
| Team size | 5v5 symmetric | 2v2 symmetric | 3v3 / 1v1 symmetric | Random asymmetric (1v1 to 5v5, different sizes) |
| Boss objective | Roshan (3 kill tiers, Aegis = extra life) | No boss | No boss | Roshan-inspired, 3 kill tiers |
| Match modifiers | None (Turbo mode toggle) | Augments picked per round | Map-permanent modifiers (~24 types) | 1 Battle Trait per match (random) |
| Progression in match | Gold + items + XP + levels | Gold + items + levels | No in-match progression | XP + levels only |
| Draft | Full ban/pick draft | No draft (random assigned) | No draft (player selects before) | Pick-from-3 random |
| Win condition | Tower destruction (Ancient) | Last team standing | Mode-specific (gem grab, brawl ball, etc.) | Tower destruction OR scoring at 5:00 |
| Scoring | No points; single elimination | Team health (HP) | Mode-specific score | Kill/boss/objective points |
| Neutral buffs | Red/Blue buff camps, Shrines | No neutral camps | No neutral camps | 4 buff camps (Damage/Shield/Haste/Cooldown) |
| Ability structure | Q/W/E/R + passive | Q/W/E/R + passive | 1 attack + 1 super + gadget/star power | Q/W/E/R + passive |
| AI players | No | No | No (PvP only) | All AI in v1 |

**Key insight (MEDIUM confidence):** The closest mechanical analog to Rift Clash's core loop is Dota 2's turbo mode (shorter games, same objectives) crossed with Brawl Stars' modifier variety — but neither has truly asymmetric team sizes as a competitive ranked feature. This is the genuine white space Rift Clash occupies.

---

## Hero Ability Design Notes

### Current State (12 heroes, 3 abilities each)

All 12 heroes use Q/W/E slots. The `E` slot acts as a de facto ultimate (30s cooldown, highest damage) but is structurally treated as a regular ability. This creates:
- No ability feel difference between Q/W/E
- AI uses all 3 identically (no "save ultimate" behavior)
- Heroes feel mechanically thin despite numerical differences

### Required: 5-ability structure (Q/W/E/R + Passive)

**Q/W** — Low cooldown, low-medium impact. Core toolkit. (Already exists for all heroes.)
**E** — Medium cooldown, setup or sustained threat. (Already exists; keep as-is but reduce to be less "final")
**R (Ultimate)** — Long cooldown (60–120s), unlocked at a level threshold, defines the hero's moment-of-power. Must be high-impact enough that players notice when an enemy ults.
**Passive** — Always active. Fires on event triggers. No button press. Reinforces archetype identity.

### Ultimate Design Principles (MEDIUM confidence, from MOBA documentation)

- Ultimates should have a **clear, readable effect** — players need to know what just hit them
- Ultimates should **synergize with the hero's other abilities**, not exist in isolation
- Ultimates can be passive (always-on power scaling) but most effective ones are active with meaningful timing windows
- Long cooldown (60–120s in a 5-minute match means 2–4 uses max) makes each use a moment
- AI must have a "save ultimate for good moment" behavior, not fire it randomly

### Passive Design Principles (MEDIUM confidence)

- Passives must be **visible feedback** — player should see when a passive triggers (VFX flash, number pop)
- Passives should NOT be so powerful that they feel mandatory to build around (avoid "passive is the whole hero")
- Best passives reward **playing to the hero's archetype** — e.g., ASSASSIN passive fires when you go in first, SUPPORT passive fires when an ally dies nearby
- Passives that proc on combat events require the event hook system; passives that are stat multipliers are simpler (implement those first)

### Suggested Passive Archetypes by Hero Role

| Archetype | Passive Type | Trigger | Example Effect |
|-----------|-------------|---------|----------------|
| TANK | Damage mitigation | Taking damage below 30% HP | 20% damage reduction when low HP |
| ASSASSIN | Burst amplifier | First attack after 2s of no combat | +50% damage on first hit |
| MAGE | Spell stacking | Each ability hit on same target | 3rd hit on same target deals bonus magic burst |
| CARRY | Momentum | Each auto-attack hit | Attack speed increases stacking up to 5x |
| SUPPORT | Altruism | Nearby ally dies | Gain 30% HP instantly |

---

## Implementation Risk Assessment

| Feature | Risk Level | Primary Risk | Mitigation |
|---------|------------|-------------|------------|
| Respawn system | LOW | Touches match flow | Replace instant-defeat with death state machine |
| Ultimate ability (R) | HIGH | Schema change + AI update + HUD change | Design one hero's ultimate first; validate the full chain before batch-implementing all 12 |
| Passive system | HIGH | Event hook architecture is a new system | Build event bus / hook registry first; plug in one passive to validate |
| Boss system Tier 1 | HIGH | New entity type, kill-tier state machine | Implement as a single-state boss first (no roaming, no tiers) then add tiers |
| Boss system Tier 2 (roaming) | VERY HIGH | Pathfinding a large entity around obstacles | May need NavMesh or waypoint graph; most technically risky feature in the milestone |
| Asymmetric team sizes | MEDIUM | Scoring/MMR fairness with different sizes | Defer MMR adaptive scaling to v1.x; ship asymmetric sizes with existing flat MMR first |
| Battle Traits | MEDIUM | Interaction conflicts between traits | Enforce single trait per match (never stack); test trait × boss + trait × asymmetry combinations |
| XP leveling | MEDIUM | Balancing XP rates with 5-min timer | Use fixed milestones (kill = 50 XP, boss = 150 XP, objective = 100 XP) not curve-based |

---

## Sources

- Dota 2 Roshan mechanics and kill tiers: [Dota 2 Wiki — Roshan/Changelogs](https://dota2.fandom.com/wiki/Roshan/Changelogs), [Hawk Live — Patch 7.37 Roshan changes](https://hawk.live/posts/dota-2-roshan-patch-737) (MEDIUM confidence — wiki-sourced)
- LoL Arena mode (augment system, round structure, XP/leveling): [LoL Arena Wiki](https://wiki.leagueoflegends.com/en-us/Arena), [Dexerto — Season 2024 Arena overhaul](https://www.dexerto.com/league-of-legends/league-of-legends-gets-massive-arena-mode-overhaul-in-season-2024-2460429/) (MEDIUM confidence — official wiki)
- Brawl Stars match modifiers: [Brawl Stars Fandom Wiki — Modifiers](https://brawlstars.fandom.com/wiki/Modifiers) (MEDIUM confidence — wiki-sourced)
- Brawl Stars game modes and win conditions: [Gameflip — Game Modes](https://gameflip.com/en/blog/brawl-stars-game-modes-explained-how-to-win-in-each-onebrawl-stars-game-modes-explained-how-to-win-in-each-one) (LOW confidence — third-party)
- MOBA ability design: [Dota 2 Fandom — Abilities](https://dota2.fandom.com/wiki/Abilities), [Liquipedia — Dota 2 Abilities](https://liquipedia.net/dota2/Abilities) (MEDIUM confidence)
- Asymmetric game design principles: [Game-Wisdom — Asymmetrical Game Design](https://game-wisdom.com/critical/asymmetrical-game-design), [VU.nl — Asymmetric Abilities pattern](https://www.cs.vu.nl/~eliens/mma/media/pattern-asymmetricabilities.html) (LOW confidence — design articles)
- Matchmaking and MMR: [League of Legends — Matchmaking in 2024](https://www.leagueoflegends.com/en-us/news/dev/dev-matchmaking-in-2024/) (MEDIUM confidence — official)
- Game loop design: [Meshy — Game Loop Fundamentals 2025](https://www.meshy.ai/blog/game-loop) (LOW confidence)
- Existing codebase: Direct inspection of `/Users/brenopires/Projetos/games/dota22/src/` — `types.ts`, `heroes/heroData.ts`, `systems/TeamManager.ts`, `systems/MatchOrchestrator.ts`, `.planning/PROJECT.md` (HIGH confidence — ground truth)

---
*Feature research for: Asymmetric Hero Brawler / Arena Combat (Rift Clash)*
*Researched: 2026-02-22*
