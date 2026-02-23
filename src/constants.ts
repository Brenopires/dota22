export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const ARENA_WIDTH = 1600;
export const ARENA_HEIGHT = 1200;

export const MATCH_DURATION = 300; // seconds — 5-minute match cap
export const RESPAWN_DURATION = 5000; // ms — flat 5s respawn for all heroes in Phase 1

export const HERO_RADIUS = 20;
export const HERO_LABEL_SIZE = 14;
export const HEALTHBAR_WIDTH = 40;
export const HEALTHBAR_HEIGHT = 5;
export const MANABAR_HEIGHT = 3;
export const HEALTHBAR_OFFSET_Y = -30;

export const MELEE_RANGE = 60;
export const AUTO_ATTACK_COOLDOWN = 1000; // ms

export const PROJECTILE_SPEED = 400;
export const PROJECTILE_RADIUS = 5;

export const AI_UPDATE_INTERVAL = 200; // ms
export const AI_DECISION_DELAY_MIN = 150; // ms
export const AI_DECISION_DELAY_MAX = 400; // ms

export const FOCUS_PENALTY_PER_ATTACKER = 0.2; // score penalty per additional AI already targeting same enemy

export const MANA_REGEN_RATE = 5; // per second

export const DAMAGE_NUMBER_DURATION = 800;
export const DAMAGE_NUMBER_RISE = 30;

export const MMR_INITIAL = 1000;
export const MMR_K_FACTOR = 32;

export const COLORS = {
  IRON_GUARD: 0x4682B4,
  SHADOW_BLADE: 0x8B008B,
  FLAME_WITCH: 0xFF8C00,
  FROST_ARCHER: 0x00CED1,
  HOLY_PRIEST: 0xFFD700,
  STORM_CALLER: 0x1E90FF,
  BLADE_DANCER: 0xDC143C,
  WAR_DRUMMER: 0x8B4513,
  VENOM_STALKER: 0x32CD32,
  STONE_GOLEM: 0x808080,
  LIGHTNING_DUELIST: 0xFFFF00,
  BLOOD_SHAMAN: 0x8B0000,
  PHANTOM_KNIGHT: 0x4B0082,
} as const;

export const RANK_THRESHOLDS = [
  { name: 'Bronze', minMMR: 0, color: 0xCD7F32 },
  { name: 'Silver', minMMR: 800, color: 0xC0C0C0 },
  { name: 'Gold', minMMR: 1100, color: 0xFFD700 },
  { name: 'Platinum', minMMR: 1400, color: 0x00CED1 },
  { name: 'Diamond', minMMR: 1700, color: 0xB9F2FF },
  { name: 'Master', minMMR: 2000, color: 0xFF4500 },
] as const;

export const TEAM_BALANCE = {
  BASE_SCALE_FACTOR: 0.35,   // bonus per unit of size ratio (e.g., 3v1 → ratio 3 → rawBonus 0.70)
  MMR_SCALE_FLOOR: 1000,     // MMR at and below which full bonus applies
  MMR_SCALE_RANGE: 1000,     // MMR span over which bonus linearly shrinks to zero
  MMR_SCALE_REDUCTION: 0.7,  // cap: even at MMR floor, only 70% of rawBonus is applied
  MAX_BONUS_CAP: 1.5,        // absolute cap: smaller team stats never exceed 2.5x base
} as const;

export const ARENA_THEMES = ['stone_ruins', 'lava_pit', 'frozen_tundra', 'dark_forest', 'desert_dunes'] as const;
export const ARENA_LAYOUTS = ['open', 'corridor', 'pillars', 'fortress', 'maze_light'] as const;

// ---------------------------------------------------------------------------
// Phase 4 — Boss constants
// ---------------------------------------------------------------------------
export const BOSS_BASE_HP = 3000;
export const BOSS_BASE_DAMAGE = 40;
export const BOSS_BASE_ARMOR = 5;
export const BOSS_SCALING_PER_MINUTE = 0.15;
export const BOSS_AGGRO_RADIUS = 250;
export const BOSS_LEASH_RADIUS = 400;
export const BOSS_ATTACK_RANGE = 80;
export const BOSS_ATTACK_INTERVAL = 1.5;
export const BOSS_ENRAGED_ATTACK_INTERVAL = 1.0;
export const BOSS_DYING_ATTACK_INTERVAL = 0.7;
export const BOSS_RADIUS = 35;
export const BOSS_KILL_BUFF_DAMAGE = 20;
export const BOSS_KILL_BUFF_DURATION = 60;
export const BOSS_ENRAGED_THRESHOLD = 0.6;
export const BOSS_DYING_THRESHOLD = 0.25;
export const BOSS_MOVE_SPEED = 80;

