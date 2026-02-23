import Phaser from 'phaser';
import { AIState, HeroArchetype, Team } from '../types';
import { Hero } from '../entities/Hero';
import { AIPersonality, AIProfile } from './AIPersonality';
import { AI_DECISION_DELAY_MIN, AI_DECISION_DELAY_MAX, FOCUS_PENALTY_PER_ATTACKER } from '../constants';

export class AIController {
  hero: Hero;
  private scene: Phaser.Scene;
  private state: AIState = AIState.IDLE;
  private previousState: AIState = AIState.IDLE;
  private profile: AIProfile;
  private target: Hero | null = null;
  private decisionDelay: number;
  private delayClock = 0;
  private lastAbilityAttempt = 0;
  private static readonly RANGE_HYSTERESIS = 15;

  constructor(hero: Hero, scene: Phaser.Scene, profileOverride?: AIProfile) {
    this.hero = hero;
    this.scene = scene;
    this.profile = profileOverride ?? AIPersonality.getProfile(hero.stats.archetype);
    this.decisionDelay = this.randomDelay();
  }

  private randomDelay(): number {
    return (AI_DECISION_DELAY_MIN + Math.random() * (AI_DECISION_DELAY_MAX - AI_DECISION_DELAY_MIN)) / 1000;
  }

  get currentTarget(): Hero | null {
    return this.target;
  }

  update(targetCountMap?: Map<string, number>): void {
    if (!this.hero.isAlive || this.hero.isStunned()) {
      this.hero.body?.setVelocity(0, 0);
      return;
    }

    this.delayClock += 0.2; // AI_UPDATE_INTERVAL = 200ms
    if (this.delayClock < this.decisionDelay) return;
    this.delayClock = 0;
    this.decisionDelay = this.randomDelay();

    const battleScene = this.scene as any;
    const enemies = battleScene.getEnemies(this.hero.team) as Hero[];
    const allies = battleScene.getAllies(this.hero.team, this.hero) as Hero[];

    if (!enemies || enemies.length === 0) {
      this.state = AIState.IDLE;
      this.hero.body?.setVelocity(0, 0);
      return;
    }

    // Select target
    this.target = this.selectTarget(enemies, targetCountMap ?? new Map());
    if (!this.target) {
      this.state = AIState.IDLE;
      this.hero.body?.setVelocity(0, 0);
      return;
    }

    const hpRatio = this.hero.currentHP / this.hero.stats.maxHP;
    const distToTarget = this.hero.distanceTo(this.target);
    const attackRange = this.hero.getAttackRange();

    // State transitions
    if (hpRatio <= this.profile.retreatThreshold) {
      this.state = AIState.RETREAT;
    } else if (this.shouldUseAbility(distToTarget)) {
      this.state = AIState.USE_ABILITY;
    } else if (distToTarget <= attackRange) {
      this.state = AIState.ATTACK;
    } else if (this.previousState === AIState.ATTACK && distToTarget <= attackRange + AIController.RANGE_HYSTERESIS) {
      this.state = AIState.ATTACK;
    } else if (hpRatio > this.profile.retreatThreshold) {
      this.state = AIState.CHASE;
    } else {
      this.state = AIState.IDLE;
    }

    // Execute state
    switch (this.state) {
      case AIState.IDLE:
        this.hero.body?.setVelocity(0, 0);
        break;
      case AIState.CHASE:
        this.executeChase();
        break;
      case AIState.ATTACK:
        this.executeAttack();
        break;
      case AIState.RETREAT:
        this.executeRetreat(enemies);
        break;
      case AIState.USE_ABILITY:
        this.executeUseAbility();
        break;
    }

    this.previousState = this.state;
  }

