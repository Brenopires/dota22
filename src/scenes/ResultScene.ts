import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, RANK_THRESHOLDS } from '../constants';
import { MatchResult } from '../types';
import { StorageManager } from '../utils/StorageManager';
import { heroDataMap } from '../heroes/heroData';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: { result: MatchResult }): void {
    const { result } = data;
    const playerData = StorageManager.load();

    // Result title
    let title: string;
    let titleColor: string;
    if (result.draw) {
      title = 'DRAW';
      titleColor = '#ffff00';
    } else if (result.won) {
      title = 'VICTORY';
      titleColor = '#00ff00';
    } else {
      title = 'DEFEAT';
      titleColor = '#ff0000';
    }

    this.add.text(GAME_WIDTH / 2, 80, title, {
      fontSize: '56px',
      color: titleColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Match info
    const heroName = heroDataMap[result.playerHero]?.name || result.playerHero;
    const y0 = 170;
    const lineH = 28;

    this.add.text(GAME_WIDTH / 2, y0, `Hero: ${heroName}`, {
      fontSize: '18px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, y0 + lineH, `Team Size: ${result.teamSize}v${result.teamSize}`, {
      fontSize: '16px', color: '#999999', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, y0 + lineH * 2, `Arena: ${result.arenaTheme} / ${result.arenaLayout}`, {
      fontSize: '16px', color: '#999999', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Stats
    this.add.text(GAME_WIDTH / 2, y0 + lineH * 4, `Kills: ${result.playerKills}  Deaths: ${result.playerDeaths}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, y0 + lineH * 5, `Team Kills: ${result.teamKills}  Enemy Kills: ${result.enemyKills}`, {
      fontSize: '16px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // MMR change animation
    const oldMMR = playerData.mmr - result.mmrChange;
    const mmrChangeStr = result.mmrChange >= 0 ? `+${result.mmrChange}` : `${result.mmrChange}`;
    const mmrColor = result.mmrChange >= 0 ? '#00ff00' : '#ff0000';

    const mmrText = this.add.text(GAME_WIDTH / 2, y0 + lineH * 7.5, `MMR: ${oldMMR}`, {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const changeText = this.add.text(GAME_WIDTH / 2 + 100, y0 + lineH * 7.5, mmrChangeStr, {
      fontSize: '24px', color: mmrColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Animate MMR
    this.tweens.add({
      targets: changeText,
      alpha: 1,
      y: changeText.y - 10,
      delay: 500,
      duration: 600,
      ease: 'Power2',
    });

    this.time.delayedCall(1200, () => {
      mmrText.setText(`MMR: ${playerData.mmr}`);
    });

    // Rank
    const rank = this.getRank(playerData.mmr);
    const rankColor = Phaser.Display.Color.IntegerToColor(rank.color).rgba;
    this.add.text(GAME_WIDTH / 2, y0 + lineH * 9.5, `Rank: ${rank.name}`, {
      fontSize: '20px', color: rankColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Buttons
    this.createButton(GAME_WIDTH / 2 - 130, 580, 'PLAY AGAIN', () => {
      this.scene.start('BattleScene');
    });

    this.createButton(GAME_WIDTH / 2 + 130, 580, 'MAIN MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const bg = this.add.rectangle(x, y, 200, 45, 0x333333)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x555555))
      .on('pointerout', () => bg.setFillStyle(0x333333))
      .on('pointerdown', callback);

    this.add.rectangle(x, y, 200, 45).setStrokeStyle(2, 0x888888);

    this.add.text(x, y, label, {
      fontSize: '18px',
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
