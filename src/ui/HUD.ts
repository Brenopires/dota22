import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { AbilityBar } from './AbilityBar';

export class HUD {
  private scene: any; // BattleScene
  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private manaText: Phaser.GameObjects.Text;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBarFill: Phaser.GameObjects.Rectangle;
  private manaBarBg: Phaser.GameObjects.Rectangle;
  private manaBarFill: Phaser.GameObjects.Rectangle;
  private heroNameText: Phaser.GameObjects.Text;
  private abilityBar: AbilityBar;
  private matchOverText: Phaser.GameObjects.Text | null = null;

  constructor(scene: any) {
    this.scene = scene;

    // Timer (top center)
    this.timerText = scene.add.text(GAME_WIDTH / 2, 20, '60', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Kill score (top)
    this.killsText = scene.add.text(GAME_WIDTH / 2, 50, '0 - 0', {
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

    // HP bar (bottom left)
    const barWidth = 180;
    const barY = GAME_HEIGHT - 72;
    this.hpBarBg = scene.add.rectangle(20, barY, barWidth, 14, 0x333333)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(200);
    this.hpBarFill = scene.add.rectangle(20, barY, barWidth, 14, 0x00ff00)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);
    this.hpText = scene.add.text(20 + barWidth / 2, barY, '', {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Mana bar (bottom left)
    const manaY = barY + 18;
    this.manaBarBg = scene.add.rectangle(20, manaY, barWidth, 10, 0x222244)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(200);
    this.manaBarFill = scene.add.rectangle(20, manaY, barWidth, 10, 0x4444ff)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);
    this.manaText = scene.add.text(20 + barWidth / 2, manaY, '', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Ability bar
    this.abilityBar = new AbilityBar(scene, scene.player);
  }

  update(): void {
    const scene = this.scene;

    // Timer
    const timer = Math.max(0, scene.matchTimer);
    this.timerText.setText(`${timer}`);
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

      this.hpBarFill.setSize(barWidth * hpRatio, 14);

      if (hpRatio > 0.6) this.hpBarFill.setFillStyle(0x00ff00);
      else if (hpRatio > 0.3) this.hpBarFill.setFillStyle(0xffff00);
      else this.hpBarFill.setFillStyle(0xff0000);

      this.hpText.setText(`${Math.ceil(player.currentHP)} / ${player.stats.maxHP}`);

      this.manaBarFill.setSize(barWidth * manaRatio, 10);
      this.manaText.setText(`${Math.ceil(player.currentMana)} / ${player.stats.maxMana}`);
    }

    // Ability bar
    this.abilityBar.update();

    // Match over overlay
    if (scene.matchOver && !this.matchOverText) {
      this.matchOverText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'MATCH OVER', {
        fontSize: '40px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    }
  }
}
