# Phase 2: Hero Identity - Research

**Researched:** 2026-02-22
**Domain:** Game mechanics — XP/leveling systems, combat event hooks, ultimate/passive ability architecture, HUD extensions in Phaser 3
**Confidence:** HIGH (all findings grounded in actual source code audit + Phaser 3 documentation)

---

## Summary

The codebase entering Phase 2 is in excellent shape. Phase 1 already delivered: 13 distinct heroes in `heroData.ts`, the EventBus singleton (`Phaser.Events.EventEmitter`), BaseEntity with `die()` → `HERO_KILLED` emission, the full combat execution pipeline in `CombatSystem`, and a functioning HUD. What Phase 2 must ADD is a fourth ability slot (R = ultimate), a passive ability system that hooks into combat events, an XP/leveling system, and HUD extensions for both.

The critical architectural insight from reading the code is that `AbilityDef` types are locked to `slot: 'Q' | 'W' | 'E'` — Phase 2 must widen this union to `'Q' | 'W' | 'E' | 'R'`. Similarly `Hero.abilityCooldowns` is a fixed-length array of 3 — it must grow to 4. The `AbilityBar` UI only renders 3 slots — it must render 4 with the R slot visually distinct (gold border, longer cooldown display). The `HeroStats.abilities` array only holds Q/W/E today; adding R as index 3 preserves backward compatibility with all existing hero data.

Passives are fundamentally different from active abilities: they have no mana cost, no manual trigger, and no cooldown in the traditional sense. They respond to EventBus events (`HERO_KILLED`, `DAMAGE_TAKEN`, `HERO_HIT`). Two new Events must be added: `HERO_HIT` (for on-hit passives) and `DAMAGE_TAKEN` (for on-damage-received passives). Each Hero instance subscribes its passive handler in its constructor and unsubscribes in a new `destroy()` override. The passive must produce visible VFX feedback every time it triggers — the VFXManager already has `spawnBurst()`, `spawnImpact()`, and `showBuffEffect()` that can serve this purpose.

**Primary recommendation:** Implement XP/leveling as a self-contained `XPSystem` class that subscribes to `HERO_KILLED` and `OBJECTIVE_COMPLETED` events and calls `hero.levelUp()`. Implement passives as a `PassiveDef` on each hero that declares a trigger event and an effect callback. Implement ultimates as index-3 entries in `HeroStats.abilities` with `slot: 'R'` and 60–120s cooldowns. Expand the AbilityBar to 4 slots with R styled distinctly.

---

## Codebase Audit Findings

### What Already Exists (do not re-implement)

| Component | Location | Status |
|-----------|----------|--------|
| 13 heroes with Q/W/E | `src/heroes/heroData.ts` | Complete — Iron Guard, Shadow Blade, Flame Witch, Frost Archer, Holy Priest, Storm Caller, Blade Dancer, War Drummer, Venom Stalker, Stone Golem, Lightning Duelist, Blood Shaman, Phantom Knight |
| EventBus singleton | `src/systems/EventBus.ts` | Complete — `HERO_KILLED`, `HERO_RESPAWNED`, `MATCH_STATE_CHANGE`, `MATCH_TIMER_TICK`, `RESPAWN_TICK`, `SCORE_UPDATED` |
| BaseEntity.die() → HERO_KILLED | `src/entities/BaseEntity.ts` | Complete — emits `{ victim, killerId }` |
| CombatSystem.executeAbility() | `src/systems/CombatSystem.ts` | Complete — handles PROJECTILE, AREA, BUFF, DASH, SELF_BUFF |
| VFXManager | `src/systems/VFXManager.ts` | Complete — spawnBurst, spawnImpact, spawnDeathExplosion, createTrail |
| HUD (timer, kills, HP/mana) | `src/ui/HUD.ts` | Complete — no XP bar yet |
| AbilityBar (3 slots: I/O/P) | `src/ui/AbilityBar.ts` | Complete — 3 slots only, needs 4th |
| Hero.useAbility() | `src/entities/Hero.ts` | Complete — delegates to CombatSystem |
| Hero.abilityCooldowns[0..2] | `src/entities/Hero.ts` | 3-slot array — needs slot[3] for R |

### What Must Be Added

