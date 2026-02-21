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
}

export interface AbilityDef {
  id: string;
  name: string;
  type: AbilityType;
  slot: 'Q' | 'W' | 'E';
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

export interface ActiveBuff {
  type: BuffType;
  value: number;
  duration: number;
  remaining: number;
  sourceId?: string;
  tickInterval?: number;
  tickTimer?: number;
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
