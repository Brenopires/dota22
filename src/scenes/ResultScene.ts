import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';
import { MatchResult } from '../types';
import { StorageManager } from '../utils/StorageManager';
import { heroDataMap } from '../heroes/heroData';
import { getRank } from '../utils/RankUtils';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: { result: MatchResult }): void {
    const { result } = data;
    const playerData = StorageManager.load();

    this.cameras.main.fadeIn(400);

    // Floating background particles
    if (this.textures.exists('particle_soft')) {
      const heroColors = Object.values(COLORS);
      this.add.particles(0, 0, 'particle_soft', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 0, max: GAME_HEIGHT },
        lifespan: 4000,
        speed: { min: 5, max: 20 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.2, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 200,
        quantity: 1,
        tint: { onEmit: () => heroColors[Math.floor(Math.random() * heroColors.length)] },
      }).setDepth(-1);
    }

    // Staggered entrance helper
    const elements: Phaser.GameObjects.GameObject[] = [];
    const addStaggered = (obj: Phaser.GameObjects.Text, delay: number) => {
      obj.setAlpha(0);
      const targetY = obj.y;
      obj.y += 20;
      this.tweens.add({
        targets: obj,
        alpha: 1,
        y: targetY,
        delay,
        duration: 300,
        ease: 'Power2',
      });
      elements.push(obj);
    };

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

    const titleText = this.add.text(GAME_WIDTH / 2, 80, title, {
      fontSize: '56px',
      color: titleColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    addStaggered(titleText, 0);

    // Match info
    const heroName = heroDataMap[result.playerHero]?.name || result.playerHero;
    const y0 = 170;
    const lineH = 28;

    const heroText = this.add.text(GAME_WIDTH / 2, y0, `Hero: ${heroName}`, {
      fontSize: '18px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5);
    addStaggered(heroText, 100);

    const teamText = this.add.text(GAME_WIDTH / 2, y0 + lineH, `Team Size: ${result.teamSize}v${result.teamSize}`, {
      fontSize: '16px', color: '#999999', fontFamily: 'monospace',
    }).setOrigin(0.5);
    addStaggered(teamText, 200);

    const arenaText = this.add.text(GAME_WIDTH / 2, y0 + lineH * 2, `Arena: ${result.arenaTheme} / ${result.arenaLayout}`, {
      fontSize: '16px', color: '#999999', fontFamily: 'monospace',
    }).setOrigin(0.5);
    addStaggered(arenaText, 300);

    // Stats
    const statsText = this.add.text(GAME_WIDTH / 2, y0 + lineH * 4, `Kills: ${result.playerKills}  Deaths: ${result.playerDeaths}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    addStaggered(statsText, 400);

    const teamStatsText = this.add.text(GAME_WIDTH / 2, y0 + lineH * 5, `Team Kills: ${result.teamKills}  Enemy Kills: ${result.enemyKills}`, {
      fontSize: '16px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    addStaggered(teamStatsText, 500);

    // MMR change animation
    const oldMMR = playerData.mmr - result.mmrChange;
    const mmrChangeStr = result.mmrChange >= 0 ? `+${result.mmrChange}` : `${result.mmrChange}`;
    const mmrColor = result.mmrChange >= 0 ? '#00ff00' : '#ff0000';

    const mmrText = this.add.text(GAME_WIDTH / 2, y0 + lineH * 7.5, `MMR: ${oldMMR}`, {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    addStaggered(mmrText, 600);

    const changeText = this.add.text(GAME_WIDTH / 2 + 100, y0 + lineH * 7.5, mmrChangeStr, {
      fontSize: '24px', color: mmrColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: changeText,
      alpha: 1,
      y: changeText.y - 10,
      delay: 800,
      duration: 600,
      ease: 'Power2',
    });

    this.time.delayedCall(1400, () => {
      mmrText.setText(`MMR: ${playerData.mmr}`);
    });

    // Rank
    const rank = getRank(playerData.mmr);
    const rankColor = Phaser.Display.Color.IntegerToColor(rank.color).rgba;
    const rankText = this.add.text(GAME_WIDTH / 2, y0 + lineH * 9.5, `Rank: ${rank.name}`, {
      fontSize: '20px', color: rankColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    addStaggered(rankText, 700);

    // Buttons
    this.createButton(GAME_WIDTH / 2 - 130, 580, 'PLAY AGAIN', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.scene.start('DraftScene');
        }
      });
    });

    this.createButton(GAME_WIDTH / 2 + 130, 580, 'MAIN MENU', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.scene.start('MenuScene');
        }
      });
    });
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const w = 200, h = 45, r = 8;

    const btnGraphics = this.add.graphics();
    btnGraphics.fillStyle(0x333333, 1);
    btnGraphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    btnGraphics.lineStyle(2, 0x888888, 1);
    btnGraphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    const glowGraphics = this.add.graphics();
    glowGraphics.fillStyle(0x888888, 0.15);
    glowGraphics.fillRoundedRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, r + 2);
    glowGraphics.setAlpha(0);

    const hitArea = this.add.rectangle(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    const btnText = this.add.text(x, y, label, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const targets = [btnGraphics, btnText, glowGraphics, hitArea];

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: targets,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Sine.easeOut',
      });
      glowGraphics.setAlpha(1);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: targets,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Sine.easeOut',
      });
      glowGraphics.setAlpha(0);
    });

    hitArea.on('pointerdown', callback);
  }

}
