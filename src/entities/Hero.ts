import Phaser from 'phaser';
import { HERO_RADIUS, HERO_LABEL_SIZE, MELEE_RANGE } from '../constants';
import { HeroStats, Team, ActiveBuff, BuffType, AbilityDef, PassiveDef } from '../types';
import { HealthBar } from './HealthBar';
import { BaseEntity } from './BaseEntity';
import { EventBus, Events } from '../systems/EventBus';
import { XP_THRESHOLDS } from '../systems/XPSystem';

export class Hero extends BaseEntity {
  readonly entityType = 'hero' as const;

  stats: HeroStats;
  isPlayer: boolean;

  currentMana: number;
  faceDirection = 0;

  private heroVisual: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;
  private teamIndicator: Phaser.GameObjects.Arc;
  private glowImage: Phaser.GameObjects.Image | null = null;
  private directionArrow: Phaser.GameObjects.Triangle | null = null;
  private stunContainer: Phaser.GameObjects.Container | null = null;
  private slowOverlay: Phaser.GameObjects.Arc | null = null;
  private silenceGraphics: Phaser.GameObjects.Graphics | null = null;
  healthBar: HealthBar;

  abilityCooldowns: number[] = [0, 0, 0, 0];
  autoAttackTimer = 0;

  // XP / leveling — initialized by XPSystem
  level = 1;
  currentXP = 0;
  // Base stats stored at construction time — used for level-up scaling (not current stat)
  private baseMaxHP: number;
  private baseDamage: number;
  private passiveCooldownTimer = 0; // tracks internal cooldown for passive trigger
  private passiveHandlerRef: ((payload: any) => void) | null = null;
  private armorStackCount = 0; // tracks Stone Golem passive stacks
  private readonly MAX_ARMOR_STACKS = 8;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: HeroStats, team: Team, isPlayer: boolean) {
    super(scene, x, y, stats.maxHP, team);
    this.stats = stats;
    this.isPlayer = isPlayer;
    this.currentMana = stats.maxMana;
    this.baseMaxHP = stats.maxHP;
    this.baseDamage = stats.damage;

    if (stats.passive) {
      this.subscribePassive(stats.passive);
    }

    // Glow behind hero
    if (scene.textures.exists('glow_circle')) {
      this.glowImage = scene.add.image(0, 0, 'glow_circle');
      this.glowImage.setTint(stats.color);
      this.glowImage.setAlpha(0.15);
      this.glowImage.setBlendMode(Phaser.BlendModes.ADD);
      this.glowImage.setScale(2.5);
      this.add(this.glowImage);

      // Pulsing glow tween
      scene.tweens.add({
        targets: this.glowImage,
        alpha: { from: 0.1, to: 0.25 },
        scaleX: { from: 2.3, to: 2.7 },
        scaleY: { from: 2.3, to: 2.7 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Team indicator ring
    const teamColor = team === Team.A ? 0x00aaff : 0xff4444;
    this.teamIndicator = scene.add.circle(0, 0, HERO_RADIUS + 3);
    this.teamIndicator.setStrokeStyle(2, teamColor);
    this.teamIndicator.setFillStyle(teamColor, 0.05);
    this.add(this.teamIndicator);

    // Outer pulse ring for team
    const outerRing = scene.add.circle(0, 0, HERO_RADIUS + 5);
    outerRing.setStrokeStyle(1, teamColor, 0.3);
    outerRing.setFillStyle(0x000000, 0);
    this.add(outerRing);
    scene.tweens.add({
      targets: outerRing,
      alpha: { from: 0.3, to: 0.7 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Player highlight ring
    if (isPlayer) {
      const playerRing = scene.add.circle(0, 0, HERO_RADIUS + 6);
      playerRing.setStrokeStyle(2, 0xffffff);
      playerRing.setFillStyle(0x000000, 0);
      this.add(playerRing);
    }

    // Hero visual (procedural texture or fallback circle)
    const heroTextureKey = `hero_${stats.id}`;
    if (scene.textures.exists(heroTextureKey)) {
      this.heroVisual = scene.add.image(0, 0, heroTextureKey);
      this.add(this.heroVisual);
    } else {
      this.heroVisual = scene.add.circle(0, 0, HERO_RADIUS, stats.color);
      this.add(this.heroVisual);
    }

    // Breathing idle animation
    scene.tweens.add({
      targets: this.heroVisual,
      scaleX: { from: 1.0, to: 1.04 },
      scaleY: { from: 1.0, to: 1.04 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Direction arrow
    this.directionArrow = scene.add.triangle(
      HERO_RADIUS + 5, 0,
      0, -4, 8, 0, 0, 4,
      0xffffff, 0.6
    );
    this.add(this.directionArrow);

    // Label
    this.label = scene.add.text(0, 0, stats.label, {
      fontSize: `${HERO_LABEL_SIZE}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.label.setOrigin(0.5);
    this.add(this.label);

    // Health bar
    this.healthBar = new HealthBar(scene);
    for (const obj of this.healthBar.getGameObjects()) {
      this.add(obj);
    }

    // Add to scene with physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS);
    body.setCollideWorldBounds(true);
    body.setBounce(0);
    body.setDrag(800);
    body.setMaxVelocity(stats.moveSpeed);
  }

  updateHero(dt: number): void {
    // Update cooldowns (with CDR buff acceleration)
    const cdrFactor = this.getCooldownReductionFactor();
    for (let i = 0; i < this.abilityCooldowns.length; i++) {
      if (this.abilityCooldowns[i] > 0) {
        this.abilityCooldowns[i] = Math.max(0, this.abilityCooldowns[i] - dt * cdrFactor);
      }
    }

    // Update auto-attack timer
    if (this.autoAttackTimer > 0) {
      this.autoAttackTimer -= dt;
    }

    // Update passive cooldown timer (used by passive ability implementations)
    if (this.passiveCooldownTimer > 0) {
      this.passiveCooldownTimer = Math.max(0, this.passiveCooldownTimer - dt);
    }

    // Update buffs (inherited from BaseEntity)
    this.updateBuffs(dt);

    // Update health bar
    const shieldRatio = this.shield / this.stats.maxHP;
    this.healthBar.update(
      this.currentHP / this.stats.maxHP,
      this.currentMana / this.stats.maxMana,
      shieldRatio
    );

    // Update direction arrow
    if (this.directionArrow) {
      const dist = HERO_RADIUS + 5;
      this.directionArrow.setPosition(
        Math.cos(this.faceDirection) * dist,
        Math.sin(this.faceDirection) * dist
      );
      this.directionArrow.setRotation(this.faceDirection);
    }

    // Status visual indicators
    this.updateStatusVisuals();
  }

  private updateStatusVisuals(): void {
    const stunned = this.isStunned();
    const slowed = this.buffs.some(b => b.type === BuffType.SLOW && b.remaining > 0);
    const silenced = this.isSilenced();

    // Stun stars
    if (stunned && !this.stunContainer) {
      this.stunContainer = this.scene.add.container(0, -HERO_RADIUS - 15);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const star = this.scene.add.text(
          Math.cos(angle) * 10,
          Math.sin(angle) * 10,
          '*',
          { fontSize: '12px', color: '#ffff00', fontFamily: 'monospace', fontStyle: 'bold' }
        ).setOrigin(0.5);
        this.stunContainer.add(star);
      }
      this.add(this.stunContainer);
      this.scene.tweens.add({
        targets: this.stunContainer,
        angle: 360,
        duration: 1000,
        repeat: -1,
      });
    } else if (!stunned && this.stunContainer) {
      this.stunContainer.destroy();
      this.stunContainer = null;
    }

    // Slow overlay
    if (slowed && !this.slowOverlay) {
      this.slowOverlay = this.scene.add.circle(0, 0, HERO_RADIUS, 0x00CED1, 0.2);
      this.add(this.slowOverlay);
    } else if (!slowed && this.slowOverlay) {
      this.slowOverlay.destroy();
      this.slowOverlay = null;
    }

    // Silence X
    if (silenced && !this.silenceGraphics) {
      this.silenceGraphics = this.scene.add.graphics();
      this.silenceGraphics.lineStyle(3, 0xff0000, 0.7);
      const s = HERO_RADIUS * 0.6;
      this.silenceGraphics.lineBetween(-s, -s, s, s);
      this.silenceGraphics.lineBetween(s, -s, -s, s);
      this.add(this.silenceGraphics);
    } else if (!silenced && this.silenceGraphics) {
      this.silenceGraphics.destroy();
      this.silenceGraphics = null;
    }

    // Keep label visible (no alpha changes)
    if (stunned) {
      this.label.setText('!!');
    } else {
      this.label.setText(this.stats.label);
    }
    this.heroVisual.setAlpha(1);
  }

  useAbility(slot: number, targetX: number, targetY: number): boolean {
    if (!this.isAlive || this.isStunned() || this.isSilenced()) return false;
    if (slot < 0 || slot >= this.stats.abilities.length) return false;

    const ability = this.stats.abilities[slot];
    if (this.abilityCooldowns[slot] > 0) return false;
    if (this.currentMana < ability.manaCost) return false;

    this.currentMana -= ability.manaCost;
    this.abilityCooldowns[slot] = ability.cooldown;

    // Execute ability through combat system
    const battleScene = this.scene as any;
    if (battleScene.combatSystem) {
      battleScene.combatSystem.executeAbility(this, ability, targetX, targetY);
    }

    return true;
  }

  /**
   * Override takeDamage to show floating damage numbers (Hero-specific visual behavior).
   * Combat logic delegates to BaseEntity.takeDamage().
   */
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

  /**
   * Override heal to show floating heal numbers (Hero-specific visual behavior).
   */
  override heal(amount: number): void {
    if (!this.isAlive) return;
    super.heal(amount);
    this.showHealNumber(amount);
  }

  /**
   * onDeath: Hero-specific visual/VFX behavior on death.
   * Called by BaseEntity.die() after emitting HERO_KILLED on EventBus.
   * Does NOT call battleScene.onHeroKill() — the EventBus event replaces that coupling.
   */
  protected onDeath(killerId?: string): void {
    // VFX death explosion
    const battleScene = this.scene as any;
    if (battleScene.vfxManager) {
      battleScene.vfxManager.spawnDeathExplosion(this.x, this.y, this.stats.color);
    }

    // Death animation: shrink with rotation
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      angle: 360,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.setVisible(false);
      },
    });

    // Slow motion if player dies
    if (this.isPlayer && battleScene.vfxManager) {
      battleScene.vfxManager.slowMotion(1500, 0.3);
    }
  }

  private showDamageNumber(amount: number): void {
    const rounded = Math.round(amount);
    const isBigHit = rounded > 100;
    const fontSize = isBigHit ? '18px' : '14px';
    const offsetX = Phaser.Math.Between(-15, 15);

    const text = this.scene.add.text(this.x + offsetX, this.y - 30, `-${rounded}`, {
      fontSize,
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    text.setScale(0);

    // Pop-up animation
    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          y: text.y - 40,
          alpha: 0,
          duration: 1000,
          ease: 'Power2',
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private showHealNumber(amount: number): void {
    const offsetX = Phaser.Math.Between(-15, 15);

    const text = this.scene.add.text(this.x + offsetX, this.y - 30, `+${Math.round(amount)}`, {
      fontSize: '14px',
      color: '#44ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);
    text.setScale(0);

    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          y: text.y - 40,
          alpha: 0,
          duration: 1000,
          ease: 'Power2',
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  getArmor(): number {
    return this.stats.armor || 0;
  }

  getMoveSpeed(): number {
    if (this.isStunned() || this.isRooted()) return 0;
    let speed = this.stats.moveSpeed * this.getSlowFactor();
    // Apply haste buffs (camp haste: value = 0.25 means +25% speed)
    for (const buff of this.buffs) {
      if (buff.type === BuffType.HASTE && buff.remaining > 0) {
        speed *= (1 + buff.value);
      }
    }
    return speed;
  }

  /**
   * Returns CDR factor for cooldown tick acceleration.
   * 1.0 = normal rate, 1.2 = 20% faster cooldowns.
   * Multiple CDR buffs stack multiplicatively.
   */
  private getCooldownReductionFactor(): number {
    let factor = 1;
    for (const buff of this.buffs) {
      if (buff.type === BuffType.COOLDOWN_REDUCTION && buff.remaining > 0) {
        factor *= (1 + buff.value);
      }
    }
    return factor;
  }

  getAttackDamage(): number {
    let damage = this.stats.damage;
    for (const buff of this.buffs) {
      if (buff.type === BuffType.STAT_BUFF && buff.remaining > 0) {
        damage += buff.value;
      }
    }
    return damage;
  }

  getAttackRange(): number {
    return this.stats.attackRange <= MELEE_RANGE ? MELEE_RANGE : this.stats.attackRange;
  }

  isRanged(): boolean {
    return this.stats.attackRange > MELEE_RANGE;
  }

  getUniqueId(): string {
    return this.stats.id + '_' + this.team;
  }

  distanceTo(other: Hero): number {
    return Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
  }

  private subscribePassive(passive: PassiveDef): void {
    const handler = (payload: any) => this.onPassiveTrigger(passive, payload);
    this.passiveHandlerRef = handler;

    if (passive.trigger === 'on_kill') {
      EventBus.on(Events.HERO_KILLED, handler, this);
    } else if (passive.trigger === 'on_hit') {
      EventBus.on(Events.HERO_HIT, handler, this);
    } else if (passive.trigger === 'on_damage_taken') {
      EventBus.on(Events.DAMAGE_TAKEN, handler, this);
    }
  }

  private onPassiveTrigger(passive: PassiveDef, payload: any): void {
    if (!this.isAlive) return;

    // Check internal cooldown
    if (passive.passiveCooldown && this.passiveCooldownTimer > 0) return;

    // Check if this event applies to THIS hero (ownership check)
    if (passive.trigger === 'on_kill') {
      const { killerId } = payload as { victim: any; killerId?: string };
      if (killerId !== this.getUniqueId()) return;
    } else if (passive.trigger === 'on_hit') {
      const { attacker } = payload as { attacker: any; victim: any; damage: number };
      if (attacker !== this) return;
    } else if (passive.trigger === 'on_damage_taken') {
      const { victim } = payload as { victim: any; sourceId?: string; damage: number };
      if (victim !== this) return;
    }

    // Apply effect
    this.applyPassiveEffect(passive, payload);

    // Set internal cooldown
    if (passive.passiveCooldown) {
      this.passiveCooldownTimer = passive.passiveCooldown;
    }

    // REQUIRED: visual feedback on every trigger
    this.showPassiveVFX();
  }

  private applyPassiveEffect(passive: PassiveDef, payload: any): void {
    // on_kill effects
    if (passive.buffOnKill && passive.trigger === 'on_kill') {
      const buff: ActiveBuff = { ...passive.buffOnKill };
      this.addBuff(buff);
    }
    if (passive.healOnKill && passive.trigger === 'on_kill') {
      this.heal(passive.healOnKill);
    }
    if (passive.speedBurstOnKill) {
      // Temporary speed boost: store original speed, restore after duration
      const origSpeed = this.stats.moveSpeed;
      this.stats.moveSpeed += passive.speedBurstOnKill;
      this.scene.time.delayedCall(3000, () => {
        this.stats.moveSpeed = origSpeed;
      });
    }
    if (passive.cooldownResetOnKill) {
      for (let i = 0; i < this.abilityCooldowns.length; i++) {
        this.abilityCooldowns[i] = 0;
      }
    }
    if (passive.manaRestoreOnKill) {
      this.currentMana = Math.min(this.stats.maxMana, this.currentMana + passive.manaRestoreOnKill);
    }

    // on_hit effects
    if (passive.buffOnHit && passive.trigger === 'on_hit') {
      const { victim } = payload as { victim: any };
      if (victim && victim.addBuff) {
        const buff: ActiveBuff = { ...passive.buffOnHit };
        victim.addBuff(buff);
      }
    }
    if (passive.damageReturnRatio && passive.trigger === 'on_hit') {
      // Lifesteal: heal attacker for ratio of hit damage
      const { damage } = payload as { damage: number };
      this.heal(Math.floor(damage * passive.damageReturnRatio));
    }

    // on_damage_taken effects
    if (passive.damageReturnRatio && passive.trigger === 'on_damage_taken') {
      // Damage return: reflect ratio back to attacker
      const { sourceId, damage } = payload as { sourceId?: string; damage: number };
      const reflected = Math.floor(damage * passive.damageReturnRatio);
      if (sourceId && reflected > 0) {
        const battleScene = this.scene as any;
        const attacker = battleScene.heroes?.find((h: any) => h.getUniqueId() === sourceId);
        if (attacker && attacker.isAlive) {
          attacker.takeDamage(reflected, this.getUniqueId());
        }
      }
    }
    if (passive.healOnKill && passive.trigger === 'on_damage_taken') {
      // Reuse healOnKill field as heal amount for damage-taken trigger (holy_priest)
      this.heal(passive.healOnKill);
    }
    if (passive.buffOnKill && passive.trigger === 'on_damage_taken') {
      // Reuse buffOnKill for self-buff on damage taken (war_drummer)
      const buff: ActiveBuff = { ...passive.buffOnKill };
      this.addBuff(buff);
    }
    if (passive.armorStackOnDamage && this.armorStackCount < this.MAX_ARMOR_STACKS) {
      this.stats.armor += passive.armorStackOnDamage;
      this.armorStackCount++;
    }
  }

  private showPassiveVFX(): void {
    const battleScene = this.scene as any;
    if (battleScene.vfxManager) {
      battleScene.vfxManager.spawnBurst(this.x, this.y, 'generic', 10, 0xFFD700);
    }
    // Brief hero tint flash to gold
    if (this.heroVisual) {
      this.scene.tweens.add({
        targets: this.heroVisual,
        alpha: 0.5,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          if (this.heroVisual) this.heroVisual.setAlpha(1);
        },
      });
    }
  }

  override destroy(fromScene?: boolean): void {
    if (this.passiveHandlerRef && this.stats.passive) {
      const trigger = this.stats.passive.trigger;
      if (trigger === 'on_kill') {
        EventBus.off(Events.HERO_KILLED, this.passiveHandlerRef, this);
      } else if (trigger === 'on_hit') {
        EventBus.off(Events.HERO_HIT, this.passiveHandlerRef, this);
      } else if (trigger === 'on_damage_taken') {
        EventBus.off(Events.DAMAGE_TAKEN, this.passiveHandlerRef, this);
      }
      this.passiveHandlerRef = null;
    }
    super.destroy(fromScene);
  }

  gainXP(amount: number): void {
    if (!this.isAlive) return;
    this.currentXP += amount;
    while (this.level < XP_THRESHOLDS.length - 1 && this.currentXP >= XP_THRESHOLDS[this.level]) {
      this.levelUp();
    }
  }

  levelUp(): void {
    this.level++;

    // Use BASE stats for scaling — prevents exponential runaway
    const hpBonus = Math.floor(this.baseMaxHP * 0.06);   // +6% base HP
    const dmgBonus = Math.floor(this.baseDamage * 0.04);  // +4% base damage
    const armorBonus = 0.5; // +0.5 flat per level (accumulates)

    this.maxHP += hpBonus;
    this.currentHP = Math.min(this.currentHP + hpBonus, this.maxHP); // partial heal
    this.stats.damage += dmgBonus;
    this.stats.armor += armorBonus;

    // Emit level-up event for HUD XP bar (Plan 02-05)
    EventBus.emit(Events.HERO_LEVELED_UP, { hero: this, level: this.level });

    this.showLevelUpVFX();
  }

  private showLevelUpVFX(): void {
    const battleScene = this.scene as any;
    if (battleScene.vfxManager) {
      battleScene.vfxManager.spawnBurst(this.x, this.y, 'generic', 16, 0xFFD700);
    }
    const text = this.scene.add.text(this.x, this.y - 40, `LEVEL ${this.level}!`, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }
}
