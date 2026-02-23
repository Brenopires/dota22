export enum HeroArchetype {
  TANK = 'tank',
  ASSASSIN = 'assassin',
  MAGE = 'mage',
  CARRY = 'carry',
  SUPPORT = 'support',
}

export enum AbilityType {
  PROJECTILE = 'projectile',
  AREA = 'area',
  BUFF = 'buff',
  DASH = 'dash',
  SELF_BUFF = 'self_buff',
}

export enum BuffType {
  STUN = 'stun',
  ROOT = 'root',
  SLOW = 'slow',
  DOT = 'dot',
  SHIELD = 'shield',
  STAT_BUFF = 'stat_buff',
  HEAL_OVER_TIME = 'heal_over_time',
  SILENCE = 'silence',
}

export enum AIState {
  IDLE = 'idle',
  CHASE = 'chase',
  ATTACK = 'attack',
  RETREAT = 'retreat',
  USE_ABILITY = 'use_ability',
}

export enum Team {
  A = 'A',
  B = 'B',
  NEUTRAL = 'NEUTRAL',
}

export enum BossPhase {
  NORMAL = 'normal',
  ENRAGED = 'enraged',
  DYING = 'dying',
}

export interface HeroStats {
  id: string;
  name: string;
  label: string; // 2-letter abbreviation
  archetype: HeroArchetype;
  color: number;
  maxHP: number;
  maxMana: number;
  damage: number;
  armor: number;
  attackRange: number;
  moveSpeed: number;
  abilities: AbilityDef[];
  passive: PassiveDef;
}

export interface AbilityDef {
  id: string;
  name: string;
  type: AbilityType;
  slot: 'Q' | 'W' | 'E' | 'R';
  isUltimate?: boolean;
  manaCost: number;
  cooldown: number; // seconds
  damage?: number;
  range?: number;
  radius?: number;
  duration?: number;
  projectileSpeed?: number;
  buffType?: BuffType;
  buffValue?: number;
  buffDuration?: number;
  healAmount?: number;
  dashDistance?: number;
  dashSpeed?: number;
  description: string;
}

export type PassiveTrigger = 'on_kill' | 'on_hit' | 'on_damage_taken';

export interface PassiveDef {
  id: string;
  name: string;
  trigger: PassiveTrigger;
  description: string;
  // Effect fields — interpreted by Hero.applyPassiveEffect()
  healOnKill?: number;          // heal self X HP on kill
  buffOnKill?: ActiveBuff;      // apply buff to self on kill
  damageReturnRatio?: number;   // reflect X% damage back (on_damage_taken)
  bonusDamageOnHit?: number;    // extra flat damage (on_hit)
  buffOnHit?: ActiveBuff;       // apply debuff to enemy (on_hit)
  speedBurstOnKill?: number;    // +X to moveSpeed for 3s (on_kill)
  cooldownResetOnKill?: boolean;// reset all cooldowns (on_kill)
  manaRestoreOnKill?: number;   // restore X mana (on_kill)
  armorStackOnDamage?: number;  // gain +X armor stack (on_damage_taken)
  passiveCooldown?: number;     // seconds before passive can trigger again (prevents spam)
}

export interface ActiveBuff {
  type: BuffType;
  value: number;
  duration: number;
  remaining: number;
  sourceId?: string;
  tickInterval?: number;
  tickTimer?: number;
}

export interface MatchConfig {
  teamSizeA: number;
  teamSizeB: number;
  teamSize: number;   // backward compat — Math.max(teamSizeA, teamSizeB)
  teamA: string[];
  teamB: string[];
  playerHero: string;
  arenaTheme: string;
  arenaLayout: string;
}

export interface MatchResult {
  won: boolean;
  draw: boolean;
  playerHero: string;
  playerTeam: Team;
  playerKills: number;
  playerDeaths: number;
  teamKills: number;
  enemyKills: number;
  teamSize: number;
  teamSizeA?: number;
  teamSizeB?: number;
  arenaTheme: string;
  arenaLayout: string;
  mmrChange: number;
  timestamp: number;
}

export interface PlayerData {
  mmr: number;
  wins: number;
  losses: number;
  draws: number;
  matchHistory: MatchResult[];
  gamesPlayed: number;
}

export interface ArenaConfig {
  theme: string;
  layout: string;
  backgroundColor: number;
  wallColor: number;
  obstacles: ObstacleDef[];
  spawnA: { x: number; y: number }[];
  spawnB: { x: number; y: number }[];
}

export interface ObstacleDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Phase 1 additions — EventBus / match state foundations
// ---------------------------------------------------------------------------

export enum MatchPhase {
  PRE_MATCH = 'pre_match',
  ACTIVE    = 'active',
  ENDED     = 'ended',
}

import type { Hero } from './entities/Hero';
import type { MatchStateMachine } from './systems/MatchStateMachine';
export interface IBattleScene {
  heroes: Hero[];
  teamA: Hero[];
  teamB: Hero[];
  player: Hero;
  spawnA: { x: number; y: number }[];
  spawnB: { x: number; y: number }[];
  teamAKills: number;
  teamBKills: number;
  matchStateMachine: MatchStateMachine;
  playerRespawnEndTime: number; // ms timestamp — 0 means alive; non-zero means respawning
  getEnemies(team: Team): Hero[];
  getAllies(team: Team, excludeSelf?: Hero): Hero[];
}
