import Phaser from 'phaser';
import { EventBus, Events } from './EventBus';
import { MatchPhase, Team } from '../types';
import { BaseEntity } from '../entities/BaseEntity';
import {
  CAMP_SCORE_POINTS,
  BOSS_KILL_SCORE,
  TOWER_DAMAGE_THRESHOLD_SCORE,
  TOWER_DAMAGE_THRESHOLD_PCT,
} from '../constants';

export class MatchStateMachine {
  private phase: MatchPhase = MatchPhase.PRE_MATCH;
  private scene: Phaser.Scene;
  private matchTimerEvent: Phaser.Time.TimerEvent | null = null;
  private matchTimeRemaining: number;
  private score = {
    teamA: 0,
    teamB: 0,
    campClearsA: 0,
    campClearsB: 0,
    bossKillsA: 0,
    bossKillsB: 0,
    towerThresholdA: false,
    towerThresholdB: false,
  };

  constructor(scene: Phaser.Scene, matchDurationSeconds: number) {
    this.scene = scene;
    this.matchTimeRemaining = matchDurationSeconds;
  }

  start(): void {
    if (this.phase !== MatchPhase.PRE_MATCH) return;
    this.transition(MatchPhase.ACTIVE);
    EventBus.on(Events.HERO_KILLED, this.onKill, this);
    EventBus.on(Events.CAMP_CLEARED, this.onCampCleared, this);
    EventBus.on(Events.BOSS_KILLED, this.onBossKilled, this);
    EventBus.on(Events.TOWER_DAMAGED, this.onTowerDamaged, this);
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

  private onCampCleared({ victim, killerId, campType }: { victim: BaseEntity; killerId?: string; campType: string }): void {
    if (this.phase === MatchPhase.ENDED) return;
    if (!killerId) return;

    // Find killer's team from the heroes list by matching killerId
    // Camp mobs are neutral, so the killer determines which team scores
    // killerId format is 'heroId_team' (e.g., 'iron_guard_A'),
    // extract team from the suffix
    const isTeamA = killerId.endsWith('_A');
    const isTeamB = killerId.endsWith('_B');

    if (isTeamA) {
      this.score.teamA += CAMP_SCORE_POINTS;
      this.score.campClearsA++;
    } else if (isTeamB) {
      this.score.teamB += CAMP_SCORE_POINTS;
      this.score.campClearsB++;
    }

    EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
  }

  private onBossKilled({ victim, killerId }: { victim: BaseEntity; killerId?: string }): void {
    if (this.phase === MatchPhase.ENDED) return;
    // Determine team from killerId suffix (_A / _B) — same pattern as onCampCleared
    const isTeamA = killerId?.endsWith('_A');
    const isTeamB = killerId?.endsWith('_B');
    if (isTeamA) {
      this.score.teamA += BOSS_KILL_SCORE;
      this.score.bossKillsA++;
    } else if (isTeamB) {
      this.score.teamB += BOSS_KILL_SCORE;
      this.score.bossKillsB++;
    }
    EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
  }

  private onTowerDamaged({ tower, damage }: { tower: BaseEntity; damage: number }): void {
    if (this.phase === MatchPhase.ENDED) return;
    // Guard: avoid scoring on the destruction frame (same tick as die())
    if (!tower.isAlive) return;
    const hpRatio = (tower as any).currentHP / (tower as any).maxHP;
    if (tower.team === Team.A && !this.score.towerThresholdA && hpRatio <= TOWER_DAMAGE_THRESHOLD_PCT) {
      this.score.teamB += TOWER_DAMAGE_THRESHOLD_SCORE;
      this.score.towerThresholdA = true;
      EventBus.emit(Events.TOWER_THRESHOLD_SCORED, { scoringTeam: Team.B, tower });
      EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
    } else if (tower.team === Team.B && !this.score.towerThresholdB && hpRatio <= TOWER_DAMAGE_THRESHOLD_PCT) {
      this.score.teamA += TOWER_DAMAGE_THRESHOLD_SCORE;
      this.score.towerThresholdB = true;
      EventBus.emit(Events.TOWER_THRESHOLD_SCORED, { scoringTeam: Team.A, tower });
      EventBus.emit(Events.SCORE_UPDATED, { ...this.score });
    }
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

  /**
   * Transition the match to SUDDEN_DEATH.
   * Called by BattleScene when the third boss kill occurs (plan 04).
   * If the match is not ACTIVE (already SUDDEN_DEATH or ENDED), the transition guard rejects it.
   */
  triggerSuddenDeath(reason: string): void {
    this.transition(MatchPhase.SUDDEN_DEATH);
    EventBus.emit(Events.SUDDEN_DEATH_TRIGGERED, { reason });
  }

  transition(next: MatchPhase): void {
    const order = [MatchPhase.PRE_MATCH, MatchPhase.ACTIVE, MatchPhase.SUDDEN_DEATH, MatchPhase.ENDED];
    if (order.indexOf(next) <= order.indexOf(this.phase)) return;
    this.phase = next;
    EventBus.emit(Events.MATCH_STATE_CHANGE, { phase: next, score: { ...this.score } });
  }

  getPhase(): MatchPhase { return this.phase; }
  getTimeRemaining(): number { return this.matchTimeRemaining; }
  getScore() { return { ...this.score }; }

  destroy(): void {
    EventBus.off(Events.HERO_KILLED, this.onKill, this);
    EventBus.off(Events.CAMP_CLEARED, this.onCampCleared, this);
    EventBus.off(Events.BOSS_KILLED, this.onBossKilled, this);
    EventBus.off(Events.TOWER_DAMAGED, this.onTowerDamaged, this);
    if (this.matchTimerEvent) {
      this.scene.time.removeEvent(this.matchTimerEvent); // NOT .destroy() — confirmed Phaser bug
      this.matchTimerEvent = null;
    }
  }
}
