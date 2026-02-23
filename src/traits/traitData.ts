import type { TraitDef } from '../types';

export const TRAITS: readonly TraitDef[] = [
  // ---- Stat traits (3) ----
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    description: 'All heroes deal +20 damage but lose 150 HP',
    category: 'stat',
    color: 0xFF4444,
    icon: '!!',
    damageMod: 20,
    hpMod: -150,
    incompatiblePassives: [],
  },
  {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    description: 'All heroes gain +5 armor but lose 30 move speed',
    category: 'stat',
    color: 0x808080,
    icon: '[]',
    armorMod: 5,
    moveSpeedMod: -30,
    incompatiblePassives: [],
  },
  {
    id: 'arcane_surge',
    name: 'Arcane Surge',
    description: 'All heroes gain +100 mana and +3 mana regen',
    category: 'stat',
    color: 0x4488FF,
    icon: '~~',
    manaMod: 100,
    manaRegenMod: 3,
    incompatiblePassives: [],
  },

  // ---- Mechanic traits (4) ----
  {
    id: 'vampiric_pact',
    name: 'Vampiric Pact',
    description: 'Auto-attacks heal for 10% of damage dealt',
    category: 'mechanic',
    color: 0x8B0000,
    icon: 'vv',
    onHitEffect: { healPercentOfDamage: 0.10 },
    incompatiblePassives: ['bd_passive'],
  },
  {
    id: 'thorns_aura',
    name: 'Thorns Aura',
    description: 'Taking damage reflects 8% back to the attacker',
    category: 'mechanic',
    color: 0x228B22,
    icon: '/\\',
    onDamageTakenEffect: { reflectPercent: 0.08 },
    incompatiblePassives: [],
  },
  {
    id: 'executioner',
    name: 'Executioner',
    description: 'Killing a hero grants +15 damage for 10 seconds',
    category: 'mechanic',
    color: 0xCC0000,
    icon: '>>',
    onKillEffect: { damageBuff: 15, buffDuration: 10 },
    incompatiblePassives: ['ld_passive'],
  },
  {
    id: 'spell_burn',
    name: 'Spell Burn',
    description: 'Auto-attacks have a 30% chance to apply 25 damage burn for 3s',
    category: 'mechanic',
    color: 0xFF8C00,
    icon: '**',
    onHitEffect: { dotChance: 0.30, dotDamage: 25, dotDuration: 3 },
    incompatiblePassives: ['fw_passive', 'vs_passive'],
  },

  // ---- Rule change traits (1) ----
  {
    id: 'sudden_valor',
    name: 'Sudden Valor',
    description: 'First kill each minute grants team +10 damage for 30s',
    category: 'rule_change',
    color: 0xFFD700,
    icon: '!*',
    onKillEffect: { teamDamageBuff: 10, teamBuffDuration: 30 },
    ruleChange: {
      type: 'first_kill_buff',
      description: 'First kill each minute grants team-wide damage buff',
    },
    incompatiblePassives: [],
  },
] as const;

export function getTraitById(id: string): TraitDef | undefined {
  return TRAITS.find(t => t.id === id);
}

export function getAllTraits(): readonly TraitDef[] {
  return TRAITS;
}
