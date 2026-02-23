# Phase 8: Draft & Ranked - Research

**Researched:** 2026-02-23
**Domain:** Phaser 3 interactive UI scenes, pick-from-N hero selection, MMR persistence, rank tier display
**Confidence:** HIGH

## Summary

Phase 8 adds a hero draft pick step and a flat ±40 MMR ladder. The codebase already has substantial scaffolding for both: `DraftScene` exists as a "show teams" screen that needs to be converted to a "pick your hero" screen; `ResultScene` already renders MMR changes and a rank badge; `MenuScene` already shows rank and MMR; `RANK_THRESHOLDS` already exists in `constants.ts` (but has 6 tiers, not 5 — see pitfall); `StorageManager.saveMatchResult()` already applies `mmrChange`; and `MMRCalculator` exists but uses an ELO formula instead of the flat ±40 required by RANK-02.

The core work is (1) converting `DraftScene.create()` from a passive team viewer to an interactive pick-from-3 card selector, (2) replacing `MMRCalculator.calculate()` with a flat ±40 rule, (3) aligning `RANK_THRESHOLDS` to the five required tiers (Bronze/Silver/Gold/Platinum/Apex), and (4) verifying that `MenuScene` and `ResultScene` already correctly consume the updated thresholds. No new libraries or scene registrations are needed — the entire feature set is achievable with existing Phaser 3 APIs and existing project infrastructure.

The highest-risk item is the DraftScene refactor: the current scene generates `matchConfig` (including `playerHero`) via `MatchOrchestrator.generateMatch()` at the top of `create()`, then displays the pre-assigned player hero. The new flow must defer hero assignment until after the player picks. This requires splitting `MatchOrchestrator` responsibilities: generate everything except `playerHero` and `teamA` first, present 3 random hero choices, then finalize `teamA` (and `playerHero`) based on the player's selection before transitioning to `BattleScene`.

**Primary recommendation:** Refactor `DraftScene` to a pick-from-3 interactive selector with a 25-second countdown and auto-pick. Replace `MMRCalculator` with a flat ±40 function. Align `RANK_THRESHOLDS` to exactly 5 tiers. All display surfaces (MenuScene, ResultScene) already work correctly once the thresholds and MMR delta are correct.

---

## Standard Stack

### Core (no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.90.0 | Scene management, tweens, timers, input | Project core — all existing patterns |
| TypeScript | 5.x | Type safety | Already configured |

### Phaser APIs Used
| API | Purpose |
|-----|---------|
| `this.time.addEvent({ delay, callback, loop })` | Countdown ticker (1-second interval) |
| `this.time.delayedCall(ms, fn)` | Auto-pick when countdown expires |
| `hitArea.setInteractive({ useHandCursor: true })` | Clickable cards — exact pattern from existing `createButton()` |
| `this.tweens.add(...)` | Card highlight/selection animations — same pattern as `animateIn()` |
| `this.cameras.main.fadeOut(400, ...)` | Scene transition — same pattern as existing `startBattle()` |
| `this.scene.start('BattleScene', { matchConfig })` | Data passing — same pattern already in use |
| `localStorage` (via `StorageManager`) | MMR persistence — already in use |

### No New Dependencies
Everything needed is already present. Do not install any additional packages.

---

## Architecture Patterns

### Existing Scene Flow (Current)
```
MenuScene  →  DraftScene (show teams, press START)  →  BattleScene  →  ResultScene  →  MenuScene
```

### New Scene Flow (Phase 8)
```
MenuScene  →  DraftScene (pick 1 of 3 heroes, countdown)  →  BattleScene  →  ResultScene  →  MenuScene
```
The transition mechanics are unchanged. Only the DraftScene interior logic changes.

### Recommended File Changes
```
src/
  constants.ts                # Replace RANK_THRESHOLDS (6 tiers → 5 tiers with Apex top)
                              # Add DRAFT_PICK_TIMEOUT = 25 (seconds)
                              # Replace MMR_K_FACTOR usage documentation
  utils/
    MMRCalculator.ts          # Replace ELO formula with flat ±40 (draw = 0)
  systems/
    MatchOrchestrator.ts      # Add generateMatchPartial() — returns config WITHOUT playerHero/teamA
                              # (or refactor generateMatch() to accept playerHeroId param)
  scenes/
    DraftScene.ts             # Major refactor: interactive pick-from-3, countdown, auto-pick
  heroes/
    heroData.ts               # No changes needed — heroIds already exported
  types.ts                    # No changes needed — MatchConfig already has all fields
```

