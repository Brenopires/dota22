# Phase 4: Boss & Towers - Research

**Researched:** 2026-02-22
**Domain:** Phaser 3 game entities (boss AI FSM, tower mechanics, match win conditions, UI health bars)
**Confidence:** HIGH

## Summary

Phase 4 introduces two new entity types -- BossEntity and TowerEntity -- that extend the existing BaseEntity abstract class. The codebase already has a well-established pattern for entities (BaseEntity -> Hero), combat (CombatSystem with auto-attacks and abilities), event communication (EventBus singleton), and match state management (MatchStateMachine FSM). The boss and tower fit cleanly into these patterns.

The boss requires a health-threshold-based FSM (Normal -> Enraged -> Dying) with per-minute stat scaling, aggro-based targeting, and distinct attack patterns per phase. The tower requires a static physics body with AoE damage on a tick timer, out-of-combat HP regeneration, and a disable mechanic triggered by boss death. Tower destruction must integrate with MatchStateMachine to force an immediate match end.

**Primary recommendation:** Extend BaseEntity for both Boss and Tower, reuse CombatSystem patterns for damage dealing (boss melee attacks + AoE, tower AoE ticks), wire all cross-system communication through EventBus events (BOSS_KILLED, BOSS_PHASE_CHANGED, TOWER_DESTROYED, TOWER_DISABLED), and add a new VICTORY match end path to MatchStateMachine that bypasses the timer-based end.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | Game framework, physics, rendering, tweens | Already used for everything |
| TypeScript | (project config) | Type safety | Already used throughout |

### No New Dependencies Needed
This phase requires zero new libraries. Everything is built with:
- Phaser.GameObjects.Container (boss/tower visuals, same as Hero)
- Phaser.Physics.Arcade.Body (collision, overlap detection for tower AoE)
- Phaser.Events.EventEmitter (EventBus singleton, already exists)
- Phaser.GameObjects.Graphics (boss health bar, tower visuals, phase indicators)
- Phaser.Time.TimerEvent (boss scaling timer, tower regen timer, disable timer)

## Architecture Patterns

### Recommended Project Structure (new files)
```
src/
  entities/
    BaseEntity.ts        # (exists) Abstract base -- no changes needed
    Hero.ts              # (exists) Reference implementation
    BossEntity.ts        # NEW -- extends BaseEntity, boss FSM + scaling
    TowerEntity.ts       # NEW -- extends BaseEntity, AoE + regen
  systems/
    BossAISystem.ts      # NEW -- boss aggro, attack patterns, phase FSM
    EventBus.ts          # (exists) Add new event constants
    MatchStateMachine.ts # (modify) Add tower-destruction win path
    CombatSystem.ts      # (modify) Add boss/tower to collision & attack targets
  ui/
    BossHealthBar.ts     # NEW -- large centered health bar with phase markers
    HUD.ts               # (modify) Mount boss health bar, tower status indicators
  scenes/
    BattleScene.ts       # (modify) Spawn boss + towers, wire up systems
  constants.ts           # (modify) Add boss/tower constants
  types.ts               # (modify) Add BossPhase enum, Team.NEUTRAL
```

### Pattern 1: BossEntity extends BaseEntity
**What:** Boss is a Container-based entity like Hero, but with no abilities/mana. Instead it has phase-based attack patterns and per-minute stat scaling.
**When to use:** Single central boss per match.