  private selectTarget(enemies: Hero[], targetCountMap: Map<string, number>): Hero | null {
    if (enemies.length === 0) return null;

    // Score each enemy — lower score = higher priority target
    const scored = enemies.map(e => {
      const overlapCount = targetCountMap.get(e.getUniqueId()) ?? 0;
      const focusPenalty = overlapCount * FOCUS_PENALTY_PER_ATTACKER;

      let baseScore: number;
      switch (this.profile.targetPriority) {
        case 'lowest_hp':
          // Lower HP ratio → lower score → preferred; 0 = critical, 1 = full HP
          baseScore = e.currentHP / e.stats.maxHP;
          break;
        case 'closest':
          // Normalize distance by arena max diagonal (~2000px)
          baseScore = this.hero.distanceTo(e) / 2000;
          break;
        case 'highest_threat':
        default:
          baseScore = 0.5; // neutral; jitter will spread ties
          break;
      }

      // Jitter ±0.1 — prevents synchronized lock-step across all AIs on same tick
      const jitter = (Math.random() - 0.5) * 0.2;
      return { hero: e, score: baseScore + focusPenalty + jitter };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0].hero;
  }

  private shouldUseUltimate(): boolean {
    if (Math.random() > 0.3) return false; // AI uses ult only 30% of chances
    if (!this.hero.stats.abilities[3]) return false;
    if (this.hero.abilityCooldowns[3] > 0) return false;
    if (this.hero.currentMana < this.hero.stats.abilities[3].manaCost) return false;
    return true;
  }

  private shouldUseAbility(distToTarget: number): boolean {
    if (this.shouldUseUltimate()) return true;

    if (Math.random() > this.profile.abilityPriority) return false;

    // Check if any ability is ready
    for (let i = 0; i < this.hero.stats.abilities.length; i++) {
      if (this.hero.abilityCooldowns[i] <= 0) {
        const ability = this.hero.stats.abilities[i];
        if (this.hero.currentMana >= ability.manaCost) {
          return true;
        }
      }
    }
    return false;
  }

  private executeChase(): void {
    if (!this.target) return;

    const angle = Math.atan2(this.target.y - this.hero.y, this.target.x - this.hero.x);
    const speed = this.hero.getMoveSpeed();

    // Kiting: ranged heroes try to maintain distance
    if (this.profile.kitingEnabled && this.hero.isRanged()) {
      const dist = this.hero.distanceTo(this.target);
      const keepDist = this.profile.keepDistance;

      if (dist < keepDist * 0.7) {
        // Too close, move away
        this.hero.body?.setVelocity(
          -Math.cos(angle) * speed,
          -Math.sin(angle) * speed
        );
        return;
      }
    }

    this.hero.body?.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    this.hero.faceDirection = angle;
  }

  private executeAttack(): void {
    if (!this.target) return;

    const dist = this.hero.distanceTo(this.target);
    const attackRange = this.hero.getAttackRange();

    // Kiting for ranged
    if (this.profile.kitingEnabled && this.hero.isRanged()) {
      const keepDist = this.profile.keepDistance;
      if (dist < keepDist * 0.6) {
        const angle = Math.atan2(this.target.y - this.hero.y, this.target.x - this.hero.x);
        const speed = this.hero.getMoveSpeed();
        this.hero.body?.setVelocity(
          -Math.cos(angle) * speed * 0.7,
          -Math.sin(angle) * speed * 0.7
        );
        return;
      }
    }

    // Stop and attack
    this.hero.body?.setVelocity(0, 0);

    // Face target
    this.hero.faceDirection = Math.atan2(
      this.target.y - this.hero.y,
      this.target.x - this.hero.x
    );

    // Auto-attack
    const battleScene = this.scene as any;
    if (battleScene.combatSystem) {
      battleScene.combatSystem.tryAutoAttack(this.hero);
    }
  }

  private executeRetreat(enemies: Hero[]): void {
    // Run away from nearest enemy
    let nearestEnemy = enemies[0];
    let nearestDist = Infinity;
    for (const e of enemies) {
      const dist = this.hero.distanceTo(e);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = e;
      }
    }

    const angle = Math.atan2(this.hero.y - nearestEnemy.y, this.hero.x - nearestEnemy.x);
    const speed = this.hero.getMoveSpeed();
    this.hero.body?.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Try to use defensive ability while retreating
    for (let i = 0; i < this.hero.stats.abilities.length; i++) {
      const ability = this.hero.stats.abilities[i];
      if (this.hero.abilityCooldowns[i] <= 0 && this.hero.currentMana >= ability.manaCost) {
        if (ability.buffType === 'shield' || ability.healAmount) {
          this.hero.useAbility(i, this.hero.x, this.hero.y);
          break;
        }
      }
    }
  }

  private executeUseAbility(): void {
    if (!this.target) return;

    // Prioritize: Ultimate first (if ready), then highest damage
    const abilityOrder = [3, 2, 0, 1]; // R (ultimate), E, Q, W priority

    for (const slot of abilityOrder) {
      if (slot >= this.hero.stats.abilities.length) continue;
      if (this.hero.abilityCooldowns[slot] > 0) continue;

      const ability = this.hero.stats.abilities[slot];
      if (this.hero.currentMana < ability.manaCost) continue;

      // Check range
      const dist = this.hero.distanceTo(this.target);
      const abilityRange = ability.range || ability.dashDistance || 200;

      if (dist <= abilityRange + 50) {
        // Use ability targeting enemy position
        let targetX = this.target.x;
        let targetY = this.target.y;

        // For heal/buff abilities, target self or allies
        if (ability.healAmount && !ability.damage) {
          targetX = this.hero.x;
          targetY = this.hero.y;
        }

        this.hero.useAbility(slot, targetX, targetY);
        return;
      }
    }

    // If no ability used, chase
    this.executeChase();
  }
}
