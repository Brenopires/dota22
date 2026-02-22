# Pitfalls Research

**Domain:** Asymmetric hero brawler — short-match arena combat (Phaser 3 + TypeScript)
**Researched:** 2026-02-22
**Confidence:** MEDIUM — domain design pitfalls from multiple sources; Phaser-specific pitfalls verified with official discourse and GitHub issues

---

## Critical Pitfalls

### Pitfall 1: Asymmetric Scaling Invalidation — Helping High-MMR Players Instead of Challenging Them

**What goes wrong:**
MMR-situational scaling logic unintentionally gives powerful AI allies or reduced enemy AI quality to high-MMR solo players in 1v3/1v4/1v5 configurations. The intent ("scale difficulty by MMR") inverts: high MMR solo player gets easier opponents rather than harder ones, making asymmetry feel like a handicap system instead of a skill test. Players notice when winrates converge regardless of skill level — the game feels rigged rather than rewarding.

**Why it happens:**
Developers conflate "balance the asymmetry" with "make the game feel fair." The Rift Clash design pillar explicitly rejects fairness — at high MMR, 1v3 should be hard but possible through outplay. Adaptive scaling that reduces enemy AI aggression or gives better allies is rubber-banding in disguise. Dead by Daylight fell into this exact trap: at high MMR, solo killers dominated novice teams, but at mid-MMR expert survivors with coordinated play made the 1v4 feel impossible — the scaling never correctly addressed the real problem (team coordination, not individual skill).

**How to avoid:**
- Define scaling direction explicitly: high MMR = enemy AI aggression/coordination increases, NOT solo player power increases
- Scaling should only affect AI behavior parameters (aggression, targeting priority, kiting behavior, ability usage rate), never hero stats
- The solo player at high MMR should feel the disadvantage of 1v3 more sharply, not less — their reward is winning through outplay
- Expose scaling parameters as named constants in `constants.ts` (e.g., `AI_AGGRESSION_MMR_SCALE`) so the direction is legible in code
- Test: play a 1v3 at max MMR and verify it feels harder than at low MMR, not comparable

**Warning signs:**
- Winrate for the solo player converges to ~50% regardless of MMR tier (scaling is working as rubber band, not skill amplifier)
- High-MMR players report the game feels "easy despite being outnumbered"
- AI teammates feel smarter/more helpful as MMR increases rather than enemies feeling more dangerous

**Phase to address:**
Asymmetric team + MMR scaling phase. Define the scaling formula and its direction before implementing any adaptive parameters.

---

### Pitfall 2: Battle Trait Combinatorial Explosion — One Modifier Breaks Everything Else

**What goes wrong:**
A single random Battle Trait interacts with other systems in ways not anticipated during design: "blink reset on kill" + "lifesteal converted to shield" creates a hero that becomes progressively unkillable while teleporting, effectively breaking match pacing. With 5v5 + a boss + neutral camps + a scoring timer, one trait that eliminates a core constraint (respawn timer, mana cost, cooldown) cascades into broken match states.

**Why it happens:**
Modifiers are designed in isolation and tested solo, but matches run many overlapping systems. The space of interactions is `traits × heroes × abilities × boss states × team compositions` — exhaustive testing is impossible. Roguelite developers (Hades, Slay the Spire) spend the largest portion of balance work on synergy combinations, not individual items. A game that ships traits without isolation constraints will have at least one "win more" combo that invalidates a match within the first week of play.

**How to avoid:**
- Categorize traits into exactly one of three classes: **stat modifiers** (e.g., +20% damage), **mechanic replacements** (e.g., lifesteal→shield), and **rule changes** (e.g., blink reset on kill). Never apply more than one rule-change modifier per match — they break the most assumptions
- Hard-cap trait power level: a single trait should not be able to contribute more than ~20% swing to match outcome on its own
- Implement a modifier validation gate: when a trait is selected, check it against a blacklist of incompatible hero abilities (e.g., "blink reset" blacklisted for any hero with a no-cooldown passive)
- In `constants.ts`, mark each trait with `incompatibleWith: string[]` (hero IDs or ability types) and filter the random pool at selection time

