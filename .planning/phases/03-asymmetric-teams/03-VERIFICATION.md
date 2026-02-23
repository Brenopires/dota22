---
phase: 03-asymmetric-teams
verified: 2026-02-23T02:30:00Z
status: human_needed
score: 7/7 must-haves verified (automated)
re_verification: false
human_verification:
  - test: "Start 4-5 matches and observe that the composition banner appears at match start showing varying team sizes (e.g., '2 vs 4', '1 vs 3', '3 vs 5')."
    expected: "Banner shows 'X vs Y' centered on screen in large bold text, auto-fades after ~3 seconds. Team compositions vary across matches."
    why_human: "Visual rendering, banner positioning, fade animation, and randomness distribution cannot be verified programmatically."
  - test: "In a match where your team is smaller (e.g., '1 vs 3'), check that your hero has noticeably higher HP than in an equal-size match."
    expected: "Solo or smaller-team heroes have visibly scaled maxHP and damage. In equal-size matches, stats remain at base values."
    why_human: "Stat visibility requires observing HP bar proportion and damage numbers in live gameplay."
  - test: "In a 3v1 scenario with 3+ enemy AI heroes, observe whether they all rush the same target or spread across multiple targets."
    expected: "At least two different targets are engaged by enemy AI simultaneously when 2+ targets are alive. When only 1 target is alive, all correctly focus that target."
    why_human: "AI behavior distribution is probabilistic and requires observing multiple AI decision cycles in real-time."
  - test: "Play a full match and verify no regressions: 5-minute timer, respawns, abilities (Q/W/E/R), HUD elements all function."
    expected: "Match runs full duration without crashes. All Phase 1 and Phase 2 features remain functional."
    why_human: "Integration regression testing requires human gameplay observation."
---

# Phase 3: Asymmetric Teams Verification Report

**Phase Goal:** Each match generates a random, uneven team composition; the smaller or solo team receives MMR-calibrated scaling; AI teammates do not all focus the same target.
**Verified:** 2026-02-23T02:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Team sizes vary across matches (1v1, 2v3, 4v1, etc.) and are shown in HUD | VERIFIED | `TeamManager.getRandomTeamSizes()` draws sizeA and sizeB independently from `[1,5]` via `Math.floor(Math.random() * 5) + 1` (src/systems/TeamManager.ts:11-12). `showCompositionBanner()` renders `${sizeA} vs ${sizeB}` at match start (src/scenes/BattleScene.ts:260). Visual rendering needs human confirmation. |
| 2 | The solo or smaller team has visibly higher per-hero stats (HP, damage) that scale with the team size ratio | VERIFIED | `TeamBalancer.computeMultiplier()` computes MMR-adaptive multiplier (src/systems/TeamBalancer.ts:16-26). `TeamBalancer.applyToStats()` scales `maxHP` and `damage` only, returning a new copy (src/systems/TeamBalancer.ts:33-39). BattleScene spawn loops apply scaling: teamA loop line 120-122, teamB loop line 135-137. Stats flow through `HeroRegistry.create()` 7th param `statsOverride` into `Hero` constructor where `maxHP` initializes HP (src/entities/Hero.ts:43,47). |
| 3 | At high MMR, the scaling advantage shrinks -- a high-MMR solo player in a 1v3 gets less help than a low-MMR player | VERIFIED | `computeMultiplier()` uses `mmrFactor = 1 - clamp((mmr - 1000) / 1000, 0, 1)`. At MMR 1000: mmrFactor=1.0, bonus applied fully. At MMR 2000: mmrFactor=0.0, multiplier=1.0 (no bonus). Formula verified in src/systems/TeamBalancer.ts:21-24. Constants: `MMR_SCALE_FLOOR=1000`, `MMR_SCALE_RANGE=1000`, `MMR_SCALE_REDUCTION=0.7` in src/constants.ts:61-67. |
| 4 | AI teammates do not all target the same solo player simultaneously when 2+ targets exist | VERIFIED | `AIController.selectTarget()` applies `focusPenalty = overlapCount * FOCUS_PENALTY_PER_ATTACKER` (0.2 per attacker) plus random jitter of +/-0.1 (src/ai/AIController.ts:108-131). `BattleScene.update()` rebuilds `targetCountMap` per AI tick from alive targets only (src/scenes/BattleScene.ts:304-312), passes it to `ai.update(this.targetCountMap)` (line 317). `currentTarget` getter exposes private target for map building (src/ai/AIController.ts:30-32). |
| 5 | Enemy AI has MMR-adaptive difficulty (more aggressive at high MMR, less at low MMR) | VERIFIED | `MMR_TIERS` has 6 entries from Bronze (aggrMod 0.7) to Master (aggrMod 1.5) in src/ai/AIPersonality.ts:19-26. `applyMMRModifiers()` scales aggressiveness and retreatThreshold (lines 98-109). BattleScene applies modifiers only to enemy team: `const isEnemy = hero.team !== this.player.team` (src/scenes/BattleScene.ts:155), friendly AI stays at baseline (line 158). |
| 6 | MATCH_COMPOSITION_SET event is emitted with team size and scaling data | VERIFIED | Event defined in src/systems/EventBus.ts:32. Emitted in BattleScene.create() at line 201: `EventBus.emit(Events.MATCH_COMPOSITION_SET, { teamSizeA, teamSizeB, scalingMultiplier })`. |
| 7 | MatchResult carries teamSizeA and teamSizeB for match history | VERIFIED | MatchResult interface has `teamSizeA?: number` and `teamSizeB?: number` (src/types.ts:130-131). BattleScene.endMatch() populates both fields plus backward-compat `teamSize: Math.max(...)` (src/scenes/BattleScene.ts:504-506). |

