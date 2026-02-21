import Phaser from 'phaser';

export type ElementType = 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'shadow' | 'blood' | 'stone' | 'generic';

export interface ParticlePresetConfig {
  texture: string;
  tint: number[];
  blendMode: Phaser.BlendModes;
  lifespan: number;
  speed: { min: number; max: number };
  scale: { start: number; end: number };
  alpha: { start: number; end: number };
  quantity: number;
  frequency?: number;
  gravityY?: number;
  angle?: { min: number; max: number };
  rotate?: { min: number; max: number };
  emitZone?: any;
}

const ELEMENT_COLORS: Record<ElementType, number[]> = {
  fire: [0xFF8C00, 0xFF4500, 0xFFFF00],
  ice: [0x00CED1, 0xFFFFFF, 0x4682B4],
  lightning: [0xFFFF00, 0xFFFFFF, 0x1E90FF],
  poison: [0x32CD32, 0x00FF00],
  holy: [0xFFD700, 0xFFFFFF],
  shadow: [0x4B0082, 0xFF00FF, 0x111111],
  blood: [0x8B0000, 0xDC143C],
  stone: [0x808080, 0x666666, 0x999999],
  generic: [0xFFFFFF],
};

const ELEMENT_BLEND: Record<ElementType, Phaser.BlendModes> = {
  fire: Phaser.BlendModes.ADD,
  ice: Phaser.BlendModes.ADD,
  lightning: Phaser.BlendModes.ADD,
  poison: Phaser.BlendModes.NORMAL,
  holy: Phaser.BlendModes.ADD,
  shadow: Phaser.BlendModes.NORMAL,
  blood: Phaser.BlendModes.NORMAL,
  stone: Phaser.BlendModes.NORMAL,
  generic: Phaser.BlendModes.ADD,
};

export class ParticlePresets {
  static getColors(element: ElementType, heroColor?: number): number[] {
    if (element === 'generic' && heroColor !== undefined) {
      return [heroColor];
    }
    return ELEMENT_COLORS[element];
  }

  static getBlend(element: ElementType): Phaser.BlendModes {
    return ELEMENT_BLEND[element];
  }

  static trailConfig(element: ElementType, heroColor?: number): ParticlePresetConfig {
    return {
      texture: 'particle_soft',
      tint: this.getColors(element, heroColor),
      blendMode: this.getBlend(element),
      lifespan: 300,
      speed: { min: 5, max: 20 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 1,
      frequency: 30,
    };
  }

  static impactConfig(element: ElementType, heroColor?: number): ParticlePresetConfig {
    return {
      texture: 'particle_circle',
      tint: this.getColors(element, heroColor),
      blendMode: this.getBlend(element),
      lifespan: 400,
      speed: { min: 40, max: 120 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 8,
      angle: { min: 0, max: 360 },
    };
  }

  static burstConfig(element: ElementType, count: number = 12, heroColor?: number): ParticlePresetConfig {
    return {
      texture: 'particle_soft',
      tint: this.getColors(element, heroColor),
      blendMode: this.getBlend(element),
      lifespan: 500,
      speed: { min: 50, max: 150 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: count,
      angle: { min: 0, max: 360 },
    };
  }

  static deathConfig(color: number): ParticlePresetConfig {
    return {
      texture: 'particle_soft',
      tint: [color, 0xFFFFFF],
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 600,
      speed: { min: 60, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 15,
      angle: { min: 0, max: 360 },
      gravityY: 50,
    };
  }

  static areaFillConfig(element: ElementType, heroColor?: number): ParticlePresetConfig {
    return {
      texture: 'particle_dot',
      tint: this.getColors(element, heroColor),
      blendMode: this.getBlend(element),
      lifespan: 600,
      speed: { min: 5, max: 30 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      quantity: 2,
      frequency: 100,
      gravityY: -20,
    };
  }

  static ambientConfig(theme: string): ParticlePresetConfig {
    switch (theme) {
      case 'lava_pit':
        return {
          texture: 'particle_soft',
          tint: [0xFF8C00, 0xFF4500],
          blendMode: Phaser.BlendModes.ADD,
          lifespan: 2000,
          speed: { min: 10, max: 30 },
          scale: { start: 0.3, end: 0 },
          alpha: { start: 0.4, end: 0 },
          quantity: 1,
          frequency: 400,
          gravityY: -15,
        };
      case 'frozen_tundra':
        return {
          texture: 'particle_circle',
          tint: [0xFFFFFF, 0xADD8E6],
          blendMode: Phaser.BlendModes.ADD,
          lifespan: 3000,
          speed: { min: 10, max: 25 },
          scale: { start: 0.2, end: 0.1 },
          alpha: { start: 0.3, end: 0 },
          quantity: 1,
          frequency: 500,
          gravityY: 10,
        };
      case 'dark_forest':
        return {
          texture: 'particle_soft',
          tint: [0x32CD32, 0xFFFF00],
          blendMode: Phaser.BlendModes.ADD,
          lifespan: 2500,
          speed: { min: 3, max: 12 },
          scale: { start: 0.4, end: 0.2 },
          alpha: { start: 0.3, end: 0.1 },
          quantity: 1,
          frequency: 300,
        };
      case 'desert_dunes':
        return {
          texture: 'particle_dot',
          tint: [0xDAA520, 0xCD853F],
          blendMode: Phaser.BlendModes.NORMAL,
          lifespan: 2000,
          speed: { min: 15, max: 40 },
          scale: { start: 0.3, end: 0 },
          alpha: { start: 0.2, end: 0 },
          quantity: 1,
          frequency: 400,
          angle: { min: -10, max: 10 },
        };
      default: // stone_ruins
        return {
          texture: 'particle_dot',
          tint: [0x888888, 0x666666],
          blendMode: Phaser.BlendModes.NORMAL,
          lifespan: 2500,
          speed: { min: 3, max: 10 },
          scale: { start: 0.2, end: 0 },
          alpha: { start: 0.15, end: 0 },
          quantity: 1,
          frequency: 500,
        };
    }
  }

  static buffBurstConfig(color: number): ParticlePresetConfig {
    return {
      texture: 'particle_soft',
      tint: [color, 0xFFFFFF],
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 500,
      speed: { min: 20, max: 60 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      quantity: 8,
      gravityY: -40,
    };
  }
}
