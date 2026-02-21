import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { TextureGenerator } from '../systems/TextureGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Generate procedural textures for particles
    TextureGenerator.generate(this);

    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    text.setOrigin(0.5);

    this.cameras.main.fadeIn(400);

    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.scene.start('MenuScene');
        }
      });
    });
  }
}
