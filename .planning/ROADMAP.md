# Roadmap: Rift Clash

## Overview

Rift Clash evolves from a working arena brawler into a competitive asymmetric hero brawler with 5-minute matches, a boss economy, team size randomization, and battle modifiers. The build order follows hard dependencies: the event bus and state machine unblock everything; respawn replaces the current instant-defeat behavior; hero identity (ultimates, passives, XP) and team balancing ship before objectives; the boss and tower systems share the same phase because towers require BaseEntity too; battle traits reuse the combat event hooks built for passives; neutral camps finalize the map; Sudden Death and full scoring close the match loop; draft UI and ranked tiers polish the surrounding flow.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - EventBus, BaseEntity, MatchStateMachine, respawn, and 5-minute match timer
- [x] **Phase 2: Hero Identity** - Hero roster (6-10), ultimates, passives, XP leveling, combat event hooks
- [x] **Phase 3: Asymmetric Teams** - Random team sizes, MMR-adaptive scaling, AI target distribution
- [x] **Phase 4: Boss & Towers** - BossEntity (Tier 1), multi-phase boss AI, tower entities with destruction win
- [ ] **Phase 5: Battle Traits & Gems** - TraitRegistry, per-match trait assignment, random Gem power-ups
- [ ] **Phase 6: Neutral Camps & Arena** - 4 camp types, 60s respawn, buff grants, arena zone layout
- [ ] **Phase 7: Scoring & Sudden Death** - Full scoring system, Boss Tier 2/3, Sudden Death at 5:00 and via boss Tier 3
- [ ] **Phase 8: Draft & Ranked** - Pick-from-3 draft UI, rank tier ladder, ±40 MMR shifts

---

## Phase Details

### Phase 1: Foundation

**Goal:** The match runs for a full 5 minutes with visible time, heroes respawn after death, and match state transitions cleanly through a formal state machine.

**Depends on:** Nothing (first phase). Replaces the existing "death = match over" behavior.

**Requirements:** FLOW-01, FLOW-02, FLOW-04a

**Success Criteria** (what must be TRUE):
1. A match runs for exactly 5 minutes without crashing — the countdown timer is visible and accurate throughout.
2. When a hero dies, a respawn timer (max 10 seconds) counts down and the hero re-enters combat at their team's spawn point.
3. The match progresses through PRE_MATCH → ACTIVE → ENDED states with no invalid transitions.
4. On "Play Again," no timers from the previous match carry over — respawn timers, tick handlers, and event listeners are fully cleaned up.

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md — EventBus singleton + IBattleScene interface + MatchPhase enum
- [x] 01-02-PLAN.md — BaseEntity abstract class + Hero refactored to extend it
- [x] 01-03-PLAN.md — MatchStateMachine (PRE_MATCH → ACTIVE → ENDED) + BattleScene integration + timer cleanup
- [x] 01-04-PLAN.md — Respawn system (5s timer, spawn-point re-entry, replaces instant-defeat)
- [x] 01-05-PLAN.md — 5-minute countdown HUD (MM:SS format) + player respawn overlay

---

### Phase 2: Hero Identity

**Goal:** Every hero in the roster has a complete ability set (Q/W/E/R + passive), gains XP during the match, levels up with stat increases, and each hero feels mechanically distinct.

**Depends on:** Phase 1 (BaseEntity, EventBus — passives hook into combat events)

**Requirements:** HERO-01, HERO-02, HERO-03, HERO-04

**Success Criteria** (what must be TRUE):
1. At least 6 heroes are selectable, each with a clearly different combat role (burst, sustain, tank, mobility, etc.).
2. Every hero has a functional R-slot ultimate with 60–120s cooldown that creates a high-impact moment.
3. Every hero has a passive ability that visibly triggers (VFX feedback) on its condition (e.g., on-kill, on-damage-taken).
4. An XP bar is visible in the HUD; heroes reach level 5+ in a typical 5-minute match and stats visibly increase on level-up.
5. Combat event hooks (on-hit, on-kill, on-damage-taken) fire correctly and passives respond to them.

**Plans:** 6 plans

Plans:
- [x] 02-01-PLAN.md — Type foundation: AbilityDef R slot, PassiveDef interface, HERO_HIT/DAMAGE_TAKEN/HERO_LEVELED_UP events + emissions
- [x] 02-02-PLAN.md — R-slot ultimates for all 13 heroes + abilityCooldowns[4] + R key input + AI ultimate logic
- [x] 02-03-PLAN.md — XPSystem (50 XP/kill, level thresholds, stat scaling) + Hero gainXP()/levelUp() + level-up VFX
- [x] 02-04-PLAN.md — Passive definitions for all 13 heroes + Hero passive subscription lifecycle + destroy() cleanup
- [x] 02-05-PLAN.md — HUD XP bar + level display + AbilityBar 4-slot layout with gold R slot
- [x] 02-06-PLAN.md — Human verification checkpoint (all 5 success criteria confirmed in live gameplay)

---

### Phase 3: Asymmetric Teams

**Goal:** Each match generates a random, uneven team composition; the smaller or solo team receives MMR-calibrated scaling; AI teammates do not all focus the same target.