```typescript
// Follows exact same constructor pattern as Hero:
export class BossEntity extends BaseEntity {
  readonly entityType = 'boss' as const;

  // Boss-specific state
  phase: BossPhase = BossPhase.NORMAL;
  private baseMaxHP: number;
  private baseDamage: number;
  private minutesElapsed = 0;
  private aggroTarget: BaseEntity | null = null;
  private attackTimer = 0;
  private phaseThresholds = { enraged: 0.6, dying: 0.25 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Neutral team -- boss attacks everyone
    super(scene, x, y, BOSS_BASE_HP, Team.NEUTRAL);
    this.baseMaxHP = BOSS_BASE_HP;
    this.baseDamage = BOSS_BASE_DAMAGE;
    // Setup physics, visuals...
  }

  // Scale stats each minute (called by timer)
  scalePower(minute: number): void {
    this.minutesElapsed = minute;
    const multiplier = 1 + (minute * BOSS_SCALING_PER_MINUTE);
    this.maxHP = Math.floor(this.baseMaxHP * multiplier);
    // Only heal the delta to prevent full-heal on scale
    const hpDelta = this.maxHP - this.baseMaxHP * (1 + ((minute - 1) * BOSS_SCALING_PER_MINUTE));
    this.heal(Math.max(0, hpDelta));
  }

  // Phase transition check (called after taking damage)
  private checkPhaseTransition(): void {
    const hpRatio = this.currentHP / this.maxHP;
    if (hpRatio <= this.phaseThresholds.dying && this.phase !== BossPhase.DYING) {
      this.phase = BossPhase.DYING;
      EventBus.emit(Events.BOSS_PHASE_CHANGED, { phase: BossPhase.DYING, boss: this });
    } else if (hpRatio <= this.phaseThresholds.enraged && this.phase === BossPhase.NORMAL) {
      this.phase = BossPhase.ENRAGED;
      EventBus.emit(Events.BOSS_PHASE_CHANGED, { phase: BossPhase.ENRAGED, boss: this });
    }
  }

  getUniqueId(): string { return 'boss_neutral'; }
  getArmor(): number { return BOSS_BASE_ARMOR + this.minutesElapsed; }
}
```

### Pattern 2: TowerEntity extends BaseEntity
**What:** Static entity with no movement, AoE damage tick to nearby enemies, out-of-combat HP regen, and a disable state.
**When to use:** One per team, positioned near team spawn areas.

```typescript
export class TowerEntity extends BaseEntity {
  readonly entityType = 'tower' as const;

  private attackRadius: number;
  private attackDamage: number;
  private attackTimer = 0;
  private regenTimer = 0;
  private lastDamagedTime = 0;
  private disabled = false;
  private disableTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, team: Team) {
    super(scene, x, y, TOWER_MAX_HP, team);
    this.attackRadius = TOWER_ATTACK_RADIUS;
    this.attackDamage = TOWER_ATTACK_DAMAGE;
    // Static body -- no movement
  }

  updateTower(dt: number, enemies: BaseEntity[]): void {
    if (!this.isAlive || this.disabled) return;
    this.updateBuffs(dt);

    // Attack nearest enemy in range
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      const target = this.findNearestEnemy(enemies);
      if (target) {
        target.takeDamage(this.attackDamage, this.getUniqueId());
        this.attackTimer = TOWER_ATTACK_INTERVAL;
        this.showAttackVFX(target);
      }
    }

    // Out-of-combat regen
    const timeSinceDamage = this.scene.time.now - this.lastDamagedTime;
    if (timeSinceDamage > TOWER_REGEN_DELAY && this.currentHP < this.maxHP) {
      this.heal(TOWER_REGEN_RATE * dt);
    }
  }

  override takeDamage(rawDamage: number, sourceId?: string): number {
    this.lastDamagedTime = this.scene.time.now;
    return super.takeDamage(rawDamage, sourceId);
  }

  disable(duration: number): void {
    this.disabled = true;
    this.disableTimer = duration;
    EventBus.emit(Events.TOWER_DISABLED, { tower: this, duration });
    // Visual feedback -- grey out, particles stop
  }

  getUniqueId(): string { return `tower_${this.team}`; }
}
```

### Pattern 3: BossAISystem (Health-Threshold FSM)
**What:** Standalone system that drives boss behavior. NOT extending AIController -- boss AI is fundamentally different from hero AI (no abilities/mana, phase-based attacks, aggro radius rather than target selection).
**When to use:** Updated each frame from BattleScene.update(), similar to how aiControllers are updated.

