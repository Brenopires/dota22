import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';
import { MatchOrchestrator } from '../systems/MatchOrchestrator';
import { heroDataMap } from '../heroes/heroData';
import { HeroArchetype } from '../types';

const ARCHETYPE_COLORS: Record<string, string> = {
  [HeroArchetype.TANK]: '#4488cc',
  [HeroArchetype.ASSASSIN]: '#cc44cc',
  [HeroArchetype.MAGE]: '#44aaff',
  [HeroArchetype.CARRY]: '#ffaa44',
  [HeroArchetype.SUPPORT]: '#44cc44',
};

export class DraftScene extends Phaser.Scene {
  private matchConfig!: ReturnType<typeof MatchOrchestrator.generateMatch>;

  constructor() {
    super({ key: 'DraftScene' });
  }

  create(): void {
    this.matchConfig = MatchOrchestrator.generateMatch();

    this.cameras.main.fadeIn(400);

    // Background particles
    if (this.textures.exists('particle_soft')) {
      const heroColors = Object.values(COLORS);
      this.add.particles(0, 0, 'particle_soft', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 0, max: GAME_HEIGHT },
        lifespan: 4000,
        speed: { min: 5, max: 20 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.15, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 250,
        quantity: 1,
        tint: { onEmit: () => heroColors[Math.floor(Math.random() * heroColors.length)] },
      }).setDepth(-1);
    }

