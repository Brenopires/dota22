import Phaser from 'phaser';
import { ARENA_WIDTH, ARENA_HEIGHT, MATCH_DURATION, MANA_REGEN_RATE, AI_UPDATE_INTERVAL, HERO_RADIUS, RESPAWN_DURATION } from '../constants';
import { Team, MatchResult, MatchPhase } from '../types';
import { Hero } from '../entities/Hero';
import { HeroRegistry } from '../heroes/HeroRegistry';
import { CombatSystem } from '../systems/CombatSystem';
import { ArenaGenerator } from '../systems/ArenaGenerator';
import { MatchOrchestrator } from '../systems/MatchOrchestrator';
import { AIController } from '../ai/AIController';
import { HUD } from '../ui/HUD';
import { MMRCalculator } from '../utils/MMRCalculator';
import { StorageManager } from '../utils/StorageManager';
import { VFXManager } from '../systems/VFXManager';
import { MatchStateMachine } from '../systems/MatchStateMachine';
import { EventBus, Events } from '../systems/EventBus';
import { BaseEntity } from '../entities/BaseEntity';

export class BattleScene extends Phaser.Scene {
  player!: Hero;
  heroes: Hero[] = [];
  teamA: Hero[] = [];
  teamB: Hero[] = [];
  combatSystem!: CombatSystem;
  vfxManager!: VFXManager;
  aiControllers: AIController[] = [];
  hud!: HUD;
  matchStateMachine!: MatchStateMachine;
  teamAKills = 0;
  teamBKills = 0;
  playerKills = 0;
  playerDeaths = 0;
  playerRespawnEndTime = 0; // ms timestamp — 0 means player is alive; non-zero means player is respawning
  private endingMatch = false;
  private respawnTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
  keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    I: Phaser.Input.Keyboard.Key;
    O: Phaser.Input.Keyboard.Key;
    P: Phaser.Input.Keyboard.Key;
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
  };
  spawnA: { x: number; y: number }[] = [];
  spawnB: { x: number; y: number }[] = [];
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  projectiles!: Phaser.GameObjects.Group;
  areaEffects!: Phaser.GameObjects.Group;
  aiTimer = 0;
  matchConfig!: ReturnType<typeof MatchOrchestrator.generateMatch>;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(data?: { matchConfig?: ReturnType<typeof MatchOrchestrator.generateMatch> }): void {
    this.endingMatch = false;
    this.teamAKills = 0;
    this.teamBKills = 0;
    this.playerKills = 0;
    this.playerDeaths = 0;
    this.heroes = [];
    this.teamA = [];
    this.teamB = [];
    this.aiControllers = [];
    this.aiTimer = 0;
    this.respawnTimers = new Map();

    // Use provided match config or generate new one
    this.matchConfig = data?.matchConfig ?? MatchOrchestrator.generateMatch();

    // Create VFX manager
    this.vfxManager = new VFXManager(this);

    // Create arena
    this.obstacles = this.physics.add.staticGroup();
    this.projectiles = this.add.group();
    this.areaEffects = this.add.group();

    const arenaConfig = ArenaGenerator.generate(this.matchConfig.arenaTheme, this.matchConfig.arenaLayout);
    ArenaGenerator.render(this, arenaConfig, this.obstacles);
    this.spawnA = arenaConfig.spawnA;
    this.spawnB = arenaConfig.spawnB;

    // Set world bounds
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Ambient particles
    this.vfxManager.createAmbientParticles(this.matchConfig.arenaTheme, {
      x: 0, y: 0, width: ARENA_WIDTH, height: ARENA_HEIGHT,
    });

    // Create combat system
    this.combatSystem = new CombatSystem(this);

    // Create heroes
    const { teamA: teamAIds, teamB: teamBIds, playerHero } = this.matchConfig;

    for (let i = 0; i < teamAIds.length; i++) {
      const heroId = teamAIds[i];
      const spawn = arenaConfig.spawnA[i] || arenaConfig.spawnA[0];
      const isPlayer = heroId === playerHero;
      const hero = HeroRegistry.create(this, heroId, spawn.x, spawn.y, Team.A, isPlayer);
      this.heroes.push(hero);
      this.teamA.push(hero);
      if (isPlayer) {
        this.player = hero;
      }
    }

    for (let i = 0; i < teamBIds.length; i++) {
      const heroId = teamBIds[i];
      const spawn = arenaConfig.spawnB[i] || arenaConfig.spawnB[0];
      const hero = HeroRegistry.create(this, heroId, spawn.x, spawn.y, Team.B, false);
      this.heroes.push(hero);
      this.teamB.push(hero);
    }

    // Setup collisions
    this.combatSystem.setupCollisions(this.heroes, this.obstacles);

    // Setup AI for non-player heroes
    for (const hero of this.heroes) {
      if (!hero.isPlayer) {
        const ai = new AIController(hero, this);
        this.aiControllers.push(ai);
      }
    }

    // Camera follow player
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.fadeIn(400);

    // Vignette overlay
    this.createVignette();

    // Input
    this.keys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      I: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      O: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O),
      P: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      ONE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      TWO: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      THREE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    };

    // HUD
    this.hud = new HUD(this);

    // MatchStateMachine — owns the 5-minute countdown timer
    this.matchStateMachine = new MatchStateMachine(this, MATCH_DURATION);
    this.matchStateMachine.start();

    // Subscribe to match state changes
    EventBus.on(Events.MATCH_STATE_CHANGE, this.onMatchStateChange, this);

    // Subscribe to hero kills for respawn scheduling and kill feed
    EventBus.on(Events.HERO_KILLED, this.onHeroKilled, this);
  }

  private createVignette(): void {
    const g = this.add.graphics();
    g.setScrollFactor(0);
    g.setDepth(150);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const thickness = 80;

    // Top edge
    for (let i = 0; i < thickness; i++) {
      const alpha = (1 - i / thickness) * 0.3;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, i, w, 1);
    }
    // Bottom edge
    for (let i = 0; i < thickness; i++) {
      const alpha = (1 - i / thickness) * 0.3;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, h - i, w, 1);
    }
    // Left edge
    for (let i = 0; i < thickness; i++) {
      const alpha = (1 - i / thickness) * 0.2;
      g.fillStyle(0x000000, alpha);
      g.fillRect(i, 0, 1, h);
    }
    // Right edge
    for (let i = 0; i < thickness; i++) {
      const alpha = (1 - i / thickness) * 0.2;
      g.fillStyle(0x000000, alpha);
      g.fillRect(w - i, 0, 1, h);
    }
  }

  update(time: number, delta: number): void {
    if (this.matchStateMachine?.getPhase() === MatchPhase.ENDED) return;

    const dt = delta / 1000;

    // Player input
    if (this.player && this.player.isAlive) {
      this.handlePlayerInput(dt);
    } else if (this.player && !this.player.isAlive) {
      this.player.body?.setVelocity(0, 0);
    }

    // Update all heroes
    for (const hero of this.heroes) {
      if (hero.isAlive) {
        hero.updateHero(dt);
        hero.currentMana = Math.min(hero.stats.maxMana, hero.currentMana + MANA_REGEN_RATE * dt);
      }
    }

    // AI update
    this.aiTimer += delta;
    if (this.aiTimer >= AI_UPDATE_INTERVAL) {
      this.aiTimer = 0;
      for (const ai of this.aiControllers) {
        if (ai.hero.isAlive) {
          ai.update();
        }
      }
    }

    // Combat system update
    this.combatSystem.update(dt);

    // Update HUD
    this.hud.update();
  }

  private handlePlayerInput(dt: number): void {
    let vx = 0;
    let vy = 0;

    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;
    if (this.keys.W.isDown) vy -= 1;
    if (this.keys.S.isDown) vy += 1;

    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    const speed = this.player.getMoveSpeed();
    const body = this.player.body!;
    const accel = speed * 6;
    if (vx !== 0 || vy !== 0) {
      body.setAcceleration(vx * accel, vy * accel);
      body.setMaxVelocity(speed);
    } else {
      body.setAcceleration(0, 0);
    }

    // Face mouse
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.player.faceDirection = Math.atan2(
      worldPoint.y - this.player.y,
      worldPoint.x - this.player.x
    );

    // Abilities
    if (Phaser.Input.Keyboard.JustDown(this.keys.I) || Phaser.Input.Keyboard.JustDown(this.keys.ONE)) {
      this.player.useAbility(0, worldPoint.x, worldPoint.y);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.O) || Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
      this.player.useAbility(1, worldPoint.x, worldPoint.y);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.P) || Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
      this.player.useAbility(2, worldPoint.x, worldPoint.y);
    }

    // Auto-attack
    this.combatSystem.tryAutoAttack(this.player);
  }

  private onMatchStateChange({ phase }: { phase: MatchPhase }): void {
    if (phase === MatchPhase.ENDED) {
      this.endMatch();
    }
  }

  private onHeroKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    const hero = victim as Hero;

    // Kill counting
    if (hero.team === Team.A) this.teamBKills++;
    else this.teamAKills++;

    if (hero === this.player) this.playerDeaths++;

    // Find killer for kill feed
    const killerHero = this.findHeroById(killerId);
    if (killerHero === this.player) this.playerKills++;

    this.hud.showKill(killerHero?.stats.name ?? 'Unknown', hero.stats.name);

    // Schedule respawn — NOT instant defeat.
    // Cap at 10 000 ms per FLOW-02 requirement (max 10-second respawn timer).
    const respawnDelay = Math.min(RESPAWN_DURATION, 10000);

    // Track player respawn end time for HUD countdown overlay
    if (hero === this.player) {
      this.playerRespawnEndTime = Date.now() + respawnDelay;
    }

    const respawnTimer = this.time.delayedCall(respawnDelay, () => {
      this.respawnHero(hero);
    });
    this.respawnTimers.set(hero.getUniqueId(), respawnTimer);
  }

  private findHeroById(id?: string): Hero | undefined {
    if (!id) return undefined;
    return this.heroes.find(h => h.getUniqueId() === id);
  }

  private respawnHero(hero: Hero): void {
    const spawnPoints = hero.team === Team.A ? this.spawnA : this.spawnB;
    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)] || { x: 200, y: 200 };

    // Reset state
    hero.currentHP = hero.maxHP;
    hero.currentMana = hero.stats.maxMana;
    hero.buffs = [];
    hero.shield = 0;
    hero.isAlive = true;

    // Reposition
    hero.setPosition(spawn.x, spawn.y);
    hero.setScale(1);
    hero.setAlpha(0);
    hero.setVisible(true);
    hero.setAngle(0);

    // Re-enable physics body — must match constructor setup exactly to restore collisions.
    // IMPORTANT: setCircle must be called (not just setEnable) — die() calls setCircle(0) which
    // zeroes the radius; without restoring it, projectiles pass through the respawned hero.
    const body = hero.body as Phaser.Physics.Arcade.Body;
    body.setEnable(true);
    body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(800);
    body.setMaxVelocity(hero.stats.moveSpeed);
    body.setVelocity(0, 0);

    // Clear player respawn end time once player is back
    if (hero === this.player) {
      this.playerRespawnEndTime = 0;
    }

    // Fade in
    this.tweens.add({
      targets: hero,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });

    EventBus.emit(Events.HERO_RESPAWNED, { hero });
    this.respawnTimers.delete(hero.getUniqueId());
  }

  private endMatch(): void {
    if (this.endingMatch) return;
    this.endingMatch = true;

    const teamAAlive = this.teamA.filter(h => h.isAlive).length;
    const teamBAlive = this.teamB.filter(h => h.isAlive).length;

    let won = false;
    let draw = false;

    if (teamAAlive > teamBAlive) {
      won = this.player.team === Team.A;
    } else if (teamBAlive > teamAAlive) {
      won = this.player.team === Team.B;
    } else {
      const playerTeamKills = this.player.team === Team.A ? this.teamAKills : this.teamBKills;
      const enemyTeamKills = this.player.team === Team.A ? this.teamBKills : this.teamAKills;
      if (playerTeamKills > enemyTeamKills) {
        won = true;
      } else if (playerTeamKills === enemyTeamKills) {
        draw = true;
      }
    }

    const playerData = StorageManager.load();
    const mmrChange = MMRCalculator.calculate(playerData.mmr, won, draw, playerData);

    const result: MatchResult = {
      won,
      draw,
      playerHero: this.player.stats.id,
      playerTeam: this.player.team,
      playerKills: this.playerKills,
      playerDeaths: this.playerDeaths,
      teamKills: this.player.team === Team.A ? this.teamAKills : this.teamBKills,
      enemyKills: this.player.team === Team.A ? this.teamBKills : this.teamAKills,
      teamSize: this.matchConfig.teamSize,
      arenaTheme: this.matchConfig.arenaTheme,
      arenaLayout: this.matchConfig.arenaLayout,
      mmrChange,
      timestamp: Date.now(),
    };

    StorageManager.saveMatchResult(result);

    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.scene.start('ResultScene', { result });
        }
      });
    });
  }

  shutdown(): void {
    EventBus.off(Events.HERO_KILLED, this.onHeroKilled, this);
    EventBus.off(Events.MATCH_STATE_CHANGE, this.onMatchStateChange, this);
    if (this.matchStateMachine) {
      this.matchStateMachine.destroy();
    }
    for (const timer of this.respawnTimers.values()) {
      this.time.removeEvent(timer);
    }
    this.respawnTimers.clear();
    if (this.vfxManager) {
      this.vfxManager.destroy();
    }
  }

  getEnemies(team: Team): Hero[] {
    const enemies = team === Team.A ? this.teamB : this.teamA;
    return enemies.filter(h => h.isAlive);
  }

  getAllies(team: Team, excludeSelf?: Hero): Hero[] {
    const allies = team === Team.A ? this.teamA : this.teamB;
    return allies.filter(h => h.isAlive && h !== excludeSelf);
  }
}