```typescript
export class BossAISystem {
  private boss: BossEntity;
  private scene: Phaser.Scene;
  private aggroRadius = BOSS_AGGRO_RADIUS;
  private leashRadius = BOSS_LEASH_RADIUS;
  private homePosition: { x: number; y: number };

  update(dt: number, allEntities: BaseEntity[]): void {
    if (!this.boss.isAlive) return;

    // Find targets in aggro radius
    const nearbyEnemies = allEntities.filter(e =>
      e.isAlive &&
      e !== this.boss &&
      Phaser.Math.Distance.Between(this.boss.x, this.boss.y, e.x, e.y) <= this.aggroRadius
    );

    if (nearbyEnemies.length === 0) {
      this.returnToHome(); // Leash behavior
      return;
    }

    // Target selection: closest entity
    const target = this.selectTarget(nearbyEnemies);

    // Execute phase-appropriate attack pattern
    switch (this.boss.phase) {
      case BossPhase.NORMAL:
        this.executeNormalAttack(target, dt);
        break;
      case BossPhase.ENRAGED:
        this.executeEnragedAttack(target, nearbyEnemies, dt);
        break;
      case BossPhase.DYING:
        this.executeDyingAttack(target, nearbyEnemies, dt);
        break;
    }
  }
}
```

### Pattern 4: Revival Token Mechanic
**What:** On boss kill, the killing team receives a one-time death prevention token. The next time any hero on that team dies, the token is consumed instead and the hero is instantly revived.
**When to use:** Managed via EventBus -- listens for HERO_KILLED, checks token, cancels death if token exists.

```typescript
// In BattleScene or a dedicated RewardSystem:
private revivalTokenTeam: Team | null = null;

private onBossKilled({ killerId }: { victim: BossEntity; killerId?: string }): void {
  const killer = this.findEntityById(killerId);
  if (!killer) return;
  const team = killer.team;

  // Team-wide stat buff
  const allies = team === Team.A ? this.teamA : this.teamB;
  for (const hero of allies) {
    hero.addBuff({
      type: BuffType.STAT_BUFF,
      value: BOSS_KILL_BUFF_DAMAGE,
      duration: BOSS_KILL_BUFF_DURATION,
      remaining: BOSS_KILL_BUFF_DURATION,
      sourceId: 'boss_reward',
    });
  }

  // Grant revival token
  this.revivalTokenTeam = team;
  EventBus.emit(Events.BOSS_KILLED, { killingTeam: team });
}

// Intercept next death:
private onHeroKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
  const hero = victim as Hero;

  // Check revival token BEFORE normal death processing
  if (this.revivalTokenTeam === hero.team) {
    this.revivalTokenTeam = null; // Consume token
    // Cancel death: restore HP, re-enable
    hero.isAlive = true;
    hero.currentHP = Math.floor(hero.maxHP * 0.3); // Revive at 30% HP
    hero.body.setEnable(true);
    hero.body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
    EventBus.emit(Events.REVIVAL_TOKEN_USED, { hero });
    return; // Skip normal death processing
  }

  // ... normal death processing
}
```

### Pattern 5: Tower Destruction Win Condition
**What:** When a tower reaches 0 HP, immediately end the match via MatchStateMachine. The destroying team wins.
**When to use:** Handled in tower's onDeath() which emits TOWER_DESTROYED, listened to by MatchStateMachine or BattleScene.

```typescript
// In MatchStateMachine -- add a new method:
endByTowerDestruction(destroyedTowerTeam: Team): void {
  if (this.phase === MatchPhase.ENDED) return;
  const winningTeam = destroyedTowerTeam === Team.A ? Team.B : Team.A;
  this.transition(MatchPhase.ENDED);
  EventBus.emit(Events.TOWER_DESTROYED, { destroyedTeam: destroyedTowerTeam, winningTeam });
}
```

### Pattern 6: EventBus Events to Add
```typescript
// New events for Phase 4:
export const Events = {
  // ... existing events ...

  // Boss events
  BOSS_KILLED:         'boss:killed',          // { killingTeam: Team, killerId: string }
  BOSS_PHASE_CHANGED:  'boss:phase_changed',   // { phase: BossPhase, boss: BossEntity }
  BOSS_SCALED:         'boss:scaled',          // { minute: number, newMaxHP: number }

  // Tower events
  TOWER_DESTROYED:     'tower:destroyed',      // { destroyedTeam: Team, winningTeam: Team }
  TOWER_DISABLED:      'tower:disabled',       // { tower: TowerEntity, duration: number }
  TOWER_ENABLED:       'tower:enabled',        // { tower: TowerEntity }
  TOWER_DAMAGED:       'tower:damaged',        // { tower: TowerEntity, damage: number }

  // Revival
  REVIVAL_TOKEN_USED:  'revival:token_used',   // { hero: Hero }
} as const;
```