**Score:** 7/7 truths verified (automated checks pass; visual/behavioral confirmation requires human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/systems/TeamManager.ts` | TeamSizes interface + getRandomTeamSizes() + generateTeams(sizeA, sizeB) | VERIFIED | 42 lines. Exports `TeamSizes` interface. `getRandomTeamSizes()` returns independent sizes 1-5. `generateTeams(sizeA, sizeB)` builds teams with player always first in teamA. |
| `src/systems/MatchOrchestrator.ts` | generateMatch() returning MatchConfig with teamSizeA/teamSizeB | VERIFIED | 24 lines. Calls `TeamManager.getRandomTeamSizes()`, returns `MatchConfig` with `teamSizeA`, `teamSizeB`, and backward-compat `teamSize`. |
| `src/systems/ArenaGenerator.ts` | 5 spawn points per side | VERIFIED | `spawnA` array has 5 entries (lines 71-77), `spawnB` array has 5 entries (lines 79-85). 5th entries at x=80 and x=ARENA_WIDTH-80 respectively. |
| `src/systems/TeamBalancer.ts` | computeMultiplier() + applyToStats() | VERIFIED | 40 lines. `computeMultiplier(smallerSize, largerSize, playerMMR)` implements full formula with MMR factor. `applyToStats(stats, multiplier)` returns new HeroStats with scaled maxHP/damage, armor untouched. |
| `src/ai/AIPersonality.ts` | MMR_TIERS + applyMMRModifiers() | VERIFIED | `MMRTier` interface exported. `MMR_TIERS` readonly array with 6 tiers (Bronze through Master). `applyMMRModifiers()` static method scales aggressiveness and retreatThreshold with clamping. |
| `src/ai/AIController.ts` | selectTarget with focus penalty, currentTarget getter | VERIFIED | 293 lines. Constructor accepts `profileOverride`. `update()` accepts optional `targetCountMap`. `selectTarget()` uses scoring with `focusPenalty + jitter`. `currentTarget` getter at line 30. |
| `src/scenes/BattleScene.ts` | Scaling, enemy-only MMR AI, targetCountMap, showCompositionBanner | VERIFIED | 549 lines. Scaling computed and applied in spawn loops (lines 109-141). Enemy-only MMR modifiers (lines 150-161). targetCountMap rebuilt per AI tick (lines 304-319). showCompositionBanner private method (lines 240-277). |
| `src/systems/EventBus.ts` | MATCH_COMPOSITION_SET event | VERIFIED | Line 32: `MATCH_COMPOSITION_SET: 'match:composition_set'` in Events object. |
| `src/constants.ts` | TEAM_BALANCE config + FOCUS_PENALTY_PER_ATTACKER | VERIFIED | `TEAM_BALANCE` block at lines 61-67. `FOCUS_PENALTY_PER_ATTACKER = 0.2` at line 26. |
| `src/types.ts` | MatchConfig interface + MatchResult teamSizeA/teamSizeB | VERIFIED | `MatchConfig` interface at lines 109-118 with all required fields. `MatchResult` has `teamSizeA?: number` and `teamSizeB?: number` at lines 130-131 (optional for backward compat). |
| `src/heroes/HeroRegistry.ts` | statsOverride parameter on create() | VERIFIED | 7th param `statsOverride?: HeroStats` in `create()` method (line 7). Uses `statsOverride ?? heroDataMap[heroId]` for stats lookup (line 8). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| BattleScene.ts | TeamBalancer.ts | `TeamBalancer.computeMultiplier()` called before spawn loops | WIRED | Line 113: `const scalingMultiplier = TeamBalancer.computeMultiplier(smallerSize, largerSize, playerData.mmr);` Import at line 10. |
| BattleScene.ts | TeamBalancer.ts | `TeamBalancer.applyToStats()` in both team spawn loops | WIRED | Lines 121 and 136: `TeamBalancer.applyToStats(baseStats, scalingMultiplier)`. Both conditional on team being smaller. |
| BattleScene.ts | HeroRegistry.ts | `HeroRegistry.create(..., scaledStats)` with 7th param | WIRED | Lines 123 and 138: `HeroRegistry.create(this, heroId, spawn.x, spawn.y, team, isPlayer, scaledStats)`. |
| HeroRegistry.ts | Hero.ts | `new Hero(scene, x, y, stats, team, isPlayer)` where stats may be overridden | WIRED | Line 12: `return new Hero(scene, x, y, stats, team, isPlayer)` where `stats = statsOverride ?? heroDataMap[heroId]`. |
| BattleScene.ts | AIPersonality.ts | `applyMMRModifiers()` called only for enemy team AI | WIRED | Line 157: `AIPersonality.applyMMRModifiers(baseProfile, playerData.mmr)` guarded by `isEnemy` check at line 155. Import at line 12. |
| BattleScene.ts | AIController.ts | `ai.update(this.targetCountMap)` in AI update loop | WIRED | Line 317: `ai.update(this.targetCountMap)`. Map rebuilt from alive targets at lines 305-312. |
| AIController.ts | Hero.ts | `hero.getUniqueId()` as targetCountMap key | WIRED | Line 109: `targetCountMap.get(e.getUniqueId())`. `getUniqueId()` implemented in Hero.ts line 445. |
| MatchOrchestrator.ts | TeamManager.ts | `TeamManager.getRandomTeamSizes()` + `generateTeams()` | WIRED | Lines 7-8: destructured call to both methods. Import at line 2. |
| BattleScene.ts | EventBus.ts | `EventBus.emit(Events.MATCH_COMPOSITION_SET, ...)` | WIRED | Line 201: emit with teamSizeA, teamSizeB, scalingMultiplier payload. Event constant imported from line 18. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| ASYM-01: System randomly assigns team sizes each match | SATISFIED | Team sizes drawn independently 1-5 per side; banner displays composition. Human needs to visually confirm banner rendering. |
| ASYM-02: Solo/smaller team receives MMR-adaptive scaling | SATISFIED | TeamBalancer.computeMultiplier() provides ratio-based scaling reduced at high MMR. Applied to maxHP and damage before hero instantiation. |
| ASYM-03: AI teammates distribute targets to prevent focus-fire | SATISFIED | Focus penalty (0.2 per attacker overlap) + random jitter in selectTarget(). targetCountMap rebuilt per tick from alive targets only. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in any Phase 3 files |

Zero TODO/FIXME/PLACEHOLDER markers. Zero empty implementations. Zero stub returns. Zero console.log-only handlers.

### TypeScript Compilation

`npx tsc --noEmit` passes with zero errors. All Phase 3 changes compile cleanly.

### Git Commits Verified

All 10 Phase 3 commits exist in git history:

1. `3e266d2` feat(03-01): rework TeamManager and expand types
2. `a9abc80` feat(03-01): update MatchOrchestrator and expand ArenaGenerator
3. `02b7c3a` feat(03-02): add TEAM_BALANCE constants and TeamBalancer
4. `50d0e32` feat(03-02): add optional statsOverride to HeroRegistry
5. `0963032` feat(03-02): wire TeamBalancer scaling in BattleScene
6. `336a83b` feat(phase-03-03): MMR-adaptive AI difficulty profiles
7. `cc58fc9` feat(phase-03-04): AI target distribution with focus penalty
8. `e0a9c2b` feat(phase-03-05): composition banner and event

### Human Verification Required

### 1. Composition Banner Visual Check (ASYM-01)

**Test:** Start 4-5 matches. Observe the banner that appears at match start.
**Expected:** A centered banner reading "TEAM COMPOSITION" with a large "X vs Y" text appears on screen. It fades out after ~3 seconds. Across multiple matches, team sizes vary (not always the same composition).
**Why human:** Visual rendering, text sizing, animation timing, and randomness distribution cannot be verified through code inspection.

### 2. Stat Scaling Observability (ASYM-02)

**Test:** In a match where your team is smaller (e.g., "1 vs 3"), observe your hero's HP bar relative to enemies. Then play an equal-size match and compare.
**Expected:** In the asymmetric match, your hero's HP bar should represent more total HP than in the equal match. Damage dealt should also be noticeably higher.
**Why human:** Stat values are computed before instantiation -- confirming they are "visibly higher" requires observing gameplay behavior and damage numbers.

### 3. AI Target Distribution (ASYM-03)

**Test:** In a match with 3+ enemy AI heroes and 2+ targets on your team, observe AI behavior over 30+ seconds.
**Expected:** Enemy AIs should not all converge on the same target simultaneously. At least two different targets should be engaged when multiple targets are alive. When only one target remains, all correctly focus that target.
**Why human:** AI targeting is probabilistic with jitter; verification requires observing multiple decision cycles in real-time to confirm distribution.

### 4. Regression Check

**Test:** Play a full match to completion.
**Expected:** 5-minute timer counts down correctly. Heroes respawn after death. All abilities (Q/W/E/R) function. HUD shows HP, mana, XP bar, ability bar, match timer. No crashes.
**Why human:** Full integration test across all Phase 1 and Phase 2 features requires gameplay observation.

### Gaps Summary

No gaps found in automated verification. All 7 observable truths are verified at the code level:

- Team sizes are independently randomized (1-5 per side)
- MatchConfig carries teamSizeA/teamSizeB with backward-compat teamSize
- TeamBalancer computes MMR-adaptive multiplier and applies to HP/damage only
- Scaling is injected before hero instantiation via statsOverride (heroDataMap never mutated)
- Enemy AI receives MMR-modified profiles; friendly AI stays at baseline
- AI target distribution uses focus penalty + jitter with per-tick targetCountMap rebuild
- Composition banner renders "X vs Y" and auto-dismisses; MATCH_COMPOSITION_SET event is emitted

All artifacts exist, are substantive (not stubs), and are wired together. TypeScript compiles with zero errors. The only remaining verification is human observation of visual rendering, AI behavior distribution, and gameplay regression testing.

---

_Verified: 2026-02-23T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