### Pattern 1: DraftScene Pick-from-3 Flow

**What:** Generate a partial match config (team B, arena, trait, gems for non-player heroes). Pick 3 random hero IDs from the full pool (`HeroRegistry.getAllHeroIds()`), excluding heroes already on team B. Present 3 card options. On pick (or auto-pick), finalize `playerHero`, build `teamA`, add gem assignment for player hero, then start BattleScene.

**When to use:** Any time DraftScene transitions to BattleScene.

**Example structure:**
```typescript
// Source: project pattern (DraftScene.ts + HeroRegistry.ts + MatchOrchestrator.ts)

create(): void {
  // Step 1: Generate partial config (teamB, arena, trait, gems for teamB)
  const partial = MatchOrchestrator.generatePartialMatch();
  // partial has: teamB, arenaTheme, arenaLayout, traitId, gemAssignments (teamB only)

  // Step 2: Pick 3 hero candidates (exclude teamB heroes)
  const candidates = this._pickThreeCandidates(partial.teamB);

  // Step 3: Render the 3 pick cards
  this._renderPickCards(candidates, partial);

  // Step 4: Start countdown timer
  this._startCountdown(candidates, partial);
}

private _pickThreeCandidates(excludeIds: string[]): string[] {
  const all = HeroRegistry.getAllHeroIds();       // heroIds array, already exported
  const pool = all.filter(id => !excludeIds.includes(id));
  // Fisher-Yates shuffle then slice 3
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

private _confirmPick(heroId: string, partial: PartialMatchConfig): void {
  const matchConfig = MatchOrchestrator.finalizeMatch(heroId, partial);
  this.cameras.main.fadeOut(400, 0, 0, 0, (_cam, progress) => {
    if (progress === 1) {
      this.scene.start('BattleScene', { matchConfig });
    }
  });
}
```

### Pattern 2: Countdown Timer with Auto-Pick

**What:** Display a numeric countdown (25 → 0). On expiry, auto-pick the first candidate. Uses `this.time.addEvent` for per-second updates and `this.time.delayedCall` for the final auto-pick.

**Example:**
```typescript
// Source: Phaser 3 docs — this.time.addEvent (official API)
private _startCountdown(candidates: string[], partial: PartialMatchConfig): void {
  let remaining = DRAFT_PICK_TIMEOUT; // 25

  const timerText = this.add.text(GAME_WIDTH / 2, 660, `${remaining}`, {
    fontSize: '28px', color: '#ffaa00', fontFamily: 'monospace', fontStyle: 'bold',
  }).setOrigin(0.5);

  this._countdownEvent = this.time.addEvent({
    delay: 1000,
    repeat: DRAFT_PICK_TIMEOUT - 1,
    callback: () => {
      remaining--;
      timerText.setText(`${remaining}`);
      if (remaining <= 5) timerText.setColor('#ff4444'); // urgency color
    },
  });

  // Auto-pick: fires once after full timeout
  this._autoPick = this.time.delayedCall(DRAFT_PICK_TIMEOUT * 1000, () => {
    this._confirmPick(candidates[0], partial);
  });
}

// On manual pick — cancel timers before transitioning
private _onCardClicked(heroId: string, partial: PartialMatchConfig): void {
  this._countdownEvent?.remove();
  this._autoPick?.remove();
  this._confirmPick(heroId, partial);
}
```

### Pattern 3: Interactive Pick Card

**What:** Each of the 3 hero cards is a clickable area using the exact `createButton()` pattern already in DraftScene. Highlight (border color change + scale pulse) on hover; lock (glow stays on, other 2 dim) on click.

