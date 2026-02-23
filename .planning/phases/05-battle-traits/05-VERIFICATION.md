---
phase: 05-battle-traits
verified: 2026-02-23T22:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 5: Battle Traits & Gems -- Verification Report

**Phase Goal:** Every match has one randomly assigned Battle Trait that modifies combat rules for all heroes, and each hero starts with a randomly assigned Gem power-up; neither breaks matches through combinatorial exploits.
**Verified:** 2026-02-23T22:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                    | Status     | Evidence                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | A Battle Trait is randomly selected at match start and displayed in draft scene and HUD   | VERIFIED   | `MatchOrchestrator.generateMatch()` calls `TraitSystem.selectTrait()` (line 23); DraftScene renders trait banner (lines 57-77); HUD shows trait indicator (lines 67-86) |
| 2   | Each hero starts with a Gem providing stat modifier, shown in UI                          | VERIFIED   | `MatchOrchestrator` assigns random gems (lines 26-30); BattleScene applies gem stats additively (lines 159-172, 195-208); DraftScene shows gem on each card (lines 244-257); HUD shows player gem (lines 133-146) |
| 3   | 8 Battle Traits implemented covering stat (3), mechanic (4), rule_change (1)              | VERIFIED   | `traitData.ts` contains exactly 8 entries: glass_cannon/iron_fortress/arcane_surge (stat), vampiric_pact/thorns_aura/executioner/spell_burn (mechanic), sudden_valor (rule_change) |
| 4   | 8 Gems implemented with flat stat bonuses only, no CDR                                    | VERIFIED   | `gemData.ts` contains 8 entries: ruby/sapphire/emerald/diamond/topaz/amethyst/onyx/opal. Zero matches for "cooldown" in gemData.ts. GemDef interface has no CDR field. |
| 5   | Incompatibility blacklists prevent vampiric_pact+bd_passive, executioner+ld_passive, spell_burn+fw/vs_passive | VERIFIED | vampiric_pact: `['bd_passive']` (line 48), executioner: `['ld_passive']` (line 68), spell_burn: `['fw_passive', 'vs_passive']` (line 78) |
| 6   | TraitSystem subscribes AFTER BattleScene's HERO_KILLED handler                            | VERIFIED   | BattleScene subscribes at line 311; TraitSystem instantiated at line 321 (constructor subscribes internally). EventEmitter3 fires listeners in subscription order. |
| 7   | handleOnDamageTaken uses payload.victim (not payload.entity)                              | VERIFIED   | TraitSystem line 140: `payload: { victim: any; ... }` -- all handlers use `payload.victim` consistently. No reference to `payload.entity`. |
| 8   | handleOnKill checks victim.isAlive for revival token                                      | VERIFIED   | TraitSystem line 96: `if (payload.victim.isAlive) return;` -- correctly skips trait processing when BattleScene has already consumed revival token |
| 9   | HP floor in applyStatMods prevents glass_cannon exploit                                   | VERIFIED   | TraitSystem line 191: `maxHP: Math.max(100, stats.maxHP + (trait.hpMod ?? 0))` -- enforces minimum 100 HP |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact                              | Expected                                                              | Status     | Details                                                                      |
| ------------------------------------- | --------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `src/types.ts`                        | TraitDef, GemDef, TraitCategory, MatchConfig with traitId/gemAssignments | VERIFIED | All interfaces present. TraitCategory is `'stat' | 'mechanic' | 'rule_change'`. MatchConfig extended at lines 197-198. |
| `src/traits/traitData.ts`             | 8 traits across 3 categories with helpers                             | VERIFIED   | 8 TraitDef entries, exports TRAITS, getTraitById, getAllTraits. Imports TraitDef from types. |
| `src/traits/TraitSystem.ts`           | Runtime mechanic handlers, selectTrait with blacklists                | VERIFIED   | 198 lines. Handles onHit (lifesteal + DoT), onKill (individual + team buff), onDamageTaken (reflect). selectTrait filters by incompatiblePassives. applyStatMods with HP floor. destroy() cleans up EventBus listeners. |
| `src/gems/gemData.ts`                 | 8 gems with flat stat bonuses                                         | VERIFIED   | 8 GemDef entries, exports GEMS, getGemById, getAllGems. Imports GemDef from types. No CDR fields. |
| `src/systems/MatchOrchestrator.ts`    | traitId + gemAssignments in MatchConfig                               | VERIFIED   | Imports TraitSystem and GEMS. Collects hero passive IDs, calls selectTrait, assigns random gems. Returns traitId and gemAssignments in config object. |
| `src/systems/EventBus.ts`             | TRAIT_APPLIED event                                                   | VERIFIED   | TRAIT_APPLIED defined at line 43. Note: event constant is defined but never emitted -- this is an info-level observation, not a blocker. |
| `src/scenes/BattleScene.ts`           | Trait/gem stat mods, TraitSystem lifecycle, mana regen                | VERIFIED   | Trait stat mods applied before HeroRegistry.create (lines 155-157, 191-193). Gem stat mods applied (lines 159-172, 195-208). TraitSystem created after HERO_KILLED subscription (line 321). Mana regen includes trait bonus (line 419-420). Cleanup in shutdown (lines 848-850). |
| `src/scenes/DraftScene.ts`            | Trait banner, per-hero gem display                                    | VERIFIED   | Trait banner rendered at lines 57-77 with icon+name+description in trait color. Gem info on each hero card at lines 244-257 showing `GEM: icon name -- description`. |
| `src/ui/HUD.ts`                       | Trait indicator, gem indicator                                        | VERIFIED   | Trait indicator at y=68-84 below kill score (lines 66-86). Gem indicator at GAME_HEIGHT-25 in stat panel (lines 133-146). Panel expanded to 90px (line 100). |

