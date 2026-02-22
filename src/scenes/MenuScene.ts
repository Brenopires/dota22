import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, RANK_THRESHOLDS, COLORS } from '../constants';
import { StorageManager } from '../utils/StorageManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const playerData = StorageManager.load();
    const rank = this.getRank(playerData.mmr);

    this.cameras.main.fadeIn(400);

    // Floating background particles
    if (this.textures.exists('particle_soft')) {
      const heroColors = Object.values(COLORS);
      this.add.particles(0, 0, 'particle_soft', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 0, max: GAME_HEIGHT },
        lifespan: 4000,
        speed: { min: 5, max: 20 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.2, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 200,
        quantity: 1,
        tint: { onEmit: () => heroColors[Math.floor(Math.random() * heroColors.length)] },
      }).setDepth(-1);
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 100, 'DOTA22', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 155, 'MINI BATTLE ARENA', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // MMR Display
    const rankColor = Phaser.Display.Color.IntegerToColor(rank.color).rgba;
    this.add.text(GAME_WIDTH / 2, 230, `${rank.name}`, {
      fontSize: '28px',
      color: rankColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 265, `MMR: ${playerData.mmr}`, {
      fontSize: '18px',
      color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Stats
    this.add.text(GAME_WIDTH / 2, 310, `W: ${playerData.wins}  L: ${playerData.losses}  D: ${playerData.draws}`, {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Play Button
    this.createButton(GAME_WIDTH / 2, 420, 'PLAY', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.scene.start('DraftScene');
        }
      });
    });

    // Controls hint
    this.add.text(GAME_WIDTH / 2, 580, 'WASD - Move  |  I/O/P (or 1/2/3) - Abilities  |  Mouse - Aim', {
      fontSize: '14px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 610, 'Auto-attack when enemies in range', {
      fontSize: '12px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const w = 220, h = 50, r = 8;

    const btnGraphics = this.add.graphics();
    btnGraphics.fillStyle(0x333333, 1);
    btnGraphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    btnGraphics.lineStyle(2, 0x888888, 1);
    btnGraphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    // Glow (hidden by default)
    const glowGraphics = this.add.graphics();
    glowGraphics.fillStyle(0x888888, 0.15);
    glowGraphics.fillRoundedRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, r + 2);
    glowGraphics.setAlpha(0);

    const hitArea = this.add.rectangle(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    const btnText = this.add.text(x, y, label, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Container for scaling
    const targets = [btnGraphics, btnText, glowGraphics, hitArea];

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: targets,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Sine.easeOut',
      });
      glowGraphics.setAlpha(1);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: targets,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Sine.easeOut',
      });
      glowGraphics.setAlpha(0);
    });

    hitArea.on('pointerdown', callback);
  }

  private getRank(mmr: number): { name: string; minMMR: number; color: number } {
    let rank: { name: string; minMMR: number; color: number } = RANK_THRESHOLDS[0];
    for (const r of RANK_THRESHOLDS) {
      if (mmr >= r.minMMR) rank = r;
    }
    return rank;
  }
}
