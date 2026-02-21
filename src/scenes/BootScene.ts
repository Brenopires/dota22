import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    text.setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