// ---------------------------------------------------------------------------
// Phase 4 — Tower constants
// ---------------------------------------------------------------------------
export const TOWER_MAX_HP = 4000;
export const TOWER_ATTACK_DAMAGE = 80;
export const TOWER_ATTACK_RADIUS = 200;
export const TOWER_ATTACK_INTERVAL = 1.0;
export const TOWER_RADIUS = 30;
export const TOWER_REGEN_RATE = 20;
export const TOWER_REGEN_DELAY = 5000;
export const TOWER_DISABLE_DURATION = 15;

// ---------------------------------------------------------------------------
// Phase 6 -- Neutral Camp constants
// ---------------------------------------------------------------------------
export const CAMP_MOB_HP = 600;
export const CAMP_MOB_DAMAGE = 25;
export const CAMP_MOB_ARMOR = 3;
export const CAMP_MOB_RADIUS = 22;
export const CAMP_MOB_AGGRO_RADIUS = 150;
export const CAMP_MOB_LEASH_RADIUS = 200;
export const CAMP_MOB_ATTACK_RANGE = 60;
export const CAMP_MOB_ATTACK_INTERVAL = 1.2; // seconds
export const CAMP_MOB_MOVE_SPEED = 60;
export const CAMP_MOB_SCALING_PER_MINUTE = 0.10;
export const CAMP_RESPAWN_DELAY = 60000; // ms -- 60 seconds
export const CAMP_BUFF_DURATION = 30; // seconds
export const CAMP_BUFF_DAMAGE_VALUE = 15; // +15 flat damage
export const CAMP_BUFF_SHIELD_VALUE = 200; // 200 HP shield
export const CAMP_BUFF_HASTE_VALUE = 0.25; // +25% move speed
export const CAMP_BUFF_COOLDOWN_VALUE = 0.20; // -20% cooldown reduction
export const CAMP_SCORE_POINTS = 1; // 1 point per camp clear

// ---------------------------------------------------------------------------
// Phase 7 — Scoring
// ---------------------------------------------------------------------------
export const KILL_SCORE = 1;
export const BOSS_KILL_SCORE = 3;
export const TOWER_DAMAGE_THRESHOLD_SCORE = 2;
export const TOWER_DAMAGE_THRESHOLD_PCT = 0.50;

// Phase 7 — Boss Tier 2
export const BOSS_TIER2_DAMAGE_AMP = 25;
export const BOSS_RESPAWN_DELAY = 30000;
export const BOSS_ROAM_SPEED = 60;
export const BOSS_ROAM_WAYPOINTS: { x: number; y: number }[] = [
  { x: 800, y: 200 },
  { x: 1150, y: 350 },
  { x: 1250, y: 600 },
  { x: 1150, y: 850 },
  { x: 800, y: 1000 },
  { x: 450, y: 850 },
  { x: 350, y: 600 },
  { x: 450, y: 350 },
];

// Phase 7 — Sudden Death
export const SUDDEN_DEATH_COLOR = 0xff0000;
export const SUDDEN_DEATH_FLASH_DURATION = 600;
export const SUDDEN_DEATH_FLASH_INTENSITY = 0.7;

export const HERO_ELEMENT_MAP: Record<string, string> = {
  flame_witch: 'fire',
  frost_archer: 'ice',
  storm_caller: 'lightning',
  lightning_duelist: 'lightning',
  venom_stalker: 'poison',
  holy_priest: 'holy',
  shadow_blade: 'shadow',
  phantom_knight: 'shadow',
  blade_dancer: 'blood',
  blood_shaman: 'blood',
  iron_guard: 'stone',
  stone_golem: 'stone',
  war_drummer: 'generic',
};