**Warning signs:**
- Any trait that makes a specific hero "the only viable choice" for that match
- Traits involving cooldown reset, respawn, or invincibility need extra scrutiny
- Playtest sessions where one player wins by a huge margin and attributes it entirely to the trait, not their play

**Phase to address:**
Battle Traits implementation phase. Categorize and constrain all traits before adding the random selection system.

---

### Pitfall 3: Boss as Score Lever — Boss Kill Becomes the Only Strategic Priority

**What goes wrong:**
The Boss grants 3 points per kill (vs. 1 point for a hero kill), so rational players immediately optimize for boss kills and ignore team combat entirely. Worse: in a 1v3, if the solo player kills the boss first, they get 3 points while the 3-player team has had no real combat. The boss stops being a contested objective and becomes a race that disproportionately rewards the hero with the most burst damage, regardless of skill or strategy.

**Why it happens:**
Point values are set during early design without playtesting under competitive conditions. MOBA bosses work as contested objectives because they take time and are geographically central — teams fight each other over the boss, not the boss itself. In a short 5-minute match, a boss that takes 30 seconds to kill and gives 3 points creates a dominant strategy: ignore everything else, rush the boss repeatedly.

**How to avoid:**
- Require a contested window: the boss should trigger an alert to both teams upon spawn, and boss kill credit should require a hero from the killing team to survive for 5 seconds post-kill (preventing kill-steal from awarding points to a dead team)
- Boss point value should be capped relative to current match score: if one team is already winning by 4+ points, the boss gives 2 points instead of 3 (prevents runaway victory acceleration)
- Boss health should scale so a solo player cannot kill it meaningfully faster than a coordinated team — the solo player's disadvantage in numbers should create a trade-off (high risk to boss-rush alone)
- Design the boss encounter as a triangle: boss threatens nearby heroes (with roaming behavior), killing the boss creates a vulnerable moment for the killer, and the opposing team can capitalize on that window

**Warning signs:**
- Playtest sessions where one team ignores all hero combat after the first 60 seconds
- Boss kill rate per match exceeds 3 (boss being killed more than once per minute on average in a 5-minute match)
- Players verbalize "just stack on boss" as the default strategy

**Phase to address:**
Boss system implementation phase. Define the boss economy (points, timing, alert mechanics) before implementing combat behavior.

---

### Pitfall 4: Phaser Scene Restart Memory Accumulation — Stale Timers and Event Listeners Stack

**What goes wrong:**
After "Play Again," `BattleScene.create()` runs again but timers registered with `scene.time.addEvent()` from the previous run may still be in the queue if shutdown did not explicitly remove them. More critically, any `EventEmitter` listeners attached to `this.events` accumulate — each restart adds a duplicate handler, so after 3 matches, a single game event fires 3 handlers. The existing `tickTimer` bug (already identified in codebase concerns) is a confirmed instance of this pattern.

