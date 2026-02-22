# Architecture Research

**Domain:** Asymmetric hero arena brawler — Phaser 3 + TypeScript, existing codebase evolution
**Researched:** 2026-02-22
**Confidence:** HIGH (codebase read directly; patterns verified against Phaser 3 official docs and Game Programming Patterns)

---

## Current Architecture Audit

Before describing the target architecture, here is an honest map of what exists and where the seams are.

### What Exists (as-built)

```
Boot → Menu → Draft → Battle → Results
                         │
              ┌──────────┴──────────────────────┐
              │          BattleScene             │
              │  (owns everything directly)      │
              │                                  │
              │  player: Hero                    │
              │  heroes: Hero[]                  │
              │  teamA/teamB: Hero[]             │
              │  combatSystem: CombatSystem      │
              │  vfxManager: VFXManager          │
              │  aiControllers: AIController[]   │
              │  hud: HUD                        │
              │  matchTimer: number              │
              │  matchOver: boolean              │
              │  teamAKills / teamBKills          │
              └──────────────────────────────────┘
```

**Communication pattern:** Direct method calls. BattleScene is passed to every system as `scene as any`, and systems reach back via `battleScene.heroes`, `battleScene.vfxManager`, etc. No event bus exists.

**Entity model:** Hero extends `Phaser.GameObjects.Container`. AI via AIController (FSM with 5 states). No base entity class — a Boss cannot be created without duplicating Hero logic.

**Match state:** Raw booleans and counters on BattleScene (`matchOver`, `teamAKills`, `playerKills`). No formal state machine. Win condition is checked inline via `checkWinCondition()`.

### Critical Architectural Gaps for New Features

| Gap | Blocks |
|-----|--------|
| No shared base entity class | Boss entity, Tower entity — both need health, buffs, collision |
| No event bus | Scoring, XP, trait triggers all need decoupled notification |
| Match state is ad-hoc booleans | Sudden death, scoring phases, boss phase transitions need a state machine |
| No modifier/trait layer | Battle traits need to intercept damage, kills, movement without editing every system |
| AI is archetype-only | Boss multi-phase requires phase-aware AI that can swap behavior profiles |
| No neutral camp concept | Requires a spawn manager + timer + territory awareness |

---

## Recommended Target Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BattleScene                              │
│  (orchestrator only — no game logic lives here)                  │
├────────────────────┬────────────────────┬────────────────────────┤
│   Entity Layer     │   System Layer     │      UI Layer           │
│                    │                    │                          │
│  BaseEntity        │  CombatSystem      │  HUD                    │
│  ├─ Hero           │  BossAISystem      │  AbilityBar             │
│  ├─ BossEntity     │  NeutralCampSystem │  ScoreDisplay           │
│  └─ TowerEntity    │  TraitSystem       │  BossHealthBar          │
│                    │  XPSystem          │  SuddenDeathOverlay     │
│                    │  MatchStateMachine │                          │
│                    │  TeamBalancer      │                          │
│                    │  VFXManager        │                          │
├────────────────────┴────────────────────┴────────────────────────┤
│                       Event Bus (shared emitter)                  │
│   HERO_KILLED | BOSS_PHASE_CHANGE | BUFF_ACQUIRED |              │
│   MATCH_STATE_CHANGE | XP_GAINED | CAMP_CLEARED                  │
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                               │
│   types.ts  constants.ts  heroData.ts  HeroRegistry             │
│   TraitRegistry  GemRegistry  MatchConfig                        │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Notes |
|-----------|---------------|-------------------|-------|
| **BattleScene** | Wiring, lifecycle, input routing | All systems (owns references) | Must stop owning game logic |
| **BaseEntity** | HP, mana, buffs, physics body, death VFX | CombatSystem (receives damage calls), EventBus (emits on death) | New abstract class; Hero and Boss extend it |
| **Hero** | Player/ally-specific rendering, ability slots | CombatSystem, AIController, TraitSystem | Already exists; refactor to extend BaseEntity |
| **BossEntity** | 3-tier phase logic, boss-specific abilities, phase health thresholds | BossAISystem, EventBus, CombatSystem | New class; extends BaseEntity |
| **TowerEntity** | Static placement, periodic damage aura or projectile, health | CombatSystem, EventBus | New class; extends BaseEntity |
| **CombatSystem** | Projectiles, area effects, auto-attack, ability dispatch | BaseEntity (damage calls), EventBus (kill events), VFXManager | Already exists; extend to handle TowerEntity and BossEntity |
| **BossAISystem** | Phase-aware FSM for boss, phase transition logic | BossEntity (reads HP ratio), EventBus (emits phase changes) | New system; replaces AIController for boss |
| **MatchStateMachine** | Match phases: PRE_MATCH → ACTIVE → SUDDEN_DEATH → ENDED | EventBus (listens for kill events, timer events, emits state changes), HUD | New system; replaces ad-hoc booleans on BattleScene |
| **TraitSystem** | Battle trait application, modifier hooks on damage/kill/ability | EventBus (listens for combat events), BaseEntity (applies buffs/modifiers) | New system; data-driven via TraitRegistry |
| **XPSystem** | XP accumulation on kill, level-up stat grants, gem threshold unlocks | EventBus (listens for HERO_KILLED), Hero (applies stat increases) | New system |
| **NeutralCampSystem** | Camp spawn timers, buff grants on clear, respawn scheduling | EventBus (emits CAMP_CLEARED), BaseEntity (grants buffs) | New system |
| **TeamBalancer** | Pre-match stat scaling based on team size asymmetry | MatchOrchestrator, Hero stats on spawn | New system; runs once at match start |
| **EventBus** | Global typed event emitter; decouples all systems | All systems subscribe/emit through it | Single `Phaser.Events.EventEmitter` instance |
| **VFXManager** | Particles, screen effects, trails | Scene (creates game objects) | Already exists; no changes needed |
| **HUD** | Score display, timer, kill feed, boss phase bar | EventBus (subscribes to state changes) | Already exists; extend to consume events |

