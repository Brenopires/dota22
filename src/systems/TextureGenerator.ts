import Phaser from 'phaser';
import { HERO_RADIUS, HERO_ELEMENT_MAP } from '../constants';
import { heroDataMap } from '../heroes/heroData';
import { HeroArchetype } from '../types';

const HERO_TEX_SIZE = 48;
const CX = HERO_TEX_SIZE / 2;
const CY = HERO_TEX_SIZE / 2;

export class TextureGenerator {
  static generate(scene: Phaser.Scene): void {
    // particle_circle — 8x8 white circle
    const pc = scene.make.graphics({});
    pc.fillStyle(0xffffff);
    pc.fillCircle(4, 4, 4);
    pc.generateTexture('particle_circle', 8, 8);
    pc.destroy();

    // particle_soft — 16x16 radial gradient (soft glow)
    const ps = scene.make.graphics({});
    for (let r = 8; r > 0; r--) {
      const alpha = (1 - r / 8) * 0.8;
      ps.fillStyle(0xffffff, alpha);
      ps.fillCircle(8, 8, r);
    }
    ps.generateTexture('particle_soft', 16, 16);
    ps.destroy();

    // particle_spark — 4x12 elongated rectangle
    const pk = scene.make.graphics({});
    pk.fillStyle(0xffffff);
    pk.fillRect(0, 0, 4, 12);
    pk.generateTexture('particle_spark', 4, 12);
    pk.destroy();

    // particle_ring — 16x16 hollow circle
    const pr = scene.make.graphics({});
    pr.lineStyle(2, 0xffffff, 1);
    pr.strokeCircle(8, 8, 6);
    pr.generateTexture('particle_ring', 16, 16);
    pr.destroy();

    // particle_star — 12x12 four-pointed star
    const pst = scene.make.graphics({});
    pst.fillStyle(0xffffff);
    pst.beginPath();
    const scx = 6, scy = 6, outer = 6, inner = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 === 0 ? outer : inner;
      const px = scx + Math.cos(angle) * rad;
      const py = scy + Math.sin(angle) * rad;
      if (i === 0) pst.moveTo(px, py);
      else pst.lineTo(px, py);
    }
    pst.closePath();
    pst.fillPath();
    pst.generateTexture('particle_star', 12, 12);
    pst.destroy();

    // particle_dot — 4x4 solid dot
    const pd = scene.make.graphics({});
    pd.fillStyle(0xffffff);
    pd.fillCircle(2, 2, 2);
    pd.generateTexture('particle_dot', 4, 4);
    pd.destroy();

    // glow_circle — 32x32 large radial gradient
    const gc = scene.make.graphics({});
    for (let r = 16; r > 0; r--) {
      const alpha = (1 - r / 16) * 0.5;
      gc.fillStyle(0xffffff, alpha);
      gc.fillCircle(16, 16, r);
    }
    gc.generateTexture('glow_circle', 32, 32);
    gc.destroy();