**Depends on:** Phase 1 (MatchStateMachine, EventBus), Phase 2 (hero roster exists)

**Requirements:** ASYM-01, ASYM-02, ASYM-03

**Success Criteria** (what must be TRUE):
1. Team sizes vary across matches — 1v1, 2v3, 4v1, and other asymmetric compositions are generated randomly and shown in the HUD.
2. The solo or smaller team has visibly higher per-hero stats (HP, damage) that scale with the team size ratio.
3. At high MMR, the scaling advantage shrinks — a high-MMR solo player in a 1v3 gets less help than a low-MMR player in the same composition.
4. In a 3v1 scenario, AI teammates do not all target the same solo player simultaneously — at least two different targets are engaged across the team.

**Plans:** 5 plans

Plans:
- [x] 03-01-PLAN.md — TeamManager asymmetric generation (1–5 per side); MatchOrchestrator MatchConfig type; ArenaGenerator 5 spawn points
- [x] 03-02-PLAN.md — TeamBalancer (TEAM_BALANCE constants; computeMultiplier; applyToStats; BattleScene spawn wiring)
- [x] 03-03-PLAN.md — MMR-adaptive AI profiles (MMR_TIERS; applyMMRModifiers; enemy-only application in BattleScene)
- [x] 03-04-PLAN.md — AI target distribution (targetCountMap; focus penalty; jitter in selectTarget)
- [x] 03-05-PLAN.md — Team composition HUD banner + MATCH_COMPOSITION_SET event + human verification

---

### Phase 4: Boss & Towers

**Goal:** A central boss spawns at match start, scales per minute, can be killed for team-wide rewards, transitions through health-based combat phases, and can disable towers; each team has a damageable tower that ends the match if destroyed.

**Depends on:** Phase 1 (BaseEntity — Boss and Tower extend it), Phase 2 (combat events for boss interactions)

**Requirements:** BOSS-01, BOSS-02, BOSS-05, TOWR-01, TOWR-02, TOWR-03, TOWR-04

**Success Criteria** (what must be TRUE):
1. The boss spawns at match start, its power visibly increases each minute, and it engages heroes that come near it.
2. The boss transitions through at least 3 combat phases (Normal → Enraged → Dying) with visually distinct attack patterns at each threshold.
3. Killing the boss (Tier 1) grants all heroes on the killing team a stat buff and places a revival token that can prevent the next death.
4. Each team has a Core Tower that damages nearby enemies, slowly regenerates HP when not under fire, and is disabled temporarily after the boss is killed.
5. Destroying the enemy Core Tower immediately ends the match with a victory screen.

**Plans:** 6 plans

Plans:
- [x] 04-01-PLAN.md — Type foundation (Team.NEUTRAL, BossPhase enum, events, constants) + BossEntity class
- [x] 04-02-PLAN.md — TowerEntity class (AoE attack, out-of-combat regen, disable mechanic)
- [x] 04-03-PLAN.md — BossAISystem (aggro FSM, phase-based attacks) + BattleScene boss/tower integration
- [x] 04-04-PLAN.md — Boss kill rewards (revival token, stat buff, tower disable) + tower destruction win condition
- [x] 04-05-PLAN.md — Boss health bar UI + tower status HUD indicators
- [x] 04-06-PLAN.md — Human verification checkpoint (all 5 success criteria confirmed in live gameplay)

---

### Phase 5: Battle Traits & Gems

**Goal:** Every match has one randomly assigned Battle Trait that modifies combat rules for all heroes, and each hero starts with a randomly assigned Gem power-up; neither breaks matches through combinatorial exploits.

**Depends on:** Phase 2 (combat event hooks — traits subscribe to on-hit, on-kill, on-damage-taken)

**Requirements:** HERO-05, HERO-06

**Success Criteria** (what must be TRUE):
1. A Battle Trait is randomly selected at match start and displayed in the draft scene and HUD — the trait's effect is visible during play.
2. Each hero starts the match with a Gem that provides a distinct stat or ability modifier; the Gem's effect is shown in the ability bar or stat panel.
3. At least 8 Battle Traits are implemented covering stat, mechanic, and rule-change categories; rule-change traits are capped at 1 per match.
4. No combination of trait + hero passive + Gem breaks a test match (eliminates core constraints like respawn, mana, or cooldown in under 2 minutes).

**Plans:** TBD

Plans:
- [ ] 05-01: TraitRegistry (8-12 initial traits; stat / mechanic / rule-change categories; incompatibility blacklists)
- [ ] 05-02: TraitSystem (event-listener hooks into EventBus; single trait per match enforced at init)
- [ ] 05-03: Random Gem system (GemRegistry; random assignment at match start; modifier applied to hero stats or ability)
- [ ] 05-04: Draft scene trait display (selected trait name + tooltip shown before match)
- [ ] 05-05: Trait + Gem HUD indicators (visible during match)

---

### Phase 6: Neutral Camps & Arena

**Goal:** Four neutral buff camps occupy named positions on the arena; they respawn every 60 seconds; killing a camp grants a 30-second team buff and awards scoring points; the arena has clear strategic zones.