### Key Link Verification

| From                          | To                        | Via                                             | Status | Details                                                    |
| ----------------------------- | ------------------------- | ----------------------------------------------- | ------ | ---------------------------------------------------------- |
| `traitData.ts`                | `types.ts`                | `import type { TraitDef } from '../types'`       | WIRED  | Line 1 of traitData.ts                                     |
| `gemData.ts`                  | `types.ts`                | `import type { GemDef } from '../types'`         | WIRED  | Line 1 of gemData.ts                                       |
| `MatchOrchestrator.ts`        | `TraitSystem.ts`          | `TraitSystem.selectTrait(heroPassiveIds)`        | WIRED  | Import at line 5, called at line 23                        |
| `MatchOrchestrator.ts`        | `gemData.ts`              | `import { GEMS }` for random gem assignment      | WIRED  | Import at line 4, used at line 28                          |
| `BattleScene.ts`              | `TraitSystem.ts`          | `new TraitSystem(activeTrait, this.heroes, this)` | WIRED | Import at line 24, instantiated at line 321, destroyed at 848 |
| `BattleScene.ts`              | `traitData.ts`            | `getTraitById(this.matchConfig.traitId)`         | WIRED  | Import at line 25, called at line 142                      |
| `BattleScene.ts`              | `gemData.ts`              | `getGemById(gemIdA)` for stat application        | WIRED  | Import at line 26, called at lines 161, 197                |
| `DraftScene.ts`               | `traitData.ts`            | `getTraitById(matchConfig.traitId)` for banner   | WIRED  | Import at line 6, called at line 57                        |
| `DraftScene.ts`               | `gemData.ts`              | `getGemById(gemId)` for per-hero gem display     | WIRED  | Import at line 7, called at line 246                       |
| `HUD.ts`                      | `traitData.ts`            | `getTraitById(matchConfig.traitId)` for indicator | WIRED | Import at line 7, called at line 68                        |
| `HUD.ts`                      | `gemData.ts`              | `getGemById(playerGemId)` for gem indicator      | WIRED  | Import at line 8, called at line 136                       |
| `TraitSystem.ts`              | `EventBus.ts`             | `EventBus.on(Events.HERO_HIT/HERO_KILLED/DAMAGE_TAKEN)` | WIRED | Import at line 1, subscriptions in constructor lines 24-38 |

### Requirements Coverage

| Requirement | Status     | Blocking Issue |
| ----------- | ---------- | -------------- |
| HERO-05: Each match assigns a random Battle Trait modifier | SATISFIED | None. MatchOrchestrator calls selectTrait with blacklist filtering; 8 traits across 3 categories; runtime mechanic handlers in TraitSystem. |
| HERO-06: Each hero receives a random Gem power-up at match start | SATISFIED | None. MatchOrchestrator assigns random gems to all heroes; BattleScene applies gem stats before hero construction; displayed in DraftScene and HUD. |

### Anti-Patterns Found

| File             | Line | Pattern           | Severity | Impact                                                               |
| ---------------- | ---- | ----------------- | -------- | -------------------------------------------------------------------- |
| `src/types.ts`   | 196  | TODO(05-02) comment | INFO   | Stale TODO comment -- MatchOrchestrator already returns traitId + gemAssignments. Not a blocker; cosmetic only. |
| `src/systems/EventBus.ts` | 43 | Unused TRAIT_APPLIED event | INFO | Event constant defined but never emitted or subscribed to. May be intended for future use. Not a blocker. |