| Feature | Scope |
|---------|-------|
| `slot: 'R'` in `AbilityDef` union | `src/types.ts` — widen the union |
| `abilityCooldowns[3]` for R slot | `src/entities/Hero.ts` |
| R-key input binding (R key) | `src/scenes/BattleScene.ts` |
| `UltimateDef` or R-slot in `HeroStats.abilities[3]` | `src/heroes/heroData.ts` — add to all 13 heroes |
| `PassiveDef` interface + passive per hero | `src/types.ts` + `src/heroes/heroData.ts` |
| EventBus events: `HERO_HIT`, `DAMAGE_TAKEN` | `src/systems/EventBus.ts` |
| Passive trigger subscription in Hero | `src/entities/Hero.ts` |
| `XPSystem` class | `src/systems/XPSystem.ts` (new file) |
| `Hero.level`, `Hero.currentXP`, `Hero.xpToNextLevel()` | `src/entities/Hero.ts` |
| `Hero.levelUp()` — stat scaling logic | `src/entities/Hero.ts` |
| XP bar in HUD | `src/ui/HUD.ts` |
| Level badge on hero visual | `src/entities/Hero.ts` |
| 4-slot AbilityBar with R visually distinct | `src/ui/AbilityBar.ts` |
| R-key AI usage for ultimates | `src/ai/AIController.ts` |

---

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | ^3.87.0 | Game engine — already in use | EventEmitter, Tweens, Timer, Graphics all needed |
| TypeScript | ^5.7.0 | Type safety | Already configured |

No new npm packages are needed for Phase 2. All mechanics — XP accumulation, level-up scaling, passive triggers, cooldown tracking — are pure game logic that runs on top of the existing Phaser runtime.

### No Additional Libraries

The existing stack handles everything:
- **EventBus (Phaser.Events.EventEmitter)** — passive trigger subscriptions
- **Phaser.Time.delayedCall / addEvent** — cooldown tracking already in `abilityCooldowns[]`
- **Phaser.Tweens** — level-up animation, XP bar fill animation
- **Phaser.GameObjects.Graphics** — XP bar rendering (same pattern as HP bar in HUD.ts)

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── entities/
│   ├── BaseEntity.ts     # No changes needed
│   └── Hero.ts           # Add: level, currentXP, passive subscription, levelUp()
├── heroes/
│   ├── heroData.ts       # Add: R-slot ability + passive per hero
│   └── HeroRegistry.ts   # No changes
├── systems/
│   ├── EventBus.ts       # Add: HERO_HIT, DAMAGE_TAKEN events
│   ├── XPSystem.ts       # NEW: XP accumulation, level threshold logic
│   └── CombatSystem.ts   # Add: emit HERO_HIT on auto-attack hit
├── types.ts              # Widen AbilityDef.slot union, add PassiveDef
└── ui/
    ├── HUD.ts            # Add: XP bar, level display
    └── AbilityBar.ts     # Expand to 4 slots, R visually distinct
```

### Pattern 1: Passive as EventBus Subscriber

**What:** Each hero declares a `PassiveDef` on its stats. The `Hero` constructor reads this def and subscribes a handler to EventBus. The handler checks `victim/sourceId` to confirm it applies to THIS hero, then applies its effect and spawns VFX.

**When to use:** All on-hit, on-kill, on-damage-taken triggers.

**Why EventBus (not direct method calls):** The passive must fire from events that originate in BaseEntity (die), CombatSystem (auto-attack hit), or any ability projectile hit — systems that should not have direct knowledge of Hero's passive internals.

```typescript
// src/types.ts
export type PassiveTrigger = 'on_kill' | 'on_hit' | 'on_damage_taken';

export interface PassiveDef {
  id: string;
  name: string;
  trigger: PassiveTrigger;
  description: string;
  // Effect fields — interpreted by Hero.applyPassiveEffect()
  healOnKill?: number;       // heal self X HP on kill
  buffOnKill?: ActiveBuff;   // apply buff to self on kill
  damageReturnRatio?: number; // reflect X% damage back on damage taken
  bonusDamageOnHit?: number; // extra damage added to auto-attack
}

