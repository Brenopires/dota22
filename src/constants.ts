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

export const ARENA_THEMES = ['stone_ruins', 'lava_pit', 'frozen_tundra', 'dark_forest', 'desert_dunes'] as const;
export const ARENA_LAYOUTS = ['open', 'corridor', 'pillars', 'fortress', 'maze_light'] as const;

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