**Example:**
```typescript
// Source: project pattern — DraftScene.createButton() and animateIn()
private _renderPickCard(cx: number, y: number, heroId: string, onPick: () => void): void {
  const heroData = heroDataMap[heroId];
  const cardW = 340, cardH = 200;

  // Background
  const bg = this.add.graphics();
  bg.fillStyle(0x1a1a2a, 0.85);
  bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 10);

  // Border (highlight on hover)
  const border = this.add.graphics();
  border.lineStyle(2, heroData.color, 0.5);
  border.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 10);

  // Invisible hit area
  const hitArea = this.add.rectangle(cx, y, cardW, cardH)
    .setInteractive({ useHandCursor: true })
    .setAlpha(0.001);

  hitArea.on('pointerover', () => {
    border.clear();
    border.lineStyle(3, heroData.color, 1.0);
    border.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 10);
    this.tweens.add({ targets: [bg, border], scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Sine.easeOut' });
  });

  hitArea.on('pointerout', () => {
    border.clear();
    border.lineStyle(2, heroData.color, 0.5);
    border.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 10);
    this.tweens.add({ targets: [bg, border], scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeOut' });
  });

  hitArea.on('pointerdown', onPick);
  // ... render name, archetype, abilities inside card
}
```

### Pattern 4: MatchOrchestrator Partial/Finalize Split

**What:** `generateMatch()` currently does everything. Split into two functions to support the pick-from-3 flow.

**Example:**
```typescript
// Source: project — MatchOrchestrator.ts (current logic)

static generatePartialMatch(): PartialMatchConfig {
  const { sizeA: teamSizeA, sizeB: teamSizeB } = TeamManager.getRandomTeamSizes();
  const { teamB } = TeamManager.generateTeamBOnly(teamSizeB);
  const arenaTheme = ARENA_THEMES[Math.floor(Math.random() * ARENA_THEMES.length)];
  const arenaLayout = ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)];
  const heroPassiveIds = teamB.map(id => heroDataMap[id]?.passive?.id).filter(Boolean) as string[];
  const selectedTrait = TraitSystem.selectTrait(heroPassiveIds);

  // Assign gems only to teamB for now
  const gemAssignments: Record<string, string> = {};
  for (const heroId of teamB) {
    gemAssignments[heroId] = GEMS[Math.floor(Math.random() * GEMS.length)].id;
  }

  return { teamSizeA, teamSizeB, teamB, arenaTheme, arenaLayout, traitId: selectedTrait.id, gemAssignments };
}

static finalizeMatch(playerHero: string, partial: PartialMatchConfig): MatchConfig {
  // Build teamA: playerHero first, then fill remaining slots
  const usedHeroes = [playerHero, ...partial.teamB];
  const teamA: string[] = [playerHero];
  for (let i = 1; i < partial.teamSizeA; i++) {
    const heroId = HeroRegistry.getRandomHeroId(usedHeroes);
    usedHeroes.push(heroId);
    teamA.push(heroId);
  }

  // Assign gem to player hero and any new teamA members
  const gemAssignments = { ...partial.gemAssignments };
  for (const heroId of teamA) {
    if (!gemAssignments[heroId]) {
      gemAssignments[heroId] = GEMS[Math.floor(Math.random() * GEMS.length)].id;
    }
  }

  return {
    teamSizeA: partial.teamSizeA,
    teamSizeB: partial.teamSizeB,
    teamSize: Math.max(partial.teamSizeA, partial.teamSizeB),
    teamA,
    teamB: partial.teamB,
    playerHero,
    arenaTheme: partial.arenaTheme,
    arenaLayout: partial.arenaLayout,
    traitId: partial.traitId,
    gemAssignments,
  };
}
```

### Pattern 5: Flat ±40 MMR Replacement

**What:** Replace the ELO formula in `MMRCalculator.calculate()` with a flat ±40 shift. Draw = 0 (no change).

**Example:**
```typescript
// Source: Phase 8 spec (RANK-02) — flat shift requirement
static calculate(_currentMMR: number, won: boolean, draw: boolean, _playerData: PlayerData): number {
  if (draw) return 0;
  return won ? 40 : -40;
}
```

Note: `StorageManager.saveMatchResult()` already clamps: `data.mmr = Math.max(0, data.mmr)` — so the floor at 0 is already handled. No changes needed to `StorageManager`.

### Pattern 6: RANK_THRESHOLDS — 5 Tiers

**What:** Replace the current 6-tier table (Bronze/Silver/Gold/Platinum/Diamond/Master) with the 5 required tiers (Bronze/Silver/Gold/Platinum/Apex). Starting MMR is 1000, and the flat ±40 shift moves the ladder quickly.

**Recommended thresholds** (designed so a new player at MMR 1000 is Gold, giving headroom both up and down):

