# Phase 5: Battle Traits & Gems - Research

**Researched:** 2026-02-23
**Domain:** Data-driven modifier/trait system within an existing Phaser 3 + TypeScript combat architecture
**Confidence:** HIGH

## Summary

Phase 5 adds two new modifier layers to the match: one global Battle Trait affecting all heroes, and one per-hero Gem power-up. Both systems hook into the same EventBus and combat pipeline already used by hero passives (Phase 2). The key architectural insight is that the existing passive system (`subscribePassive` / `onPassiveTrigger` / `applyPassiveEffect` in Hero.ts) is a **hero-scoped** system and should NOT be extended to carry global trait logic. Instead, traits and gems should be standalone systems that subscribe to the same events but operate at different scopes: TraitSystem subscribes once per match (global), GemSystem applies per-hero stat modifications at init time.

The biggest risk is combinatorial explosion: 8+ traits x 13 heroes x 13 passives x N gems = thousands of possible combinations. The research concludes that (1) stat-based traits/gems are safe because they are additive and can be capped, (2) mechanic traits that modify event handling need explicit incompatibility blacklists only for rule-change traits, and (3) all modifier stacking should be additive-then-cap, never multiplicative.

**Primary recommendation:** Use a data-driven registry pattern (plain TypeScript objects/arrays, no class hierarchy) for both TraitRegistry and GemRegistry, with traits applying effects through EventBus listeners at the TraitSystem level and gems applying flat stat modifiers at hero construction time. Keep trait logic OUT of Hero.ts entirely.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | Game framework | Already in use; EventEmitter3 bundled |
| TypeScript | 5.9.3 | Type system | Already in use; discriminated unions for trait categories |
| Vite | 6.4.1 | Bundler | Already in use; no new dependencies needed |

### Supporting (no new dependencies needed)
This phase requires ZERO new npm dependencies. All trait/gem logic is pure TypeScript data structures + EventBus subscriptions. The existing Phaser EventEmitter3 is sufficient for all event-driven trait hooks.

## Architecture Patterns

### Recommended Project Structure
```
src/
  traits/
    TraitRegistry.ts      # Data: all trait definitions (plain objects)
    TraitSystem.ts         # Runtime: subscribes to EventBus, applies active trait effects
    traitData.ts           # Trait definition array (8-12 traits)
  gems/
    GemRegistry.ts         # Data: all gem definitions (plain objects)
    GemSystem.ts           # Runtime: applies gem stat modifiers to heroes at match start
    gemData.ts             # Gem definition array
  systems/
    EventBus.ts            # Existing — add new events if needed
  types.ts                 # Existing — add TraitDef, GemDef, TraitCategory types
```

### Pattern 1: Data-Driven Registry (NOT class-based)

**What:** Define traits and gems as plain TypeScript objects with discriminated union types, not as classes with inheritance.

**When to use:** When the number of variants is moderate (8-20) and behavior differences are captured by data fields rather than polymorphic methods.

**Why NOT class-based:** The existing passive system already shows the pattern: `PassiveDef` is a plain interface with optional fields (`healOnKill?`, `buffOnKill?`, etc.), and `Hero.applyPassiveEffect()` switches on which fields are present. This works well when effects are composable from a small set of primitives (heal, buff, damage modification). Traits follow the same pattern.

**Example TraitDef:**
```typescript
// Source: project architecture analysis
export type TraitCategory = 'stat' | 'mechanic' | 'rule_change';

export interface TraitDef {
  id: string;
  name: string;
  description: string;
  category: TraitCategory;
  // Visual
  color: number;
  icon: string; // emoji or short text for HUD display

  // Stat modifiers (applied globally to all heroes at match start)
  hpMod?: number;           // flat HP adjustment (e.g., +100 or -50)
  damageMod?: number;       // flat damage adjustment
  armorMod?: number;        // flat armor adjustment
  moveSpeedMod?: number;    // flat speed adjustment
  manaRegenMod?: number;    // mana regen rate multiplier (1.0 = normal)
  cooldownMod?: number;     // cooldown multiplier (0.8 = 20% faster)

  // Mechanic hooks (TraitSystem subscribes to events and applies these)
  onHitEffect?: TraitOnHitEffect;
  onKillEffect?: TraitOnKillEffect;
  onDamageTakenEffect?: TraitOnDamageTakenEffect;

  // Rule change (only 1 per match)
  ruleChange?: TraitRuleChange;

  // Incompatibility blacklist: hero passive IDs that conflict
  incompatiblePassives?: string[];
}
```

