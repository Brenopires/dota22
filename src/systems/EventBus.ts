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
} as const;

/** Derived union type of all valid event keys. */
export type EventKey = typeof Events[keyof typeof Events];
