import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Hero } from '../entities/Hero';

interface AbilitySlot {
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  cdText: Phaser.GameObjects.Text;
  keyLabel: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

export class AbilityBar {
  private scene: Phaser.Scene;
  private slots: AbilitySlot[] = [];
  private player: Hero;
  private slotSize = 50;

  constructor(scene: Phaser.Scene, player: Hero) {
    this.scene = scene;
    this.player = player;

    const gap = 8;
    const rGap = 16; // extra gap before R slot to signal it is special
    const totalWidth = 4 * this.slotSize + 3 * gap + rGap; // 3 normal gaps + 1 wider R gap
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + this.slotSize / 2;
    const y = GAME_HEIGHT - 55;

    // Panel background behind ability bar
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.4);
    panelBg.fillRoundedRect(
      GAME_WIDTH / 2 - totalWidth / 2 - 8,
      y - this.slotSize / 2 - 6,
      totalWidth + 16,
      this.slotSize + 28,
      8
    );
    panelBg.setScrollFactor(0).setDepth(199);

    const keys = ['I', 'O', 'P', 'R'];

    for (let i = 0; i < 4; i++) {
      let x: number;
      if (i < 3) {
        x = startX + i * (this.slotSize + gap);
      } else {
        // R slot: add extra rGap before it
        x = startX + 3 * (this.slotSize + gap) + rGap;
      }

      const graphics = scene.add.graphics();
      graphics.setScrollFactor(0).setDepth(200);

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

      const keyLabel = scene.add.text(x, y + this.slotSize / 2 + 10, keys[i], {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

      this.slots.push({ graphics, label, cdText, keyLabel, x, y });
    }
  }

  update(): void {
    const s = this.slotSize;
    const r = 6;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (i >= this.player.stats.abilities.length) continue;

      const ability = this.player.stats.abilities[i];
      const cd = this.player.abilityCooldowns[i];
      const hasMana = this.player.currentMana >= ability.manaCost;

      const g = slot.graphics;
      g.clear();

      const left = slot.x - s / 2;
      const top = slot.y - s / 2;

      // Slot background
      g.fillStyle(0x222222, 1);
      g.fillRoundedRect(left, top, s, s, r);

      // Determine colors: gold for ultimate slot, green for regular
      const isUltimate = ability.isUltimate === true;
      const readyBorderColor = isUltimate ? 0xFFD700 : 0x00ff00;
      const readyGlowColor = isUltimate ? 0xFFD700 : 0x00ff00;

      if (cd > 0) {
        // Cooldown overlay
        const ratio = cd / ability.cooldown;
        const cdHeight = s * ratio;
        g.fillStyle(0x000000, 0.7);
        g.fillRoundedRect(left, top, s, cdHeight, { tl: r, tr: r, bl: 0, br: 0 });

        // Border: gray on cooldown
        g.lineStyle(2, 0x444444, 1);
        g.strokeRoundedRect(left, top, s, s, r);

        slot.cdText.setText(`${Math.ceil(cd)}`);
      } else if (!hasMana) {
        // No mana overlay
        g.fillStyle(0x000000, 0.5);
        g.fillRoundedRect(left, top, s, s, r);

        g.lineStyle(2, 0x0000aa, 1);
        g.strokeRoundedRect(left, top, s, s, r);

        slot.cdText.setText('');
      } else {
        // Ready! — gold for ultimate, green for regular
        g.lineStyle(2, readyBorderColor, 1);
        g.strokeRoundedRect(left, top, s, s, r);

        // Subtle glow
        g.fillStyle(readyGlowColor, 0.08);
        g.fillRoundedRect(left, top, s, s, r);

        slot.cdText.setText('');
      }
    }
  }
}
