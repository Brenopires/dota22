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
      obstacles.push({ x: cx - 200, y: cy - 150, width: 60, height: 60 });
      obstacles.push({ x: cx + 200, y: cy + 150, width: 60, height: 60 });
      obstacles.push({ x: cx, y: cy, width: 40, height: 40 });
      break;

    case 'corridor':
      obstacles.push({ x: cx, y: 200, width: 600, height: 30 });
      obstacles.push({ x: cx, y: ARENA_HEIGHT - 200, width: 600, height: 30 });
      obstacles.push({ x: cx - 100, y: cy, width: 50, height: 50 });
      obstacles.push({ x: cx + 100, y: cy, width: 50, height: 50 });
      break;

    case 'pillars':
      for (let px = 300; px < ARENA_WIDTH - 200; px += 250) {
        for (let py = 250; py < ARENA_HEIGHT - 200; py += 250) {
          obstacles.push({ x: px, y: py, width: 40, height: 40 });
        }
      }
      break;

    case 'fortress':
      obstacles.push({ x: cx, y: cy - 120, width: 200, height: 25 });
      obstacles.push({ x: cx, y: cy + 120, width: 200, height: 25 });
      obstacles.push({ x: cx - 100, y: cy, width: 25, height: 240 });
      obstacles.push({ x: cx + 100, y: cy, width: 25, height: 240 });
      break;

    case 'maze_light':
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

    // Dot grid (replacing lines)
    const gridSize = 80;
    const gridGraphics = scene.add.graphics();
    gridGraphics.fillStyle(0xffffff, 0.06);
    for (let gx = gridSize; gx < ARENA_WIDTH; gx += gridSize) {
      for (let gy = gridSize; gy < ARENA_HEIGHT; gy += gridSize) {
        gridGraphics.fillCircle(gx, gy, 1.5);
      }
    }
    gridGraphics.setDepth(-9);

    // Arena borders
    const borderThickness = 20;
    const borderColor = config.wallColor;
    const themeColors = THEMES[config.theme] || THEMES.stone_ruins;

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

    // Inner glow on borders
    const innerGlow = scene.add.graphics();
    innerGlow.lineStyle(2, themeColors.border, 0.3);
    innerGlow.strokeRect(
      borderThickness + 1,
      borderThickness + 1,
      ARENA_WIDTH - (borderThickness + 1) * 2,
      ARENA_HEIGHT - (borderThickness + 1) * 2
    );
    innerGlow.setDepth(-8);

    // Obstacles with shadows and rounded corners
    for (const obs of config.obstacles) {
      const cornerRadius = 6;

      // Shadow (offset +3px)
      const shadowG = scene.add.graphics();
      shadowG.fillStyle(0x000000, 0.3);
      shadowG.fillRoundedRect(
        obs.x - obs.width / 2 + 3,
        obs.y - obs.height / 2 + 3,
        obs.width,
        obs.height,
        cornerRadius
      );
      shadowG.setDepth(-1);

      // Main body visual (rounded rect)
      const obsG = scene.add.graphics();
      obsG.fillStyle(config.wallColor, 1);
      obsG.fillRoundedRect(
        obs.x - obs.width / 2,
        obs.y - obs.height / 2,
        obs.width,
        obs.height,
        cornerRadius
      );
      // Highlight on top
      obsG.fillStyle(0xffffff, 0.08);
      obsG.fillRoundedRect(
        obs.x - obs.width / 2,
        obs.y - obs.height / 2,
        obs.width,
        obs.height / 2,
        { tl: cornerRadius, tr: cornerRadius, bl: 0, br: 0 }
      );
      // Border
      obsG.lineStyle(1, 0x444444, 0.5);
      obsG.strokeRoundedRect(
        obs.x - obs.width / 2,
        obs.y - obs.height / 2,
        obs.width,
        obs.height,
        cornerRadius
      );
      obsG.setDepth(0);

      // Invisible physics body (rectangle for collision)
      const rect = scene.add.rectangle(obs.x, obs.y, obs.width, obs.height);
      rect.setVisible(false);
      obstacleGroup.add(rect);
      scene.physics.add.existing(rect, true);
    }
  }
}
