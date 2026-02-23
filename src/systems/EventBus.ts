import Phaser from 'phaser';

/**
 * Module-level EventBus singleton.
 *
 * Uses Phaser.Events.EventEmitter (EventEmitter3 bundled in Phaser 3.90.0).
 * A standalone singleton is used instead of game.events so it survives scene restarts cleanly.
 *
 * Subscription pattern:
 *   EventBus.on(Events.HERO_KILLED, this.handler, this)    // third arg is context scope
 *   EventBus.off(Events.HERO_KILLED, this.handler, this)   // must match scope exactly
 *
 * NEVER call EventBus.removeAllListeners() in cleanup — that removes ALL global listeners.
 */
export const EventBus = new Phaser.Events.EventEmitter();

/**
 * Typed event name constants. Use these instead of raw strings in all cross-system calls.
 */
export const Events = {
  HERO_KILLED:        'hero:killed',
  HERO_RESPAWNED:     'hero:respawned',
  MATCH_STATE_CHANGE: 'match:state_change',
  MATCH_TIMER_TICK:   'match:timer_tick',
  RESPAWN_TICK:       'respawn:tick',
  SCORE_UPDATED:      'score:updated',
  // Phase 2 additions:
  HERO_HIT:           'hero:hit',          // emitted by CombatSystem.tryAutoAttack after hit connects
  DAMAGE_TAKEN:       'hero:damage_taken', // emitted by Hero.takeDamage on non-zero final damage
  HERO_LEVELED_UP:    'hero:leveled_up',   // emitted by Hero.levelUp() when level increases
  // Phase 3 additions:
  MATCH_COMPOSITION_SET: 'match:composition_set', // emitted after team composition is determined
  // Phase 4 additions:
  BOSS_KILLED:         'boss:killed',
  BOSS_PHASE_CHANGED:  'boss:phase_changed',
  BOSS_SCALED:         'boss:scaled',
  TOWER_DESTROYED:     'tower:destroyed',
  TOWER_DISABLED:      'tower:disabled',
  TOWER_ENABLED:       'tower:enabled',
  TOWER_DAMAGED:       'tower:damaged',
  REVIVAL_TOKEN_USED:  'revival:token_used',
  // Phase 5 additions:
  TRAIT_APPLIED:       'trait:applied',
} as const;

/** Derived union type of all valid event keys. */
export type EventKey = typeof Events[keyof typeof Events];