---

## Recommended Project Structure

```
src/
├── entities/
│   ├── BaseEntity.ts          # NEW: abstract; HP, mana, buffs, physics, death
│   ├── Hero.ts                # REFACTOR: extend BaseEntity
│   ├── BossEntity.ts          # NEW: 3-phase boss
│   ├── TowerEntity.ts         # NEW: static turret entity
│   ├── NeutralMob.ts          # NEW: neutral camp monster
│   ├── HealthBar.ts           # existing
│   ├── Projectile.ts          # existing
│   └── AreaEffect.ts          # existing
├── ai/
│   ├── AIController.ts        # existing; for heroes/mobs
│   ├── AIPersonality.ts       # existing
│   ├── BossAISystem.ts        # NEW: phase-aware boss FSM
│   └── BossPhaseProfile.ts    # NEW: per-phase AI + ability configs
├── systems/
│   ├── CombatSystem.ts        # existing; extend for boss/tower
│   ├── MatchStateMachine.ts   # NEW: formal match phase FSM
│   ├── TraitSystem.ts         # NEW: modifier application
│   ├── XPSystem.ts            # NEW: leveling, stat grants
│   ├── NeutralCampSystem.ts   # NEW: camp timers, buff grants
│   ├── TeamBalancer.ts        # NEW: asymmetric stat scaling
│   ├── EventBus.ts            # NEW: singleton EventEmitter
│   ├── ArenaGenerator.ts      # existing
│   ├── MatchOrchestrator.ts   # existing; extend with boss/camp config
│   ├── TeamManager.ts         # existing
│   ├── VFXManager.ts          # existing
│   ├── ParticlePresets.ts     # existing
│   └── TextureGenerator.ts    # existing
├── traits/
│   ├── TraitRegistry.ts       # NEW: all trait definitions
│   └── traitData.ts           # NEW: data declarations
├── gems/
│   ├── GemRegistry.ts         # NEW: random gem pool
│   └── gemData.ts             # NEW: gem stat definitions
├── scenes/
│   ├── BattleScene.ts         # REFACTOR: thin orchestrator
│   ├── BootScene.ts           # existing
│   ├── DraftScene.ts          # existing (add trait draft phase)
│   ├── MenuScene.ts           # existing
│   └── ResultScene.ts         # existing
├── ui/
│   ├── HUD.ts                 # existing; extend for score/boss bar
│   ├── AbilityBar.ts          # existing
│   ├── BossHealthBar.ts       # NEW: phase-segmented health display
│   └── ScoreDisplay.ts        # NEW: kill score + sudden death UI
├── heroes/
│   ├── heroData.ts            # existing
│   └── HeroRegistry.ts        # existing
├── types.ts                   # EXTEND: add new enums/interfaces
├── constants.ts               # EXTEND: boss thresholds, camp timers
└── main.ts                    # existing
```

