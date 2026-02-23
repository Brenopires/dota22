import Phaser from 'phaser';
import { ARENA_WIDTH, ARENA_HEIGHT, MATCH_DURATION, MANA_REGEN_RATE, AI_UPDATE_INTERVAL, HERO_RADIUS, RESPAWN_DURATION, BOSS_KILL_BUFF_DAMAGE, BOSS_KILL_BUFF_DURATION, TOWER_DISABLE_DURATION } from '../constants';
import { Team, MatchResult, MatchPhase, MatchConfig, BuffType } from '../types';
import { Hero } from '../entities/Hero';
import { HeroRegistry } from '../heroes/HeroRegistry';
import { heroDataMap } from '../heroes/heroData';
import { CombatSystem } from '../systems/CombatSystem';
import { ArenaGenerator } from '../systems/ArenaGenerator';
import { MatchOrchestrator } from '../systems/MatchOrchestrator';
import { TeamBalancer } from '../systems/TeamBalancer';
import { AIController } from '../ai/AIController';
import { AIPersonality } from '../ai/AIPersonality';
import { HUD } from '../ui/HUD';
import { MMRCalculator } from '../utils/MMRCalculator';
import { StorageManager } from '../utils/StorageManager';
import { VFXManager } from '../systems/VFXManager';
import { MatchStateMachine } from '../systems/MatchStateMachine';
import { EventBus, Events } from '../systems/EventBus';
import { BaseEntity } from '../entities/BaseEntity';
import { BossEntity } from '../entities/BossEntity';
import { TowerEntity } from '../entities/TowerEntity';
import { BossAISystem } from '../systems/BossAISystem';
import { XPSystem } from '../systems/XPSystem';

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
  xpSystem!: XPSystem;
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
    R: Phaser.Input.Keyboard.Key;
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
  private targetCountMap: Map<string, number> = new Map();
  matchConfig!: MatchConfig;
  boss: BossEntity | null = null;
  bossAI: BossAISystem | null = null;
  towerA: TowerEntity | null = null;
  towerB: TowerEntity | null = null;
  private bossScaleTimer: Phaser.Time.TimerEvent | null = null;
  private bossMinute = 0;
  private revivalTokenTeam: Team | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(data?: { matchConfig?: MatchConfig }): void {
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
    this.targetCountMap = new Map();
    this.respawnTimers = new Map();
    this.boss = null;
    this.bossAI = null;
    this.towerA = null;
    this.towerB = null;
    this.bossMinute = 0;
    this.bossScaleTimer = null;
    this.revivalTokenTeam = null;

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
    const { teamSizeA, teamSizeB } = this.matchConfig;
    const playerData = StorageManager.load();
    const smallerSize = Math.min(teamSizeA, teamSizeB);
    const largerSize  = Math.max(teamSizeA, teamSizeB);
    const scalingMultiplier = TeamBalancer.computeMultiplier(smallerSize, largerSize, playerData.mmr);

    for (let i = 0; i < teamAIds.length; i++) {
      const heroId = teamAIds[i];
      const spawn = arenaConfig.spawnA[i] ?? arenaConfig.spawnA[0];
      const isPlayer = heroId === playerHero;
      const baseStats = heroDataMap[heroId];
      const scaledStats = teamSizeA < teamSizeB
        ? TeamBalancer.applyToStats(baseStats, scalingMultiplier)
        : { ...baseStats };
      const hero = HeroRegistry.create(this, heroId, spawn.x, spawn.y, Team.A, isPlayer, scaledStats);
      this.heroes.push(hero);
      this.teamA.push(hero);
      if (isPlayer) {
        this.player = hero;
      }
    }

    for (let i = 0; i < teamBIds.length; i++) {
      const heroId = teamBIds[i];
      const spawn = arenaConfig.spawnB[i] ?? arenaConfig.spawnB[0];
      const baseStats = heroDataMap[heroId];
      const scaledStats = teamSizeB < teamSizeA
        ? TeamBalancer.applyToStats(baseStats, scalingMultiplier)
        : { ...baseStats };
      const hero = HeroRegistry.create(this, heroId, spawn.x, spawn.y, Team.B, false, scaledStats);
      this.heroes.push(hero);
      this.teamB.push(hero);
    }

    // XP system — subscribes to HERO_KILLED to award kill XP
    this.xpSystem = new XPSystem(this.heroes);

    // Setup collisions
    this.combatSystem.setupCollisions(this.heroes, this.obstacles);

    // --- Boss + Tower spawning ---

    // Spawn boss at arena center
    const bossX = ARENA_WIDTH / 2;
    const bossY = ARENA_HEIGHT / 2;
    this.boss = new BossEntity(this, bossX, bossY);
    this.bossAI = new BossAISystem(this.boss, this, bossX, bossY);

    // Spawn towers near each team's spawn area
    const towerAX = 250;
    const towerAY = ARENA_HEIGHT / 2;
    const towerBX = ARENA_WIDTH - 250;
    const towerBY = ARENA_HEIGHT / 2;
    this.towerA = new TowerEntity(this, towerAX, towerAY, Team.A);
    this.towerB = new TowerEntity(this, towerBX, towerBY, Team.B);

    // Boss scaling timer (60s interval)
    this.bossMinute = 0;
    this.bossScaleTimer = this.time.addEvent({
      delay: 60000,
      callback: () => {
        if (this.boss?.isAlive) {
          this.bossMinute++;
          this.boss.scalePower(this.bossMinute);
        }
      },
      loop: true,
    });

    // Physics colliders for boss + towers
    this.physics.add.collider(this.boss, this.obstacles);
    this.physics.add.collider(this.towerA, this.obstacles);
    this.physics.add.collider(this.towerB, this.obstacles);
    this.physics.add.collider(this.boss, this.towerA);
    this.physics.add.collider(this.boss, this.towerB);
    for (const hero of this.heroes) {
      this.physics.add.collider(hero, this.boss);
      this.physics.add.collider(hero, this.towerA);
      this.physics.add.collider(hero, this.towerB);
    }

    // Setup AI for non-player heroes — enemy AI gets MMR-modified profiles
    for (const hero of this.heroes) {
      if (!hero.isPlayer) {
        const baseProfile = AIPersonality.getProfile(hero.stats.archetype);
        // Only apply MMR modifiers to ENEMY AI (opposing team from player)
        // Friendly AI (same team as player) stays at baseline difficulty
        const isEnemy = hero.team !== this.player.team;
        const finalProfile = isEnemy
          ? AIPersonality.applyMMRModifiers(baseProfile, playerData.mmr)
          : baseProfile;
        const ai = new AIController(hero, this, finalProfile);
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
      R: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
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

    // Subscribe to boss kills for rewards (buff, revival token, XP, tower disable)
    EventBus.on(Events.BOSS_KILLED, this.onBossKilled, this);

    // Emit composition event and show the banner
    EventBus.emit(Events.MATCH_COMPOSITION_SET, { teamSizeA, teamSizeB, scalingMultiplier });
    this.showCompositionBanner(teamSizeA, teamSizeB);
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

  private showCompositionBanner(sizeA: number, sizeB: number): void {
    const { width: W, height: H } = this.cameras.main;
    const container = this.add.container(W / 2, H / 2 - 60);
    container.setScrollFactor(0).setDepth(300);

    // Semi-transparent background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.72);
    bg.fillRoundedRect(-130, -44, 260, 88, 14);
    container.add(bg);

    // Header label
    const label = this.add.text(0, -26, 'TEAM COMPOSITION', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(label);

    // Main composition text e.g. "2 vs 4"
    const comp = this.add.text(0, 6, `${sizeA} vs ${sizeB}`, {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(comp);

    // Auto-dismiss after 3 seconds with fade tween
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 600,
        onComplete: () => container.destroy(),
      });
    });
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

    // Boss AI update
    if (this.boss?.isAlive && this.bossAI) {
      this.bossAI.update(dt, this.heroes);
    }

    // Tower updates
    if (this.towerA?.isAlive) {
      const towerAEnemies = this.heroes.filter(h => h.isAlive && h.team === Team.B);
      this.towerA.updateTower(dt, towerAEnemies);
    }
    if (this.towerB?.isAlive) {
      const towerBEnemies = this.heroes.filter(h => h.isAlive && h.team === Team.A);
      this.towerB.updateTower(dt, towerBEnemies);
    }

    // AI update
    this.aiTimer += delta;
    if (this.aiTimer >= AI_UPDATE_INTERVAL) {
      this.aiTimer = 0;

      // Rebuild target count map — track how many AIs are targeting each enemy (alive only)
      this.targetCountMap.clear();
      for (const ai of this.aiControllers) {
        const t = ai.currentTarget;
        if (t && t.isAlive) {
          const id = t.getUniqueId();
          this.targetCountMap.set(id, (this.targetCountMap.get(id) ?? 0) + 1);
        }
      }

      // Pass map to each AI update
      for (const ai of this.aiControllers) {
        if (ai.hero.isAlive) {
          ai.update(this.targetCountMap);
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
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.player.useAbility(3, worldPoint.x, worldPoint.y);
    }

    // Auto-attack
    this.combatSystem.tryAutoAttack(this.player);
  }

  private onMatchStateChange({ phase }: { phase: MatchPhase }): void {
    if (phase === MatchPhase.ENDED) {
      this.endMatch();
    }
  }

  private onBossKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    // Find the hero who struck the killing blow
    const killer = this.findHeroById(killerId);
    if (!killer) return; // Edge case: boss killed by DoT with no source

    const team = killer.team;

    // 1. Team-wide stat buff: +20 damage for 60s to all alive allies
    const allies = team === Team.A ? this.teamA : this.teamB;
    for (const ally of allies) {
      if (ally.isAlive) {
        ally.addBuff({
          type: BuffType.STAT_BUFF,
          value: BOSS_KILL_BUFF_DAMAGE,
          duration: BOSS_KILL_BUFF_DURATION,
          remaining: BOSS_KILL_BUFF_DURATION,
          sourceId: 'boss_reward',
        });
      }
    }

    // 2. Revival token: next death on this team is prevented
    this.revivalTokenTeam = team;

    // 3. XP reward: 100 XP to killer
    this.xpSystem.awardObjectiveXP(killerId!);

    // 4. Disable enemy tower for 15 seconds
    const enemyTower = team === Team.A ? this.towerB : this.towerA;
    if (enemyTower && enemyTower.isAlive) {
      enemyTower.disable(TOWER_DISABLE_DURATION);
    }

    // 5. Kill feed
    this.hud.showKill('TEAM ' + team, 'ANCIENT GUARDIAN');

    // 6. Boss kill banner (screen-space overlay)
    this.showBossKillBanner(team);
  }

  private showBossKillBanner(team: Team): void {
    const { width: W, height: H } = this.cameras.main;
    const teamColor = team === Team.A ? '#00aaff' : '#ff4444';
    const teamColorHex = team === Team.A ? 0x00aaff : 0xff4444;

    const container = this.add.container(W / 2, H / 2 - 40);
    container.setScrollFactor(0).setDepth(300);

    // Semi-transparent background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-180, -60, 360, 120, 14);
    bg.lineStyle(2, teamColorHex, 0.6);
    bg.strokeRoundedRect(-180, -60, 360, 120, 14);
    container.add(bg);

    // "BOSS SLAIN!" title
    const title = this.add.text(0, -36, 'BOSS SLAIN!', {
      fontSize: '28px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(title);

    // Buff info text
    const buffInfo = this.add.text(0, 2, `Team ${team} gains +${BOSS_KILL_BUFF_DAMAGE} DMG for ${BOSS_KILL_BUFF_DURATION}s`, {
      fontSize: '12px',
      color: teamColor,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(buffInfo);

    // Revival token text
    const tokenInfo = this.add.text(0, 22, 'Revival Token granted!', {
      fontSize: '12px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(tokenInfo);

    // Auto-dismiss after 4 seconds with fade
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 600,
        onComplete: () => container.destroy(),
      });
    });
  }

  private onHeroKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    // Safety check: only process hero entities
    if (victim.entityType !== 'hero') return;

    const hero = victim as Hero;

    // Check revival token BEFORE any death processing
    if (this.revivalTokenTeam === hero.team) {
      this.revivalTokenTeam = null; // Consume token
      // Cancel death: restore to alive state
      hero.isAlive = true;
      hero.currentHP = Math.floor(hero.maxHP * 0.3); // Revive at 30% HP
      const body = hero.body as Phaser.Physics.Arcade.Body;
      body.setEnable(true);
      body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
      // Visual feedback
      hero.setAlpha(1);
      hero.setVisible(true);
      hero.setScale(1);
      hero.setAngle(0);
      EventBus.emit(Events.REVIVAL_TOKEN_USED, { hero });
      // Show revival VFX
      const vfx = (this as any).vfxManager;
      if (vfx) {
        vfx.spawnBurst(hero.x, hero.y, 'generic', 20, 0xFFD700);
        vfx.screenFlash(0xFFD700, 300, 0.3);
      }
      // Show "REVIVED!" text at hero position
      const reviveText = this.add.text(hero.x, hero.y - 40, 'REVIVED!', {
        fontSize: '18px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: reviveText, y: reviveText.y - 50, alpha: 0, duration: 1500, onComplete: () => reviveText.destroy() });
      return; // Skip ALL normal death processing (no kill counting, no respawn scheduling)
    }

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
      teamSize: Math.max(this.matchConfig.teamSizeA, this.matchConfig.teamSizeB),  // backward compat
      teamSizeA: this.matchConfig.teamSizeA,
      teamSizeB: this.matchConfig.teamSizeB,
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
    EventBus.off(Events.BOSS_KILLED, this.onBossKilled, this);
    this.revivalTokenTeam = null;
    if (this.matchStateMachine) {
      this.matchStateMachine.destroy();
    }
    this.xpSystem?.destroy();
    for (const timer of this.respawnTimers.values()) {
      this.time.removeEvent(timer);
    }
    this.respawnTimers.clear();
    if (this.vfxManager) {
      this.vfxManager.destroy();
    }
    // Boss + tower cleanup
    if (this.bossScaleTimer) {
      this.time.removeEvent(this.bossScaleTimer);
      this.bossScaleTimer = null;
    }
    this.boss = null;
    this.bossAI = null;
    this.towerA = null;
    this.towerB = null;
    this.bossMinute = 0;
  }

  /**
   * Returns non-hero targetable entities (boss + enemy towers) for a given team.
   * Used by CombatSystem to let heroes auto-attack and hit boss/towers.
   */
  getNonHeroTargets(attackerTeam: Team): BaseEntity[] {
    const targets: BaseEntity[] = [];
    // Boss is always a valid target (neutral, attackable by all)
    if (this.boss?.isAlive) {
      targets.push(this.boss);
    }
    // Enemy tower is a valid target (attack the OTHER team's tower)
    if (attackerTeam === Team.A && this.towerB?.isAlive) {
      targets.push(this.towerB);
    } else if (attackerTeam === Team.B && this.towerA?.isAlive) {
      targets.push(this.towerA);
    }
    return targets;
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