```typescript
// Source: Phase 8 spec (RANK-01) — tier names specified; thresholds are design discretion
export const RANK_THRESHOLDS = [
  { name: 'Bronze',   minMMR: 0,    color: 0xCD7F32 },
  { name: 'Silver',   minMMR: 800,  color: 0xC0C0C0 },
  { name: 'Gold',     minMMR: 1000, color: 0xFFD700 },
  { name: 'Platinum', minMMR: 1200, color: 0x00CED1 },
  { name: 'Apex',     minMMR: 1500, color: 0xFF4500 },
] as const;
```

This places the starting MMR of 1000 at the bottom of Gold. After 5 wins the player reaches Platinum (1200). After 12+ wins from start they reach Apex (1500+). Bronze starts at 0 so even a losing streak never strands a player without a tier.

### Anti-Patterns to Avoid

- **Re-calling `MatchOrchestrator.generateMatch()` from inside BattleScene as a fallback when no matchConfig is passed:** The current BattleScene `create()` has `this.matchConfig = data?.matchConfig ?? MatchOrchestrator.generateMatch()`. After Phase 8 the DraftScene ALWAYS passes a matchConfig — the fallback is OK to keep as defensive code, but it must never be the normal path.
- **Generating full matchConfig before the player picks:** The old `DraftScene.create()` called `MatchOrchestrator.generateMatch()` at the top and assigned `playerHero` from the result. This must be replaced — the player's hero choice drives `playerHero`, not the other way around.
- **Using `scene.stop()` + `scene.start()` on shutdown:** The project consistently uses `this.scene.start('X', data)` which handles shutdown implicitly. Do not call `this.scene.stop()` manually.
- **Calling `this.input.keyboard!.removeAllKeys()` before the tween completes:** See DraftScene's `startBattle()` — it removes keys before the fade. This is fine. Replicate this pattern: cancel timers AND remove keys before starting fade-out.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timer countdown | Custom `update()` loop with frame counting | `this.time.addEvent({ delay: 1000, repeat: N, callback })` | Phaser's Clock is scene-lifecycle-aware; pauses with scene; no manual delta math |
| Random unique hero selection | Custom shuffle | Fisher-Yates on `HeroRegistry.getAllHeroIds()` filtered by exclude list | Already pattern in `TeamManager.generateTeams()` |
| MMR persistence | IndexedDB, cookies, server calls | `StorageManager.save()` / `StorageManager.load()` via `localStorage` | Already in use for all player data |
| Rank lookup | Binary search, switch statements | The existing `getRank()` loop pattern in `MenuScene` and `ResultScene` | Already correct and DRY — extract to a shared utility if duplicated |
| Card hover effects | DOM overlays, CSS | Phaser `setInteractive()` + `pointerover`/`pointerout` events + tweens | Same pattern as `createButton()` — already proven in DraftScene |

**Key insight:** The existing codebase has already built 90% of the needed infrastructure. Phase 8 is primarily a recombination of existing patterns, not new invention.

---

## Common Pitfalls

### Pitfall 1: RANK_THRESHOLDS Has 6 Tiers, Not 5
**What goes wrong:** `constants.ts` currently defines Bronze/Silver/Gold/Platinum/Diamond/Master — 6 tiers. The spec requires Bronze/Silver/Gold/Platinum/Apex — 5 tiers. If not updated, the rank display will show "Diamond" and "Master" instead of "Apex".
**Why it happens:** Phase 8 specifies the tier names but the previous placeholder was a different design.
**How to avoid:** Replace `RANK_THRESHOLDS` array entirely. The `getRank()` loop in `MenuScene` and `ResultScene` is threshold-agnostic — it will work correctly with any number of tiers once the constant is updated.
**Warning signs:** Any reference to `Diamond` or `Master` rank names in tests or UI.

### Pitfall 2: MMRCalculator Uses ELO — Must Be Flat ±40
**What goes wrong:** `MMRCalculator.calculate()` currently uses ELO (K=32 factor against simulated opponent MMR). With ELO, wins at high MMR give less than 40 points and wins against "weaker" opponents give much less. The spec requires exactly ±40 per match.
**Why it happens:** ELO was a reasonable placeholder from an earlier phase.
**How to avoid:** Replace the function body with `return won ? 40 : draw ? 0 : -40`. The function signature can stay the same (even if parameters become unused) to avoid call-site changes.
**Warning signs:** MMR changing by amounts other than 0, 40, or -40 after a match.