### Structure Rationale

- **`entities/`:** All game objects with physics bodies live here, not in systems. Systems operate on entities; entities do not own systems.
- **`traits/` and `gems/`:** Isolated from entities and systems. Both are pure data registries consumed by TraitSystem and XPSystem respectively. Adding a new trait never touches combat code.
- **`systems/EventBus.ts`:** A single module-level singleton. Every system imports it and uses typed string constants for event names. Prevents the `battleScene as any` pattern.

---

## Architectural Patterns

### Pattern 1: Typed Event Bus (replace `battleScene as any`)

**What:** A module-level `Phaser.Events.EventEmitter` instance exported as a singleton. All cross-system communication goes through it. Event names are typed string constants.

**When to use:** Whenever two systems need to react to each other's state changes (kill events, boss phase transitions, camp clears, XP gains).

**Trade-offs:** Adds indirection (harder to trace call stacks). Eliminates the `battleScene as any` antipattern and makes systems independently testable.

**Example:**
```typescript
// systems/EventBus.ts
import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
  HERO_KILLED:         'hero:killed',
  BOSS_PHASE_CHANGE:   'boss:phase_change',
  BUFF_ACQUIRED:       'buff:acquired',
  MATCH_STATE_CHANGE:  'match:state_change',
  XP_GAINED:           'xp:gained',
  CAMP_CLEARED:        'camp:cleared',
  SCORE_UPDATED:       'score:updated',
} as const;

// Emitting (in BaseEntity.die())
EventBus.emit(Events.HERO_KILLED, { victim: this, killer });

// Subscribing (in XPSystem.init())
EventBus.on(Events.HERO_KILLED, this.onHeroKilled, this);
```

**Confidence:** HIGH — Phaser official docs confirm `Phaser.Events.EventEmitter` is the recommended cross-system communication mechanism. Singleton pattern avoids the `game.events` global pitfall noted in official docs.

---

### Pattern 2: BaseEntity Abstract Class

**What:** An abstract class that Hero, BossEntity, TowerEntity, and NeutralMob all extend. Houses the shared interface: `takeDamage()`, `heal()`, `addBuff()`, `isAlive`, physics body setup, death notification.

**When to use:** Whenever CombatSystem or TraitSystem needs to operate on any damageable entity without type-checking which concrete type it is.

**Trade-offs:** Slight over-engineering for a small roster but pays off immediately when Boss, Tower, and NeutralMob all need to receive damage from CombatSystem.

**Example:**
```typescript
// entities/BaseEntity.ts
export abstract class BaseEntity extends Phaser.GameObjects.Container {
  abstract entityType: 'hero' | 'boss' | 'tower' | 'neutral_mob';
  team: Team;
  isAlive = true;
  currentHP: number;
  maxHP: number;
  buffs: ActiveBuff[] = [];
  shield = 0;

  takeDamage(rawDamage: number, sourceId?: string): number { /* shared logic */ }
  heal(amount: number): void { /* shared logic */ }
  addBuff(buff: ActiveBuff): void { /* shared logic */ }
  isStunned(): boolean { /* shared logic */ }

  protected die(killerId?: string): void {
    this.isAlive = false;
    EventBus.emit(Events.HERO_KILLED, { victim: this, killerId });
    this.onDeath(); // hook for subclass-specific death behavior
  }

  protected abstract onDeath(): void;
}
```

---

### Pattern 3: Multi-Phase Boss via Hierarchical FSM

**What:** BossAISystem manages a BossEntity with three tiers, each represented as a distinct phase object. Phase transitions trigger at HP thresholds. Each phase carries its own attack patterns, move speed multiplier, and ability set.

**When to use:** The boss fight is the game's climax. Flat AI that doesn't escalate reads as a standard enemy. Phase changes must feel dramatic and signal to the player that rules have changed.

**Trade-offs:** Three AI profiles per boss is manageable; parameterize via `BossPhaseProfile` data objects so designers can tune without touching logic.

