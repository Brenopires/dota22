import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SUDDEN_DEATH_COLOR } from '../constants';
import { IBattleScene } from '../types';
import { AbilityBar } from './AbilityBar';
import { BossHealthBar } from './BossHealthBar';
import { XP_THRESHOLDS } from '../systems/XPSystem';
import { getTraitById } from '../traits/traitData';
import { getGemById } from '../gems/gemData';

interface KillFeedEntry {
  text: Phaser.GameObjects.Text;
  timer: Phaser.Time.TimerEvent;
}

export class HUD {
  private scene: IBattleScene & Phaser.Scene;
  private timerText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private scoreBreakdownText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private manaText: Phaser.GameObjects.Text;
  private heroNameText: Phaser.GameObjects.Text;
  private abilityBar: AbilityBar;
  private matchOverText: Phaser.GameObjects.Text | null = null;
  private hpGraphics: Phaser.GameObjects.Graphics;
  private xpGraphics: Phaser.GameObjects.Graphics;
  private levelText: Phaser.GameObjects.Text;
  private xpBarWidth = 180;
  private killFeedEntries: KillFeedEntry[] = [];
  private respawnOverlay: Phaser.GameObjects.Container | null = null;
  private respawnCountdownText: Phaser.GameObjects.Text | null = null;
  private bossHealthBar: BossHealthBar;
  private towerAGraphics: Phaser.GameObjects.Graphics;
  private towerBGraphics: Phaser.GameObjects.Graphics;
  private towerAText: Phaser.GameObjects.Text;
  private towerBText: Phaser.GameObjects.Text;
  private traitText: Phaser.GameObjects.Text | null = null;
  private gemText: Phaser.GameObjects.Text | null = null;
  private buffIconTexts: Phaser.GameObjects.Text[] = [];
  private buffIconBgs: Phaser.GameObjects.Graphics[] = [];
  private isSuddenDeath = false;

