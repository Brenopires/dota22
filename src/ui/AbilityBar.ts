import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Hero } from '../entities/Hero';

interface AbilitySlot {
  bg: Phaser.GameObjects.Rectangle;
  cooldownOverlay: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  cdText: Phaser.GameObjects.Text;
  keyLabel: Phaser.GameObjects.Text;
}

export class AbilityBar {
  private scene: Phaser.Scene;
  private slots: AbilitySlot[] = [];
  private player: Hero;

  constructor(scene: Phaser.Scene, player: Hero) {
    this.scene = scene;
    this.player = player;

    const slotSize = 50;
    const gap = 8;
    const totalWidth = 3 * slotSize + 2 * gap;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + slotSize / 2;
    const y = GAME_HEIGHT - 55;

    const keys = ['I', 'O', 'P'];

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotSize + gap);

      const bg = scene.add.rectangle(x, y, slotSize, slotSize, 0x222222)
        .setScrollFactor(0)
        .setDepth(200)
        .setStrokeStyle(2, 0x666666);

      const cooldownOverlay = scene.add.rectangle(x, y, slotSize, slotSize, 0x000000, 0.7)
        .setScrollFactor(0)
        .setDepth(201);

      const abilityName = i < player.stats.abilities.length
        ? player.stats.abilities[i].name.substring(0, 6)
        : '';

      const label = scene.add.text(x, y - 5, abilityName, {
        fontSize: '9px',
        color: '#cccccc',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

      const cdText = scene.add.text(x, y + 8, '', {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

      const keyLabel = scene.add.text(x, y + slotSize / 2 + 10, keys[i], {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

      this.slots.push({ bg, cooldownOverlay, label, cdText, keyLabel });
    }
  }

  update(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (i >= this.player.stats.abilities.length) continue;

      const ability = this.player.stats.abilities[i];
      const cd = this.player.abilityCooldowns[i];
      const hasMana = this.player.currentMana >= ability.manaCost;

      if (cd > 0) {
        const ratio = cd / ability.cooldown;
        slot.cooldownOverlay.setSize(50, 50 * ratio);
        slot.cooldownOverlay.setY(slot.bg.y - 25 + (50 * ratio) / 2);
        slot.cooldownOverlay.setVisible(true);
        slot.cdText.setText(`${Math.ceil(cd)}`);
        slot.bg.setStrokeStyle(2, 0x444444);
      } else if (!hasMana) {
        slot.cooldownOverlay.setSize(50, 50);
        slot.cooldownOverlay.setY(slot.bg.y);
        slot.cooldownOverlay.setVisible(true);
        slot.cooldownOverlay.setAlpha(0.5);
        slot.cdText.setText('');
        slot.bg.setStrokeStyle(2, 0x0000aa);
      } else {
        slot.cooldownOverlay.setVisible(false);
        slot.cdText.setText('');
        slot.bg.setStrokeStyle(2, 0x00ff00);
      }
    }
  }
}