    // Generate unique hero textures
    TextureGenerator.generateHeroTextures(scene);
  }

  private static generateHeroTextures(scene: Phaser.Scene): void {
    for (const [heroId, stats] of Object.entries(heroDataMap)) {
      const g = scene.make.graphics({});
      const element = (HERO_ELEMENT_MAP[heroId] || 'generic') as string;

      // 1. Base archetype shape (filled)
      this.drawArchetypeShape(g, stats.archetype, stats.color);

      // 2. Dome shading (3D effect)
      this.drawDomeShading(g);

      // 3. Element accent pattern
      this.drawElementAccent(g, element);

      // 4. Archetype border (stroke)
      this.drawArchetypeBorder(g, stats.archetype, stats.color);

      // 5. Hero-specific symbol
      this.drawHeroSymbol(g, heroId);

      g.generateTexture(`hero_${heroId}`, HERO_TEX_SIZE, HERO_TEX_SIZE);
      g.destroy();
    }
  }

  private static drawArchetypeShape(
    g: Phaser.GameObjects.Graphics,
    archetype: HeroArchetype,
    color: number
  ): void {
    g.fillStyle(color, 1);

    switch (archetype) {
      case HeroArchetype.TANK: {
        // Hexagon
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = CX + Math.cos(angle) * HERO_RADIUS;
          const py = CY + Math.sin(angle) * HERO_RADIUS;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        break;
      }

      case HeroArchetype.ASSASSIN: {
        // 8-pointed star
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const angle = (i * Math.PI) / 8 - Math.PI / 2;
          const rad = i % 2 === 0 ? HERO_RADIUS : HERO_RADIUS * 0.65;
          const px = CX + Math.cos(angle) * rad;
          const py = CY + Math.sin(angle) * rad;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        break;
      }

      case HeroArchetype.MAGE: {
        // Circle (slightly smaller to leave room for orbit dots)
        g.fillCircle(CX, CY, HERO_RADIUS - 2);

        // Orbit ring
        g.lineStyle(1, 0xffffff, 0.2);
        g.strokeCircle(CX, CY, HERO_RADIUS - 4);

        // 3 orbit dots at 120° intervals
        g.fillStyle(0xffffff, 0.5);
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
          const dx = CX + Math.cos(angle) * (HERO_RADIUS - 4);
          const dy = CY + Math.sin(angle) * (HERO_RADIUS - 4);
          g.fillCircle(dx, dy, 2);
        }
        break;
      }

      case HeroArchetype.CARRY: {
        // Diamond / Rhombus
        g.beginPath();
        g.moveTo(CX, CY - HERO_RADIUS);          // top
        g.lineTo(CX + HERO_RADIUS * 0.8, CY);    // right
        g.lineTo(CX, CY + HERO_RADIUS);           // bottom
        g.lineTo(CX - HERO_RADIUS * 0.8, CY);    // left
        g.closePath();
        g.fillPath();
        break;
      }

      case HeroArchetype.SUPPORT: {
        // Rounded square (squircle)
        const size = HERO_RADIUS * 1.7;
        g.fillRoundedRect(CX - size / 2, CY - size / 2, size, size, HERO_RADIUS * 0.45);
        break;
      }
    }
  }

  private static drawDomeShading(g: Phaser.GameObjects.Graphics): void {
    // Upper-left highlight
    for (let r = HERO_RADIUS; r > 0; r -= 2) {
      const alpha = (1 - r / HERO_RADIUS) * 0.15;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(CX - 3, CY - 3, r);
    }
    // Lower-right shadow
    for (let r = HERO_RADIUS; r > 0; r -= 2) {
      const alpha = (1 - r / HERO_RADIUS) * 0.1;
      g.fillStyle(0x000000, alpha);
      g.fillCircle(CX + 3, CY + 3, r);
    }
  }

  private static drawElementAccent(g: Phaser.GameObjects.Graphics, element: string): void {
    switch (element) {
      case 'fire': {
        // 3 flame wisps (upward teardrops)
        const flames = [
          { x: CX - 6, y: CY + 4 },
          { x: CX, y: CY + 1 },
          { x: CX + 6, y: CY + 4 },
        ];
        for (const f of flames) {
          g.fillStyle(0xFFFF00, 0.35);
          g.fillCircle(f.x, f.y, 2);
          g.beginPath();
          g.moveTo(f.x - 2, f.y);
          g.lineTo(f.x, f.y - 6);
          g.lineTo(f.x + 2, f.y);
          g.closePath();
          g.fillStyle(0xFF4500, 0.3);
          g.fillPath();
        }
        break;
      }

      case 'ice': {
        // 6 snowflake lines radiating from center
        g.lineStyle(1, 0xffffff, 0.35);
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const len = 8;
          const ex = CX + Math.cos(angle) * len;
          const ey = CY + Math.sin(angle) * len;
          g.beginPath();
          g.moveTo(CX, CY);
          g.lineTo(ex, ey);
          g.strokePath();

          // Small perpendicular tick at midpoint
          const mx = CX + Math.cos(angle) * len * 0.5;
          const my = CY + Math.sin(angle) * len * 0.5;
          const perp = angle + Math.PI / 2;
          g.beginPath();
          g.moveTo(mx + Math.cos(perp) * 2, my + Math.sin(perp) * 2);
          g.lineTo(mx - Math.cos(perp) * 2, my - Math.sin(perp) * 2);
          g.strokePath();
        }
        break;
      }

      case 'lightning': {
        // 2 zigzag bolt lines
        g.lineStyle(1.5, 0xFFFF00, 0.5);
        // Bolt 1
        g.beginPath();
        g.moveTo(CX - 4, CY - 7);
        g.lineTo(CX + 1, CY - 2);
        g.lineTo(CX - 2, CY + 1);
        g.lineTo(CX + 3, CY + 7);
        g.strokePath();
        // Bolt 2
        g.beginPath();
        g.moveTo(CX + 4, CY - 5);
        g.lineTo(CX - 1, CY);
        g.lineTo(CX + 2, CY + 5);
        g.strokePath();
        break;
      }

      case 'poison': {
        // 3 small bubbles + spore dots
        g.fillStyle(0x00FF00, 0.4);
        g.fillCircle(CX - 5, CY + 3, 3);
        g.fillCircle(CX + 4, CY - 2, 2);
        g.fillCircle(CX + 1, CY + 6, 2);
        // Spore dots
        g.fillStyle(0x00FF00, 0.25);
        g.fillCircle(CX - 2, CY - 5, 1);
        g.fillCircle(CX + 6, CY + 4, 1);
        g.fillCircle(CX - 6, CY - 2, 1);
        break;
      }

      case 'holy': {
        // Cross shape + diagonal rays
        g.fillStyle(0xffffff, 0.4);
        g.fillRect(CX - 5, CY - 1, 10, 2);  // horizontal
        g.fillRect(CX - 1, CY - 5, 2, 10);  // vertical
        // 4 diagonal rays
        g.lineStyle(1, 0xffffff, 0.2);
        const rayLen = 4;
        for (let i = 0; i < 4; i++) {
          const angle = Math.PI / 4 + (i * Math.PI) / 2;
          g.beginPath();
          g.moveTo(CX + Math.cos(angle) * 3, CY + Math.sin(angle) * 3);
          g.lineTo(CX + Math.cos(angle) * (3 + rayLen), CY + Math.sin(angle) * (3 + rayLen));
          g.strokePath();
        }
        break;
      }

      case 'shadow': {
        // 3 concentric partial arcs (swirling void)
        g.lineStyle(1.5, 0x000000, 0.3);
        g.beginPath();
        g.arc(CX, CY, 8, 0, Math.PI, false);
        g.strokePath();
        g.beginPath();
        g.arc(CX, CY, 12, Math.PI / 2, Math.PI * 1.5, false);
        g.strokePath();
        g.beginPath();
        g.arc(CX, CY, 5, Math.PI, Math.PI * 2, false);
        g.strokePath();
        break;
      }

      case 'blood': {
        // 3 falling blood droplets
        const drops = [
          { x: CX - 4, y: CY - 3 },
          { x: CX + 2, y: CY + 1 },
          { x: CX - 1, y: CY + 5 },
        ];
        for (const d of drops) {
          g.fillStyle(0xFF0000, 0.35);
          g.fillCircle(d.x, d.y, 2);
          // Tiny triangle on top (drop shape)
          g.beginPath();
          g.moveTo(d.x - 1.5, d.y);
          g.lineTo(d.x, d.y - 3);
          g.lineTo(d.x + 1.5, d.y);
          g.closePath();
          g.fillPath();
        }
        break;
      }

      case 'stone': {
        // 2-3 irregular crack lines
        g.lineStyle(1, 0x333333, 0.4);
        // Crack 1: upper-left
        g.beginPath();
        g.moveTo(CX - 2, CY - 1);
        g.lineTo(CX - 6, CY - 5);
        g.lineTo(CX - 8, CY - 3);
        g.strokePath();
        // Crack 2: lower-right
        g.beginPath();
        g.moveTo(CX + 1, CY + 1);
        g.lineTo(CX + 5, CY + 6);
        g.lineTo(CX + 7, CY + 4);
        g.strokePath();
        // Crack 3: right
        g.beginPath();
        g.moveTo(CX + 2, CY - 2);
        g.lineTo(CX + 7, CY - 1);
        g.strokePath();
        break;
      }

      default: {
        // Generic: sound wave arcs
        g.lineStyle(1, 0xffffff, 0.2);
        g.beginPath();
        g.arc(CX, CY, 6, -Math.PI / 4, Math.PI / 4, false);
        g.strokePath();
        g.beginPath();
        g.arc(CX, CY, 10, Math.PI / 6, Math.PI * 5 / 6, false);
        g.strokePath();
        g.beginPath();
        g.arc(CX, CY, 14, Math.PI, Math.PI * 1.5, false);
        g.strokePath();
        break;
      }
    }
  }

  private static drawArchetypeBorder(
    g: Phaser.GameObjects.Graphics,
    archetype: HeroArchetype,
    color: number
  ): void {
    // Darker border color
    const r = (color >> 16) & 0xff;
    const gv = (color >> 8) & 0xff;
    const b = color & 0xff;
    const darkerColor = ((Math.max(0, r - 50) << 16) | (Math.max(0, gv - 50) << 8) | Math.max(0, b - 50));

    g.lineStyle(2, darkerColor, 0.8);

    switch (archetype) {
      case HeroArchetype.TANK: {
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = CX + Math.cos(angle) * HERO_RADIUS;
          const py = CY + Math.sin(angle) * HERO_RADIUS;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.strokePath();
        break;
      }

      case HeroArchetype.ASSASSIN: {
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const angle = (i * Math.PI) / 8 - Math.PI / 2;
          const rad = i % 2 === 0 ? HERO_RADIUS : HERO_RADIUS * 0.65;
          const px = CX + Math.cos(angle) * rad;
          const py = CY + Math.sin(angle) * rad;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.strokePath();
        break;
      }

      case HeroArchetype.MAGE: {
        g.strokeCircle(CX, CY, HERO_RADIUS - 2);
        break;
      }

      case HeroArchetype.CARRY: {
        g.beginPath();
        g.moveTo(CX, CY - HERO_RADIUS);
        g.lineTo(CX + HERO_RADIUS * 0.8, CY);
        g.lineTo(CX, CY + HERO_RADIUS);
        g.lineTo(CX - HERO_RADIUS * 0.8, CY);
        g.closePath();
        g.strokePath();
        break;
      }

      case HeroArchetype.SUPPORT: {
        const size = HERO_RADIUS * 1.7;
        g.strokeRoundedRect(CX - size / 2, CY - size / 2, size, size, HERO_RADIUS * 0.45);
        break;
      }
    }
  }

  private static drawHeroSymbol(g: Phaser.GameObjects.Graphics, heroId: string): void {
    switch (heroId) {
      case 'iron_guard': {
        // Shield outline
        g.lineStyle(1.5, 0xffffff, 0.5);
        g.strokeRoundedRect(CX - 3, CY - 4, 6, 8, 2);
        break;
      }

      case 'stone_golem': {
        // Boulder with crack
        g.fillStyle(0x555555, 0.6);
        g.fillCircle(CX, CY, 4);
        g.lineStyle(1, 0x333333, 0.5);
        g.beginPath();
        g.moveTo(CX - 2, CY - 1);
        g.lineTo(CX + 2, CY + 2);
        g.strokePath();
        break;
      }

      case 'shadow_blade': {
        // Dagger pointing up
        g.fillStyle(0xffffff, 0.5);
        g.beginPath();
        g.moveTo(CX - 1.5, CY + 4);
        g.lineTo(CX, CY - 4);
        g.lineTo(CX + 1.5, CY + 4);
        g.closePath();
        g.fillPath();
        break;
      }

      case 'venom_stalker': {
        // Fang marks: "\ /"
        g.lineStyle(1.5, 0xffffff, 0.5);
        g.beginPath();
        g.moveTo(CX - 4, CY - 3);
        g.lineTo(CX - 1, CY + 3);
        g.strokePath();
        g.beginPath();
        g.moveTo(CX + 4, CY - 3);
        g.lineTo(CX + 1, CY + 3);
        g.strokePath();
        break;
      }

      case 'flame_witch': {
        // Prominent flame teardrop
        g.fillStyle(0xFFFF00, 0.6);
        g.fillCircle(CX, CY + 1, 2.5);
        g.beginPath();
        g.moveTo(CX - 2.5, CY + 1);
        g.lineTo(CX, CY - 5);
        g.lineTo(CX + 2.5, CY + 1);
        g.closePath();
        g.fillStyle(0xFF8C00, 0.5);
        g.fillPath();
        break;
      }

      case 'storm_caller': {
        // Cloud (2 circles) + bolt V below
        g.fillStyle(0xffffff, 0.4);
        g.fillCircle(CX - 2, CY - 2, 3);
        g.fillCircle(CX + 2, CY - 2, 3);
        // V bolt
        g.lineStyle(1.5, 0xFFFF00, 0.5);
        g.beginPath();
        g.moveTo(CX - 2, CY + 1);
        g.lineTo(CX, CY + 4);
        g.lineTo(CX + 2, CY + 1);
        g.strokePath();
        break;
      }

      case 'blood_shaman': {
        // Skull-like: two dots (eyes) + arc (mouth)
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(CX - 3, CY - 2, 1.5);
        g.fillCircle(CX + 3, CY - 2, 1.5);
        g.lineStyle(1, 0xffffff, 0.4);
        g.beginPath();
        g.arc(CX, CY + 1, 3, 0.2, Math.PI - 0.2, false);
        g.strokePath();
        break;
      }

      case 'frost_archer': {
        // Arrowhead pointing right
        g.fillStyle(0xffffff, 0.5);
        g.beginPath();
        g.moveTo(CX - 3, CY - 3);
        g.lineTo(CX + 4, CY);
        g.lineTo(CX - 3, CY + 3);
        g.closePath();
        g.fillPath();
        break;
      }

      case 'blade_dancer': {
        // Crossed blades X
        g.lineStyle(1.5, 0xffffff, 0.5);
        g.beginPath();
        g.moveTo(CX - 4, CY - 4);
        g.lineTo(CX + 4, CY + 4);
        g.strokePath();
        g.beginPath();
        g.moveTo(CX + 4, CY - 4);
        g.lineTo(CX - 4, CY + 4);
        g.strokePath();
        break;
      }

      case 'lightning_duelist': {
        // Bold zigzag bolt
        g.lineStyle(2, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(CX - 2, CY - 6);
        g.lineTo(CX + 2, CY - 1);
        g.lineTo(CX - 2, CY + 1);
        g.lineTo(CX + 2, CY + 6);
        g.strokePath();
        break;
      }

      case 'holy_priest': {
        // Halo arc above center
        g.lineStyle(1.5, 0xFFD700, 0.6);
        g.beginPath();
        g.arc(CX, CY - 3, 5, Math.PI + 0.3, -0.3, false);
        g.strokePath();
        break;
      }

      case 'war_drummer': {
        // Two drum sticks (parallel diagonal lines)
        g.lineStyle(1.5, 0xffffff, 0.5);
        g.beginPath();
        g.moveTo(CX - 4, CY - 4);
        g.lineTo(CX + 1, CY + 4);
        g.strokePath();
        g.beginPath();
        g.moveTo(CX - 1, CY - 4);
        g.lineTo(CX + 4, CY + 4);
        g.strokePath();
        break;
      }

      case 'phantom_knight': {
        // Ghost wisp (wavy line)
        g.lineStyle(1.5, 0xffffff, 0.4);
        g.beginPath();
        g.moveTo(CX - 6, CY);
        for (let i = 1; i <= 12; i++) {
          const wx = CX - 6 + i;
          const wy = CY + Math.sin(i * 1.2) * 3;
          g.lineTo(wx, wy);
        }
        g.strokePath();
        break;
      }
    }
  }
}