**Depends on:** Phase 1 (BaseEntity for NeutralMob, EventBus, timer cleanup), Phase 4 (boss zone established; arena layout reference)

**Requirements:** CAMP-01, CAMP-02, CAMP-03

**Success Criteria** (what must be TRUE):
1. Four camp types (Damage, Shield, Haste, Cooldown) are visible on the arena in named strategic positions.
2. After a camp is cleared, it respawns exactly 60 seconds later with no timer accumulation across match restarts.
3. Clearing a camp grants every hero on the killing team a 30-second buff matching the camp type; the buff icon appears in the HUD.
4. Neutral camp clears contribute 1 point per camp to the scoring system and appear in the kill feed.

**Plans:** TBD

Plans:
- [ ] 06-01: Arena zone rework (named zones: boss area, tower positions, N/S/E/W camp positions)
- [ ] 06-02: NeutralMob entity (extends BaseEntity; simple pursuit FSM; scales with minute)
- [ ] 06-03: NeutralCampSystem (4 camp types; spawn/respawn scheduling; buff grant on kill)
- [ ] 06-04: Camp buff integration (30s team buff per camp type; HUD buff icons)
- [ ] 06-05: Camp scoring integration (1pt per clear; kill feed notification)

---

### Phase 7: Scoring & Sudden Death

**Goal:** The match tracks a full score across all objective types; Boss Tier 2 and Tier 3 are functional; a Sudden Death mode activates at 5:00 if tied or on the third boss kill, disabling respawns.

**Depends on:** Phase 1 (MatchStateMachine adds SUDDEN_DEATH state), Phase 4 (Boss Tier 1 validated), Phase 6 (neutral camp scoring in place)

**Requirements:** FLOW-03, FLOW-04b, FLOW-05, FLOW-06, BOSS-03, BOSS-04

**Success Criteria** (what must be TRUE):
1. The HUD shows a live score for both teams tracking kills (1pt), boss kills (3pt), tower damage thresholds (2pt), and neutral camp control (1pt).
2. If the score is tied at 5:00, the match transitions to Sudden Death — respawns are disabled, the screen flashes red, and the HUD shows "SUDDEN DEATH."
3. The third boss kill triggers Sudden Death immediately, regardless of the timer.
4. The second boss kill grants the killing team a permanent damage amplification buff and the boss begins roaming the map (obstacle-aware movement).
5. The match never runs past 5:00 plus pending death animations — no race conditions at the 5:00:000 boundary.

**Plans:** TBD

Plans:
- [ ] 07-01: Full scoring system (kill + boss + tower threshold + neutral control tracking; live HUD scoreboard)
- [ ] 07-02: Tower damage threshold scoring (2pt trigger at damage percentage; visual cue)
- [ ] 07-03: Boss Tier 2 (second kill: damage amp buff + roaming movement with obstacle avoidance)
- [ ] 07-04: Boss Tier 3 + Sudden Death trigger (third boss kill → SUDDEN_DEATH state)
- [ ] 07-05: Sudden Death at 5:00 tie (state machine timer fires at 5:00; disables respawn before processing deaths)
- [ ] 07-06: Sudden Death HUD (screen flash, red border, "SUDDEN DEATH" text, no-respawn warning)

---

### Phase 8: Draft & Ranked

**Goal:** Players pick from 3 randomly presented heroes before each match; rank tiers display correctly; MMR shifts ±40 per match for fast ladder movement.

**Depends on:** Phase 2 (hero roster complete), Phase 7 (full match scoring determines MMR result)

**Requirements:** DRFT-01, RANK-01, RANK-02

**Success Criteria** (what must be TRUE):
1. The draft scene presents exactly 3 random heroes; the player picks one and that hero is used in the match.
2. After each match, MMR changes by exactly ±40 points.
3. The player's current rank tier (Bronze, Silver, Gold, Platinum, Apex) is visible in the main menu and results screen based on their MMR.
4. The draft completes and transitions to BattleScene in under 30 seconds, passing the correct hero and trait selection.

**Plans:** TBD

Plans:
- [ ] 08-01: Pick-from-3 draft UI (3 random hero cards; one-pick-lock; countdown to auto-pick)
- [ ] 08-02: Rank tier system (Bronze / Silver / Gold / Platinum / Apex MMR thresholds)
- [ ] 08-03: ±40 MMR shift enforcement (post-match calculation; results screen MMR delta display)
- [ ] 08-04: Rank display (menu + results screen; tier badge with current MMR)

---

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete | 2026-02-23 |
| 2. Hero Identity | 6/6 | Complete | 2026-02-23 |
| 3. Asymmetric Teams | 5/5 | Complete | 2026-02-22 |
| 4. Boss & Towers | 6/6 | Complete | 2026-02-23 |
| 5. Battle Traits & Gems | 0/5 | Not started | - |
| 6. Neutral Camps & Arena | 0/5 | Not started | - |
| 7. Scoring & Sudden Death | 0/6 | Not started | - |
| 8. Draft & Ranked | 0/4 | Not started | - |