**Example:**
```typescript
// ai/BossPhaseProfile.ts
export interface BossPhaseProfile {
  phase: 1 | 2 | 3;
  hpThreshold: number;      // enter this phase when HP <= threshold (ratio 0-1)
  moveSpeedMultiplier: number;
  damageMultiplier: number;
  abilityPattern: 'cautious' | 'aggressive' | 'berserker';
  specialAbilities: string[]; // ability IDs unlocked in this phase
  vfxAura: string;            // element key for aura VFX change
}

// ai/BossAISystem.ts
export class BossAISystem {
  private currentPhase: BossPhaseProfile;
  private phases: BossPhaseProfile[];

  update(): void {
    const hpRatio = this.boss.currentHP / this.boss.maxHP;
    const nextPhase = this.phases.find(p => hpRatio <= p.hpThreshold && p.phase > this.currentPhase.phase);
    if (nextPhase) {
      this.transitionToPhase(nextPhase);
    }
    this.executePhase(this.currentPhase);
  }

  private transitionToPhase(phase: BossPhaseProfile): void {
    this.currentPhase = phase;
    EventBus.emit(Events.BOSS_PHASE_CHANGE, { phase: phase.phase });
    // Apply stat changes to BossEntity, swap VFX aura
  }
}
```

---

### Pattern 4: Match State Machine (MatchStateMachine)

**What:** A formal FSM replacing the `matchOver` boolean and inline `checkWinCondition()`. States: `PRE_MATCH → ACTIVE → SUDDEN_DEATH → ENDED`. Transitions are driven by EventBus events and timers. The state machine owns win/loss determination; BattleScene owns nothing about match outcome.

**When to use:** The moment you add sudden death and scoring, a boolean is no longer sufficient. State machines prevent invalid transitions (e.g., endMatch being called twice, or sudden death logic running after match ends).

**Example:**
```typescript
// systems/MatchStateMachine.ts
export enum MatchPhase {
  PRE_MATCH    = 'pre_match',
  ACTIVE       = 'active',
  SUDDEN_DEATH = 'sudden_death',
  ENDED        = 'ended',
}

export class MatchStateMachine {
  private phase: MatchPhase = MatchPhase.PRE_MATCH;
  private score = { teamA: 0, teamB: 0 };

  init(): void {
    EventBus.on(Events.HERO_KILLED, this.onKill, this);
    // timer events from Phaser scene time
  }

  private onKill({ victim }: { victim: BaseEntity }): void {
    if (this.phase === MatchPhase.ENDED) return;
    if (victim.team === Team.A) this.score.teamB++;
    else this.score.teamA++;
    EventBus.emit(Events.SCORE_UPDATED, this.score);
    this.checkTransitions();
  }

  private checkTransitions(): void {
    // ...transition to SUDDEN_DEATH or ENDED based on score/timer
  }

  transition(next: MatchPhase): void {
    this.phase = next;
    EventBus.emit(Events.MATCH_STATE_CHANGE, { phase: next, score: this.score });
  }
}
```

---

### Pattern 5: Data-Driven Trait System

**What:** Traits (battle modifiers chosen during draft or granted by camps) are pure data objects with a `trigger` (event name) and an `effect` (callback applied to entity stats or buffs). TraitSystem subscribes to EventBus events and calls the appropriate trait effects when triggered.

**When to use:** Any time you add a new trait. The system never changes — only `traitData.ts` grows. No trait logic touches CombatSystem or Hero directly.

**Trade-offs:** Debugging trait interactions is harder when effects are data-driven. Log all trait activations with the entity ID and trait ID during development.

**Example:**
```typescript
// traits/traitData.ts
export interface TraitDef {
  id: string;
  name: string;
  trigger: keyof typeof Events;   // which event activates this trait
  condition?: (payload: any) => boolean;
  effect: (payload: any, owner: BaseEntity) => void;
}

export const TRAIT_DEFS: TraitDef[] = [
  {
    id: 'bloodthirst',
    name: 'Bloodthirst',
    trigger: 'hero:killed',
    condition: ({ victim }) => victim.team !== owner.team,
    effect: (_payload, owner) => owner.heal(owner.maxHP * 0.1),
  },
  // ...
];

// systems/TraitSystem.ts
export class TraitSystem {
  private activeTraits: Map<string, TraitDef[]> = new Map(); // heroId → traits

  applyTraitsToEntity(entity: BaseEntity, traitIds: string[]): void {
    const traits = traitIds.map(id => TRAIT_DEFS.find(t => t.id === id)!).filter(Boolean);
    this.activeTraits.set(entity.getUniqueId(), traits);
    for (const trait of traits) {
      EventBus.on(Events[trait.trigger], (payload: any) => {
        if (!trait.condition || trait.condition(payload)) {
          trait.effect(payload, entity);
        }
      }, this);
    }
  }
}
```