### Human Verification Required

### 1. Trait Banner Visibility in DraftScene

**Test:** Start a new match from the main menu and observe the draft scene.
**Expected:** A colored banner appears near the top showing the trait icon, name, and description (e.g., "TRAIT: !! Glass Cannon -- All heroes deal +20 damage but lose 150 HP") in the trait's color.
**Why human:** Visual placement, color rendering, and text readability cannot be verified programmatically.

### 2. Gem Display on Each Hero Card in DraftScene

**Test:** In the draft scene, check each hero card.
**Expected:** Below the three ability lines, each card shows "GEM: [icon] [name] -- [description]" in the gem's color. Different heroes may have different gems.
**Why human:** Visual layout of gem line relative to abilities and card boundaries requires visual inspection.

### 3. HUD Trait Indicator During Battle

**Test:** Start a battle and observe the top-center HUD area.
**Expected:** Below the kill score (0 - 0), a small colored indicator shows the trait icon and name (e.g., "!! Glass Cannon"). The background is tinted with the trait's color at low opacity.
**Why human:** Verify the indicator does not overlap with boss health bar or timer elements.

### 4. HUD Gem Indicator in Stat Panel

**Test:** During battle, look at the bottom-left stat panel.
**Expected:** Below the XP bar, the player's gem is shown (e.g., "R Ruby of Might: +15 damage") in the gem's color. The panel background is large enough to contain it.
**Why human:** Verify text fits within the expanded 90px panel and does not clip.

### 5. Trait Mechanic Effects During Combat

**Test:** Play multiple matches, noting which trait is active. Observe:
  - Vampiric Pact: auto-attacks should heal the attacker
  - Thorns Aura: taking damage should hurt the attacker
  - Executioner: killing a hero should visibly increase damage output for 10s
  - Spell Burn: auto-attacks should occasionally apply burning DoT
  - Sudden Valor: first kill each minute should buff the entire team
**Expected:** Mechanic effects are observable during gameplay and do not crash or freeze the match.
**Why human:** Runtime behavior of mechanic trait effects requires observation during live gameplay.

### 6. No Combinatorial Exploits

**Test:** Play 5+ matches looking for situations where a hero passive + trait + gem combination eliminates core constraints (respawn, mana, cooldown).
**Expected:** No combination makes a hero unkillable, have infinite mana, or bypass cooldowns within 2 minutes.
**Why human:** Combinatorial testing of all trait+passive+gem interactions requires gameplay observation.

### Gaps Summary

No gaps found. All 9 must-have truths are verified through direct codebase inspection:

1. **Data layer (types.ts, traitData.ts, gemData.ts):** All interfaces, 8 traits (3 stat/4 mechanic/1 rule_change), 8 gems (no CDR), and helper functions are fully implemented.

2. **Runtime system (TraitSystem.ts):** Event-driven mechanic handlers for onHit (lifesteal, DoT), onKill (individual buff, team buff with minute tracking), and onDamageTaken (reflect) are substantive and properly guarded with entity type checks and isAlive checks. The selectTrait static method correctly filters by incompatibility blacklists. The applyStatMods method enforces an HP floor of 100.

3. **Match orchestration (MatchOrchestrator.ts):** Trait selection with blacklist filtering and random gem assignment are both wired into generateMatch(), returning traitId and gemAssignments in MatchConfig.

4. **Battle integration (BattleScene.ts):** Trait stat mods and gem stat mods are applied additively to copied stats before hero construction. Mana regen includes trait bonus. TraitSystem is created after BattleScene's HERO_KILLED subscription (ensuring revival token ordering). TraitSystem is cleaned up in shutdown().

5. **UI display (DraftScene.ts, HUD.ts):** Trait banner in DraftScene with color and description. Per-hero gem info on each hero card. HUD trait indicator below kill score. HUD gem indicator in expanded stat panel. All are wired to the actual match config data.

6. **Safety constraints:** No CDR gems (field not in GemDef). Incompatibility blacklists on 3 mechanic traits. HP floor of 100 in applyStatMods. Entity type guards in all TraitSystem handlers. Revival token checked via isAlive before trait processing.

TypeScript compilation passes with zero errors. Two info-level anti-patterns found (stale TODO comment, unused TRAIT_APPLIED event constant) -- neither blocks goal achievement.

---

_Verified: 2026-02-23T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