// Extended HeroStats
export interface HeroStats {
  // ... existing fields ...
  passive: PassiveDef;
}
```

```typescript
// src/entities/Hero.ts — constructor addition
if (stats.passive) {
  this.subscribePassive(stats.passive);
}

private subscribePassive(passive: PassiveDef): void {
  if (passive.trigger === 'on_kill') {
    EventBus.on(Events.HERO_KILLED, this.onKillPassive, this);
  } else if (passive.trigger === 'on_hit') {
    EventBus.on(Events.HERO_HIT, this.onHitPassive, this);
  } else if (passive.trigger === 'on_damage_taken') {
    EventBus.on(Events.DAMAGE_TAKEN, this.onDamageTakenPassive, this);
  }
}

// CRITICAL: Must unsubscribe in destroy() to prevent memory leaks
override destroy(): void {
  EventBus.off(Events.HERO_KILLED, this.onKillPassive, this);
  EventBus.off(Events.HERO_HIT, this.onHitPassive, this);
  EventBus.off(Events.DAMAGE_TAKEN, this.onDamageTakenPassive, this);
  super.destroy();
}

private onKillPassive({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
  if (!this.isAlive) return;
  if (killerId !== this.getUniqueId()) return; // only fires for MY kills
  this.applyPassiveEffect(this.stats.passive);
  this.showPassiveVFX(); // REQUIRED: visible trigger feedback
}
```

### Pattern 2: R-Slot Ultimate as Index-3 in abilities Array

**What:** Add a 4th entry to each hero's `abilities` array with `slot: 'R'`. Expand `abilityCooldowns` from length 3 to length 4. Add R key binding in BattleScene. The `useAbility(3, ...)` call flows through existing `CombatSystem.executeAbility()` with no changes needed there.

**When to use:** All ultimates — they are just abilities with longer cooldowns and more impact.

```typescript
// src/types.ts — widen union
export interface AbilityDef {
  // ...
  slot: 'Q' | 'W' | 'E' | 'R'; // WIDEN: was 'Q' | 'W' | 'E'
  isUltimate?: boolean; // optional flag for UI styling
}

// src/entities/Hero.ts
abilityCooldowns: number[] = [0, 0, 0, 0]; // CHANGE: was [0, 0, 0]

// AbilityBar.update() check
if (slot >= this.player.stats.abilities.length) continue;
// Now naturally handles 4th slot if ability exists
```

```typescript
// src/scenes/BattleScene.ts — add R key
this.keys = {
  // ...existing...
  R: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
};

// In handlePlayerInput:
if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
  this.player.useAbility(3, worldPoint.x, worldPoint.y);
}
```

### Pattern 3: XPSystem as EventBus Subscriber

**What:** A standalone class that subscribes to `HERO_KILLED` (and optionally a new `OBJECTIVE_COMPLETED` event). On kill, it determines who gets XP, calls `hero.gainXP(amount)`, and checks for level-up.

**When to use:** Instantiate in BattleScene.create(), destroyed in BattleScene.shutdown().

```typescript
// src/systems/XPSystem.ts
export const XP_PER_KILL = 50;
export const XP_PER_OBJECTIVE = 100;

// Level thresholds — XP required to reach each level from level 1
// Tuned for a 5-minute match to reach level 5+:
// At ~5 kills per minute solo = ~25 kills = 1250 XP → must reach level 5 by ~500 XP
export const XP_THRESHOLDS = [0, 100, 220, 370, 550, 760, 1000, 1280, 1600]; // level 1-8

export class XPSystem {
  private heroes: Hero[];

  constructor(heroes: Hero[]) {
    this.heroes = heroes;
    // Initialize XP fields on each hero
    for (const hero of heroes) {
      hero.level = 1;
      hero.currentXP = 0;
    }
    EventBus.on(Events.HERO_KILLED, this.onKill, this);
  }

  private onKill({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    if (!killerId) return;
    const killer = this.heroes.find(h => h.getUniqueId() === killerId);
    if (!killer || !killer.isAlive) return;

    killer.gainXP(XP_PER_KILL);

    // Assist XP: allies nearby get partial XP
    // (optional — implement in plan 02-02 if time allows)
  }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this);
  }
}
```

### Pattern 4: Level-Up Stat Scaling on Hero

**What:** `Hero.gainXP(amount)` accumulates XP and calls `levelUp()` when threshold is crossed. `levelUp()` applies stat multipliers and shows VFX.

**Scaling formula:** Simple flat-rate multipliers per level to ensure visible stat growth without exponential imbalance.

```typescript
// src/entities/Hero.ts additions
level = 1;
currentXP = 0;