---

### Pattern 6: Neutral Camp System with Timer-Based Spawn

**What:** NeutralCampSystem owns a list of camp definitions (position, mob types, buff grant on clear, respawn delay). It uses `scene.time` events to respawn camps and listens for HERO_KILLED events to detect when all mobs in a camp are dead, then grants the buff and schedules respawn.

**When to use:** Implemented after Core Combat and Boss phases are stable. Neutral camps require BaseEntity, EventBus, and TraitSystem to be in place first.

**Example:**
```typescript
// systems/NeutralCampSystem.ts
export interface CampDef {
  id: string;
  position: { x: number; y: number };
  mobTypes: string[];           // mob IDs from a NeutralMobRegistry
  buffOnClear: ActiveBuff;      // buff granted to clearing team
  respawnDelay: number;         // ms
  isElite: boolean;             // elite camps grant stronger buffs
}

export class NeutralCampSystem {
  private activeCamps: Map<string, NeutralMob[]> = new Map();

  spawnCamp(def: CampDef): void { /* instantiate NeutralMob entities */ }

  private onMobKilled({ victim }: { victim: BaseEntity }): void {
    // find which camp this mob belonged to
    // if all mobs in camp dead → grant buff to killer's team, emit CAMP_CLEARED, schedule respawn
  }
}
```

---

### Pattern 7: TeamBalancer — Pre-Match Stat Scaling

**What:** A pure function system (no state, no event subscriptions) that runs once after teams are composed. It receives team compositions and applies a scaling multiplier to under-manned teams so 2v3 feels intentionally punishing but survivable for the skill expression it creates.

**When to use:** Called in MatchOrchestrator.generateMatch() before heroes are instantiated. Produces a `TeamScaling` object consumed by BattleScene during hero creation.

**Example:**
```typescript
// systems/TeamBalancer.ts
export interface TeamScaling {
  teamAMultiplier: { hp: number; damage: number; moveSpeed: number };
  teamBMultiplier: { hp: number; damage: number; moveSpeed: number };
}

export class TeamBalancer {
  static compute(teamASize: number, teamBSize: number): TeamScaling {
    // smaller team gets stat multipliers to compensate
    const ratio = teamASize / teamBSize;
    const boost = ratio < 1 ? 1 + (1 - ratio) * 0.3 : 1; // 30% boost per missing member
    return {
      teamAMultiplier: ratio < 1
        ? { hp: boost, damage: boost, moveSpeed: 1.05 }
        : { hp: 1, damage: 1, moveSpeed: 1 },
      teamBMultiplier: ratio > 1
        ? { hp: boost, damage: boost, moveSpeed: 1.05 }
        : { hp: 1, damage: 1, moveSpeed: 1 },
    };
  }
}
```

---

## Data Flow

### Match Start Flow

```
DraftScene (trait selection)
    │ passes matchConfig + selectedTraits
    ↓
BattleScene.create()
    │
    ├─ MatchOrchestrator.generateMatch()
    │       └─ TeamBalancer.compute()  →  TeamScaling
    │
    ├─ ArenaGenerator.generate()  →  spawns camps if boss match
    │
    ├─ Hero/BossEntity/TowerEntity instantiation (scaled stats applied)
    │
    ├─ EventBus  ←─ all systems subscribe
    │
    ├─ TraitSystem.applyTraitsToEntity() for each hero
    │
    └─ MatchStateMachine.init()
```

### Kill Event Data Flow

```
BaseEntity.takeDamage()
    │  (HP reaches 0)
    ↓
BaseEntity.die()
    │
    EventBus.emit('hero:killed', { victim, killerId })
    │
    ├─→ MatchStateMachine.onKill()     →  updates score, checks transitions
    ├─→ XPSystem.onKill()              →  awards XP to killer, triggers level-up
    ├─→ TraitSystem event callbacks    →  applies trait effects (lifesteal, on-kill buffs)
    ├─→ NeutralCampSystem.onMobKilled()→  checks camp clear, grants buff
    └─→ HUD.onKill()                   →  updates kill feed, score display
```

### Boss Phase Transition Flow

```
BossAISystem.update()
    │  (HP threshold crossed)
    ↓
BossAISystem.transitionToPhase()
    │
    ├─ BossEntity stat adjustments (speed, damage multipliers)
    ├─ VFXManager phase-change aura swap
    │
    EventBus.emit('boss:phase_change', { phase: 2 })
    │
    ├─→ HUD.BossHealthBar.onPhaseChange()  →  visual phase segment update
    ├─→ ArenaGenerator (optional)          →  arena mutation (new obstacles)
    └─→ NeutralCampSystem (optional)       →  elite camp spawns on phase 3
```