**Why it happens:**
Phaser's `shutdown` event clears the scene's display list and physics world, but explicit `time.addEvent` handles are not automatically cancelled unless you call `.destroy()` on them. Developers assume scene restart is a clean slate — it is not. This is a documented Phaser 3 pattern confirmed in GitHub issues (#4028, #2138) and the official discourse forum.

**How to avoid:**
- Store every `Phaser.Time.TimerEvent` returned by `time.addEvent()` in a class field and call `.destroy()` in the `shutdown()` event handler
- Never use anonymous arrow functions as event listeners — always bind named methods so they can be removed with `off()`
- Add a `private cleanupTimers(): void` method to `BattleScene` that is called at the start of every `create()` as a safety net
- For the boss roaming timer, neutral camp respawn timer, and match countdown — all new timers introduced in this milestone — each must be stored and destroyed explicitly
- Concrete pattern for all new timers:
  ```typescript
  // Store reference
  private matchTimer: Phaser.Time.TimerEvent | null = null;

  // In create()
  this.matchTimer = this.time.addEvent({ ... });

  // In shutdown()
  this.matchTimer?.destroy();
  this.matchTimer = null;
  ```

**Warning signs:**
- Frame rate drops progressively worse after each "Play Again" without reloading the page
- Console shows event handlers firing multiple times for a single event
- Match timer skips or runs at double speed after scene restart

**Phase to address:**
Match flow refactor phase (adding respawn timer, match countdown, boss timer). Add explicit cleanup before any timer is added.

---

### Pitfall 5: AI All-Targeting One Enemy — Team Coordination Collapse in Asymmetric Teams

**What goes wrong:**
In a 3v1 scenario, all three AI heroes on the larger team target the same enemy (the solo player). The solo player receives 3x the damage, dies in under 3 seconds, and the match is over before any skill expression occurs. Conversely, in a 1v3 where the solo player is controlled by AI (unlikely but possible in the test harness), the single AI hero never coordinates with anyone and loses trivially. The FSM's `selectTarget` picks the "highest threat" or "lowest HP" target — but all three AIs use the same logic, so they always converge.

**Why it happens:**
FSM target selection is per-hero with no team-level coordination. Each AI independently evaluates the same enemy list with the same priority and selects the same target. The existing `AIController.selectTarget()` has three modes — `lowest_hp`, `closest`, `highest_threat` — but `highest_threat` defaults to `enemies[0]`, which is always the same hero for all AIs on the same team.

**How to avoid:**
- Implement a basic team-level target distribution: before each AI's target selection, query which enemies are already being targeted by allies and de-prioritize them. A simple approach: add a `currentTargets: Map<string, number>` in `BattleScene` that counts how many AIs are targeting each enemy. AIs on larger teams should prefer under-targeted enemies
- For the asymmetric case (3v1), at least one AI should rotate to objectives (neutral camps, boss) when the solo player is already being engaged by 2 allies
- Introduce a `SUPPORT_TEAMMATE` state in the FSM: if an ally is below 30% HP and the current hero is above 70% HP, switch to supporting that ally instead of pressing the solo player
- Add a decision jitter: `selectTarget()` should have a random re-evaluation chance (15%) to pick a non-optimal target, preventing perfect convergence

**Warning signs:**
- Solo player in a 1v3 dies within 5 seconds consistently regardless of position
- Kill feed shows all kills attributed to the same AI hero (the one with "lowest_hp" priority lands the kill on every one-shot)
- Observing matches: all 3 AI heroes are always on top of each other

**Phase to address:**
AI behavior enhancement phase. Target distribution must be solved before asymmetric teams can be playtested meaningfully.

---

### Pitfall 6: Scoring Tie + Sudden Death Creates Untestable Edge State

**What goes wrong:**
The tie → Sudden Death transition is the rarest code path and the most likely to be broken. Sudden Death (no respawns after 5:00) requires: correctly detecting a tie score at the exact 5:00 mark, switching the respawn system off, notifying both teams, and handling the edge case where a hero dies at exactly 5:00 (mid-death animation). The existing codebase ends matches on first death — adding "no respawns after 5:00" creates a new boolean that gates multiple systems, and if it misfires, heroes either respawn when they shouldn't or the match never ends.

**Why it happens:**
Edge case timing: hero dies at 4:59.9, the death triggers respawn logic before Sudden Death flag is set, hero respawns. This is a race condition in the same re-entrant call chain already identified: `Hero.die()` → `onHeroKill()` → `checkWinCondition()`. The `matchOver` guard prevents double-end, but there's no equivalent guard for the Sudden Death transition.

**How to avoid:**
- Model the match state as an explicit enum with valid transitions: `ACTIVE → SUDDEN_DEATH → ENDED`. Never transition backward
- The Sudden Death flag must be set by the timer event, not by a kill event — these run in different contexts and the timer is safer
- At Sudden Death onset, immediately set a `noRespawn: boolean` flag on `BattleScene` before processing any queued death events from that frame
- Add a visual test: a 4:55 flag in the HUD that shows "Sudden Death in 5s" — if this doesn't appear, the timer is broken
- Unit test the tie-detection logic with mock score objects: tie at 0-0, tie at 5-5, and one-point lead at 5:00 (should NOT trigger Sudden Death)

**Warning signs:**
- Playtests where matches last longer than 5 minutes without appearing to be in Sudden Death
- Hero respawning after the 5:00 mark
- Match never transitioning to ResultScene despite all heroes being dead

**Phase to address:**
Match flow + scoring phase. Implement the Sudden Death state machine before adding respawn logic.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `as any` casts for BattleScene access | No refactor needed when adding boss/scoring properties | Every new property (boss HP, neutral camps, score) added to BattleScene silently breaks all callers if renamed | Never — define `IBattleScene` interface before adding new systems |
| Hardcoding trait effects inline in battle loop | Faster to implement single traits | Adding 5+ traits requires scattered conditionals throughout combat, AI, and buff code | Only for a single proof-of-concept trait; extract to a `TraitEffect` registry before ship |
| Using `Math.random()` directly for trait selection | Simple | Untestable, impossible to reproduce broken match states for debugging | Use a seeded random with the match seed — allows replaying exactly the same modifier combination |
| Global scoring tracked as plain `number` fields on BattleScene | Fast to read | Multi-source events (boss kill → score, hero kill → score, tower damage → score) become race conditions | Never — use a `ScoreManager` with an explicit `addScore(team, source, amount)` log |
| Neutral camp respawn as a simple `time.addEvent` repeat | Easy to implement | Stacks on scene restart; no way to pause during Sudden Death | Always store the timer handle; add `pauseObjectives()` / `resumeObjectives()` methods |

---

## Integration Gotchas

Common mistakes when connecting the new systems to the existing codebase.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Boss entity + CombatSystem | Adding boss as a `Hero` subclass to reuse combat logic, but boss is not on either `Team` — `getEnemies()` returns no targets for the boss | Give boss its own `Team.NEUTRAL` enum value; update `getEnemies()` to return all heroes for neutral-team entities |
| Battle Traits + existing `ActiveBuff` system | Implementing traits as long-duration `ActiveBuff` entries — they expire with `updateBuffs()` and show on health bar UI | Traits are match-scoped, not hero-scoped. Store on `BattleScene.activeTrait` and check at ability execution time, not in the buff tick loop |
| Neutral camps + existing `ArenaGenerator` | Adding camp positions as hardcoded coordinates in `ArenaGenerator` | Camp positions should be layout-aware (different positions per `ARENA_LAYOUTS` value); use the layout system already in place |
| Boss roaming + existing `AIController` | Creating a new AI class for boss; leads to two separate AI update paths with diverging logic | Add a `BossController` that shares the `AIController` update interval and scene reference patterns but has its own state machine (`IDLE → ROAMING → ATTACKING`) |
| Respawn system + `Hero.die()` | Adding respawn logic inside `Hero.die()` to keep death self-contained | `Hero.die()` should remain ignorant of respawn. Respawn is match-state logic and belongs in `BattleScene.onHeroKill()` with a `time.delayedCall(respawnDuration, ...)` |

---

## Performance Traps

Patterns that work at small scale but fail as entity count grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| O(n²) manual distance checks in `CombatSystem.update()` | Frame budget spikes during ability-heavy fights; FPS drops from 60 to 30-40 | Replace manual `Phaser.Math.Distance.Between` loops with `physics.add.overlap` groups; Arcade Physics uses RTree spatial index | Already borderline with 8 heroes + 10 projectiles; breaks visibly at 10+ heroes + boss + neutral camp projectiles |
| Creating/destroying `Projectile` and `AreaEffect` objects per ability use | Frame hitches on ability cast; garbage collection pauses | Implement an object pool: keep a fixed pool of 30 projectiles, `setActive(false)` on expiry, `setActive(true)` on reuse | Breaks at high ability usage rate (frequent ultimates + boss abilities + 10 heroes all casting) |
| Particle emitters not stopped after source entity dies | CPU usage climbs through a match; particles from dead heroes continue emitting | In `Hero.die()`, call `vfxManager.stopHeroParticles(this)` — emitters must be explicitly stopped, not just hidden | Any match where 5+ heroes die and respawn |
| Phaser `Container` for every hero with nested children | Per-hero input event overhead; containers add cost to every child's transform | Hero Containers are appropriate; do not nest Containers inside Containers. Current architecture (one Container per hero) is acceptable — adding boss as a Container-of-Containers is not | If boss entity uses a sub-Container for health ring + sprite + label |
| Vignette re-rendered every BattleScene.create() via 320 fillRect calls | 320+ draw calls on scene load, increasing boot time | Move vignette generation to `BootScene` as a pre-baked texture; reuse across matches | Every "Play Again" — already a known concern in CONCERNS.md |

---

## UX Pitfalls

Common user experience mistakes specific to this game's design.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Scoring HUD not distinguishing point sources | Player doesn't understand why the score changed; no feedback loop for learning optimal play | Show score events in the kill feed: "+3 pts (Boss Kill)" "+2 pts (Tower Threshold)" "+1 pt (Neutral Control)" |
| Battle Trait revealed only at match start with no explanation | Player doesn't know what the trait does mid-fight and can't strategically adapt | Show trait name + one-sentence tooltip for 5 seconds at match start, then collapse to a persistent icon in the HUD |
| Sudden Death announcement missing during Sudden Death | Players don't know why dead heroes aren't respawning; causes confusion | Full-screen "SUDDEN DEATH" flash at 5:00 + persistent red HUD border throughout the Sudden Death phase |
| Boss health bar not visible from across the arena | Players can't assess whether to contest a boss fight from a distance | Boss health bar should be visible at 200% scale compared to hero health bars, and always rendered above any hero health bar in depth order |
| 10-second respawn timer with no progress indicator | Dead player has no sense of time remaining; feels like a longer wait | Respawn countdown shown at screen center during death, with the hero icon fading in as respawn approaches |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Scoring system:** Score increments appear in kill feed — verify that tie detection runs at exactly 5:00:000 and not 5:00:016 (next frame after timer fires); off-by-one frame bugs cause ties to resolve as one-point wins
- [ ] **Boss kill points:** Boss grants 3 points on kill — verify points are awarded to the killing team hero, not to the team that dealt the most total damage (ambiguous if multiple teams contributed)
- [ ] **Neutral camp buffs:** Camp buff applies to hero who kills the neutral — verify the buff duration survives through the hero's death and respawn cycle (it should not; buffs should clear on death)
- [ ] **Battle Trait + Respawn:** Trait effects that are hero-stat modifiers (e.g., +20% speed) must be re-applied on respawn — verify `Hero` respawn path re-reads match trait from `BattleScene`
- [ ] **Boss Sudden Death trigger:** Third boss kill triggers Sudden Death — verify this also sets `noRespawn` immediately and does not allow a hero who dies in the same frame to respawn
- [ ] **MMR after Sudden Death:** Sudden Death win/loss must record a result to `StorageManager` — verify `endMatch()` is called exactly once regardless of how many heroes die simultaneously in Sudden Death
- [ ] **Team size display in HUD:** HUD shows team compositions — verify asymmetric compositions (1v4) display team B's count correctly when team sizes are not equal
- [ ] **AI target re-evaluation after respawn:** After a hero respawns, AI controllers on the opposing team must add them back to their enemy list — verify `getEnemies()` returns respawned heroes (`isAlive === true` filter must update correctly)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Asymmetric scaling inversion (rubber band instead of skill test) | MEDIUM | Identify which scaling parameter is inverted; flip its direction in `constants.ts`; retest at min/max MMR; no architectural change needed if scaling is data-driven |
| Broken Battle Trait discovered post-ship | LOW | Traits are selected at match start from a pool; remove the broken trait ID from the pool array in `constants.ts`; hotfix requires no structural change |
| Boss farming exploit (dominant strategy found) | MEDIUM | Add boss respawn delay or point cap; requires tuning `constants.ts` values, not code restructure |
| Scene restart memory leak | HIGH | Must audit all `time.addEvent` calls and add explicit `destroy()` in shutdown; requires touching every timer in BattleScene — significant regression risk |
| AI focus-fire kills solo player instantly | LOW | Add target-distribution logic to `BattleScene.getEnemies()` or `AIController.selectTarget()`; isolated to AI code, low blast radius |
| Sudden Death edge case causing match never to end | HIGH | Requires re-engineering the match state machine; cannot be patched with a flag; design state transitions explicitly before implementation |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Asymmetric scaling inversion | Asymmetric teams + MMR scaling phase | Playtest: solo at max MMR loses more often in 1v3 than solo at min MMR — not equal winrates |
| Battle Trait combinatorial explosion | Battle Traits implementation phase | Each trait has documented `incompatibleWith` list; at least 3 traits tested in cross-system scenarios |
| Boss as dominant scoring strategy | Boss system phase | Playtests: hero kills still contribute meaningfully to match outcome even when one team kills boss 3x |
| Scene restart memory accumulation | Match flow refactor phase (first phase that adds timers) | FPS at match 5 is within 5% of FPS at match 1; no timer event fires after scene shutdown |
| AI all-targeting solo player | AI enhancement phase | In 3v1 matches, solo player survives past 30 seconds on average without using abilities |
| Scoring tie + Sudden Death edge cases | Scoring + match timer phase | Automated scenario: force tie at 4:59, verify Sudden Death triggers; force hero death at 5:00:000, verify no respawn |

---

## Sources

- [Asymmetrical Game Design — The Never-Ending Balance (Game Wisdom)](https://game-wisdom.com/critical/asymmetrical-game-design) — skill-level disparities and counterplay gaps in asymmetric design
- [Asymmetrical Gameplay as a New Trend — Five Design Patterns (Game Developer)](https://www.gamedeveloper.com/design/asymmetrical-gameplay-as-a-new-trend-in-multiplayer-games-and-five-design-patterns-to-make-engaging-asymmetrical-games) — design patterns and implicit failure modes in 1vN structures
- [Dead by Daylight MMR Forum Thread (BHVR)](https://forums.bhvr.com/dead-by-daylight/discussion/405725/solo-queue-is-not-a-problem-the-problem-is-mmr) — real-world failure of MMR in 1v4 asymmetric structure
- [Phaser 3 Scene Lifecycle (DeepWiki)](https://deepwiki.com/phaserjs/phaser/3.1-scene-lifecycle) — shutdown vs destroy, timer accumulation on restart
- [Phaser 3 Arcade Physics Circle Performance (Phaser Discourse)](https://phaser.discourse.group/t/phaser-arcade-physics-circle-performance-questions/6078) — disabled bodies in RTree, circle body cost
- [Phaser 3 General Performance (Phaser Discourse)](https://phaser.discourse.group/t/the-limit-of-phaser-3-and-its-performance/6677) — Container costs, Ellipse rendering overhead, event loop optimization
- [Phaser GitHub Issue #4028](https://github.com/phaserjs/phaser/issues/4028) — internal shutdown event memory management issue
- [Boss Battle Design and Structure (Game Developer)](https://www.gamedeveloper.com/design/boss-battle-design-and-structure) — escalation, counterplay, placement pitfalls
- [Solving RNG Abuse in Roguelikes (Game Developer)](https://www.gamedeveloper.com/game-platforms/solving-rng-abuse-in-roguelikes) — modifier balance and synergy interaction problems
- [Game Programming Patterns — State (Robert Nystrom)](https://gameprogrammingpatterns.com/state.html) — FSM combinatorial explosion and history blindness
- [Phaser 3 Container Documentation (Phaser Help)](https://docs.phaser.io/phaser/concepts/gameobjects/container) — Container depth limitations and per-child overhead cost
- Codebase analysis: `.planning/codebase/CONCERNS.md` — existing bugs and debt that amplify pitfalls (re-entrant kill handler, timer stacking, `as any` cast scope)

---
*Pitfalls research for: Rift Clash — asymmetric hero brawler arena combat (Phaser 3 + TypeScript)*
*Researched: 2026-02-22*
