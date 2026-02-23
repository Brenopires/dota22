---
phase: 02-hero-identity
verified: 2026-02-22T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
re_verification: false
gaps:
  - truth: "Every hero has a functional R-slot ultimate that creates a high-impact moment (VFX)"
    status: partial
    reason: "R-slot ultimates are mechanically functional (damage, buffs, correct keybinding) but the special camera-shake VFX block in CombatSystem.executeAbility() checks `ability.slot === 'E'` instead of `ability.slot === 'R'` — so E-slot abilities get zoom pulse/shake/screen flash while R ultimates get none of these cinematic effects."
    artifacts:
      - path: "src/systems/CombatSystem.ts"
        issue: "Line 237: `if (ability.slot === 'E')` should be `if (ability.slot === 'R')` to apply ultimate camera VFX to the correct slot"
    missing:
      - "Change `ability.slot === 'E'` to `ability.slot === 'R'` (or `ability.isUltimate === true`) in CombatSystem.executeAbility() to ensure ultimates trigger the zoom pulse + screen shake VFX"
---

# Phase 2: Hero Identity Verification Report

**Phase Goal:** Every hero in the roster has a complete ability set (Q/W/E/R + passive), gains XP during the match, levels up with stat increases, and each hero feels mechanically distinct.
**Verified:** 2026-02-22
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | At least 6 heroes with distinct combat roles are in the roster | VERIFIED | 13 heroes in `heroDataMap`: 3 TANK, 2 ASSASSIN, 3 MAGE, 2 CARRY, 2 SUPPORT. All 13 reachable as player or AI via `TeamManager.getRandomHeroId()`. |
| 2 | Every hero has a functional R-slot ultimate with 60-120s cooldown | PARTIAL | All 13 heroes have `slot: 'R', isUltimate: true` with cooldowns 75-120s. Mechanical execution (damage/buffs) works. However, the special camera VFX block fires on `slot === 'E'` instead of `slot === 'R'`, so ultimates miss the high-impact cinematic feedback. |
| 3 | Every hero has a passive that visibly triggers with VFX on its condition | VERIFIED | All 13 passives defined with `trigger` (on_kill/on_hit/on_damage_taken). `Hero.onPassiveTrigger()` calls `this.showPassiveVFX()` unconditionally after any passive fires. VFX: gold burst + hero alpha flash. |
| 4 | XP bar visible in HUD; heroes reach level 5+ in 5-minute match; stats increase | VERIFIED | HUD renders XP bar and level text each frame from `player.currentXP`/`player.level`. With 10 kills (500 XP), player reaches level 6 (threshold 450). `levelUp()` adds +6% base HP, +4% base damage, +0.5 armor, shows floating "LEVEL X!" text with gold burst. |
| 5 | Combat event hooks (on-hit, on-kill, on-damage-taken) fire and passives respond | VERIFIED | `CombatSystem.tryAutoAttack()` emits `Events.HERO_HIT`. `Hero.takeDamage()` emits `Events.DAMAGE_TAKEN`. `BaseEntity.die()` emits `Events.HERO_KILLED`. `Hero.subscribePassive()` registers the correct handler for each trigger. `XPSystem` listens to `HERO_KILLED` and calls `killer.gainXP(50)`. |