  constructor(scene: IBattleScene & Phaser.Scene) {
    this.scene = scene;

    // Timer background circle
    const timerBg = scene.add.graphics();
    timerBg.fillStyle(0x000000, 0.5);
    timerBg.fillCircle(GAME_WIDTH / 2, 28, 32);
    timerBg.lineStyle(1, 0x555555, 0.4);
    timerBg.strokeCircle(GAME_WIDTH / 2, 28, 32);
    timerBg.setScrollFactor(0).setDepth(199);

    // Timer (top center)
    this.timerText = scene.add.text(GAME_WIDTH / 2, 20, '5:00', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Total score (top center, replacing kill-only display)
    this.scoreText = scene.add.text(GAME_WIDTH / 2, 56, '0 - 0', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Battle Trait indicator (below score)
    const matchConfig = (scene as any).matchConfig;
    let hasTraitIndicator = false;
    if (matchConfig?.traitId) {
      const traitDef = getTraitById(matchConfig.traitId);
      if (traitDef) {
        hasTraitIndicator = true;
        const traitColorStr = '#' + Phaser.Display.Color.IntegerToColor(traitDef.color).color.toString(16).padStart(6, '0');

        // Trait background
        const traitBg = scene.add.graphics();
        traitBg.fillStyle(traitDef.color, 0.12);
        traitBg.fillRoundedRect(GAME_WIDTH / 2 - 100, 68, 200, 16, 3);
        traitBg.setScrollFactor(0).setDepth(199);

        // Trait text
        this.traitText = scene.add.text(GAME_WIDTH / 2, 76, `${traitDef.icon} ${traitDef.name}`, {
          fontSize: '10px',
          color: traitColorStr,
          fontFamily: 'monospace',
          fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      }
    }

    // Score breakdown text (compact K/B/T/C per team)
    // If trait indicator exists, place at y=92; otherwise y=76
    const breakdownY = hasTraitIndicator ? 92 : 76;
    this.scoreBreakdownText = scene.add.text(
      GAME_WIDTH / 2,
      breakdownY,
      'K:0 B:0 T:0 C:0  |  K:0 B:0 T:0 C:0',
      {
        fontSize: '9px',
        color: '#666666',
        fontFamily: 'monospace',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Hero name (bottom left)
    const heroName = scene.player.stats.name;
    this.heroNameText = scene.add.text(20, GAME_HEIGHT - 95, heroName, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(200);

    // Panel background behind HP/mana/XP bars (expanded to fit gem indicator)
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.4);
    panelBg.fillRoundedRect(10, GAME_HEIGHT - 100, 200, 90, 8);
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

    // XP bar graphics
    this.xpGraphics = scene.add.graphics();
    this.xpGraphics.setScrollFactor(0).setDepth(201);

    // Level text (gold, beside XP bar)
    this.levelText = scene.add.text(20, GAME_HEIGHT - 40, 'LV 1', {
      fontSize: '10px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(202);

    // Player Gem indicator (below XP bar in stat panel)
    if (matchConfig?.gemAssignments && matchConfig?.playerHero) {
      const playerGemId = matchConfig.gemAssignments[matchConfig.playerHero];
      if (playerGemId) {
        const gemDef = getGemById(playerGemId);
        if (gemDef) {
          const gemColorStr = '#' + Phaser.Display.Color.IntegerToColor(gemDef.color).color.toString(16).padStart(6, '0');
          this.gemText = scene.add.text(20, GAME_HEIGHT - 25, `${gemDef.icon} ${gemDef.name}: ${gemDef.description}`, {
            fontSize: '9px',
            color: gemColorStr,
            fontFamily: 'monospace',
          }).setScrollFactor(0).setDepth(202);
        }
      }
    }

    // Ability bar
    this.abilityBar = new AbilityBar(scene, scene.player);

    // Boss health bar (centered below timer)
    this.bossHealthBar = new BossHealthBar(scene);

    // Tower status indicators (flanking kill score)
    // Tower A indicator (left of score)
    const towerBarWidth = 60;
    const towerABarX = GAME_WIDTH / 2 - 100 - towerBarWidth / 2;
    const towerBBarX = GAME_WIDTH / 2 + 100 - towerBarWidth / 2;

    this.towerAGraphics = scene.add.graphics();
    this.towerAGraphics.setScrollFactor(0).setDepth(200);

    this.towerAText = scene.add.text(GAME_WIDTH / 2 - 100, 46, 'T-A', {
      fontSize: '9px',
      color: '#00aaff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // Tower B indicator (right of score)
    this.towerBGraphics = scene.add.graphics();
    this.towerBGraphics.setScrollFactor(0).setDepth(200);

    this.towerBText = scene.add.text(GAME_WIDTH / 2 + 100, 46, 'T-B', {
      fontSize: '9px',
      color: '#ff4444',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
  }

  update(): void {
    const scene = this.scene;

    // Timer
    const timeRemaining = scene.matchStateMachine?.getTimeRemaining() ?? 0;
    const timer = Math.max(0, Math.floor(timeRemaining));
    this.timerText.setText(this.formatTime(timer));
    if (timer <= 10) {
      this.timerText.setColor('#ff4444');
    } else {
      this.timerText.setColor('#ffffff');
    }

    // Live four-source scoreboard
    const score = scene.matchStateMachine?.getScore();
    if (score) {
      this.scoreText.setText(`${score.teamA} - ${score.teamB}`);

      // Per-source breakdown: kills, boss kills, tower thresholds, camp clears
      const killsA = scene.teamAKills;
      const killsB = scene.teamBKills;
      const bossA = score.bossKillsA;
      const bossB = score.bossKillsB;
      const twrA = score.towerThresholdA ? 1 : 0;
      const twrB = score.towerThresholdB ? 1 : 0;
      const campA = score.campClearsA;
      const campB = score.campClearsB;
      this.scoreBreakdownText.setText(
        `K:${killsA} B:${bossA} T:${twrA} C:${campA}  |  K:${killsB} B:${bossB} T:${twrB} C:${campB}`
      );

      // Color code: player is team A → breakdown tinted blue, team B → tinted red
      const battleScene = scene as any;
      const isTeamA = !battleScene.matchConfig?.playerTeam || battleScene.matchConfig?.playerTeam === 'A';
      const leftColor = isTeamA ? '#5588cc' : '#cc5555';
      // Full per-segment coloring requires rich text — tint entire breakdown toward player's team
      this.scoreBreakdownText.setColor(leftColor);
    } else {
      this.scoreText.setText(`${scene.teamAKills} - ${scene.teamBKills}`);
    }

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

      // XP bar
      const xpThresholds = XP_THRESHOLDS;
      const xpPrev = xpThresholds[player.level - 1] ?? 0;
      const xpNext = xpThresholds[player.level] ?? xpThresholds[xpThresholds.length - 1];
      const xpProgress = xpNext > xpPrev
        ? Math.min(1, (player.currentXP - xpPrev) / (xpNext - xpPrev))
        : 1; // at max level, show full bar

      const xg = this.xpGraphics;
      xg.clear();

      // XP bar background
      xg.fillStyle(0x111111, 1);
      xg.fillRoundedRect(20, GAME_HEIGHT - 36, this.xpBarWidth, 6, 2);

      // XP fill
      const xpFillWidth = Math.max(0, this.xpBarWidth * xpProgress);
      if (xpFillWidth > 0) {
        xg.fillStyle(0xFFD700, 1);
        xg.fillRoundedRect(20, GAME_HEIGHT - 36, xpFillWidth, 6, 2);
      }

      this.levelText.setText(`LV ${player.level}`);
    }

    // Camp buff icons -- show active camp buffs on player
    this.updateCampBuffIcons();

    // Ability bar
    this.abilityBar.update();

    // Boss health bar
    const battleScene = this.scene as any;
    if (battleScene.boss) {
      const boss = battleScene.boss;
      if (boss.isAlive) {
        this.bossHealthBar.setVisible(true);
        this.bossHealthBar.update(boss.currentHP, boss.maxHP, boss.phase);
      } else {
        this.bossHealthBar.setVisible(false);
      }
    }

    // Tower status indicators — pass threshold flags from score
    this.updateTowerIndicator(
      battleScene.towerA,
      this.towerAGraphics,
      this.towerAText,
      GAME_WIDTH / 2 - 100 - 30, // barX: centered at GAME_WIDTH/2 - 100
      0x00aaff,
      'T-A',
      score?.towerThresholdA ?? false,
    );
    this.updateTowerIndicator(
      battleScene.towerB,
      this.towerBGraphics,
      this.towerBText,
      GAME_WIDTH / 2 + 100 - 30, // barX: centered at GAME_WIDTH/2 + 100
      0xff4444,
      'T-B',
      score?.towerThresholdB ?? false,
    );

    // Respawn overlay — visible when player is dead
    const player = scene.player;
    if (player && !player.isAlive) {
      if (this.isSuddenDeath) {
        // Show ELIMINATED overlay (no countdown) — replaced respawn during Sudden Death
        if (!this.respawnOverlay) {
          this.respawnOverlay = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
          this.respawnOverlay.setScrollFactor(0).setDepth(290);
          const bg = scene.add.graphics();
          bg.fillStyle(0x000000, 0.7);
          bg.fillRoundedRect(-120, -40, 240, 80, 12);
          this.respawnOverlay.add(bg);
          const label = scene.add.text(0, -10, 'ELIMINATED', {
            fontSize: '28px', color: '#ff0000', fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5);
          this.respawnOverlay.add(label);
          const sub = scene.add.text(0, 20, 'No respawns in Sudden Death', {
            fontSize: '11px', color: '#ff6666', fontFamily: 'monospace',
          }).setOrigin(0.5);
          this.respawnOverlay.add(sub);
        }
      } else {
        const secondsLeft = Math.max(0, Math.ceil((scene.playerRespawnEndTime - Date.now()) / 1000));

        if (!this.respawnOverlay) {
          // Create overlay on first dead frame
          this.respawnOverlay = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
          this.respawnOverlay.setScrollFactor(0).setDepth(290);

          const bg = scene.add.graphics();
          bg.fillStyle(0x000000, 0.6);
          bg.fillRoundedRect(-120, -50, 240, 100, 12);
          this.respawnOverlay.add(bg);

          const label = scene.add.text(0, -22, 'RESPAWNING IN', {
            fontSize: '14px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
            fontStyle: 'bold',
          }).setOrigin(0.5);
          this.respawnOverlay.add(label);

          this.respawnCountdownText = scene.add.text(0, 14, `${secondsLeft}`, {
            fontSize: '36px',
            color: '#ff4444',
            fontFamily: 'monospace',
            fontStyle: 'bold',
          }).setOrigin(0.5);
          this.respawnOverlay.add(this.respawnCountdownText);
        } else if (this.respawnCountdownText) {
          // Update countdown number each frame
          this.respawnCountdownText.setText(`${secondsLeft}`);
        }
      }
    } else if (this.respawnOverlay) {
      // Player alive — destroy overlay
      this.respawnOverlay.destroy();
      this.respawnOverlay = null;
      this.respawnCountdownText = null;
    }

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

  private updateTowerIndicator(
    tower: any,
    g: Phaser.GameObjects.Graphics,
    label: Phaser.GameObjects.Text,
    barX: number,
    teamColor: number,
    baseName: string,
    thresholdTriggered: boolean = false,
  ): void {
    g.clear();
    const barWidth = 60;
    const barHeight = 8;
    const barY = 54;

    if (tower && tower.isAlive) {
      const hpRatio = tower.currentHP / tower.maxHP;

      // Background
      g.fillStyle(0x333333, 0.8);
      g.fillRoundedRect(barX, barY, barWidth, barHeight, 2);

      // HP fill
      const fillWidth = barWidth * hpRatio;
      if (fillWidth > 0) {
        g.fillStyle(teamColor, 1);
        g.fillRoundedRect(barX, barY, fillWidth, barHeight, 2);
      }

      // Gold accent line below tower bar when threshold has been scored
      if (thresholdTriggered) {
        g.fillStyle(0xFFD700, 0.9);
        g.fillRect(barX, barY + barHeight + 1, barWidth, 2);
      }

      // If disabled, grey overlay + [OFF] label
      if (tower.isDisabled()) {
        g.fillStyle(0x666666, 0.5);
        g.fillRoundedRect(barX, barY, barWidth, barHeight, 2);
        label.setText(`${baseName} [OFF]`);
        label.setColor('#666666');
      } else if (thresholdTriggered) {
        label.setText(`${baseName} [!2pt]`);
        label.setColor('#FFD700');
      } else {
        label.setText(baseName);
        label.setColor(teamColor === 0x00aaff ? '#00aaff' : '#ff4444');
      }
    } else if (tower && !tower.isAlive) {
      // Tower destroyed
      label.setText(`${baseName} [X]`);
      label.setColor('#444444');
    }
  }

  private updateCampBuffIcons(): void {
    const player = this.scene.player;
    if (!player) return;

    // Destroy previous frame's buff icons
    for (const text of this.buffIconTexts) text.destroy();
    for (const bg of this.buffIconBgs) bg.destroy();
    this.buffIconTexts = [];
    this.buffIconBgs = [];

    // Camp buff config: sourceId -> display info
    const campBuffConfig: { sourceId: string; label: string; color: number }[] = [
      { sourceId: 'camp_damage',   label: 'DMG', color: 0xFF4444 },
      { sourceId: 'camp_shield',   label: 'SHD', color: 0xCCCCCC },
      { sourceId: 'camp_haste',    label: 'HST', color: 0x00FFFF },
      { sourceId: 'camp_cooldown', label: 'CDR', color: 0xAA44FF },
    ];

    let iconIndex = 0;
    const iconWidth = 44;
    const iconHeight = 18;
    const iconY = GAME_HEIGHT - 115;
    const iconStartX = 20;
    const iconGap = 4;

    for (const config of campBuffConfig) {
      // Find active buff with this sourceId
      const activeBuff = player.buffs.find(
        b => b.sourceId === config.sourceId && b.remaining > 0
      );
      if (!activeBuff) continue;

      const x = iconStartX + iconIndex * (iconWidth + iconGap);
      const seconds = Math.ceil(activeBuff.remaining);

      // Background rectangle
      const bg = this.scene.add.graphics();
      bg.fillStyle(config.color, 0.2);
      bg.fillRoundedRect(x, iconY, iconWidth, iconHeight, 3);
      bg.lineStyle(1, config.color, 0.5);
      bg.strokeRoundedRect(x, iconY, iconWidth, iconHeight, 3);
      bg.setScrollFactor(0).setDepth(201);
      this.buffIconBgs.push(bg);

      // Label + timer text
      const colorStr = '#' + Phaser.Display.Color.IntegerToColor(config.color).color.toString(16).padStart(6, '0');
      const text = this.scene.add.text(x + iconWidth / 2, iconY + iconHeight / 2, `${config.label} ${seconds}s`, {
        fontSize: '9px',
        color: colorStr,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
      this.buffIconTexts.push(text);

      iconIndex++;
    }
  }

  showSuddenDeathOverlay(): void {
    this.isSuddenDeath = true;
    const scene = this.scene;

    // Persistent red border (depth 295 — above game, below overlay panels)
    const border = scene.add.graphics();
    border.lineStyle(6, SUDDEN_DEATH_COLOR, 0.8);
    border.strokeRect(3, 3, GAME_WIDTH - 6, GAME_HEIGHT - 6);
    border.setScrollFactor(0).setDepth(295);

    // "SUDDEN DEATH" text below score breakdown
    scene.add.text(GAME_WIDTH / 2, 110, 'SUDDEN DEATH', {
      fontSize: '22px',
      color: '#ff0000',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(296);

    // "NO RESPAWNS" warning text below Sudden Death title
    scene.add.text(GAME_WIDTH / 2, 134, 'NO RESPAWNS', {
      fontSize: '12px',
      color: '#ff6666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(296);
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