### Anti-Patterns to Avoid
- **Boss re-aggro ping-pong:** Without a leash and aggro hysteresis, the boss will chase a hero, lose aggro, return, re-aggro, and oscillate. Use a leash radius (larger than aggro radius) and a sticky target timer.
- **Tower damage stacking with boss attacks:** If boss and tower can target the same hero, damage can feel unfair. Towers already auto-target -- boss should prefer heroes not being attacked by towers.
- **Modifying MatchStateMachine.transition() order guard:** The current guard `if (order.indexOf(next) <= order.indexOf(this.phase)) return;` prevents backward transitions. Tower destruction must call the existing `transition(MatchPhase.ENDED)` method, NOT bypass it.
- **Hard-coding boss position into CombatSystem:** CombatSystem currently only handles Hero[] arrays. Instead of refactoring CombatSystem to handle BaseEntity[], create boss and tower attack methods separately and have BattleScene orchestrate them.
- **Emitting HERO_KILLED for boss death:** BaseEntity.die() currently emits HERO_KILLED for ALL entity types. Boss death must emit a BOSS_KILLED event instead (or additionally). The die() path should be overridden in BossEntity to emit the correct event.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distance calculations | Custom math | `Phaser.Math.Distance.Between()` | Already used everywhere in codebase |
| Timer management | `setTimeout` / manual counters | `scene.time.addEvent()` / `scene.time.delayedCall()` | Respects Phaser time scale, auto-cleanup on scene destroy |
| Tween animations | Manual interpolation | `scene.tweens.add()` | Already used for all VFX, handles easing, chaining |
| Circle overlap detection | Manual radius checks | `Phaser.Physics.Arcade.overlap()` or manual distance check | Physics-integrated approach for tower AoE |
| Health bar rendering | DOM/HTML overlay | `Phaser.GameObjects.Graphics` | Existing HealthBar class uses this pattern, stays in canvas |
| Event communication | Direct method calls between systems | `EventBus.emit()` / `EventBus.on()` | Established pattern, decouples systems |
| State machine | if/else chains | Enum-based FSM (like MatchStateMachine) | Already proven pattern in codebase |

**Key insight:** The codebase has well-established patterns for every mechanism needed. The risk is NOT "how to build X" but "how to integrate X with the existing systems cleanly."

## Common Pitfalls

### Pitfall 1: BaseEntity.die() Emits HERO_KILLED for All Entity Types
**What goes wrong:** BaseEntity.die() on line 59 emits `Events.HERO_KILLED` regardless of entity type. If BossEntity inherits this, boss death triggers hero kill scoring, respawn logic, XP awards, etc.
**Why it happens:** BaseEntity was designed when only heroes existed. The event name is misleading.
**How to avoid:** Override die() in BossEntity and TowerEntity to emit entity-type-specific events (BOSS_KILLED, TOWER_DESTROYED). Do NOT call super.die() directly -- duplicate the idempotent guard logic and emit the correct event. Alternatively, rename the base event to ENTITY_KILLED and have subscribers filter by entityType.
**Warning signs:** Boss death triggers respawn timers, kill feed shows "Unknown > Boss", score increments on boss kill.

### Pitfall 2: CombatSystem Only Handles Hero[]
**What goes wrong:** CombatSystem.tryAutoAttack() casts targets as Hero[] and calls hero-specific methods (distanceTo, getAttackRange, etc.). Boss and tower cannot be attacked via this system without changes.
**Why it happens:** CombatSystem was built for hero-vs-hero combat only.
**How to avoid:** Two approaches: (A) Make boss/tower attackable by heroes via a separate attack check in BattleScene.update() that uses BaseEntity methods, or (B) refactor CombatSystem to accept BaseEntity[] alongside Hero[]. Approach (A) is simpler and lower-risk.
**Warning signs:** Heroes ignore boss/tower, projectiles pass through them.

