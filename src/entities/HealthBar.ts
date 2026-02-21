import Phaser from 'phaser';
import { HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, MANABAR_HEIGHT, HEALTHBAR_OFFSET_Y } from '../constants';

export class HealthBar {
  private graphics: Phaser.GameObjects.Graphics;
  private lastHpRatio = -1;
  private lastManaRatio = -1;
  private lastShieldRatio = -1;
  private cornerRadius = 3;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  update(hpRatio: number, manaRatio: number, shieldRatio: number = 0): void {
    // Dirty flag — only redraw when values change
    const hr = Math.round(hpRatio * 100);
    const mr = Math.round(manaRatio * 100);
    const sr = Math.round(shieldRatio * 100);
    if (hr === this.lastHpRatio && mr === this.lastManaRatio && sr === this.lastShieldRatio) return;
    this.lastHpRatio = hr;
    this.lastManaRatio = mr;
    this.lastShieldRatio = sr;

    const g = this.graphics;
    g.clear();

    const x = -HEALTHBAR_WIDTH / 2;
    const y = HEALTHBAR_OFFSET_Y - HEALTHBAR_HEIGHT / 2;
    const r = this.cornerRadius;

    // HP background
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(x, y, HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, r);

    // HP fill
    const hpWidth = Math.max(0, HEALTHBAR_WIDTH * hpRatio);
    let hpColor = 0x00ff00;
    if (hpRatio <= 0.3) hpColor = 0xff0000;
    else if (hpRatio <= 0.6) hpColor = 0xffff00;

    if (hpWidth > 0) {
      g.fillStyle(hpColor, 1);
      g.fillRoundedRect(x, y, hpWidth, HEALTHBAR_HEIGHT, r);

      // Highlight gradient on top
      g.fillStyle(0xffffff, 0.15);
      g.fillRoundedRect(x, y, hpWidth, HEALTHBAR_HEIGHT / 2, { tl: r, tr: r, bl: 0, br: 0 });
    }

    // Shield overlay
    const shieldWidth = Math.max(0, HEALTHBAR_WIDTH * Math.min(1, shieldRatio));
    if (shieldWidth > 0) {
      g.fillStyle(0xffffff, 0.4);
      g.fillRoundedRect(x, y, shieldWidth, HEALTHBAR_HEIGHT, r);
    }

    // Border
    g.lineStyle(1, 0x555555, 0.5);
    g.strokeRoundedRect(x, y, HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, r);

    // Mana bar
    const manaY = y + HEALTHBAR_HEIGHT + 2;
    g.fillStyle(0x222244, 1);
    g.fillRoundedRect(x, manaY, HEALTHBAR_WIDTH, MANABAR_HEIGHT, 2);

    const manaWidth = Math.max(0, HEALTHBAR_WIDTH * manaRatio);
    if (manaWidth > 0) {
      g.fillStyle(0x4444ff, 1);
      g.fillRoundedRect(x, manaY, manaWidth, MANABAR_HEIGHT, 2);
    }
  }

  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.graphics];
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