    // Arena info header
    const themeLabel = this.matchConfig.arenaTheme.replace(/_/g, ' ').toUpperCase();
    const layoutLabel = this.matchConfig.arenaLayout.replace(/_/g, ' ').toUpperCase();
    const arenaText = this.add.text(GAME_WIDTH / 2, 30, `ARENA: ${themeLabel} / ${layoutLabel}`, {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.animateIn(arenaText, 0);

    // Team labels
    const leftX = GAME_WIDTH * 0.27;
    const rightX = GAME_WIDTH * 0.73;

    const yourTeamLabel = this.add.text(leftX, 65, 'YOUR TEAM', {
      fontSize: '20px',
      color: '#44cc88',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.animateIn(yourTeamLabel, 100);

    const enemyTeamLabel = this.add.text(rightX, 65, 'ENEMY TEAM', {
      fontSize: '20px',
      color: '#cc4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.animateIn(enemyTeamLabel, 100);

    // Render hero cards
    const cardStartY = 100;
    const { teamA, teamB, playerHero } = this.matchConfig;
    const maxCards = Math.max(teamA.length, teamB.length);

    for (let i = 0; i < teamA.length; i++) {
      const heroId = teamA[i];
      const isPlayer = heroId === playerHero;
      const delay = 200 + i * 150;
      this.renderHeroCard(leftX, cardStartY + i * 130, heroId, isPlayer, delay);
    }

    for (let i = 0; i < teamB.length; i++) {
      const heroId = teamB[i];
      const delay = 200 + i * 150;
      this.renderHeroCard(rightX, cardStartY + i * 130, heroId, false, delay);
    }

    // VS divider
    const vsText = this.add.text(GAME_WIDTH / 2, cardStartY + (maxCards * 130) / 2 - 65, 'VS', {
      fontSize: '32px',
      color: '#333333',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.animateIn(vsText, 300);

    // START BATTLE button
    const buttonDelay = 200 + maxCards * 150 + 200;
    this.createButton(GAME_WIDTH / 2, 650, 'START BATTLE', () => {
      this.startBattle();
    }, buttonDelay);

    // Hint text
    const hintText = this.add.text(GAME_WIDTH / 2, 685, 'SPACE or CLICK to begin', {
      fontSize: '12px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.animateIn(hintText, buttonDelay + 100);

    // SPACE key listener
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => {
      this.startBattle();
    });
  }

  private startBattle(): void {
    this.input.keyboard!.removeAllKeys();
    this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
      if (progress === 1) {
        this.scene.start('BattleScene', { matchConfig: this.matchConfig });
      }
    });
  }

  private renderHeroCard(cx: number, y: number, heroId: string, isPlayer: boolean, delay: number): void {
    const heroData = heroDataMap[heroId];
    if (!heroData) return;

    const cardWidth = 280;
    const cardLeft = cx - cardWidth / 2;
    const imgSize = 48;
    const textLeft = cardLeft + imgSize + 12;

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(isPlayer ? 0x1a2a1a : 0x1a1a2a, 0.6);
    bg.fillRoundedRect(cardLeft - 8, y - 4, cardWidth + 16, 120, 6);
    if (isPlayer) {
      bg.lineStyle(1, 0x44cc88, 0.5);
      bg.strokeRoundedRect(cardLeft - 8, y - 4, cardWidth + 16, 120, 6);
    }
    this.animateIn(bg, delay);

    // Hero texture
    const textureKey = `hero_${heroId}`;
    if (this.textures.exists(textureKey)) {
      const img = this.add.image(cardLeft + imgSize / 2, y + imgSize / 2, textureKey)
        .setDisplaySize(imgSize, imgSize);
      this.animateIn(img, delay);
    } else {
      // Colored circle fallback
      const fallback = this.add.graphics();
      fallback.fillStyle(heroData.color, 1);
      fallback.fillCircle(cardLeft + imgSize / 2, y + imgSize / 2, imgSize / 2 - 2);
      this.animateIn(fallback, delay);
    }

    // Hero name
    const colorStr = '#' + Phaser.Display.Color.IntegerToColor(heroData.color).color.toString(16).padStart(6, '0');
    const nameText = this.add.text(textLeft, y + 2, heroData.name, {
      fontSize: '18px',
      color: colorStr,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.animateIn(nameText, delay);

    // Archetype tag
    const archetypeLabel = heroData.archetype.toUpperCase();
    const archetypeColor = ARCHETYPE_COLORS[heroData.archetype] || '#888888';
    const archText = this.add.text(textLeft, y + 22, archetypeLabel, {
      fontSize: '12px',
      color: archetypeColor,
      fontFamily: 'monospace',
    });
    this.animateIn(archText, delay);

    // Player marker
    if (isPlayer) {
      const youText = this.add.text(textLeft + 80, y + 20, '★ YOU', {
        fontSize: '12px',
        color: '#44cc88',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      });
      this.animateIn(youText, delay);
    }

    // Ability lines
    const abilityStartY = y + 50;
    const slotKeys = ['Q', 'W', 'E'];
    for (let i = 0; i < heroData.abilities.length && i < 3; i++) {
      const ability = heroData.abilities[i];
      const ay = abilityStartY + i * 18;

      const slotText = this.add.text(cardLeft + 4, ay, `${slotKeys[i]}:`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      });
      this.animateIn(slotText, delay + 50);

      const abilityLine = this.add.text(cardLeft + 26, ay, `${ability.name} — ${ability.description}`, {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'monospace',
        wordWrap: { width: cardWidth - 22 },
      });
      this.animateIn(abilityLine, delay + 50);
    }
  }

  private animateIn(obj: Phaser.GameObjects.GameObject, delay: number): void {
    const target = obj as any;
    if (target.setAlpha) {
      target.setAlpha(0);
      const targetY = target.y;
      target.y += 15;
      this.tweens.add({
        targets: target,
        alpha: 1,
        y: targetY,
        delay,
        duration: 250,
        ease: 'Power2',
      });
    }
  }

  private createButton(x: number, y: number, label: string, callback: () => void, delay: number): void {
    const w = 240, h = 50, r = 8;

    const btnGraphics = this.add.graphics();
    btnGraphics.fillStyle(0x333333, 1);
    btnGraphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    btnGraphics.lineStyle(2, 0x44cc88, 1);
    btnGraphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    const glowGraphics = this.add.graphics();
    glowGraphics.fillStyle(0x44cc88, 0.15);
    glowGraphics.fillRoundedRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, r + 2);
    glowGraphics.setAlpha(0);

    const hitArea = this.add.rectangle(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    const btnText = this.add.text(x, y, label, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const targets = [btnGraphics, btnText, glowGraphics, hitArea];

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Sine.easeOut',
      });
      glowGraphics.setAlpha(1);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Sine.easeOut',
      });
      glowGraphics.setAlpha(0);
    });

    hitArea.on('pointerdown', callback);

    // Animate all button elements in
    this.animateIn(btnGraphics, delay);
    this.animateIn(glowGraphics, delay);
    this.animateIn(btnText, delay);
  }
}