### Pitfall 3: Team.NEUTRAL Does Not Exist
**What goes wrong:** Boss needs to be attackable by both teams. Current Team enum only has A and B.
**Why it happens:** The two-team system was designed without neutral entities.
**How to avoid:** Add `NEUTRAL = 'NEUTRAL'` to the Team enum. Update getEnemies() to treat NEUTRAL as enemy to both teams. Boss has team = Team.NEUTRAL.
**Warning signs:** Boss is friendly to one team, or is not targetable by AI.

### Pitfall 4: Revival Token Timing with EventBus
**What goes wrong:** If the revival token handler runs AFTER the kill handler in BattleScene.onHeroKilled(), the hero is already dead, respawn is scheduled, and then the token tries to revive -- causing duplicate respawn.
**Why it happens:** EventBus listener execution order depends on registration order.
**How to avoid:** Process the revival token check INSIDE the existing onHeroKilled handler in BattleScene, BEFORE scheduling respawn. Don't register a separate listener.
**Warning signs:** Hero dies, instantly revives, AND respawns again 5 seconds later (double-alive).

### Pitfall 5: Boss Leash / Reset Exploit
**What goes wrong:** Players kite the boss to the edge of leash range, deal damage, boss resets and heals to full. Repeat for safe boss farming.
**Why it happens:** Naive leash implementation: lose aggro -> full heal -> return.
**How to avoid:** Boss should NOT heal when returning to home position. Track "combat" state separately -- boss only heals if no damage taken for N seconds (like tower regen). Leash just prevents boss from following too far.
**Warning signs:** Boss HP yo-yos between full and damaged.

### Pitfall 6: Tower AoE + Boss = Instant Wipe
**What goes wrong:** If tower can target the boss, and boss is near a tower, tower does constant AoE damage to the boss, making it trivially easy (or impossible, if tower targets heroes near boss).
**Why it happens:** Tower targeting logic doesn't exclude neutral entities.
**How to avoid:** Towers should ONLY target enemy heroes, NOT the boss. Boss is Team.NEUTRAL and should be excluded from tower targeting.
**Warning signs:** Boss dies in seconds when near a tower, or heroes near boss get tower-sniped.

### Pitfall 7: MatchStateMachine Score on Non-Hero Kills
**What goes wrong:** MatchStateMachine.onKill() increments team score for EVERY HERO_KILLED event. If boss/tower death emits this event, score gets corrupted.
**Why it happens:** Score handler doesn't check entityType.
**How to avoid:** Either (A) boss/tower emit different events (not HERO_KILLED), or (B) add entityType filter in onKill handler. Option A is cleaner.
**Warning signs:** Score jumps by 1 when boss dies.

## Code Examples

### Boss Spawn Position (Arena Center)
The arena is ARENA_WIDTH (1600) x ARENA_HEIGHT (1200). Center is (800, 600). Boss spawns at center. Source: `src/constants.ts` and `src/systems/ArenaGenerator.ts`.
```typescript
const BOSS_SPAWN_X = ARENA_WIDTH / 2;   // 800
const BOSS_SPAWN_Y = ARENA_HEIGHT / 2;  // 600
```

### Tower Positions (Near Team Spawns)
Team A spawns at x ~120-180, Team B spawns at x ~1420-1520. Towers should be positioned slightly in front of spawns to protect them.
```typescript
const TOWER_A_X = 250;  // ~70px in front of Team A spawns
const TOWER_A_Y = ARENA_HEIGHT / 2; // 600
const TOWER_B_X = ARENA_WIDTH - 250; // 1350
const TOWER_B_Y = ARENA_HEIGHT / 2;  // 600
```

### Boss Per-Minute Scaling Timer (Phaser pattern)
```typescript
// In BattleScene.create(), after spawning boss:
let bossMinute = 0;
this.time.addEvent({
  delay: 60000, // 1 minute
  callback: () => {
    bossMinute++;
    this.boss.scalePower(bossMinute);
    EventBus.emit(Events.BOSS_SCALED, { minute: bossMinute, newMaxHP: this.boss.maxHP });
  },
  loop: true,
});
```