### Pattern 2: TraitSystem as a Singleton Listener (separate from Hero)

**What:** TraitSystem is instantiated once per match in BattleScene.create(), subscribes to EventBus events, and applies the selected trait's effects globally. It does NOT modify Hero.ts code.

**Why separate from Hero:**
1. Hero.ts already has passive logic with its own cooldown tracking and ownership checks. Adding trait logic inside Hero would create tangled conditionals.
2. Traits are global (one per match, affecting all heroes), while passives are per-hero. Different lifecycle = different system.
3. Cleanup is simpler: TraitSystem.destroy() unsubscribes all its listeners, independent of Hero.destroy().

**Example:**
```typescript
// Source: project architecture pattern (mirrors XPSystem lifecycle)
export class TraitSystem {
  private activeTrait: TraitDef;
  private heroes: Hero[];
  private handlerRefs: { event: string; handler: Function }[] = [];

  constructor(trait: TraitDef, heroes: Hero[]) {
    this.activeTrait = trait;
    this.heroes = heroes;

    // Apply stat modifiers to all heroes at init
    this.applyStatMods();

    // Subscribe mechanic hooks
    if (trait.onHitEffect) {
      const handler = (payload: any) => this.handleOnHit(payload);
      EventBus.on(Events.HERO_HIT, handler, this);
      this.handlerRefs.push({ event: Events.HERO_HIT, handler });
    }
    if (trait.onKillEffect) {
      const handler = (payload: any) => this.handleOnKill(payload);
      EventBus.on(Events.HERO_KILLED, handler, this);
      this.handlerRefs.push({ event: Events.HERO_KILLED, handler });
    }
    if (trait.onDamageTakenEffect) {
      const handler = (payload: any) => this.handleOnDamageTaken(payload);
      EventBus.on(Events.DAMAGE_TAKEN, handler, this);
      this.handlerRefs.push({ event: Events.DAMAGE_TAKEN, handler });
    }
  }

  destroy(): void {
    for (const ref of this.handlerRefs) {
      EventBus.off(ref.event, ref.handler, this);
    }
    this.handlerRefs = [];
  }
}
```

### Pattern 3: Gem as Init-Time Stat Modifier (NOT event-driven)

**What:** Gems apply flat stat modifiers to the hero at match start. They do NOT subscribe to events. This keeps gems simple and avoids the combinatorial explosion of gem + trait + passive all reacting to the same events.

**Why init-time only:**
1. Reduces complexity: only traits and passives respond to combat events; gems are just "you start with +X stat."
2. The success criteria says "stat or ability modifier" -- a flat stat boost qualifies and is safer than event-reactive gems.
3. If a gem modifies an ability (e.g., -20% cooldown on Q), this can be applied once at hero construction without any event subscription.

**Example:**
```typescript
export interface GemDef {
  id: string;
  name: string;
  description: string;
  color: number;
  icon: string;

  // Stat modifiers (applied to assigned hero only)
  hpBonus?: number;
  damageBonus?: number;
  armorBonus?: number;
  moveSpeedBonus?: number;
  manaBonus?: number;
  cooldownReduction?: number; // multiplier: 0.9 = 10% CDR, applied to all abilities
  attackRangeBonus?: number;
  lifestealPercent?: number;  // simple: heal X% of auto-attack damage
}
```

### Pattern 4: Trait Selection in MatchOrchestrator (not BattleScene)

**What:** The trait and gem selections happen in `MatchOrchestrator.generateMatch()`, which already generates team compositions and arena config. The selected trait ID and per-hero gem IDs are added to `MatchConfig`, so DraftScene can display them before BattleScene instantiates them.