### Pitfall 3: Timer Not Cancelled on Manual Pick
**What goes wrong:** Player clicks a card, `_confirmPick()` starts the fadeOut, but the `delayedCall` auto-pick fires 3 seconds later mid-transition and calls `this.scene.start()` again, corrupting state.
**Why it happens:** Phaser timers are not automatically cancelled when you start a scene transition — the scene runs its shutdown lifecycle, but `delayedCall` callbacks that fire before shutdown completes can still execute.
**How to avoid:** Always call `this._countdownEvent?.remove()` and `this._autoPick?.remove()` immediately at the top of `_onCardClicked()` before any other logic.
**Warning signs:** Intermittent double scene-start errors or undefined `this.matchConfig` in BattleScene.

### Pitfall 4: Hero Pool Too Small for Pick-from-3
**What goes wrong:** With 13 heroes total and a team B of up to 5, the pick pool is at minimum 8. With 3 needed for the draft, there is always sufficient supply. However, if `teamSizeB` is very large (5), the pool is still 8 unique heroes (13 - 5), so no problem.
**Why it happens:** Not a practical issue with 13 heroes and at most 5 on team B.
**How to avoid:** No special handling needed — assert or log if pool < 3 as defensive coding.

### Pitfall 5: 30-Second Transition Requirement (Success Criterion 4)
**What goes wrong:** The spec says "draft completes and transitions to BattleScene in under 30 seconds." The DraftScene has a 25-second countdown plus the fade animation. Total time budget: 25s countdown + <1s fade = ~26s. This passes the criterion.
**Why it happens:** Criterion is a ceiling, not a floor. Setting the timer to 25s gives 5 seconds margin.
**How to avoid:** Keep `DRAFT_PICK_TIMEOUT = 25`. Do not set it to 30 or higher.

### Pitfall 6: MatchConfig Type Needs No Changes
**What goes wrong:** Attempting to add a `draftCandidates` field to `MatchConfig` or creating a separate type hierarchy.
**Why it happens:** Over-engineering the partial/finalize split.
**How to avoid:** The partial config is an internal DraftScene concern. `MatchConfig` (the type passed to BattleScene) stays exactly as defined. Introduce a local `PartialMatchConfig` type in `MatchOrchestrator.ts` only — it never leaves that file boundary.

---

## Code Examples

Verified patterns from existing codebase:

### Scene Data Passing (already working in project)
```typescript
// Source: DraftScene.ts startBattle() — confirmed working pattern
this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
  if (progress === 1) {
    this.scene.start('BattleScene', { matchConfig: this.matchConfig });
  }
});

// Receiving in BattleScene.create() — already working
create(data?: { matchConfig?: MatchConfig }): void {
  this.matchConfig = data?.matchConfig ?? MatchOrchestrator.generateMatch();
  // ...
}
```

### StorageManager MMR Update (already working)
```typescript
// Source: StorageManager.ts saveMatchResult() — no changes needed
static saveMatchResult(result: MatchResult): void {
  const data = this.load();
  data.mmr += result.mmrChange;       // applies the ±40
  data.mmr = Math.max(0, data.mmr);  // floor at 0
  // ... rest of history tracking
  this.save(data);
}
```

### Rank Lookup (already working in MenuScene and ResultScene)
```typescript
// Source: MenuScene.ts / ResultScene.ts — identical implementation in both
// Note: This is duplicated — consider extracting to StorageManager or a shared util
private getRank(mmr: number): { name: string; minMMR: number; color: number } {
  let rank = RANK_THRESHOLDS[0];
  for (const r of RANK_THRESHOLDS) {
    if (mmr >= r.minMMR) rank = r;
  }
  return rank;
}
```

### Phaser Repeating Timer (from official API)
```typescript
// Source: Phaser 3 docs — this.time.addEvent
const event = this.time.addEvent({
  delay: 1000,           // ms per tick
  repeat: 24,            // fires 25 times total (0→24), covering a 25s countdown
  callback: onTick,
  callbackScope: this,
});

// Cancel before transition:
event.remove(false);     // false = do not destroy, just remove from clock
```

