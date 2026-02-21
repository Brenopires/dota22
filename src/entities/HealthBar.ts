import Phaser from 'phaser';
import { HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, MANABAR_HEIGHT, HEALTHBAR_OFFSET_Y } from '../constants';

export class HealthBar {
  private bgBar: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private manaBar: Phaser.GameObjects.Rectangle;
  private manaBg: Phaser.GameObjects.Rectangle;
  private shieldBar: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    // HP background
    this.bgBar = scene.add.rectangle(-HEALTHBAR_WIDTH / 2, HEALTHBAR_OFFSET_Y, HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, 0x333333);
    this.bgBar.setOrigin(0, 0.5);

    // HP fill
    this.hpBar = scene.add.rectangle(-HEALTHBAR_WIDTH / 2, HEALTHBAR_OFFSET_Y, HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, 0x00ff00);
    this.hpBar.setOrigin(0, 0.5);

    // Shield overlay
    this.shieldBar = scene.add.rectangle(-HEALTHBAR_WIDTH / 2, HEALTHBAR_OFFSET_Y, 0, HEALTHBAR_HEIGHT, 0xffffff);
    this.shieldBar.setOrigin(0, 0.5);
    this.shieldBar.setAlpha(0.5);

    // Mana background
    this.manaBg = scene.add.rectangle(-HEALTHBAR_WIDTH / 2, HEALTHBAR_OFFSET_Y + HEALTHBAR_HEIGHT + 2, HEALTHBAR_WIDTH, MANABAR_HEIGHT, 0x222244);
    this.manaBg.setOrigin(0, 0.5);

    // Mana fill
    this.manaBar = scene.add.rectangle(-HEALTHBAR_WIDTH / 2, HEALTHBAR_OFFSET_Y + HEALTHBAR_HEIGHT + 2, HEALTHBAR_WIDTH, MANABAR_HEIGHT, 0x4444ff);
    this.manaBar.setOrigin(0, 0.5);
  }

  update(hpRatio: number, manaRatio: number, shieldRatio: number = 0): void {
    // HP bar
    const hpWidth = Math.max(0, HEALTHBAR_WIDTH * hpRatio);
    this.hpBar.setSize(hpWidth, HEALTHBAR_HEIGHT);

    // HP color
    if (hpRatio > 0.6) {
      this.hpBar.setFillStyle(0x00ff00);
    } else if (hpRatio > 0.3) {
      this.hpBar.setFillStyle(0xffff00);
    } else {
      this.hpBar.setFillStyle(0xff0000);
    }

    // Shield bar
    const shieldWidth = Math.max(0, HEALTHBAR_WIDTH * Math.min(1, shieldRatio));
    this.shieldBar.setSize(shieldWidth, HEALTHBAR_HEIGHT);

    // Mana bar
    const manaWidth = Math.max(0, HEALTHBAR_WIDTH * manaRatio);
    this.manaBar.setSize(manaWidth, MANABAR_HEIGHT);
  }

  getGameObjects(): Phaser.GameObjects.Rectangle[] {
    return [this.bgBar, this.hpBar, this.shieldBar, this.manaBg, this.manaBar];
  }

  destroy(): void {
    this.bgBar.destroy();
    this.hpBar.destroy();
    this.shieldBar.destroy();
    this.manaBg.destroy();
    this.manaBar.destroy();
  }
}
