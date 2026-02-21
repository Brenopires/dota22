import Phaser from 'phaser';
import { ParticlePresets, ElementType } from './ParticlePresets';
import { HERO_ELEMENT_MAP } from '../constants';

export class VFXManager {
  private scene: Phaser.Scene;
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private ambientEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  static getElement(heroId: string): ElementType {
    return (HERO_ELEMENT_MAP[heroId] as ElementType) || 'generic';
  }

  spawnBurst(x: number, y: number, element: ElementType, count: number = 12, heroColor?: number): void {
    const config = ParticlePresets.burstConfig(element, count, heroColor);
    this.emitOnce(x, y, config);
  }

  spawnImpact(x: number, y: number, element: ElementType, heroColor?: number): void {
    const config = ParticlePresets.impactConfig(element, heroColor);
    this.emitOnce(x, y, config);
  }

  spawnDeathExplosion(x: number, y: number, color: number): void {
    const config = ParticlePresets.deathConfig(color);
    this.emitOnce(x, y, config);

    // White flash expanding
    const flash = this.scene.add.circle(x, y, 10, 0xffffff, 0.8);
    flash.setDepth(50);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  createTrail(target: Phaser.GameObjects.GameObject & { x: number; y: number }, element: ElementType, heroColor?: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const config = ParticlePresets.trailConfig(element, heroColor);
    const tint = config.tint;

    const emitter = this.scene.add.particles(0, 0, config.texture, {
      follow: target,
      tint: { onEmit: () => tint[Math.floor(Math.random() * tint.length)] },
      blendMode: config.blendMode,
      lifespan: config.lifespan,
      speed: config.speed,
      scale: config.scale,
      alpha: config.alpha,
      quantity: config.quantity,
      frequency: config.frequency ?? 30,
    });
    emitter.setDepth(4);
    this.emitters.push(emitter);
    return emitter;
  }

  createAreaParticles(x: number, y: number, radius: number, element: ElementType, duration: number, heroColor?: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const config = ParticlePresets.areaFillConfig(element, heroColor);
    const tint = config.tint;

    const emitter = this.scene.add.particles(x, y, config.texture, {
      tint: { onEmit: () => tint[Math.floor(Math.random() * tint.length)] },
      blendMode: config.blendMode,
      lifespan: config.lifespan,
      speed: config.speed,
      scale: config.scale,
      alpha: config.alpha,
      quantity: config.quantity,
      frequency: config.frequency ?? 100,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, radius),
      } as any,
    });
    emitter.setDepth(2);
    this.emitters.push(emitter);

    this.scene.time.delayedCall(duration * 1000, () => {
      emitter.stop();
      this.scene.time.delayedCall(config.lifespan, () => {
        emitter.destroy();
        const idx = this.emitters.indexOf(emitter);
        if (idx !== -1) this.emitters.splice(idx, 1);
      });
    });

    return emitter;
  }

  createAmbientParticles(theme: string, bounds: { x: number; y: number; width: number; height: number }): void {
    const config = ParticlePresets.ambientConfig(theme);
    const tint = config.tint;

    this.ambientEmitter = this.scene.add.particles(0, 0, config.texture, {
      tint: { onEmit: () => tint[Math.floor(Math.random() * tint.length)] },
      blendMode: config.blendMode,
      lifespan: config.lifespan,
      speed: config.speed,
      scale: config.scale,
      alpha: config.alpha,
      quantity: config.quantity,
      frequency: config.frequency ?? 400,
      gravityY: config.gravityY ?? 0,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
      } as any,
    });
    this.ambientEmitter.setDepth(0);
  }

  screenFlash(color: number, duration: number = 200, intensity: number = 0.5): void {
    this.scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, false, undefined, intensity);
  }

  directionalShake(angle: number, intensity: number = 0.005, duration: number = 300): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  slowMotion(duration: number, timeScale: number = 0.3): void {
    this.scene.time.timeScale = timeScale;
    this.scene.tweens.timeScale = timeScale;
    this.scene.physics.world.timeScale = 1 / timeScale;

    this.scene.time.delayedCall(duration * timeScale, () => {
      this.scene.time.timeScale = 1;
      this.scene.tweens.timeScale = 1;
      this.scene.physics.world.timeScale = 1;
    });
  }

  zoomPulse(duration: number = 500, zoomAmount: number = 0.04): void {
    const cam = this.scene.cameras.main;
    const baseZoom = cam.zoom;
    this.scene.tweens.add({
      targets: cam,
      zoom: baseZoom + zoomAmount,
      duration: duration / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    for (const emitter of this.emitters) {
      if (emitter.active) emitter.destroy();
    }
    this.emitters = [];
    if (this.ambientEmitter?.active) {
      this.ambientEmitter.destroy();
    }
    this.ambientEmitter = null;
  }

  private emitOnce(x: number, y: number, config: ReturnType<typeof ParticlePresets.burstConfig>): void {
    const tint = config.tint;
    const emitter = this.scene.add.particles(x, y, config.texture, {
      tint: { onEmit: () => tint[Math.floor(Math.random() * tint.length)] },
      blendMode: config.blendMode,
      lifespan: config.lifespan,
      speed: config.speed,
      scale: config.scale,
      alpha: config.alpha,
      gravityY: config.gravityY ?? 0,
      angle: config.angle ?? { min: 0, max: 360 },
      emitting: false,
    });
    emitter.setDepth(10);
    emitter.explode(config.quantity, 0, 0);

    this.scene.time.delayedCall(config.lifespan + 100, () => {
      emitter.destroy();
    });
  }
}
