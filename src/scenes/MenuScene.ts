import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, RANK_THRESHOLDS } from '../constants';
import { StorageManager } from '../utils/StorageManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const playerData = StorageManager.load();
    const rank = this.getRank(playerData.mmr);

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
      this.scene.start('BattleScene');
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
    const bg = this.add.rectangle(x, y, 220, 50, 0x333333)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x555555))
      .on('pointerout', () => bg.setFillStyle(0x333333))
      .on('pointerdown', callback);

    this.add.rectangle(x, y, 220, 50).setStrokeStyle(2, 0x888888);

    this.add.text(x, y, label, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private getRank(mmr: number): { name: string; minMMR: number; color: number } {
    let rank: { name: string; minMMR: number; color: number } = RANK_THRESHOLDS[0];
    for (const r of RANK_THRESHOLDS) {
      if (mmr >= r.minMMR) rank = r;
    }
    return rank;
  }
}
