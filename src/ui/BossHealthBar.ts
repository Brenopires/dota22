import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { BossPhase } from '../types';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 16;
const BAR_Y = 80;

/**
 * BossHealthBar -- screen-space health bar fixed at the top of the viewport,
 * centered horizontally below the timer.
 *
 * Shows boss name, current/max HP text, HP fill colored by boss phase,
 * and phase threshold markers at 60% (ENRAGED) and 25% (DYING).
 */
export class BossHealthBar {
  private graphics: Phaser.GameObjects.Graphics;
  private thresholdGraphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const barX = (GAME_WIDTH - BAR_WIDTH) / 2;

    // Main graphics for HP fill (redrawn each frame)
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0).setDepth(200);

    // Phase threshold markers (static, drawn once)
    this.thresholdGraphics = scene.add.graphics();
    this.thresholdGraphics.setScrollFactor(0).setDepth(201);

    // Yellow line at 60% (ENRAGED threshold)
    const enragedX = barX + BAR_WIDTH * 0.6;
    this.thresholdGraphics.lineStyle(2, 0xffff00, 0.6);
    this.thresholdGraphics.lineBetween(enragedX, BAR_Y - 2, enragedX, BAR_Y + BAR_HEIGHT + 2);

    // Red line at 25% (DYING threshold)
    const dyingX = barX + BAR_WIDTH * 0.25;
    this.thresholdGraphics.lineStyle(2, 0xff0000, 0.6);
    this.thresholdGraphics.lineBetween(dyingX, BAR_Y - 2, dyingX, BAR_Y + BAR_HEIGHT + 2);

    // Boss name text centered above bar
    this.nameText = scene.add.text(GAME_WIDTH / 2, BAR_Y - 14, 'ANCIENT GUARDIAN', {
      fontSize: '12px',
      color: '#ff6666',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    // HP text centered on bar
    this.hpText = scene.add.text(GAME_WIDTH / 2, BAR_Y + BAR_HEIGHT / 2, '', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
  }

  /**
   * Update the boss health bar with current HP, max HP, and phase.
   * Redraws the bar fill with phase-appropriate color.
   */
  update(currentHP: number, maxHP: number, phase: BossPhase): void {
    const g = this.graphics;
    g.clear();

    const barX = (GAME_WIDTH - BAR_WIDTH) / 2;
    const hpRatio = Math.max(0, currentHP / maxHP);

    // Background
    g.fillStyle(0x333333, 0.8);
    g.fillRoundedRect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 4);

    // HP fill -- color based on phase
    let phaseColor: number;
    switch (phase) {
      case BossPhase.ENRAGED:
        phaseColor = 0xff8800; // orange
        break;
      case BossPhase.DYING:
        phaseColor = 0xff0000; // bright red
        break;
      default:
        phaseColor = 0xff4444; // red
        break;
    }

    const hpWidth = BAR_WIDTH * hpRatio;
    if (hpWidth > 0) {
      g.fillStyle(phaseColor, 1);
      g.fillRoundedRect(barX, BAR_Y, hpWidth, BAR_HEIGHT, 4);

      // Highlight on top half
      g.fillStyle(0xffffff, 0.1);
      g.fillRoundedRect(barX, BAR_Y, hpWidth, BAR_HEIGHT / 2, { tl: 4, tr: 4, bl: 0, br: 0 });
    }

    // Border
    g.lineStyle(2, 0x888888, 0.6);
    g.strokeRoundedRect(barX, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 4);

    // HP text
    this.hpText.setText(`${Math.ceil(currentHP)} / ${maxHP}`);
  }

  /**
   * Toggle visibility of all boss health bar elements.
   * Used to hide when boss is dead.
   */
  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible);
    this.thresholdGraphics.setVisible(visible);
    this.nameText.setVisible(visible);
    this.hpText.setVisible(visible);
  }

  /**
   * Destroy all Phaser objects owned by this component.
   */
  destroy(): void {
    this.graphics.destroy();
    this.thresholdGraphics.destroy();
    this.nameText.destroy();
    this.hpText.destroy();
  }
}