### Phaser One-Shot Delayed Call
```typescript
// Source: Phaser 3 docs — this.time.delayedCall
const autoPick = this.time.delayedCall(25000, () => {
  this._confirmPick(candidates[0], partial);
}, [], this);

// Cancel before transition:
autoPick.remove(false);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ELO MMR formula (K=32) | Flat ±40 per match | Phase 8 | Predictable, fast ladder movement |
| 6-tier rank table (Bronze–Master) | 5-tier (Bronze–Apex) | Phase 8 | Apex replaces Diamond+Master |
| DraftScene: passive team viewer | DraftScene: active pick-from-3 | Phase 8 | Player has agency over hero choice |
| MatchOrchestrator: full match at once | MatchOrchestrator: partial + finalize | Phase 8 | Supports player-driven hero selection |

**Deprecated/outdated after Phase 8:**
- `MMR_K_FACTOR = 32` constant in `constants.ts`: No longer used after flat ±40 replacement. Remove or leave as dead constant (removal preferred for clarity).
- `RANK_THRESHOLDS` entries for Diamond and Master: Replaced by Apex tier.

---

## Open Questions

1. **Should `getRank()` be extracted from MenuScene and ResultScene into a shared utility?**
   - What we know: Both scenes have identical private `getRank()` methods (lines 146-151 in MenuScene, lines 210-216 in ResultScene). This is code duplication.
   - What's unclear: The phase spec does not require deduplication.
   - Recommendation: Extract to `StorageManager.getRank(mmr)` or a standalone `RankUtils.ts` during the Phase 8 refactor. It touches both scenes anyway (to update tier names), so the incremental cost is low.

2. **What happens to `teamA` size when player picks their hero — does the team fill the remaining slots automatically?**
   - What we know: `TeamManager.generateTeams()` currently fills all of team A, player-first. After the pick-from-3 refactor, the partial match generates `teamSizeA` but not `teamA`. The `finalizeMatch()` step must fill remaining `teamA` slots (slots 2..teamSizeA) with random heroes from the remaining pool.
   - What's unclear: Whether the user experience expects to SEE their teammates before the battle (currently DraftScene shows both teams). The new design may need to show teammates in the pick screen.
   - Recommendation: Show teammates post-pick in a brief "Your Team" section below the pick cards, added after `_confirmPick()` before the fade-out. Or simplify: remove the team preview from DraftScene (Phase 5 added it, but it conflicted with the pick flow). Decision for the planner.

3. **How should draw results affect MMR?**
   - What we know: The spec says "±40 per match." Draws are neither win nor loss.
   - What's unclear: Whether draws should give 0 or some partial amount.
   - Recommendation: Draws = 0 MMR change. This is the established pattern in `MMRCalculator.calculate()` (`actual = 0.5` in ELO maps to near-zero change). The flat system makes 0 for draws the natural choice.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `DraftScene.ts`, `ResultScene.ts`, `MenuScene.ts`, `BattleScene.ts`, `MatchOrchestrator.ts`, `TeamManager.ts`, `HeroRegistry.ts`, `MMRCalculator.ts`, `StorageManager.ts`, `constants.ts`, `types.ts`, `EventBus.ts`
- Phaser 3.90.0 official docs — `this.time.addEvent`, `this.time.delayedCall`, `setInteractive`, `scene.start` data passing patterns

### Secondary (MEDIUM confidence)
- Phaser official examples — `phaser.io/examples/v3/view/scenes/passing-data-to-a-scene` — confirms `scene.start(key, data)` as correct pattern, data received in `create(data)` or `init(data)`
- Phaser official docs — `docs.phaser.io/phaser/concepts/time` — confirms `addEvent` with `repeat` count for countdown tickers

### Tertiary (LOW confidence — no verification needed for this domain)
- Industry MMR tier naming conventions (LoL, Valorant, Rocket League) — consulted for tier name patterns; not authoritative since Rift Clash defines its own names

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; verified all APIs exist in project
- Architecture: HIGH — all patterns derived directly from existing working code in the codebase
- Pitfalls: HIGH — all identified from direct code inspection (existing bugs/mismatches found)
- MMR thresholds: MEDIUM — starting values are design discretion; the math is verified

**Research date:** 2026-02-23
**Valid until:** 2026-04-23 (Phaser 3.90.0 is stable; localStorage APIs are stable)