### Match State Transitions

```
MatchPhase.PRE_MATCH
    │  (countdown complete)
    ↓
MatchPhase.ACTIVE
    │  (timer reaches 0 with no winner)
    ↓
MatchPhase.SUDDEN_DEATH
    │  (one hero dies in sudden death)
    ↓
MatchPhase.ENDED
    │
    └─ BattleScene.onMatchEnded()  →  ResultScene transition
```

---

## Suggested Build Order (System Dependencies)

This order is dictated by what each system depends on. Building out of order means rework.

| Step | System | Depends On | Why First |
|------|---------|-----------|-----------|
| 1 | **EventBus** | Nothing | Every subsequent system uses it; install early, even if unused |
| 2 | **BaseEntity** | EventBus | Hero, Boss, Tower all need to extend it; can't build those first |
| 3 | **Hero refactor** (extend BaseEntity) | BaseEntity, EventBus | Unblocks all hero-touching systems |
| 4 | **MatchStateMachine** | EventBus, BaseEntity | Replaces the `matchOver` boolean; needed before scoring or sudden death |
| 5 | **TraitSystem + TraitRegistry** | EventBus, BaseEntity | Traits hook into events; needs BaseEntity for effect targets |
| 6 | **XPSystem + GemRegistry** | EventBus, BaseEntity, TraitSystem | Levels can grant traits; traits must exist first |
| 7 | **TeamBalancer** | MatchOrchestrator (existing) | Pure function; needs no other new systems |
| 8 | **BossEntity + BossAISystem** | BaseEntity, EventBus, MatchStateMachine | Boss is an entity; its phase changes drive MatchStateMachine events |
| 9 | **TowerEntity** | BaseEntity, CombatSystem (extend) | Simpler than Boss; just a static damageable entity with a periodic attack |
| 10 | **NeutralCampSystem** | BaseEntity, EventBus, TraitSystem | Camps grant buffs (traits); needs both to be stable |
| 11 | **DraftScene trait selection UI** | TraitRegistry | UI for picking traits; registry must be complete |
| 12 | **HUD extensions** (boss bar, score display) | MatchStateMachine, EventBus | Consumes events; all producers must be wired |

---

## Anti-Patterns

### Anti-Pattern 1: `battleScene as any` Continued

**What people do:** Add boss and neutral camp access by casting `this.scene as any` and reaching for `battleScene.boss`, `battleScene.neutralCamps`, etc.

**Why it's wrong:** Each new system addition increases the cast surface. TypeScript loses all type safety. Integration bugs are invisible at compile time. We already have this problem in CombatSystem and AIController; do not propagate it.

**Do this instead:** Introduce EventBus. Systems emit and subscribe; they never need a scene reference beyond what is passed to their constructor. If a system genuinely needs scene-level Phaser APIs (tweens, time), pass `scene: Phaser.Scene` in the constructor, typed correctly — not `as any`.

---

### Anti-Pattern 2: Boss Logic Inside BattleScene.update()

**What people do:** Add boss HP threshold checks, phase timers, and ability patterns directly in `BattleScene.update()` because it's already the game loop entry point.

**Why it's wrong:** BattleScene becomes the "god object." Testing boss AI requires instantiating an entire scene. Phase logic is hidden inside a 400-line method rather than a named, findable class.

**Do this instead:** BossAISystem.update() is called from BattleScene.update() exactly like AIController. BattleScene delegates; it does not implement.

---

### Anti-Pattern 3: Trait Effects Inside Hero or CombatSystem

**What people do:** Add `if (hero.hasTrait('bloodthirst')) hero.heal(...)` inside `CombatSystem.tryAutoAttack()` or `Hero.takeDamage()`.

**Why it's wrong:** Every new trait requires editing existing system code. The trait count will grow; the systems will bloat. Trait interactions cannot be tested in isolation.

**Do this instead:** TraitSystem listens for `HERO_KILLED` on EventBus and applies effects externally. CombatSystem and Hero never know traits exist.

---

### Anti-Pattern 4: Storing Match State as Multiple Booleans

**What people do:** Add `isSuddenDeath: boolean`, `bossSpawned: boolean`, `scoringPhase: boolean` as new fields on BattleScene.