### Boss Health Bar UI (Centered, Top of Screen)
```typescript
// BossHealthBar -- drawn with Graphics, fixed to camera (setScrollFactor(0))
export class BossHealthBar {
  private graphics: Phaser.GameObjects.Graphics;
  private phaseMarkers: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;

  private readonly BAR_WIDTH = 400;
  private readonly BAR_HEIGHT = 16;
  private readonly BAR_Y = 80; // Below timer at y=28

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0).setDepth(200);

    this.phaseMarkers = scene.add.graphics();
    this.phaseMarkers.setScrollFactor(0).setDepth(201);

    // Draw phase threshold markers at 60% and 25%
    const barX = (GAME_WIDTH - this.BAR_WIDTH) / 2;
    this.phaseMarkers.lineStyle(2, 0xffff00, 0.6);
    this.phaseMarkers.lineBetween(
      barX + this.BAR_WIDTH * 0.6, this.BAR_Y - 2,
      barX + this.BAR_WIDTH * 0.6, this.BAR_Y + this.BAR_HEIGHT + 2
    );
    this.phaseMarkers.lineStyle(2, 0xff0000, 0.6);
    this.phaseMarkers.lineBetween(
      barX + this.BAR_WIDTH * 0.25, this.BAR_Y - 2,
      barX + this.BAR_WIDTH * 0.25, this.BAR_Y + this.BAR_HEIGHT + 2
    );

    this.nameText = scene.add.text(GAME_WIDTH / 2, this.BAR_Y - 14, 'ANCIENT GUARDIAN', {
      fontSize: '12px', color: '#ff6666', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.hpText = scene.add.text(GAME_WIDTH / 2, this.BAR_Y + this.BAR_HEIGHT / 2, '', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
  }

  update(currentHP: number, maxHP: number, phase: BossPhase): void {
    const g = this.graphics;
    g.clear();

    const barX = (GAME_WIDTH - this.BAR_WIDTH) / 2;
    const hpRatio = Math.max(0, currentHP / maxHP);

    // Background
    g.fillStyle(0x333333, 0.8);
    g.fillRoundedRect(barX, this.BAR_Y, this.BAR_WIDTH, this.BAR_HEIGHT, 4);

    // HP fill -- color based on phase
    const phaseColor = phase === BossPhase.NORMAL ? 0xff4444 :
                       phase === BossPhase.ENRAGED ? 0xff8800 : 0xff0000;
    const hpWidth = this.BAR_WIDTH * hpRatio;
    if (hpWidth > 0) {
      g.fillStyle(phaseColor, 1);
      g.fillRoundedRect(barX, this.BAR_Y, hpWidth, this.BAR_HEIGHT, 4);
    }

    // Border
    g.lineStyle(2, 0x888888, 0.6);
    g.strokeRoundedRect(barX, this.BAR_Y, this.BAR_WIDTH, this.BAR_HEIGHT, 4);

    this.hpText.setText(`${Math.ceil(currentHP)} / ${maxHP}`);
  }
}
```

### Tower Visual (Procedural, like Hero textures)
```typescript
// Tower is a Container with: base circle, team-colored ring, "T" label, attack range indicator
constructor(scene: Phaser.Scene, x: number, y: number, team: Team) {
  super(scene, x, y, TOWER_MAX_HP, team);

  const teamColor = team === Team.A ? 0x00aaff : 0xff4444;
  const towerRadius = TOWER_RADIUS; // ~30px, larger than hero

  // Base structure (square with rounded corners)
  const base = scene.add.graphics();
  base.fillStyle(0x888888, 1);
  base.fillRoundedRect(-towerRadius, -towerRadius, towerRadius * 2, towerRadius * 2, 8);
  base.lineStyle(3, teamColor, 0.8);
  base.strokeRoundedRect(-towerRadius, -towerRadius, towerRadius * 2, towerRadius * 2, 8);
  this.add(base);

  // Team-colored glow
  const glow = scene.add.circle(0, 0, towerRadius + 5);
  glow.setStrokeStyle(2, teamColor, 0.3);
  glow.setFillStyle(teamColor, 0.05);
  this.add(glow);

  // Attack range indicator (faint circle)
  const rangeIndicator = scene.add.circle(0, 0, TOWER_ATTACK_RADIUS);
  rangeIndicator.setStrokeStyle(1, teamColor, 0.1);
  rangeIndicator.setFillStyle(0x000000, 0);
  this.add(rangeIndicator);

  // Physics -- STATIC body
  scene.add.existing(this);
  scene.physics.add.existing(this, false); // Not static because BaseEntity expects dynamic
  const body = this.body as Phaser.Physics.Arcade.Body;
  body.setImmovable(true); // Cannot be pushed
  body.setCircle(towerRadius, -towerRadius, -towerRadius);
  body.setVelocity(0, 0);
  body.moves = false; // Never moves
}
```

