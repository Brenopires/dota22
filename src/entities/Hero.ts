import Phaser from 'phaser';
import { HERO_RADIUS, HERO_LABEL_SIZE, MELEE_RANGE } from '../constants';
import { HeroStats, Team, ActiveBuff, BuffType, AbilityDef } from '../types';
import { HealthBar } from './HealthBar';

export class Hero extends Phaser.GameObjects.Container {
  stats: HeroStats;
  team: Team;
  isPlayer: boolean;
  isAlive = true;

  currentHP: number;
  currentMana: number;
  faceDirection = 0;

  private circle: Phaser.GameObjects.Arc;
  private label: Phaser.GameObjects.Text;
  private teamIndicator: Phaser.GameObjects.Arc;
  healthBar: HealthBar;

  abilityCooldowns: number[] = [0, 0, 0]; // remaining cooldown in seconds
  autoAttackTimer = 0;

  buffs: ActiveBuff[] = [];
  shield = 0;

  body!: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: HeroStats, team: Team, isPlayer: boolean) {
    super(scene, x, y);
    this.stats = stats;
    this.team = team;
    this.isPlayer = isPlayer;
    this.currentHP = stats.maxHP;
    this.currentMana = stats.maxMana;

    // Team indicator ring
    const teamColor = team === Team.A ? 0x00aaff : 0xff4444;
    this.teamIndicator = scene.add.circle(0, 0, HERO_RADIUS + 3);
    this.teamIndicator.setStrokeStyle(2, teamColor);
    this.teamIndicator.setFillStyle(0x000000, 0);
    this.add(this.teamIndicator);

    // Player highlight ring
    if (isPlayer) {
      const playerRing = scene.add.circle(0, 0, HERO_RADIUS + 6);
      playerRing.setStrokeStyle(2, 0xffffff);
      playerRing.setFillStyle(0x000000, 0);
      this.add(playerRing);
    }

    // Hero circle
    this.circle = scene.add.circle(0, 0, HERO_RADIUS, stats.color);
    this.add(this.circle);

    // Label (2-letter abbreviation)
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
    // Update cooldowns
    for (let i = 0; i < this.abilityCooldowns.length; i++) {
      if (this.abilityCooldowns[i] > 0) {
        this.abilityCooldowns[i] = Math.max(0, this.abilityCooldowns[i] - dt);
      }
    }

    // Update auto-attack timer
    if (this.autoAttackTimer > 0) {
      this.autoAttackTimer -= dt;
    }

    // Update buffs
    this.updateBuffs(dt);

    // Update health bar
    const shieldRatio = this.shield / this.stats.maxHP;
    this.healthBar.update(
      this.currentHP / this.stats.maxHP,
      this.currentMana / this.stats.maxMana,
      shieldRatio
    );

    // Visual indicators
    if (this.isStunned()) {
      this.circle.setAlpha(0.5);
      this.label.setText('!!');
    } else if (this.isRooted()) {
      this.circle.setAlpha(0.7);
      this.label.setText(this.stats.label);
    } else if (this.isSilenced()) {
      this.circle.setAlpha(0.8);
    } else {
      this.circle.setAlpha(1);
      this.label.setText(this.stats.label);
    }
  }

  private updateBuffs(dt: number): void {
    this.shield = 0;

    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const buff = this.buffs[i];
      buff.remaining -= dt;

      // Shield tracking
      if (buff.type === BuffType.SHIELD) {
        this.shield += buff.value;
      }

      // DoT / HoT tick
      if (buff.type === BuffType.DOT || buff.type === BuffType.HEAL_OVER_TIME) {
        if (!buff.tickTimer) buff.tickTimer = 0;
        buff.tickTimer += dt;
        const interval = buff.tickInterval || 1;
        if (buff.tickTimer >= interval) {
          buff.tickTimer -= interval;
          if (buff.type === BuffType.DOT) {
            this.takeDamage(buff.value, buff.sourceId);
          } else {
            this.heal(buff.value);
          }
        }
      }

      if (buff.remaining <= 0) {
        this.buffs.splice(i, 1);
      }
    }
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

  takeDamage(rawDamage: number, sourceId?: string): number {
    if (!this.isAlive) return 0;

    // Shield absorb
    let damage = rawDamage;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      // Reduce shield buff values
      for (const buff of this.buffs) {
        if (buff.type === BuffType.SHIELD && buff.value > 0) {
          const take = Math.min(buff.value, absorbed);
          buff.value -= take;
          damage -= take;
          if (damage <= 0) break;
        }
      }
      if (damage <= 0) return 0;
    }

    // Apply armor
    const finalDamage = Math.max(1, damage - this.getArmor());
    this.currentHP -= finalDamage;

    // Floating damage number
    this.showDamageNumber(finalDamage);

    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die(sourceId);
    }

    return finalDamage;
  }

  heal(amount: number): void {
    if (!this.isAlive) return;
    this.currentHP = Math.min(this.stats.maxHP, this.currentHP + amount);
    this.showHealNumber(amount);
  }

  private die(killerId?: string): void {
    this.isAlive = false;
    this.body?.setVelocity(0, 0);
    this.body?.setEnable(false);
    this.body?.setCircle(0);

    // Death animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.setVisible(false);
      },
    });

    // Notify battle scene
    const battleScene = this.scene as any;
    if (battleScene.onHeroKill) {
      let killer: Hero | undefined;
      if (killerId) {
        killer = battleScene.heroes?.find((h: Hero) => h.getUniqueId() === killerId);
      }
      // If no specific killer found, credit to nearest living enemy
      if (!killer) {
        const enemies = this.team === 'A' ? battleScene.teamB : battleScene.teamA;
        if (enemies) {
          let minDist = Infinity;
          for (const e of enemies as Hero[]) {
            if (!e.isAlive) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (d < minDist) { minDist = d; killer = e; }
          }
        }
      }
      if (killer) {
        battleScene.onHeroKill(killer, this);
      }
    }
  }

  private showDamageNumber(amount: number): void {
    const text = this.scene.add.text(this.x, this.y - 30, `-${Math.round(amount)}`, {
      fontSize: '14px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private showHealNumber(amount: number): void {
    const text = this.scene.add.text(this.x, this.y - 30, `+${Math.round(amount)}`, {
      fontSize: '14px',
      color: '#44ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  addBuff(buff: ActiveBuff): void {
    this.buffs.push({ ...buff });
  }

  isStunned(): boolean {
    return this.buffs.some(b => b.type === BuffType.STUN && b.remaining > 0);
  }

  isRooted(): boolean {
    return this.buffs.some(b => b.type === BuffType.ROOT && b.remaining > 0);
  }

  isSilenced(): boolean {
    return this.buffs.some(b => b.type === BuffType.SILENCE && b.remaining > 0);
  }

  getSlowFactor(): number {
    let slowFactor = 1;
    for (const buff of this.buffs) {
      if (buff.type === BuffType.SLOW && buff.remaining > 0) {
        slowFactor *= (1 - buff.value);
      }
    }
    return slowFactor;
  }

  getMoveSpeed(): number {
    if (this.isStunned() || this.isRooted()) return 0;
    return this.stats.moveSpeed * this.getSlowFactor();
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

  getArmor(): number {
    return this.stats.armor || 0;
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
}