**Why it's wrong:** Boolean combinations create implicit states. `matchOver && isSuddenDeath` is an invalid state that has to be manually guarded everywhere. This is already a minor problem with `matchOver`.

**Do this instead:** MatchStateMachine with an explicit `MatchPhase` enum. Every part of the codebase can ask `matchStateMachine.is(MatchPhase.SUDDEN_DEATH)` instead of testing multiple booleans.

---

### Anti-Pattern 5: Boss as a Super-Powered Hero

**What people do:** Create the boss by calling `HeroRegistry.create()` with inflated stats and a special heroId.

**Why it's wrong:** Hero is designed for a player or AI-controlled character in a symmetrical team. It lacks phase management, multi-phase ability sets, and boss-specific visual presentation. Force-fitting a boss into `Hero` means hacking every assumption Hero makes.

**Do this instead:** BossEntity extends BaseEntity. It shares damage/buff logic from BaseEntity but implements its own constructor, ability dispatch, and phase transition logic. BossAISystem replaces AIController for this entity type.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| BattleScene ↔ Systems | Direct constructor injection (`new CombatSystem(this)`) | BattleScene passes `this` as `Phaser.Scene`, not `as any` |
| Systems ↔ Entities | Method calls (damage, heal, addBuff) + EventBus events | Systems call entity methods; entities emit events back |
| Systems ↔ Systems | EventBus only | No system holds a reference to another system |
| HUD ↔ Game State | EventBus subscriptions | HUD subscribes to score, phase, and kill events; never polls BattleScene |
| DraftScene ↔ BattleScene | Scene.start() data payload (matchConfig + selectedTraits) | Same pattern as existing matchConfig passing |
| TraitSystem ↔ BaseEntity | Direct method calls for buff application | TraitSystem receives entity reference when traits are assigned |

### Scaling Considerations

| Concern | Current Scale (now) | With Boss + Camps |
|---------|---------------------|-------------------|
| EventBus listener count | 0 (doesn't exist) | ~20-30 subscriptions; well within EventEmitter3 limits |
| Physics bodies | 4-8 heroes | Add 1 boss + 2 towers + 4-6 camp mobs = ~15 max; Arcade physics handles 100s easily |
| AI update cost | 200ms interval, 3-7 AIs | Boss gets its own 200ms update; camp mobs use simple pursuit FSM; no pathfinding needed |
| Entity pool | No pooling | Projectiles and particles could be pooled if spawn rate increases; not needed initially |

---

## Sources

- Phaser 3 Events documentation: [https://docs.phaser.io/phaser/concepts/events](https://docs.phaser.io/phaser/concepts/events) — HIGH confidence. EventBus singleton pattern and EventEmitter3 API confirmed.
- Phaser 3 Cross-Scene Communication: [https://docs.phaser.io/phaser/concepts/scenes/cross-scene-communication](https://docs.phaser.io/phaser/concepts/scenes/cross-scene-communication) — HIGH confidence. Confirms standalone emitter as safest cross-system communication.
- Game Programming Patterns — State chapter: [https://gameprogrammingpatterns.com/state.html](https://gameprogrammingpatterns.com/state.html) — HIGH confidence. Hierarchical FSM and pushdown automata patterns directly applicable to boss phase AI and match state machine.
- Chickensoft Game Architecture (Godot, pattern-portable): [https://chickensoft.games/blog/game-architecture](https://chickensoft.games/blog/game-architecture) — MEDIUM confidence. Layered architecture and trait-based interface decoupling verified against multiple game architecture sources.
- Game Developer — Boss Battle Design and Structure: [https://www.gamedeveloper.com/design/boss-battle-design-and-structure](https://www.gamedeveloper.com/design/boss-battle-design-and-structure) — MEDIUM confidence. Phase design philosophy (narrative beats, skill testing) informs why 3 tiers are the right count.
- MOBA neutral camp mechanics: Wikipedia MOBA + GDC Vault MOBA design — MEDIUM confidence. Respawn timers, buff-on-clear, elite camp concepts confirmed consistent across MOBA references.
- Existing codebase (read directly) — HIGH confidence. All current architecture observations are from direct file reads of the repository at `/Users/brenopires/Projetos/games/dota22/src/`.

---

*Architecture research for: Rift Clash — asymmetric arena brawler, Phaser 3 + TypeScript*
*Researched: 2026-02-22*
