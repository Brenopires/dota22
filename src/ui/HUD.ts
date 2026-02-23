import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { IBattleScene } from '../types';
import { AbilityBar } from './AbilityBar';

interface KillFeedEntry {
  text: Phaser.GameObjects.Text;
  timer: Phaser.Time.TimerEvent;
}

export class HUD {
  private scene: IBattleScene & Phaser.Scene;
  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private manaText: Phaser.GameObjects.Text;
  private heroNameText: Phaser.GameObjects.Text;
  private abilityBar: AbilityBar;
  private matchOverText: Phaser.GameObjects.Text | null = null;
  private hpGraphics: Phaser.GameObjects.Graphics;
  private killFeedEntries: KillFeedEntry[] = [];

  constructor(scene: IBattleScene & Phaser.Scene) {
    this.scene = scene;

    // Timer background circle
    const timerBg = scene.add.graphics();
    timerBg.fillStyle(0x000000, 0.5);
    timerBg.fillCircle(GAME_WIDTH / 2, 28, 25);
    timerBg.lineStyle(1, 0x555555, 0.4);
    timerBg.strokeCircle(GAME_WIDTH / 2, 28, 25);
    timerBg.setScrollFactor(0).setDepth(199);

    // Timer (top center)
    this.timerText = scene.add.text(GAME_WIDTH / 2, 20, '60', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Kill score (top)
    this.killsText = scene.add.text(GAME_WIDTH / 2, 56, '0 - 0', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Hero name (bottom left)
    const heroName = scene.player.stats.name;
    this.heroNameText = scene.add.text(20, GAME_HEIGHT - 95, heroName, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(200);

    // Panel background behind HP/mana bars
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.4);
    panelBg.fillRoundedRect(10, GAME_HEIGHT - 100, 200, 62, 8);
    panelBg.setScrollFactor(0).setDepth(199);

    // HP/Mana graphics (drawn each frame)
    this.hpGraphics = scene.add.graphics();
    this.hpGraphics.setScrollFactor(0).setDepth(201);

    // HP text
    const barWidth = 180;
    const barY = GAME_HEIGHT - 72;
    this.hpText = scene.add.text(20 + barWidth / 2, barY, '', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Mana text
    const manaY = barY + 18;
    this.manaText = scene.add.text(20 + barWidth / 2, manaY, '', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Ability bar
    this.abilityBar = new AbilityBar(scene, scene.player);
  }

  update(): void {
    const scene = this.scene;

    // Timer
    const timer = Math.max(0, scene.matchStateMachine?.getTimeRemaining() ?? 0);
    this.timerText.setText(this.formatTime(timer));
    if (timer <= 10) {
      this.timerText.setColor('#ff4444');
    }

    // Kills
    this.killsText.setText(`${scene.teamAKills} - ${scene.teamBKills}`);

    // Player HP/Mana
    if (scene.player && scene.player.isAlive) {
      const player = scene.player;
      const hpRatio = player.currentHP / player.stats.maxHP;
      const manaRatio = player.currentMana / player.stats.maxMana;
      const barWidth = 180;
      const barY = GAME_HEIGHT - 72;
      const manaY = barY + 18;

      const g = this.hpGraphics;
      g.clear();

      // HP bar background
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(20, barY - 7, barWidth, 14, 3);

      // HP fill
      const hpWidth = Math.max(0, barWidth * hpRatio);
      let hpColor = 0x00ff00;
      if (hpRatio <= 0.3) hpColor = 0xff0000;
      else if (hpRatio <= 0.6) hpColor = 0xffff00;

      if (hpWidth > 0) {
        g.fillStyle(hpColor, 1);
        g.fillRoundedRect(20, barY - 7, hpWidth, 14, 3);
        // Highlight
        g.fillStyle(0xffffff, 0.15);
        g.fillRoundedRect(20, barY - 7, hpWidth, 7, { tl: 3, tr: 3, bl: 0, br: 0 });
      }

      // HP border
      g.lineStyle(1, 0x555555, 0.5);
      g.strokeRoundedRect(20, barY - 7, barWidth, 14, 3);

      this.hpText.setText(`${Math.ceil(player.currentHP)} / ${player.stats.maxHP}`);

      // Mana bar background
      g.fillStyle(0x222244, 1);
      g.fillRoundedRect(20, manaY - 5, barWidth, 10, 2);

      // Mana fill
      const manaWidth = Math.max(0, barWidth * manaRatio);
      if (manaWidth > 0) {
        g.fillStyle(0x4444ff, 1);
        g.fillRoundedRect(20, manaY - 5, manaWidth, 10, 2);
      }

      this.manaText.setText(`${Math.ceil(player.currentMana)} / ${player.stats.maxMana}`);
    }

    // Ability bar
    this.abilityBar.update();

    // Match over overlay
    const isEnded = scene.matchStateMachine?.getPhase() === 'ended';
    if (isEnded && !this.matchOverText) {
      this.matchOverText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'MATCH OVER', {
        fontSize: '40px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  showKill(killerName: string, victimName: string): void {
    const yBase = 20;
    const entryY = yBase + this.killFeedEntries.length * 20;

    // Max 4 entries
    if (this.killFeedEntries.length >= 4) {
      const oldest = this.killFeedEntries.shift()!;
      oldest.timer.destroy();
      oldest.text.destroy();
      // Shift remaining up
      for (let i = 0; i < this.killFeedEntries.length; i++) {
        this.killFeedEntries[i].text.setY(yBase + i * 20);
      }
    }

    const text = this.scene.add.text(
      GAME_WIDTH - 20,
      yBase + this.killFeedEntries.length * 20,
      `${killerName} > ${victimName}`,
      {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'monospace',
      }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

    const timer = this.scene.time.delayedCall(4000, () => {
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          text.destroy();
          const idx = this.killFeedEntries.findIndex(e => e.text === text);
          if (idx !== -1) this.killFeedEntries.splice(idx, 1);
          // Re-position remaining
          for (let i = 0; i < this.killFeedEntries.length; i++) {
            this.killFeedEntries[i].text.setY(yBase + i * 20);
          }
        },
      });
    });

    this.killFeedEntries.push({ text, timer });
  }
}