**Why:** DraftScene needs to show the trait before the match starts (success criteria #1). Currently DraftScene calls `MatchOrchestrator.generateMatch()` and receives a `MatchConfig`. Adding `traitId` and `gemAssignments` to that config object is the natural extension.

**Example MatchConfig extension:**
```typescript
export interface MatchConfig {
  // ... existing fields ...
  traitId: string;                           // selected Battle Trait ID
  gemAssignments: Record<string, string>;    // heroId -> gemId mapping
}
```

### Anti-Patterns to Avoid

- **Modifying Hero.ts for trait logic:** Traits are global, not per-hero. Adding trait conditionals inside Hero.applyPassiveEffect() creates coupling that makes both systems harder to change independently.

- **Multiplicative stacking of damage modifiers:** If a trait gives +20% damage AND a gem gives +15% damage AND a passive gives +20% on hit, multiplicative stacking (1.2 * 1.15 * 1.2 = 1.656x) can snowball. Use additive stacking with a cap.

- **Trait effects that bypass takeDamage():** All damage in the system flows through `BaseEntity.takeDamage()`. Trait effects that deal damage must call this method, not directly modify `currentHP`. This preserves the armor calculation, shield absorption, and death-path consistency.

- **Subscribing trait handlers with `this` context of Hero:** The passive system uses `EventBus.on(event, handler, this)` where `this` is the Hero instance. TraitSystem must use its own `this` context. Mixing contexts will break `EventBus.off()` cleanup (Phaser's EventEmitter3 matches by function reference AND context).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event subscription/cleanup | Custom observer pattern | EventBus (Phaser EventEmitter3) | Already proven across 4 phases; cleanup pattern established |
| Random selection with weighting | Custom RNG | `Phaser.Math.Between()` or `Math.random()` | Simple uniform random is sufficient; no weighting needed for MVP |
| Buff/debuff application | New buff system | Existing `BaseEntity.addBuff()` + `BuffType` enum | Trait effects that apply buffs should use the same system |
| Cooldown reduction | Manual timer math | Multiply `ability.cooldown` by reduction factor at init | One-time application, no per-frame tracking needed |
| Damage modification | Intercept damage pipeline | Apply as stat buff (STAT_BUFF) or modify `hero.stats.damage` at init | Keeps the existing damage flow through `takeDamage()` intact |

**Key insight:** The project already has all the primitives needed (EventBus, buff system, stat fields). Traits and gems compose these primitives rather than creating new ones.

## Common Pitfalls

### Pitfall 1: Combinatorial Exploit (Trait + Passive + Gem)
**What goes wrong:** A specific combination eliminates a core constraint. Example: "Blink Reset on Kill" trait + Lightning Duelist passive (cooldown reset on kill) + CDR gem = permanent ability spam with zero cooldowns.
**Why it happens:** Each modifier is balanced in isolation but their intersection removes a constraint entirely.
**How to avoid:**
1. Define an incompatibility blacklist per trait: `incompatiblePassives: ['ld_passive']` on the "blink reset" trait.
2. During trait selection in MatchOrchestrator, check if any hero in the match has a blacklisted passive; if so, re-roll the trait.
3. Cap CDR at 40% minimum cooldown (multiply all cooldowns by `Math.max(0.6, reductionFactor)`).
4. Cap total bonus damage at +60 flat from trait+gem combined (separate from level scaling).
**Warning signs:** Any hero reaching 0s effective cooldown on any ability, or any hero gaining more than 2x their base damage through modifiers alone.

### Pitfall 2: Trait Event Handler Ordering vs Revival Token
**What goes wrong:** The revival token check in `BattleScene.onHeroKilled()` runs BEFORE kill counting (this is correct per [04-04]). But if a TraitSystem handler also listens to HERO_KILLED and grants rewards (e.g., "heal on kill" trait), it must also respect the revival token consuming the death.
**Why it happens:** EventEmitter3 fires listeners in subscription order. The revival token handler might run before or after the trait handler depending on when each subscribes.
**How to avoid:**
1. TraitSystem subscribes to HERO_KILLED AFTER BattleScene does (subscribe in BattleScene.create() after the existing `EventBus.on(Events.HERO_KILLED, ...)` call).
2. In the HERO_KILLED payload, add a `revived: boolean` field that BattleScene sets to true when the revival token is consumed. TraitSystem checks this field and skips its effect if `revived === true`.
3. Alternative: TraitSystem listens to a different event or checks `victim.isAlive` (which is true after revival).
**Warning signs:** Kill-triggered trait effects firing when a hero was actually revived.

### Pitfall 3: Stat Modifier Cleanup on Match Restart
**What goes wrong:** Trait stat modifiers (e.g., +100 HP to all heroes) are applied by mutating `hero.stats.maxHP` directly. On match restart, if these mutations persist (module-level state), heroes start with inflated stats.
**Why it happens:** `hero.stats` is passed from `heroDataMap`, and if the trait system mutates the shared object instead of a copy, the mutation persists.
**How to avoid:**
1. BattleScene already creates hero stats copies via `TeamBalancer.applyToStats()` or `{ ...baseStats }`. Trait/gem modifications must be applied AFTER this copy is made, on the per-match instance.
2. TraitSystem and GemSystem should modify `hero.stats.*` fields on the Hero instance (which is created fresh per match), NEVER modify `heroDataMap` entries.
3. Verify: `heroDataMap` values are never mutated. The current code uses spread (`{ ...baseStats }`) in BattleScene.create(), which is correct.
**Warning signs:** Starting a second match and seeing heroes with higher-than-expected base stats.

### Pitfall 4: Trait Affecting Non-Hero Entities
**What goes wrong:** A trait like "all attacks apply burn DoT" subscribes to HERO_HIT. But HERO_HIT fires when heroes attack bosses and towers too (CombatSystem.tryAutoAttack emits HERO_HIT for all targets). The trait handler applies a buff to the victim, but BaseEntity (boss/tower) does NOT have the same buff processing as Hero.
**Why it happens:** HERO_HIT payload contains `{ attacker: Hero, victim: BaseEntity, damage }`. The victim may be a BossEntity or TowerEntity, not a Hero.
**How to avoid:**
1. In trait handlers that apply buffs to victims, always check: `if (victim.entityType !== 'hero') return;`
2. For traits that modify damage, check entity type before applying effects.
3. The existing code already has this pattern: `CombatSystem` line 94 comments "Do NOT apply buffs to boss/tower (buff system is hero-only)."
**Warning signs:** Runtime errors when calling `victim.addBuff()` on an entity that supports it but doesn't process the buff in its update loop.

### Pitfall 5: Gem CDR Stacking with Passive CDR
**What goes wrong:** A gem applies 10% CDR. Lightning Duelist's passive resets all cooldowns on kill. Combined with any CDR, the duelist has near-permanent uptime on abilities.
**Why it happens:** CDR gems are powerful force multipliers on heroes with cooldown-related passives.
**How to avoid:**
1. CDR gems should NOT exist for MVP. Use flat stat bonuses only (HP, damage, armor, move speed, mana, attack range).
2. If CDR gems are implemented later, apply a hard floor: `ability.cooldown = Math.max(ability.cooldown * cdrFactor, ability.cooldown * 0.7)` -- max 30% reduction.
3. The safest gem modifiers are: +flat HP, +flat damage, +flat armor, +flat move speed, +flat mana, +flat attack range.
**Warning signs:** Any ability reaching sub-2s effective cooldown through modifier stacking.

### Pitfall 6: DraftScene Data Flow
**What goes wrong:** DraftScene calls `MatchOrchestrator.generateMatch()` and then passes the config to BattleScene via `scene.start('BattleScene', { matchConfig })`. If trait/gem data is generated separately or lazily, DraftScene cannot display it.
**Why it happens:** The current flow generates all match config in one call. Adding trait/gem selection must happen in the same call, not deferred to BattleScene.
**How to avoid:** Extend `MatchOrchestrator.generateMatch()` to include trait selection and gem assignment. The MatchConfig object already flows from DraftScene to BattleScene; just add the new fields.

## Code Examples

Verified patterns from the existing codebase:

### EventBus Subscription Lifecycle (from XPSystem -- the pattern TraitSystem should follow)
```typescript
// Source: src/systems/XPSystem.ts (existing, verified)
export class XPSystem {
  private heroes: Hero[];

  constructor(heroes: Hero[]) {
    this.heroes = heroes;
    EventBus.on(Events.HERO_KILLED, this.onKill, this);
  }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this);
  }
}
```

### Hero Stat Modification at Construction (pattern for gem application)
```typescript
// Source: src/scenes/BattleScene.ts lines 139-141 (existing, verified)
// Current pattern: stats are copied and modified before Hero construction
const scaledStats = teamSizeA < teamSizeB
  ? TeamBalancer.applyToStats(baseStats, scalingMultiplier)
  : { ...baseStats };
const hero = HeroRegistry.create(this, heroId, spawn.x, spawn.y, Team.A, isPlayer, scaledStats);

// Gem application follows the same pattern -- modify scaledStats BEFORE passing to HeroRegistry.create()
```

### Buff Application (pattern for trait on-hit effects)
```typescript
// Source: src/entities/Hero.ts lines 523-529 (existing, verified)
// Passive on-hit buff application to victim
if (passive.buffOnHit && passive.trigger === 'on_hit') {
  const { victim } = payload as { victim: any };
  if (victim && victim.addBuff) {
    const buff: ActiveBuff = { ...passive.buffOnHit };
    victim.addBuff(buff);
  }
}
// Trait on-hit effects should use the same addBuff() call pattern
```

### MatchConfig Extension Point
```typescript
// Source: src/systems/MatchOrchestrator.ts (existing, verified)
// Current: returns MatchConfig with teamA, teamB, playerHero, arenaTheme, arenaLayout
// Extension: add traitId + gemAssignments to the returned object
static generateMatch(): MatchConfig {
  // ... existing logic ...
  const traitId = TraitRegistry.selectRandom(teamA, teamB);
  const gemAssignments = GemRegistry.assignGems([...teamA, ...teamB]);
  return { ...existingConfig, traitId, gemAssignments };
}
```

### Cleanup in BattleScene.shutdown() (pattern for new systems)
```typescript
// Source: src/scenes/BattleScene.ts lines 778-806 (existing, verified)
shutdown(): void {
  EventBus.off(Events.HERO_KILLED, this.onHeroKilled, this);
  EventBus.off(Events.MATCH_STATE_CHANGE, this.onMatchStateChange, this);
  // ... other cleanup ...
  this.xpSystem?.destroy();
  // ADD: this.traitSystem?.destroy();
  // ADD: this.gemSystem is stateless after init, no cleanup needed
}
```

## Trait Design: 8 Concrete Traits

Based on the existing combat system capabilities, here are 8 traits that use only existing primitives:

### Stat Traits (safe, additive)
| # | ID | Name | Category | Effect | Notes |
|---|-----|------|----------|--------|-------|
| 1 | `glass_cannon` | Glass Cannon | stat | All heroes: +20 damage, -150 HP | Simple stat mod at init |
| 2 | `iron_fortress` | Iron Fortress | stat | All heroes: +5 armor, -30 move speed | Slower but tankier |
| 3 | `arcane_surge` | Arcane Surge | stat | All heroes: +100 mana, +50% mana regen | More ability usage |

### Mechanic Traits (event-driven, moderate risk)
| # | ID | Name | Category | Effect | Notes |
|---|-----|------|----------|--------|-------|
| 4 | `vampiric_pact` | Vampiric Pact | mechanic | On-hit: attacker heals 10% of damage dealt | Subscribe to HERO_HIT, heal attacker |
| 5 | `thorns_aura` | Thorns Aura | mechanic | On-damage-taken: reflect 8% damage back | Subscribe to DAMAGE_TAKEN, deal damage to source |
| 6 | `executioner` | Executioner | mechanic | On-kill: killer gains +15 damage buff for 10s | Subscribe to HERO_KILLED, apply STAT_BUFF |
| 7 | `spell_burn` | Spell Burn | mechanic | On-hit: 30% chance to apply 25 damage DoT for 3s | Subscribe to HERO_HIT, apply DOT buff |

### Rule-Change Traits (high impact, max 1 per match)
| # | ID | Name | Category | Effect | Notes |
|---|-----|------|----------|--------|-------|
| 8 | `sudden_valor` | Sudden Valor | rule_change | First kill each minute grants team-wide +10 damage for 30s | Subscribe to HERO_KILLED with cooldown timer |

### Incompatibility Blacklists
| Trait | Blacklisted Passives | Reason |
|-------|---------------------|--------|
| `vampiric_pact` | `bd_passive` (Life Drain) | Stacking lifesteal (20% passive + 10% trait = 30%) on a melee carry is too much sustain |
| `executioner` | `ld_passive` (Quick Hands) | Kill reward stacking: CDR reset + damage buff on kill makes Lightning Duelist snowball |
| `spell_burn` | `fw_passive` (Ember Touch), `vs_passive` (Venom Coat) | Double DoT application from trait + passive on every hit is excessive |

## Gem Design: 8 Concrete Gems

All gems are init-time stat modifiers (no event subscriptions):

| # | ID | Name | Effect | Stat Cap |
|---|-----|------|--------|----------|
| 1 | `ruby` | Ruby of Might | +15 damage | Max +30 total from gems (not reached with single gem) |
| 2 | `sapphire` | Sapphire of Mind | +80 mana | - |
| 3 | `emerald` | Emerald of Life | +120 HP | - |
| 4 | `diamond` | Diamond of Speed | +25 move speed | Max +50 total from gems |
| 5 | `topaz` | Topaz of Resilience | +3 armor | Max +8 total from gems |
| 6 | `amethyst` | Amethyst of Reach | +40 attack range | Only affects ranged heroes meaningfully |
| 7 | `onyx` | Onyx of Fortitude | +80 HP, +2 armor | Defensive combo |
| 8 | `opal` | Opal of Balance | +60 HP, +8 damage, +1 armor | Jack of all trades |

**No CDR gems.** CDR interacts multiplicatively with cooldown-related passives and creates balancing nightmares.

## Modifier Stacking Rules

| Source | Type | Application Time | Stacking |
|--------|------|-----------------|----------|
| Gem | Flat stat | Hero construction (init) | Additive to base stats |
| Trait (stat) | Flat stat | Match start (after hero construction) | Additive to current stats |
| Trait (mechanic) | Event-driven | Runtime (EventBus) | Independent of passive; both can fire |
| Passive | Event-driven | Runtime (EventBus) | Unchanged from Phase 2 |
| Level-up | Percentage of BASE | Runtime (per level) | Uses `baseMaxHP` / `baseDamage` -- unaffected by gem/trait |

**Critical: Level-up scaling uses `this.baseMaxHP` and `this.baseDamage` (Hero.ts lines 610-612).** These are set in the Hero constructor from `stats.maxHP` and `stats.damage`. If gems/traits modify `stats.maxHP` before construction, the base values will include gem/trait bonuses, causing compounding level-up gains. To prevent this:
- Apply gem modifiers to the `stats` object BEFORE passing to `HeroRegistry.create()` (so `baseMaxHP` includes the gem bonus -- this is acceptable since it is a small flat amount).
- OR apply gem modifiers AFTER construction by directly modifying `hero.maxHP` and `hero.currentHP` without changing `hero.stats.maxHP`. This keeps level scaling clean but requires accessing private fields.
- **Recommendation:** Apply BEFORE construction. The gem bonuses are small (+120 HP max) relative to base HP (520-1200), so the compounding effect through level scaling (+6% of base per level) is negligible (~7 extra HP per level from a +120 gem).

Trait stat modifiers apply the same way: modify the `scaledStats` object before `HeroRegistry.create()`.

## Data Flow: Match Lifecycle

```
DraftScene.create()
  |-> MatchOrchestrator.generateMatch()
  |     |-> TeamManager.generateTeams()          // existing
  |     |-> TraitRegistry.selectRandom(heroes)    // NEW: picks trait, checks blacklists
  |     |-> GemRegistry.assignGems(heroIds)       // NEW: random gem per hero
  |     |-> return MatchConfig { ...existing, traitId, gemAssignments }
  |
  |-> DraftScene renders trait banner + gem icons on hero cards  // NEW
  |
  |-> scene.start('BattleScene', { matchConfig })
        |
BattleScene.create(data)
  |-> Apply gem modifiers to hero stats (before HeroRegistry.create)
  |-> HeroRegistry.create() for each hero (gems baked into stats)
  |-> new TraitSystem(traitDef, heroes)  // subscribes to EventBus
  |-> new HUD(scene)  // HUD reads matchConfig.traitId for display
  |
BattleScene.update()
  |-> Combat events fire (HERO_HIT, DAMAGE_TAKEN, HERO_KILLED)
  |-> TraitSystem handlers react (global effects)
  |-> Hero passive handlers react (per-hero effects)
  |-> Both use addBuff() / heal() / takeDamage() -- same primitives
  |
BattleScene.shutdown()
  |-> traitSystem.destroy()  // unsubscribes all EventBus listeners
```

## HUD Integration Strategy

### Trait Display (top of screen, always visible)
Place a small banner BELOW the timer/score area (around y=70-80). Show: trait icon + trait name in a compact format.

```
Position: GAME_WIDTH/2, y=75 (below kill score at y=56)
Format: "[icon] TRAIT NAME"
Style: 12px monospace, trait color, semi-transparent background
```

This area is currently empty between the kill score (y=56) and the main game area.

### Gem Display (in the stat panel, bottom-left)
Add a single line below the XP bar in the existing stat panel (bottom-left corner). Show: gem icon + gem name.

```
Position: x=20, y=GAME_HEIGHT-25 (below XP bar at GAME_HEIGHT-36)
Format: "[icon] GEM NAME"
Style: 10px monospace, gem color
```

The stat panel background (`panelBg` in HUD.ts) may need to be 15px taller to accommodate this.

### DraftScene Trait Display
Add a banner between the arena info header (y=30) and the team labels (y=65):

```
Position: GAME_WIDTH/2, y=48
Format: "BATTLE TRAIT: [name] - [one-line description]"
Style: 14px monospace, trait color, with animateIn()
```

### DraftScene Gem Display
Add gem name below each hero card's ability lines:

```
Position: within each hero card, below the last ability line
Format: "GEM: [name] - [effect]"
Style: 11px monospace, gem color
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-per-modifier (OOP hierarchy) | Data-driven discriminated unions | Modern TS practice | Fewer files, easier to add new traits/gems by adding data |
| Damage pipeline interceptors | Event-driven post-hoc modification | Established in Phase 2 | Traits react to events rather than wrapping damage functions |
| Global mutable state for modifiers | Per-match instance with cleanup | Phase 1 cleanup pattern | No stale state between matches |

## Open Questions

1. **Should trait effects have cooldowns?**
   - What we know: Hero passives have `passiveCooldown` fields. Mechanic traits (e.g., vampiric_pact) fire on every HERO_HIT which happens at AUTO_ATTACK_COOLDOWN (1s) intervals.
   - What's unclear: Whether firing every 1s is too frequent for traits like thorns_aura.
   - Recommendation: For MVP, do NOT add cooldowns to mechanic traits. The effects are intentionally mild (8% reflect, 10% lifesteal). If testing reveals issues, add a trait-level cooldown timer (same pattern as `passiveCooldownTimer`).

2. **Should gems be re-rollable or fixed?**
   - What we know: Success criteria says "random assignment at match start." No mention of player choice.
   - What's unclear: Whether a player should see their gem before the match starts (in DraftScene).
   - Recommendation: Show the gem in DraftScene (for information), but do NOT allow re-rolling. Keep it simple -- random assignment, no choice. Phase 8 (Draft & Ranked) could add gem selection later.

3. **Should traits affect boss/tower interactions?**
   - What we know: Traits hook into HERO_HIT, DAMAGE_TAKEN, HERO_KILLED. These events fire for boss/tower damage too.
   - What's unclear: Whether lifesteal from boss attacks or damage reflect against towers is intended.
   - Recommendation: Trait effects that apply buffs should only target heroes (`victim.entityType === 'hero'`). Lifesteal effects (heal on hit) should work against all targets (including boss) to keep the trait impactful.

## Sources

### Primary (HIGH confidence)
- `src/entities/Hero.ts` -- passive system implementation, stat fields, EventBus subscription pattern
- `src/entities/BaseEntity.ts` -- takeDamage/heal/addBuff/die lifecycle, buff system
- `src/systems/CombatSystem.ts` -- HERO_HIT emission, damage flow, entity type handling
- `src/systems/EventBus.ts` -- event names, singleton pattern, cleanup rules
- `src/types.ts` -- HeroStats, PassiveDef, ActiveBuff, BuffType, MatchConfig interfaces
- `src/scenes/BattleScene.ts` -- match lifecycle, hero creation, system instantiation, shutdown cleanup
- `src/scenes/DraftScene.ts` -- match config flow, hero card rendering, scene transition
- `src/systems/MatchOrchestrator.ts` -- match config generation point
- `src/ui/HUD.ts` -- layout coordinates, update loop, available screen space
- `src/ui/AbilityBar.ts` -- ability bar layout, slot rendering
- `src/heroes/heroData.ts` -- all 13 hero definitions with passives
- `src/constants.ts` -- game dimensions, auto-attack cooldown, hero element map

### Secondary (MEDIUM confidence)
- Phaser 3 EventEmitter3 API (bundled in Phaser, used throughout project) -- listener ordering, context matching for off()

### Tertiary (LOW confidence)
- None. All findings are derived from direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, uses only existing primitives
- Architecture: HIGH -- patterns directly mirror existing passive/XP systems in the codebase
- Pitfalls: HIGH -- identified through codebase analysis of actual interaction points
- Trait/Gem designs: MEDIUM -- the specific 8 traits and 8 gems are reasonable but balance will require playtesting
- HUD layout: MEDIUM -- coordinates calculated from existing layout but visual fit needs verification

**Research date:** 2026-02-23
**Valid until:** Indefinite (project-specific architecture research, not dependent on external library versions)