gainXP(amount: number): void {
  if (!this.isAlive) return;
  this.currentXP += amount;
  while (this.level < XP_THRESHOLDS.length && this.currentXP >= XP_THRESHOLDS[this.level]) {
    this.levelUp();
  }
}

levelUp(): void {
  this.level++;
  // Stat scaling: +8% HP, +5% damage, +3% armor per level
  const hpBonus = Math.floor(this.stats.maxHP * 0.08);
  const dmgBonus = Math.floor(this.stats.damage * 0.05);

  this.maxHP += hpBonus;
  this.currentHP = Math.min(this.currentHP + hpBonus, this.maxHP); // partial heal on level-up
  this.stats.damage += dmgBonus;
  this.stats.armor += 1;

  EventBus.emit(Events.HERO_LEVELED_UP, { hero: this, level: this.level });
  this.showLevelUpVFX();
}

private showLevelUpVFX(): void {
  // Gold burst + floating level text
  const battleScene = this.scene as any;
  if (battleScene.vfxManager) {
    battleScene.vfxManager.spawnBurst(this.x, this.y, 'generic', 16, 0xFFD700);
  }
  const text = this.scene.add.text(this.x, this.y - 40, `LEVEL ${this.level}!`, {
    fontSize: '16px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(100);
  this.scene.tweens.add({
    targets: text, y: text.y - 50, alpha: 0, duration: 1500,
    onComplete: () => text.destroy(),
  });
}
```

### Pattern 5: XP Bar in HUD

**What:** A horizontal bar below the HP/mana panel showing current XP progress to next level. Level number displayed as text. Uses same Graphics-draw-per-frame pattern as the existing HP bar.

```typescript
// src/ui/HUD.ts — additions to constructor
this.xpGraphics = scene.add.graphics();
this.xpGraphics.setScrollFactor(0).setDepth(201);

this.levelText = scene.add.text(20, GAME_HEIGHT - 105, 'LV 1', {
  fontSize: '11px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
}).setScrollFactor(0).setDepth(202);

// In update():
const player = scene.player;
const xpRatio = (player.currentXP - XP_THRESHOLDS[player.level - 1]) /
                (XP_THRESHOLDS[player.level] - XP_THRESHOLDS[player.level - 1]);
this.xpGraphics.clear();
this.xpGraphics.fillStyle(0x111111, 1);
this.xpGraphics.fillRoundedRect(20, GAME_HEIGHT - 108, 180, 6, 2);
const xpWidth = Math.max(0, 180 * xpRatio);
if (xpWidth > 0) {
  this.xpGraphics.fillStyle(0xFFD700, 1);
  this.xpGraphics.fillRoundedRect(20, GAME_HEIGHT - 108, xpWidth, 6, 2);
}
this.levelText.setText(`LV ${player.level}`);
```

### Anti-Patterns to Avoid

- **Checking passive triggers inside CombatSystem:** CombatSystem must not know about passive definitions. Emit events, let Hero subscribers react. Mixing them creates circular dependency: CombatSystem → Hero → CombatSystem.
- **Passive state stored as mutable property on PassiveDef object:** PassiveDef is data — it should be readonly. Passive state (e.g., "on cooldown") lives on the Hero instance, not on the def.
- **Mutating `this.stats` directly in levelUp() for maxHP without updating currentHP:** Growing maxHP without adjusting currentHP leaves the bar appearing overfull or immediately healing all damage. Grant partial heal equal to the HP bonus.
- **Adding R as a 4th ability type with different cooldown tracking:** Don't create a separate `ultimateCooldown` field. Use `abilityCooldowns[3]`. The existing pattern handles it uniformly.
- **Subscribing passives per-hero without context scope in EventBus.on():** Phaser's EventEmitter requires the third argument (context scope) so that `EventBus.off(event, handler, this)` unsubscribes correctly. Without it, the handler leaks across scene restarts.
- **Using `EventBus.removeAllListeners()` in cleanup:** As documented in EventBus.ts — removes ALL global listeners. Only use targeted `.off()` calls.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XP persistence between respawns | Custom save/restore in BattleScene | Store on Hero instance directly | XPSystem already has reference to heroes; no save/restore needed — heroes persist across respawns |
| Level-up VFX system | Custom particle manager | Existing `VFXManager.spawnBurst()` + Phaser tweens | VFXManager already has all needed primitives |
| Cooldown display for R slot | Separate ultimate cooldown component | Extend AbilityBar to 4 slots | AbilityBar already handles cooldown overlay — just add slot[3] |
| Passive "trigger" state machine | Complex FSM | Simple EventBus subscription with guard checks | Passive conditions are simple (killerId === myId, etc.) |
| EventEmitter for passives | Custom event system | Existing EventBus (Phaser.Events.EventEmitter) | Already singleton, already typed |

**Key insight:** Everything in Phase 2 is additive to Phase 1's patterns. No new architectural concepts needed — extend existing data shapes, add two events, add two new classes (XPSystem, PassiveSystem logic lives in Hero).

---

## Common Pitfalls

### Pitfall 1: Passive Memory Leak on Scene Restart

**What goes wrong:** Hero instances are created fresh on each BattleScene restart. If the old Hero instances didn't unsubscribe their EventBus listeners, the module-level EventBus retains dead references. On the next match, HERO_KILLED fires and calls a method on a destroyed Hero.

**Why it happens:** Phaser Containers don't automatically call `EventBus.off()` when destroyed. The EventBus is a module-level singleton — it survives scene restarts.

**How to avoid:** Every Hero that subscribes in its constructor must override `destroy()` and call `EventBus.off(event, handler, this)` for each subscription, using the same scope argument as the `.on()` call.

**Warning signs:** Console errors like "Cannot read property 'x' of undefined" triggered by hero event handlers after scene restart. EventBus listener count growing across matches.

### Pitfall 2: XP Thresholds Mistuned for 5-Minute Match

**What goes wrong:** Heroes reach level 10 in 90 seconds (trivial) or never reach level 5 in the full 5 minutes (success criterion fails).

**Why it happens:** XP rate math without simulating kill rates. In a 1v1 match, kill rates are roughly 1 kill per 30–60 seconds. In a 4v4, kills happen faster but are distributed across 4 heroes.

**How to avoid:** Simulate: solo player at 1 kill/40s × 300s = ~7 kills = 350 XP. Thresholds should make level 5 reachable at ~250–300 XP so a player with 5 kills reaches it by mid-match. Proposed thresholds: `[0, 50, 120, 210, 320, 450, 600, 780, 990]` — level 5 at 320 XP = 6-7 kills.

**Warning signs:** Playtest the 5-minute match and note what level the player reaches. Adjust thresholds if outside 5–8 range.

### Pitfall 3: R Key Conflicts with Respawn/Existing Keys

**What goes wrong:** The R key is pressed during respawn or pre-match, triggering `useAbility(3, ...)` on a dead hero.

**Why it happens:** `handlePlayerInput()` already guards on `player.isAlive` — but the R key input must be added to that same guarded block.

**How to avoid:** Add R key handling inside the existing `if (this.player && this.player.isAlive)` block in `handlePlayerInput()`. Confirm `useAbility()` has its own `if (!this.isAlive) return` guard at the top (it already does in `Hero.useAbility()`).

### Pitfall 4: AbilityBar Slot Index vs. Abilities Array Bounds

**What goes wrong:** `AbilityBar` renders 4 slots but hero has 3 or fewer abilities defined. Accessing `player.stats.abilities[3]` returns `undefined`, crashing on `.manaCost`.

**Why it happens:** AbilityBar currently uses a fixed loop `for (let i = 0; i < 3; i++)`. Adding a 4th slot without bounds-checking the abilities array causes crash if the hero definition is incomplete.

**How to avoid:** Always guard: `if (i >= this.player.stats.abilities.length) { renderEmptySlot(); continue; }`. Ensure all 13 heroes have their R-slot defined before shipping.

### Pitfall 5: Passive VFX on Every Frame Instead of on Trigger

**What goes wrong:** Passive effect fires on every game tick instead of only when the trigger condition is met.

**Why it happens:** Confusing the passive "condition check" (event-driven, once per trigger) with the buff application (which might have per-tick DoT). The passive triggers once; the buff's DoT ticks every second via `updateBuffs()`.

**How to avoid:** Passive handler must only fire inside the EventBus callback — never in `updateHero()`. The distinction: trigger = event handler. Effect = apply buff or heal once. Ongoing tick = buff system handles it.

### Pitfall 6: Stat Scaling Making Tanks Invincible at High Level

**What goes wrong:** Iron Guard at level 8 has 1200 × 1.08^7 ≈ 2058 HP and 12 + 7 = 19 armor. Enemies do `Math.max(1, damage - 19)` — all attacks deal near-zero damage.

**Why it happens:** Armor is an absolute reduction, not a percentage. At high armor values combined with high HP, tanks become effectively immortal.

**How to avoid:** Cap armor bonus from level-ups (e.g., +0.5 per level rounded, max armor from levels = +4). Use percentage-based damage reduction for armor in future phases, or keep level-scaling conservative. The `Math.max(1, damage - armor)` formula means armor above ~50 makes heroes nearly invulnerable.

---

## Code Examples

Verified patterns based on the actual source code:

### EventBus Event Addition (src/systems/EventBus.ts)

```typescript
export const Events = {
  HERO_KILLED:        'hero:killed',
  HERO_RESPAWNED:     'hero:respawned',
  MATCH_STATE_CHANGE: 'match:state_change',
  MATCH_TIMER_TICK:   'match:timer_tick',
  RESPAWN_TICK:       'respawn:tick',
  SCORE_UPDATED:      'score:updated',
  // Phase 2 additions:
  HERO_HIT:           'hero:hit',        // emitted by CombatSystem on auto-attack connect
  DAMAGE_TAKEN:       'hero:damage_taken', // emitted by Hero.takeDamage on non-zero damage
  HERO_LEVELED_UP:    'hero:leveled_up', // emitted by XPSystem on level-up
  OBJECTIVE_COMPLETED: 'objective:completed', // emitted when objective events happen (Phase 3+)
} as const;
```

### Hero Kill Passive Example (Iron Guard — on-kill: shield refresh)

```typescript
// In heroData.ts for iron_guard:
passive: {
  id: 'ig_passive',
  name: 'Iron Will',
  trigger: 'on_kill',
  description: 'Killing an enemy instantly refreshes Iron Fortress shield',
  buffOnKill: {
    type: BuffType.SHIELD,
    value: 150,
    duration: 4,
    remaining: 4,
  },
}
```

### HERO_HIT Emission in CombatSystem (tryAutoAttack)

```typescript
// After: closest.takeDamage(damage, hero.getUniqueId());
EventBus.emit(Events.HERO_HIT, {
  attacker: hero,
  victim: closest,
  damage,
});
```

### DAMAGE_TAKEN Emission in Hero.takeDamage

```typescript
override takeDamage(rawDamage: number, sourceId?: string): number {
  if (!this.isAlive) return 0;
  const finalDamage = super.takeDamage(rawDamage, sourceId);
  if (finalDamage > 0) {
    this.showDamageNumber(finalDamage);
    EventBus.emit(Events.DAMAGE_TAKEN, {
      victim: this,
      sourceId,
      damage: finalDamage,
    });
  }
  return finalDamage;
}
```

### Passive VFX Requirement

Every passive trigger handler MUST call `showPassiveVFX()` — this satisfies success criterion 3:

```typescript
private showPassiveVFX(): void {
  const battleScene = this.scene as any;
  if (battleScene.vfxManager) {
    battleScene.vfxManager.spawnBurst(this.x, this.y, 'generic', 10, 0xFFD700);
  }
  // Also flash the hero tint briefly
  this.scene.tweens.add({
    targets: this.heroVisual,
    alpha: 0.5, duration: 80, yoyo: true,
    onComplete: () => this.heroVisual?.setAlpha(1),
  });
}
```

### AI Ultimate Usage (AIController.executeUseAbility — add slot 3)

```typescript
// src/ai/AIController.ts — extend shouldUseAbility and executeUseAbility
// to check abilities[3] (ultimate) with lower probability (AI reserves ult)
private shouldUseUltimate(): boolean {
  if (Math.random() > 0.3) return false; // AI uses ult only 30% of chances
  const ultimate = this.hero.stats.abilities[3];
  if (!ultimate) return false;
  if (this.hero.abilityCooldowns[3] > 0) return false;
  if (this.hero.currentMana < ultimate.manaCost) return false;
  return true;
}
```

---

## State of the Art

| Old Approach (Before Phase 2) | Current Approach (Phase 2) | Impact |
|-------------------------------|----------------------------|--------|
| 3 abilities per hero (Q/W/E only) | 4 abilities: Q/W/E + R ultimate | Each hero has a defining high-impact moment |
| No passive ability — combat is purely reactive | Passive ability that visibly triggers on event | Heroes feel mechanically distinct even without pressing buttons |
| No XP or leveling — stats are static for entire match | XP from kills → leveling → stat scaling | Creates a power arc: early game vs late game feel different |
| AbilityBar shows 3 slots | AbilityBar shows 4 slots; R is gold-bordered, distinct | Player immediately knows R is special |
| EventBus has 6 events | EventBus adds HERO_HIT, DAMAGE_TAKEN, HERO_LEVELED_UP | Combat event hooks enable passive reactivity |

**No deprecated patterns introduced.** All Phase 2 additions extend Phase 1 patterns without replacing them.

---

## Hero Roster Design Guidance

13 heroes already exist covering all required archetypes. Phase 2 must add ultimates and passives to all 13. Design guidance for distinctness:

| Hero | Archetype | R Ultimate Theme | Passive Theme |
|------|-----------|-----------------|---------------|
| Iron Guard | Tank | Long CC duration AoE stun | on_kill: shield refresh |
| Shadow Blade | Assassin | Global-range execute dash | on_kill: speed burst |
| Flame Witch | Mage | Massive AoE fire DoT zone | on_hit: chance to ignite |
| Frost Archer | Carry | Multi-target freeze + damage | on_hit: stacking slow |
| Holy Priest | Support | Mass team invulnerability or full heal | on_damage_taken: auto-heal allies |
| Storm Caller | Mage | Arena-wide lightning strikes | on_kill: mana restore |
| Blade Dancer | Carry | Spinning invulnerable AoE | on_hit: lifesteal effect |
| War Drummer | Support | Team-wide damage + speed aura | on_damage_taken: rally allies |
| Venom Stalker | Assassin | Persistent poison field | on_hit: guaranteed DoT proc |
| Stone Golem | Tank | Petrify + massive damage reflect | on_damage_taken: armor stacks |
| Lightning Duelist | Carry | Chain lightning overload | on_kill: reset cooldowns |
| Blood Shaman | Mage | Sacrifice HP for massive AoE | on_kill: devour HP |
| Phantom Knight | Tank | Phase + ghost mode | on_damage_taken: damage redirect |

**Key design rule:** Each passive must be functionally verifiable with a 1-second visual: when the trigger fires, something visibly changes on the hero (burst particle, tint flash, floating text). No silent passives.

---

## XP Balance Model

Target: player reaches level 5–7 in a typical 5-minute match.

**Kill rate assumptions:**
- Solo (1v1): ~6–10 kills total
- Team (4v4): Player gets ~3–6 personal kills (rest go to AI allies)

**Proposed XP thresholds:**
```
Level 1→2: 50 XP   (1 kill)
Level 2→3: 70 XP   (2 more kills)  cumulative: 120
Level 3→4: 90 XP   (2 more kills)  cumulative: 210
Level 4→5: 110 XP  (2 more kills)  cumulative: 320
Level 5→6: 130 XP  (3 more kills)  cumulative: 450
Level 6→7: 150 XP  (3 more kills)  cumulative: 600
Level 7→8: 180 XP  (4 more kills)  cumulative: 780
Level 8→9: 210 XP  (4 more kills)  cumulative: 990
```

At 50 XP per kill: 6 kills → level 5 (320 XP). 12 kills → level 7 (600 XP). Objective XP at 100 per objective can accelerate to level 6–7 even with fewer kills.

**Stat scaling per level (conservative to avoid tank invincibility):**
- HP: +6% of base maxHP (not stacked — multiply against original base, not current)
- Damage: +4% of base damage
- Armor: +0.5 flat (rounded down, so +1 every 2 levels)

Using base stats prevents exponential runaway while still producing visible growth.

---

## Open Questions

1. **Should XP be shared or solo?**
   - What we know: Roadmap says "kill = 50 XP" without specifying shared vs. solo
   - What's unclear: If team kills count for all team members, leveling is faster but less skill-differentiated
   - Recommendation: Implement solo XP (only the killer gets 50 XP). Add "assist XP" (15 XP) as a deferred feature if time allows in plan 02-02.

2. **Does the AI hero use its ultimate?**
   - What we know: AIController has `shouldUseAbility()` that checks `abilityCooldowns[i]` for any slot 0–2
   - What's unclear: Whether AI should use R aggressively or conservatively
   - Recommendation: AI uses R at 30% probability when in ATTACK state and ult is ready. This creates exciting moments without being oppressive.

3. **Level display — on hero body or HUD only?**
   - What we know: Hero already has a label text (2-letter abbreviation). Adding level on the body would compete visually
   - What's unclear: Whether level badge is worth the visual clutter on the hero sprite
   - Recommendation: Show level number only in the HUD XP bar area (not on hero body). Keep the hero body clean. Level-up VFX is sufficient in-world feedback.

4. **Passive cooldown — should passives have internal cooldowns?**
   - What we know: Requirement says "passive ability that visibly triggers on its condition" — no mention of cooldown
   - What's unclear: Passives that trigger on every auto-attack hit (on_hit passives) could proc 60+ times per minute, stacking extreme effects
   - Recommendation: Add an optional `passiveCooldown` field (e.g., 2–5 seconds internal cooldown) on PassiveDef. Without it, on_hit passives need careful value tuning to avoid OP proc rates.

---

## Sources

### Primary (HIGH confidence)
- Direct source code audit of `/Users/brenopires/Projetos/games/dota22/src/` — all findings grounded in actual code
- `src/systems/EventBus.ts` — event system verified, subscription pattern confirmed
- `src/entities/Hero.ts` — abilityCooldowns array size, useAbility() path confirmed
- `src/entities/BaseEntity.ts` — die() emission, takeDamage() signature confirmed
- `src/systems/CombatSystem.ts` — tryAutoAttack(), executeAbility() patterns confirmed
- `src/heroes/heroData.ts` — 13 heroes confirmed, all have Q/W/E only (no R, no passive)
- `src/types.ts` — AbilityDef slot union confirmed as 'Q' | 'W' | 'E', no PassiveDef exists
- `src/ui/AbilityBar.ts` — 3-slot fixed rendering confirmed
- `src/ui/HUD.ts` — no XP bar exists confirmed
- `src/scenes/BattleScene.ts` — R key not bound, matchStateMachine patterns confirmed

### Secondary (MEDIUM confidence)
- Phaser 3 EventEmitter docs: context-scoped `.on(event, fn, context)` / `.off(event, fn, context)` subscription model — verified against EventBus.ts comment block which describes this pattern and its requirements exactly
- Standard Phaser 3 best practice: avoid `removeAllListeners()` on shared singletons — documented in project's own EventBus.ts comment

### Tertiary (LOW confidence — not researched, rely on Phase 1 decisions)
- Phaser 3.87.0 specific particle emitter API — assumed same as 3.60+ post-particle-system rewrite. Low risk as VFXManager already works with this version.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new packages. All mechanics use existing Phaser APIs already proven in Phase 1 code.
- Architecture patterns: HIGH — All patterns derived from actual source code, not assumptions.
- Pitfalls: HIGH — Memory leak and scaling pitfalls derived from direct reading of EventBus.ts warning comments and armor formula in BaseEntity.ts.
- Hero design table: MEDIUM — Role/passive suggestions are design recommendations, not requirements. Specific values need playtesting.
- XP balance model: MEDIUM — Math is sound but kill rates are estimated. Requires in-game validation.

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days — Phaser 3 is stable, no external dependencies to track)
