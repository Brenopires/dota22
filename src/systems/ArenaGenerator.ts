import Phaser from 'phaser';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../constants';
import { ArenaConfig, ObstacleDef } from '../types';

interface ThemeColors {
  bg: number;
  wall: number;
  border: number;
}

const THEMES: Record<string, ThemeColors> = {
  stone_ruins: { bg: 0x2a2a2a, wall: 0x666666, border: 0x555555 },
  lava_pit: { bg: 0x1a0a0a, wall: 0x8B0000, border: 0xFF4500 },
  frozen_tundra: { bg: 0x1a2a3a, wall: 0x87CEEB, border: 0x4682B4 },
  dark_forest: { bg: 0x0a1a0a, wall: 0x2E8B57, border: 0x006400 },
  desert_dunes: { bg: 0x2a2010, wall: 0xDAA520, border: 0xCD853F },
};

function generateLayout(layout: string): ObstacleDef[] {
  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;
  const obstacles: ObstacleDef[] = [];

  switch (layout) {
    case 'open':
      // Just a few rocks
      obstacles.push({ x: cx - 200, y: cy - 150, width: 60, height: 60 });
      obstacles.push({ x: cx + 200, y: cy + 150, width: 60, height: 60 });
      obstacles.push({ x: cx, y: cy, width: 40, height: 40 });
      break;

    case 'corridor':
      // Top and bottom walls creating corridors
      obstacles.push({ x: cx, y: 200, width: 600, height: 30 });
      obstacles.push({ x: cx, y: ARENA_HEIGHT - 200, width: 600, height: 30 });
      obstacles.push({ x: cx - 100, y: cy, width: 50, height: 50 });
      obstacles.push({ x: cx + 100, y: cy, width: 50, height: 50 });
      break;

    case 'pillars':
      // Grid of pillars
      for (let px = 300; px < ARENA_WIDTH - 200; px += 250) {
        for (let py = 250; py < ARENA_HEIGHT - 200; py += 250) {
          obstacles.push({ x: px, y: py, width: 40, height: 40 });
        }
      }
      break;

    case 'fortress':
      // Center fortress walls
      obstacles.push({ x: cx, y: cy - 120, width: 200, height: 25 });
      obstacles.push({ x: cx, y: cy + 120, width: 200, height: 25 });
      obstacles.push({ x: cx - 100, y: cy, width: 25, height: 240 });
      obstacles.push({ x: cx + 100, y: cy, width: 25, height: 240 });
      // Gaps in walls
      break;

    case 'maze_light':
      // Light maze pattern
      obstacles.push({ x: 400, y: 300, width: 200, height: 25 });
      obstacles.push({ x: 400, y: 600, width: 25, height: 200 });
      obstacles.push({ x: ARENA_WIDTH - 400, y: ARENA_HEIGHT - 300, width: 200, height: 25 });
      obstacles.push({ x: ARENA_WIDTH - 400, y: ARENA_HEIGHT - 600, width: 25, height: 200 });
      obstacles.push({ x: cx, y: cy - 100, width: 150, height: 25 });
      obstacles.push({ x: cx, y: cy + 100, width: 150, height: 25 });
      break;
  }

  return obstacles;
}

export class ArenaGenerator {
  static generate(theme: string, layout: string): ArenaConfig {
    const themeColors = THEMES[theme] || THEMES.stone_ruins;
    const obstacles = generateLayout(layout);

    // Spawn points
    const spawnA = [
      { x: 120, y: ARENA_HEIGHT / 2 - 100 },
      { x: 120, y: ARENA_HEIGHT / 2 + 100 },
      { x: 180, y: ARENA_HEIGHT / 2 - 50 },
      { x: 180, y: ARENA_HEIGHT / 2 + 50 },
    ];

    const spawnB = [
      { x: ARENA_WIDTH - 120, y: ARENA_HEIGHT / 2 - 100 },
      { x: ARENA_WIDTH - 120, y: ARENA_HEIGHT / 2 + 100 },
      { x: ARENA_WIDTH - 180, y: ARENA_HEIGHT / 2 - 50 },
      { x: ARENA_WIDTH - 180, y: ARENA_HEIGHT / 2 + 50 },
    ];

    return {
      theme,
      layout,
      backgroundColor: themeColors.bg,
      wallColor: themeColors.wall,
      obstacles,
      spawnA,
      spawnB,
    };
  }

  static render(
    scene: Phaser.Scene,
    config: ArenaConfig,
    obstacleGroup: Phaser.Physics.Arcade.StaticGroup
  ): void {
    // Background
    const bg = scene.add.rectangle(
      ARENA_WIDTH / 2, ARENA_HEIGHT / 2,
      ARENA_WIDTH, ARENA_HEIGHT,
      config.backgroundColor
    );
    bg.setDepth(-10);

    // Arena border
    const borderThickness = 20;
    const borderColor = config.wallColor;

    // Top
    const top = scene.add.rectangle(ARENA_WIDTH / 2, borderThickness / 2, ARENA_WIDTH, borderThickness, borderColor);
    obstacleGroup.add(top);
    scene.physics.add.existing(top, true);

    // Bottom
    const bottom = scene.add.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT - borderThickness / 2, ARENA_WIDTH, borderThickness, borderColor);
    obstacleGroup.add(bottom);
    scene.physics.add.existing(bottom, true);

    // Left
    const left = scene.add.rectangle(borderThickness / 2, ARENA_HEIGHT / 2, borderThickness, ARENA_HEIGHT, borderColor);
    obstacleGroup.add(left);
    scene.physics.add.existing(left, true);

    // Right
    const right = scene.add.rectangle(ARENA_WIDTH - borderThickness / 2, ARENA_HEIGHT / 2, borderThickness, ARENA_HEIGHT, borderColor);
    obstacleGroup.add(right);
    scene.physics.add.existing(right, true);

    // Obstacles
    for (const obs of config.obstacles) {
      const rect = scene.add.rectangle(obs.x, obs.y, obs.width, obs.height, config.wallColor);
      rect.setStrokeStyle(1, 0x444444);
      obstacleGroup.add(rect);
      scene.physics.add.existing(rect, true);
    }

    // Grid lines (subtle)
    const gridSize = 100;
    for (let gx = gridSize; gx < ARENA_WIDTH; gx += gridSize) {
      const line = scene.add.line(0, 0, gx, 0, gx, ARENA_HEIGHT, 0xffffff, 0.03);
      line.setOrigin(0, 0);
      line.setDepth(-9);
    }
    for (let gy = gridSize; gy < ARENA_HEIGHT; gy += gridSize) {
      const line = scene.add.line(0, 0, 0, gy, ARENA_WIDTH, gy, 0xffffff, 0.03);
      line.setOrigin(0, 0);
      line.setDepth(-9);
    }
  }
}