**Score:** 4/5 truths verified (1 partial — ultimate VFX attached to wrong slot)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types.ts` | `AbilityDef` with R slot, `PassiveDef` interface | VERIFIED | `AbilityDef.slot: 'Q' \| 'W' \| 'E' \| 'R'`, `isUltimate?: boolean`, `PassiveDef` with all trigger/effect fields |
| `src/systems/EventBus.ts` | HERO_HIT, DAMAGE_TAKEN, HERO_LEVELED_UP events | VERIFIED | All three events present with typed constants |
| `src/systems/CombatSystem.ts` | HERO_HIT emission on auto-attack hit | VERIFIED | Line 142: `EventBus.emit(Events.HERO_HIT, { attacker, victim, damage })` |
| `src/systems/XPSystem.ts` | XP per kill, level thresholds, wired to EventBus | VERIFIED | `XP_PER_KILL = 50`, `XP_THRESHOLDS = [0,50,120,210,320,450,600,780,990]`, subscribes to `HERO_KILLED` |
| `src/entities/Hero.ts` | `level`, `currentXP`, `gainXP()`, `levelUp()`, passive subscription, `destroy()` cleanup | VERIFIED | All fields and methods present with correct implementation. `destroy()` unsubscribes passive handler. |
| `src/heroes/heroData.ts` | 13 heroes with R-slot and passive definitions | VERIFIED | 13 hero entries confirmed. All have 4 abilities (Q/W/E/R) and 1 passive. |
| `src/scenes/BattleScene.ts` | R key binding to `useAbility(3,...)`, XPSystem lifecycle | VERIFIED | R key calls `useAbility(3, ...)`. `XPSystem` created at line 126 with all heroes, destroyed in `shutdown()`. |
| `src/ai/AIController.ts` | AI uses ultimates via `shouldUseUltimate()` | VERIFIED | `shouldUseUltimate()` checks slot index 3, 30% random chance. `executeUseAbility()` prioritizes order `[3, 2, 0, 1]`. |
| `src/ui/HUD.ts` | XP bar, level display wired to player state | VERIFIED | XP bar drawn from `player.currentXP`/`player.level` each frame. `levelText` updated to `LV {n}`. |
| `src/ui/AbilityBar.ts` | 4-slot layout with gold R slot indicator | VERIFIED | 4 slots rendered (I/O/P/R keys). R slot uses `isUltimate === true` to apply gold border `0xFFD700`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CombatSystem.tryAutoAttack()` | `Hero.onPassiveTrigger()` | `EventBus.emit(HERO_HIT)` + `Hero.subscribePassive()` | WIRED | Verified: emit at CombatSystem:142, subscribe at Hero:460 |
| `Hero.takeDamage()` | `Hero.onPassiveTrigger()` | `EventBus.emit(DAMAGE_TAKEN)` + `Hero.subscribePassive()` | WIRED | Verified: emit at Hero:296, subscribe at Hero:461 |
| `BaseEntity.die()` | `XPSystem.onKill()` | `EventBus.emit(HERO_KILLED)` + `XPSystem` constructor | WIRED | XPSystem subscribes to HERO_KILLED at construction, awards 50 XP to killer |
| `Hero.gainXP()` | `Hero.levelUp()` | while loop in `gainXP()` | WIRED | Loop checks `XP_THRESHOLDS[this.level]` and calls `levelUp()` when exceeded |
| `Hero.levelUp()` | HUD XP display | `player.level` + `player.currentXP` polled in `HUD.update()` | WIRED | HUD reads these values every frame, no event subscription needed |
| `BattleScene.handlePlayerInput()` | `Hero.useAbility(3,...)` | R key → `JustDown` check | WIRED | Line 292-294: R key → `useAbility(3, worldX, worldY)` |
| `Hero.useAbility(3,...)` | `CombatSystem.executeAbility()` | `battleScene.combatSystem.executeAbility(hero, ability, x, y)` | WIRED | Line 281: dispatches to CombatSystem |
| `CombatSystem.executeAbility()` | Ultimate VFX (zoom/shake) | `ability.slot === 'E'` check | BROKEN | Check fires for E-slot (index 2) not R-slot (index 3). Ultimate (R) gets no camera VFX. |
| `AIController.executeUseAbility()` | Ultimate (slot 3) | priority order `[3,2,0,1]` | WIRED | AI tries R first with 30% probability gate via `shouldUseUltimate()` |
| `Hero.onPassiveTrigger()` | `showPassiveVFX()` | unconditional call at end of handler | WIRED | Called at Hero:493, after all ownership checks and effect application |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| HERO-01: 6-10 heroes with distinct playstyles | SATISFIED | 13 heroes across 5 archetypes: TANK (3), ASSASSIN (2), MAGE (3), CARRY (2), SUPPORT (2) |
| HERO-02: Q/W/E + R + passive per hero | SATISFIED | All 13 heroes have 4 abilities and 1 passive. Verified in `heroData.ts`. |
| HERO-03: XP from kills, no gold | SATISFIED | `XPSystem` awards 50 XP on HERO_KILLED. No gold system exists. `awardObjectiveXP()` available for future objectives. |
| HERO-04: Level up with stat scaling | SATISFIED | `levelUp()` increments level, adds +6% base HP, +4% base damage, +0.5 armor. Floating text "LEVEL X!" with VFX burst. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/systems/CombatSystem.ts` | 237 | `ability.slot === 'E'` labeled as "Ultimate effects" | Warning | E-slot abilities (index 2) trigger zoom pulse/shake/screen flash instead of R-slot ultimates. Ultimates still function mechanically but lack cinematic impact. |
| `src/scenes/DraftScene.ts` | 196-197 | DraftScene shows only Q/W/E abilities, not R ultimate | Info | Pre-match hero info card omits the ultimate. Minor UX gap; does not block Phase 2 goal. |
| `src/systems/TeamManager.ts` | 10 | Player hero is randomly assigned, not chosen | Info | Phase 8 (Draft) will add player hero selection. For Phase 2, all 13 heroes can appear as player hero. |

---

### Human Verification Required

#### 1. Passive VFX Visibility

**Test:** Play a match as Iron Guard (IG). Kill an enemy and observe the immediate visual feedback.
**Expected:** A gold particle burst appears at the Iron Guard's position and the hero briefly dims/flashes. The passive effect (shield) is also applied.
**Why human:** VFX involves Phaser tweens and particle emitters — only verifiable at runtime.

#### 2. Ultimate Mechanical Impact

**Test:** Press R as any hero when the ultimate is ready. Observe the effect.
**Expected:** The ultimate executes (damage, buffs, etc.) but note there is NO camera shake or zoom pulse (this is the bug). The effect still creates a noticeable gameplay moment (large AoE, long CC, etc.).
**Why human:** "High-impact moment" is a subjective feel judgment that requires runtime observation.

#### 3. XP Bar Progression

**Test:** Play a 5-minute match and get several kills. Observe the bottom-left XP bar and level display.
**Expected:** XP bar fills and resets each level. Level counter increments (LV 1 → LV 2 → ... → LV 5+). A "LEVEL X!" text floats up at each level-up.
**Why human:** Visual rendering of HUD bars requires runtime observation.

#### 4. Mechanical Distinctness Between Heroes

**Test:** Play 2-3 different heroes from different archetypes (e.g., Iron Guard vs Shadow Blade vs Flame Witch).
**Expected:** Each hero feels notably different in combat: Iron Guard is durable with a shield, Shadow Blade is fast with dashes, Flame Witch applies DoTs from range.
**Why human:** Subjective "feel" of mechanical distinctness cannot be verified by code inspection alone.

---

### Gaps Summary

One gap was found: the `CombatSystem.executeAbility()` function applies special camera VFX (zoom pulse, directional shake, screen flash) to E-slot abilities (`ability.slot === 'E'`) but not to R-slot ultimates (`ability.slot === 'R'`). The comment reads "Ultimate effects (slot E)" — the comment is correct in intent but the condition checks the wrong slot letter.

This is a single-line fix: change `ability.slot === 'E'` to `ability.slot === 'R'` (or alternatively `ability.isUltimate === true`) at `src/systems/CombatSystem.ts` line 237.

**Root cause:** A copy-paste or naming error during Phase 2 implementation. The old keybinding system used Q/W/E as the three active slots, and when R was added as the ultimate, the condition string was not updated.

**Impact:** R-slot ultimates are mechanically complete and deal damage/apply effects correctly. The gap affects only the cinematic "high-impact moment" feel criterion. The AbilityBar correctly shows R with a gold border. The keybinding is correct. Only the camera VFX is misrouted.

---

_Verified: 2026-02-22_
_Verifier: Claude (gsd-verifier)_