### How Hero AI Targets Boss/Tower (AIController modification)
```typescript
// AIController needs awareness of boss/tower for target selection.
// Approach: BattleScene.getEnemies() already returns Hero[] -- extend it to
// also return attackable non-hero entities when AI needs to consider them.

// In BattleScene:
getAttackableEntities(team: Team): BaseEntity[] {
  const enemies = this.getEnemies(team) as BaseEntity[];
  // Boss is attackable by everyone
  if (this.boss?.isAlive) enemies.push(this.boss);
  // Enemy tower is attackable
  const enemyTower = team === Team.A ? this.towerB : this.towerA;
  if (enemyTower?.isAlive) enemies.push(enemyTower);
  return enemies;
}
```

## Recommended Constants

```typescript
// Boss constants
export const BOSS_BASE_HP = 3000;
export const BOSS_BASE_DAMAGE = 40;
export const BOSS_BASE_ARMOR = 5;
export const BOSS_SCALING_PER_MINUTE = 0.15; // +15% per minute
export const BOSS_AGGRO_RADIUS = 250;
export const BOSS_LEASH_RADIUS = 400;
export const BOSS_ATTACK_RANGE = 80; // Melee boss
export const BOSS_ATTACK_INTERVAL = 1.5; // seconds between attacks
export const BOSS_ENRAGED_ATTACK_INTERVAL = 1.0;
export const BOSS_DYING_ATTACK_INTERVAL = 0.7;
export const BOSS_RADIUS = 35; // Larger than hero (20)
export const BOSS_KILL_BUFF_DAMAGE = 20; // +20 attack damage
export const BOSS_KILL_BUFF_DURATION = 60; // 60 seconds
export const BOSS_ENRAGED_THRESHOLD = 0.6; // 60% HP
export const BOSS_DYING_THRESHOLD = 0.25; // 25% HP

// Tower constants
export const TOWER_MAX_HP = 4000;
export const TOWER_ATTACK_DAMAGE = 80;
export const TOWER_ATTACK_RADIUS = 200;
export const TOWER_ATTACK_INTERVAL = 1.0; // seconds
export const TOWER_RADIUS = 30;
export const TOWER_REGEN_RATE = 20; // HP per second
export const TOWER_REGEN_DELAY = 5000; // ms out of combat before regen starts
export const TOWER_DISABLE_DURATION = 15; // seconds after boss kill
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Only Hero entities | BaseEntity abstract with entityType discriminator | Phase 1 | Boss/Tower can extend BaseEntity cleanly |
| Direct method coupling | EventBus decoupled events | Phase 1 | Boss/Tower integrate via events, not direct calls |
| Timer-only match end | MatchStateMachine FSM | Phase 1 | Tower destruction can trigger ENDED state cleanly |
| Hero-only CombatSystem | CombatSystem + separate boss/tower attack logic | Phase 4 (this phase) | Need to add boss/tower attack paths |

**Important note on BaseEntity.die():** The current die() method emits `Events.HERO_KILLED` on line 59 for ALL entity types. This was fine when only heroes existed. For Phase 4, BossEntity and TowerEntity MUST override the die() method to emit entity-specific events. The `entityType` discriminator already exists on BaseEntity (`readonly abstract entityType: 'hero' | 'boss' | 'tower' | 'neutral_mob'`) specifically for this use case.

## Open Questions

1. **Should hero AI proactively target the boss?**
   - What we know: Hero AI currently targets enemy heroes only (AIController.selectTarget filters by getEnemies which returns Hero[])
   - What's unclear: Should AI heroes engage the boss, or only attack it if the player leads them there? Making AI target boss could lead to weird behavior (whole team ignoring enemies to fight boss).
   - Recommendation: AI heroes should NOT proactively target boss. They should only attack boss if (A) already in boss aggro range and boss is attacking them, or (B) player is attacking boss and they follow the player's target. Default to hero-vs-hero combat.

2. **Should towers be destructible by the boss?**
   - What we know: Requirement TOWR-03 says "boss kill temporarily disables enemy towers." This implies boss doesn't destroy towers, it disables them.
   - What's unclear: Can the boss walk to a tower and destroy it? The requirements don't mention this.
   - Recommendation: Boss should NOT attack towers. Boss only attacks heroes in its aggro radius. Towers are destroyed only by enemy heroes.

3. **Revival token: team-wide or single-hero?**
   - What we know: BOSS-02 says "1 revival token (mini Aegis)" -- singular. Dota 2's Aegis revives the holder specifically.
   - What's unclear: Does the first hero on the team to die consume it, or can the team choose?
   - Recommendation: First death on the killing team consumes it automatically. Simplest implementation, matches Dota 2 pattern where the Aegis holder is the one who dies.

4. **Boss respawn after kill?**
   - What we know: Requirements only mention "First boss kill" (BOSS-02) and Phase 7 defers Tier 2 boss.
   - What's unclear: Does the boss respawn at all in Phase 4?
   - Recommendation: Boss does NOT respawn in Phase 4. Single kill, single set of rewards. Tier 2 boss roaming is deferred to Phase 7 per roadmap.

## Sources

### Primary (HIGH confidence)
- `src/entities/BaseEntity.ts` -- Abstract class with entityType discriminator, die() path, takeDamage/heal/buff system
- `src/entities/Hero.ts` -- Reference implementation of BaseEntity extension (constructor pattern, physics setup, updateHero pattern, onDeath override)
- `src/systems/CombatSystem.ts` -- Auto-attack pattern (tryAutoAttack), projectile/area handling, Hero[] dependency
- `src/systems/EventBus.ts` -- Singleton emitter pattern, existing event constants
- `src/systems/MatchStateMachine.ts` -- FSM with transition guard, onKill scoring, timer tick
- `src/scenes/BattleScene.ts` -- Full game loop: create() spawning, update() orchestration, onHeroKilled() respawn scheduling, endMatch() flow
- `src/ai/AIController.ts` -- AI state machine pattern, target selection, hero-specific methods
- `src/constants.ts` -- Arena dimensions (1600x1200), game timing constants
- `src/systems/ArenaGenerator.ts` -- Spawn positions (Team A at x~120, Team B at x~1480), obstacle placement, center at (800,600)
- `src/types.ts` -- Team enum, MatchPhase enum, BuffType enum, ActiveBuff interface
- `src/systems/XPSystem.ts` -- XP_PER_OBJECTIVE constant already exists for boss kill XP rewards
- `src/ui/HUD.ts` -- HUD layout, Graphics-based health bars, respawn overlay pattern
- `src/entities/HealthBar.ts` -- Per-entity health bar with dirty-flag rendering

### Secondary (MEDIUM confidence)
- Phaser 3.90.0 Arcade Physics -- `body.setImmovable(true)` and `body.moves = false` for static-like behavior on dynamic bodies (verified by codebase usage patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all Phaser 3 built-in APIs
- Architecture: HIGH -- extends existing proven patterns (BaseEntity, EventBus, MatchStateMachine)
- Pitfalls: HIGH -- identified from direct codebase analysis (die() emitting HERO_KILLED, CombatSystem Hero[] coupling, Team enum missing NEUTRAL)
- Code examples: HIGH -- based on actual codebase patterns, not hypothetical
- Constants/tuning: MEDIUM -- numbers are reasonable estimates but will need playtesting

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable -- Phaser 3 and codebase patterns well-established)
