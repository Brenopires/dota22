import Phaser from 'phaser';
import { EventBus, Events } from './EventBus';
import { MatchPhase, Team } from '../types';
import { BaseEntity } from '../entities/BaseEntity';

export class MatchStateMachine {
  private phase: MatchPhase = MatchPhase.PRE_MATCH;
  private scene: Phaser.Scene;
  private matchTimerEvent: Phaser.Time.TimerEvent | null = null;
  private matchTimeRemaining: number;
  private score = { teamA: 0, teamB: 0 };

  constructor(scene: Phaser.Scene, matchDurationSeconds: number) {
    this.scene = scene;
    this.matchTimeRemaining = matchDurationSeconds;
  }

  start(): void {
    if (this.phase !== MatchPhase.PRE_MATCH) return;
    this.transition(MatchPhase.ACTIVE);
    EventBus.on(Events.HERO_KILLED, this.onKill, this);
    this.matchTimerEvent = this.scene.time.addEvent({
      delay: 1000,
      callback: this.onTick,
      callbackScope: this,
      loop: true,
    });
  }

  private onTick(): void {
    if (this.phase !== MatchPhase.ACTIVE) return;
    this.matchTimeRemaining--;
    EventBus.emit(Events.MATCH_TIMER_TICK, { remaining: this.matchTimeRemaining });
    if (this.matchTimeRemaining <= 0) {
      this.transition(MatchPhase.ENDED);
    }
  }

  private onKill({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    if (this.phase === MatchPhase.ENDED) return;
    // Only count hero kills for score (boss/tower have their own events)
    if (victim.entityType !== 'hero') return;
    if (victim.team === Team.A) this.score.teamB++;
    else if (victim.team === Team.B) this.score.teamA++;
    EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
  }

  /**
   * End the match immediately due to tower destruction.
   * Uses existing transition() guard to prevent backward transitions.
   * The transition emits MATCH_STATE_CHANGE with phase: ENDED, which
   * triggers BattleScene.onMatchStateChange -> endMatch().
   */
  endByTowerDestruction(destroyedTowerTeam: Team): void {
    if (this.phase === MatchPhase.ENDED) return;
    this.transition(MatchPhase.ENDED);
  }

  transition(next: MatchPhase): void {
    const order = [MatchPhase.PRE_MATCH, MatchPhase.ACTIVE, MatchPhase.ENDED];
    if (order.indexOf(next) <= order.indexOf(this.phase)) return;
    this.phase = next;
    EventBus.emit(Events.MATCH_STATE_CHANGE, { phase: next, score: { ...this.score } });
  }

  getPhase(): MatchPhase { return this.phase; }
  getTimeRemaining(): number { return this.matchTimeRemaining; }
  getScore(): { teamA: number; teamB: number } { return { ...this.score }; }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this);
    if (this.matchTimerEvent) {
      this.scene.time.removeEvent(this.matchTimerEvent); // NOT .destroy() — confirmed Phaser bug
      this.matchTimerEvent = null;
    }
  }
}
