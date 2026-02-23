import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DRAFT_PICK_TIMEOUT } from '../constants';
import { MatchOrchestrator, PartialMatchConfig } from '../systems/MatchOrchestrator';
import { HeroRegistry } from '../heroes/HeroRegistry';
import { heroDataMap } from '../heroes/heroData';
import { HeroArchetype, MatchConfig } from '../types';
import { getTraitById } from '../traits/traitData';

const ARCHETYPE_COLORS: Record<string, string> = {
  [HeroArchetype.TANK]: '#4488cc',
  [HeroArchetype.ASSASSIN]: '#cc44cc',
  [HeroArchetype.MAGE]: '#44aaff',
  [HeroArchetype.CARRY]: '#ffaa44',
  [HeroArchetype.SUPPORT]: '#44cc44',
};

export class DraftScene extends Phaser.Scene {
  private partialConfig!: PartialMatchConfig;
  private candidates: string[] = [];
  private _countdownEvent: Phaser.Time.TimerEvent | null = null;
  private _autoPick: Phaser.Time.TimerEvent | null = null;
  private _picked = false;

  constructor() {
    super({ key: 'DraftScene' });
  }

  create(): void {
    // Generate partial match config (teamB, arena, trait) before hero is picked
    this.partialConfig = MatchOrchestrator.generatePartialMatch();

    // Reset pick guard on scene create (handles scene restart)
    this._picked = false;
    this._countdownEvent = null;
    this._autoPick = null;

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

    // Title header — "CHOOSE YOUR HERO"
    const titleText = this.add.text(GAME_WIDTH / 2, 30, 'CHOOSE YOUR HERO', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.animateIn(titleText, 0);

    // Arena info label (y=55)
    const themeLabel = this.partialConfig.arenaTheme.replace(/_/g, ' ').toUpperCase();
    const layoutLabel = this.partialConfig.arenaLayout.replace(/_/g, ' ').toUpperCase();
    const arenaText = this.add.text(GAME_WIDTH / 2, 55, `ARENA: ${themeLabel} / ${layoutLabel}`, {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.animateIn(arenaText, 30);

    // Battle Trait banner (y=68-90) — uses partialConfig.traitId
    const traitDef = getTraitById(this.partialConfig.traitId);
    if (traitDef) {
      const traitColorStr = '#' + Phaser.Display.Color.IntegerToColor(traitDef.color).color.toString(16).padStart(6, '0');

      const traitBg = this.add.graphics();
      traitBg.fillStyle(traitDef.color, 0.15);
      traitBg.fillRoundedRect(GAME_WIDTH / 2 - 250, 66, 500, 24, 4);
      traitBg.lineStyle(1, traitDef.color, 0.3);
      traitBg.strokeRoundedRect(GAME_WIDTH / 2 - 250, 66, 500, 24, 4);
      this.animateIn(traitBg, 50);

      const traitText = this.add.text(GAME_WIDTH / 2, 78, `TRAIT: ${traitDef.icon} ${traitDef.name} \u2014 ${traitDef.description}`, {
        fontSize: '12px',
        color: traitColorStr,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.animateIn(traitText, 50);
    }

    // Generate 3 hero candidates (excluding teamB heroes)
    this.candidates = this._pickThreeCandidates();

    // Render pick cards and start countdown
    this._renderPickCards();
    this._startCountdown();
  }

  // -------------------------------------------------------------------------
  // Candidate generation
  // -------------------------------------------------------------------------

  private _pickThreeCandidates(): string[] {
    const all = HeroRegistry.getAllHeroIds();
    const pool = all.filter(id => !this.partialConfig.teamB.includes(id));
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  // -------------------------------------------------------------------------
  // Pick card rendering
  // -------------------------------------------------------------------------

  private _renderPickCards(): void {
    const cardCenterY = 310;
    const cardWidth = 280;
    const cardHeight = 300;

    const xPositions = [
      GAME_WIDTH / 2 - 320,
      GAME_WIDTH / 2,
      GAME_WIDTH / 2 + 320,
    ];

    this.candidates.forEach((heroId, index) => {
      const heroData = heroDataMap[heroId];
      if (!heroData) return;

      const cx = xPositions[index];
      const cardLeft = cx - cardWidth / 2;
      const cardTop = cardCenterY - cardHeight / 2;
      const delay = 150 + index * 120;

      const colorStr = '#' + Phaser.Display.Color.IntegerToColor(heroData.color).color.toString(16).padStart(6, '0');
      const archetypeColor = ARCHETYPE_COLORS[heroData.archetype] || '#888888';

      // Card background
      const bg = this.add.graphics();
      bg.fillStyle(0x111122, 0.85);
      bg.fillRoundedRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
      this.animateIn(bg, delay);

      // Card border (dim by default, brightened on hover)
      const border = this.add.graphics();
      border.lineStyle(2, heroData.color, 0.4);
      border.strokeRoundedRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
      this.animateIn(border, delay);

      // Hero circle (top of card, centered)
      const circleY = cardTop + 56;
      const textureKey = `hero_${heroId}`;
      if (this.textures.exists(textureKey)) {
        const img = this.add.image(cx, circleY, textureKey).setDisplaySize(56, 56);
        this.animateIn(img, delay);
      } else {
        const circle = this.add.graphics();
        circle.fillStyle(heroData.color, 1);
        circle.fillCircle(cx, circleY, 28);
        this.animateIn(circle, delay);
      }

      // Hero name
      const nameText = this.add.text(cx, cardTop + 96, heroData.name, {
        fontSize: '20px',
        color: colorStr,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.animateIn(nameText, delay);

      // Archetype label
      const archetypeText = this.add.text(cx, cardTop + 118, heroData.archetype.toUpperCase(), {
        fontSize: '14px',
        color: archetypeColor,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.animateIn(archetypeText, delay);

      // Q/W/E abilities
      const slotKeys = ['Q', 'W', 'E'];
      for (let i = 0; i < heroData.abilities.length && i < 3; i++) {
        const ability = heroData.abilities[i];
        const ay = cardTop + 144 + i * 32;

        const slotLabel = this.add.text(cardLeft + 10, ay, `${slotKeys[i]}:`, {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontStyle: 'bold',
        });
        this.animateIn(slotLabel, delay + 50);

        const abilityLine = this.add.text(cardLeft + 30, ay, `${ability.name} \u2014 ${ability.description}`, {
          fontSize: '12px',
          color: '#888888',
          fontFamily: 'monospace',
          wordWrap: { width: cardWidth - 36 },
        });
        this.animateIn(abilityLine, delay + 50);
      }

      // R ultimate (if present)
      const ultAbility = heroData.abilities.find(a => a.isUltimate);
      if (ultAbility) {
        const ry = cardTop + 144 + 3 * 32 + 4;
        const rLabel = this.add.text(cardLeft + 10, ry, 'R:', {
          fontSize: '12px',
          color: '#ffdd44',
          fontFamily: 'monospace',
          fontStyle: 'bold',
        });
        this.animateIn(rLabel, delay + 50);

        const rLine = this.add.text(cardLeft + 30, ry, `${ultAbility.name} \u2014 ${ultAbility.description}`, {
          fontSize: '12px',
          color: '#ccaa22',
          fontFamily: 'monospace',
          wordWrap: { width: cardWidth - 36 },
        });
        this.animateIn(rLine, delay + 50);
      }

      // Invisible hit area — interactive with hand cursor
      const hitArea = this.add.rectangle(cx, cardCenterY, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001);

      // Hover effects
      hitArea.on('pointerover', () => {
        this.tweens.add({
          targets: [bg, border, nameText, archetypeText],
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 120,
          ease: 'Sine.easeOut',
        });
        border.clear();
        border.lineStyle(2, heroData.color, 1.0);
        border.strokeRoundedRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
      });

      hitArea.on('pointerout', () => {
        this.tweens.add({
          targets: [bg, border, nameText, archetypeText],
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: 'Sine.easeOut',
        });
        border.clear();
        border.lineStyle(2, heroData.color, 0.4);
        border.strokeRoundedRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
      });

      hitArea.on('pointerdown', () => {
        this._onCardClicked(heroId);
      });

      this.animateIn(hitArea, delay);
    });
  }

  // -------------------------------------------------------------------------
  // Countdown timer
  // -------------------------------------------------------------------------

  private _startCountdown(): void {
    let remaining = DRAFT_PICK_TIMEOUT;

    const timerText = this.add.text(GAME_WIDTH / 2, 500, `${remaining}`, {
      fontSize: '32px',
      color: '#ffaa00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hintText = this.add.text(GAME_WIDTH / 2, 535, `Click a hero to pick (auto-pick in ${remaining}s)`, {
      fontSize: '14px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.animateIn(timerText, 400);
    this.animateIn(hintText, 450);

    this._countdownEvent = this.time.addEvent({
      delay: 1000,
      repeat: DRAFT_PICK_TIMEOUT - 1,
      callback: () => {
        remaining--;
        timerText.setText(`${remaining}`);
        hintText.setText(`Click a hero to pick (auto-pick in ${remaining}s)`);
        if (remaining <= 5) {
          timerText.setColor('#ff4444');
        }
      },
    });

    this._autoPick = this.time.delayedCall(DRAFT_PICK_TIMEOUT * 1000, () => {
      if (!this._picked) {
        this._onCardClicked(this.candidates[0]);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Pick handlers
  // -------------------------------------------------------------------------

  private _onCardClicked(heroId: string): void {
    if (this._picked) return; // prevent double-pick
    this._picked = true;

    // Cancel timers immediately
    this._countdownEvent?.remove();
    this._autoPick?.remove();

    this._confirmPick(heroId);
  }

  private _confirmPick(heroId: string): void {
    const matchConfig: MatchConfig = MatchOrchestrator.finalizeMatch(heroId, this.partialConfig);

    // Remove keyboard listeners before fade
    this.input.keyboard!.removeAllKeys();

    this.cameras.main.fadeOut(400, 0, 0, 0, (_cam: any, progress: number) => {
      if (progress === 1) {
        this.scene.start('BattleScene', { matchConfig });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

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
}
