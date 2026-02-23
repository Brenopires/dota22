import { EventBus, Events } from '../systems/EventBus';
import { Hero } from '../entities/Hero';
import { BaseEntity } from '../entities/BaseEntity';
import { TraitDef, BuffType, ActiveBuff, Team } from '../types';
import { TRAITS, getTraitById } from './traitData';

export class TraitSystem {
  private activeTrait: TraitDef;
  private heroes: Hero[];
  private handlerRefs: { event: string; handler: Function }[] = [];
  private scene: any; // BattleScene reference for finding team heroes

  // For sudden_valor rule_change: track first kill per minute
  private lastMinuteKillGranted = -1;

  constructor(traitDef: TraitDef, heroes: Hero[], scene: any) {
    this.activeTrait = traitDef;
    this.heroes = heroes;
    this.scene = scene;

    // Subscribe mechanic event handlers based on trait's effect fields
    if (traitDef.onHitEffect) {
      const handler = (payload: any) => this.handleOnHit(payload);
      EventBus.on(Events.HERO_HIT, handler, this);
      this.handlerRefs.push({ event: Events.HERO_HIT, handler });
    }

    if (traitDef.onKillEffect) {
      const handler = (payload: any) => this.handleOnKill(payload);
      EventBus.on(Events.HERO_KILLED, handler, this);
      this.handlerRefs.push({ event: Events.HERO_KILLED, handler });
    }

    if (traitDef.onDamageTakenEffect) {
      const handler = (payload: any) => this.handleOnDamageTaken(payload);
      EventBus.on(Events.DAMAGE_TAKEN, handler, this);
      this.handlerRefs.push({ event: Events.DAMAGE_TAKEN, handler });
    }
  }

  destroy(): void {
    for (const ref of this.handlerRefs) {
      EventBus.off(ref.event, ref.handler as any, this);
    }
    this.handlerRefs = [];
  }

  getActiveTrait(): TraitDef {
    return this.activeTrait;
  }

  // ---------------------------------------------------------------------------
  // Mechanic event handlers
  // ---------------------------------------------------------------------------

  private handleOnHit(payload: { attacker: any; victim: any; damage: number }): void {
    if (!this.activeTrait.onHitEffect) return;
    if (!payload.attacker?.isAlive) return;

    const { healPercentOfDamage, dotChance, dotDamage, dotDuration } = this.activeTrait.onHitEffect;

    // Lifesteal: works on all targets (including boss) per research
    if (healPercentOfDamage && healPercentOfDamage > 0) {
      const heal = Math.floor(payload.damage * healPercentOfDamage);
      if (heal > 0) {
        payload.attacker.heal(heal);
      }
    }

    // DoT chance: only apply DoT buffs to heroes
    if (dotChance && dotChance > 0 && Math.random() < dotChance) {
      if (payload.victim?.entityType === 'hero') {
        const buff: ActiveBuff = {
          type: BuffType.DOT,
          value: dotDamage ?? 0,
          duration: dotDuration ?? 3,
          remaining: dotDuration ?? 3,
          tickInterval: 1,
          tickTimer: 0,
          sourceId: 'trait_spell_burn',
        };
        payload.victim.addBuff(buff);
      }
    }
  }

  private handleOnKill(payload: { victim: BaseEntity; killerId?: string }): void {
    if (!this.activeTrait.onKillEffect) return;

    // Only hero kills trigger this
    if (payload.victim.entityType !== 'hero') return;

    // Revival token check: if victim is alive again, BattleScene already consumed the token
    // This works because TraitSystem subscribes AFTER BattleScene's HERO_KILLED handler
    // per EventEmitter3 subscription ordering.
    if (payload.victim.isAlive) return;

    // Find the killer
    const killer = this.heroes.find(h => h.getUniqueId() === payload.killerId);
    if (!killer || !killer.isAlive) return;

    const { damageBuff, buffDuration, teamDamageBuff, teamBuffDuration } = this.activeTrait.onKillEffect;

    // Individual killer buff (executioner)
    if (damageBuff && damageBuff > 0) {
      killer.addBuff({
        type: BuffType.STAT_BUFF,
        value: damageBuff,
        duration: buffDuration ?? 10,
        remaining: buffDuration ?? 10,
        sourceId: 'trait_executioner',
      });
    }

    // Team-wide buff (sudden_valor rule_change): first kill each minute
    if (teamDamageBuff && teamDamageBuff > 0) {
      // Calculate elapsed minutes from match timer
      const timeRemaining = this.scene.matchStateMachine?.getTimeRemaining?.() ?? 300;
      const elapsed = 300 - timeRemaining;
      const currentMinute = Math.floor(elapsed / 60);

      if (this.lastMinuteKillGranted < currentMinute) {
        this.lastMinuteKillGranted = currentMinute;

        // Find all alive allies of the killer's team
        const allies = this.heroes.filter(h => h.team === killer.team && h.isAlive);
        for (const ally of allies) {
          ally.addBuff({
            type: BuffType.STAT_BUFF,
            value: teamDamageBuff,
            duration: teamBuffDuration ?? 30,
            remaining: teamBuffDuration ?? 30,
            sourceId: 'trait_sudden_valor',
          });
        }
      }
    }
  }

  private handleOnDamageTaken(payload: { victim: any; sourceId?: string; damage: number }): void {
    if (!this.activeTrait.onDamageTakenEffect) return;

    // Guard: victim must be alive and a hero
    if (!payload.victim?.isAlive) return;
    if (payload.victim.entityType !== 'hero') return;

    const { reflectPercent } = this.activeTrait.onDamageTakenEffect;

    if (reflectPercent && reflectPercent > 0) {
      const reflected = Math.floor(payload.damage * reflectPercent);
      if (reflected > 0) {
        // Find source — only reflect to heroes (not bosses/towers)
        const source = this.heroes.find(h => h.getUniqueId() === payload.sourceId);
        if (source && source.isAlive && source.entityType === 'hero') {
          source.takeDamage(reflected, payload.victim.getUniqueId());
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------

  /**
   * Select a random trait that is compatible with the heroes' passives in this match.
   * Respects incompatibility blacklists.
   */
  static selectTrait(heroPassiveIds: string[]): TraitDef {
    const eligible = TRAITS.filter(trait => {
      if (!trait.incompatiblePassives || trait.incompatiblePassives.length === 0) return true;
      return !trait.incompatiblePassives.some(pid => heroPassiveIds.includes(pid));
    });

    if (eligible.length === 0) {
      // Edge case fallback: return the first stat trait
      return TRAITS.find(t => t.category === 'stat') ?? TRAITS[0];
    }

    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  /**
   * Apply trait stat modifiers additively to a stats object.
   * Returns a new object — never mutates the input.
   * Enforces HP floor of 100 to prevent glass_cannon exploit on low-HP heroes.
   */
  static applyStatMods(stats: any, trait: TraitDef): typeof stats {
    return {
      ...stats,
      maxHP: Math.max(100, stats.maxHP + (trait.hpMod ?? 0)),
      damage: stats.damage + (trait.damageMod ?? 0),
      armor: stats.armor + (trait.armorMod ?? 0),
      moveSpeed: stats.moveSpeed + (trait.moveSpeedMod ?? 0),
      maxMana: stats.maxMana + (trait.manaMod ?? 0),
    };
  }
}
