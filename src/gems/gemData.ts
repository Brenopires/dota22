import type { GemDef } from '../types';

export const GEMS: readonly GemDef[] = [
  {
    id: 'ruby',
    name: 'Ruby of Might',
    description: '+15 damage',
    color: 0xFF0000,
    icon: 'R',
    damageBonus: 15,
  },
  {
    id: 'sapphire',
    name: 'Sapphire of Mind',
    description: '+80 mana',
    color: 0x0000FF,
    icon: 'S',
    manaBonus: 80,
  },
  {
    id: 'emerald',
    name: 'Emerald of Life',
    description: '+120 HP',
    color: 0x00FF00,
    icon: 'E',
    hpBonus: 120,
  },
  {
    id: 'diamond',
    name: 'Diamond of Speed',
    description: '+25 move speed',
    color: 0xB9F2FF,
    icon: 'D',
    moveSpeedBonus: 25,
  },
  {
    id: 'topaz',
    name: 'Topaz of Resilience',
    description: '+3 armor',
    color: 0xFFCC00,
    icon: 'T',
    armorBonus: 3,
  },
  {
    id: 'amethyst',
    name: 'Amethyst of Reach',
    description: '+40 attack range',
    color: 0x9966CC,
    icon: 'A',
    attackRangeBonus: 40,
  },
  {
    id: 'onyx',
    name: 'Onyx of Fortitude',
    description: '+80 HP, +2 armor',
    color: 0x333333,
    icon: 'O',
    hpBonus: 80,
    armorBonus: 2,
  },
  {
    id: 'opal',
    name: 'Opal of Balance',
    description: '+60 HP, +8 damage, +1 armor',
    color: 0xCCCCFF,
    icon: 'P',
    hpBonus: 60,
    damageBonus: 8,
    armorBonus: 1,
  },
] as const;

export function getGemById(id: string): GemDef | undefined {
  return GEMS.find(g => g.id === id);
}

export function getAllGems(): readonly GemDef[] {
  return GEMS;
}
