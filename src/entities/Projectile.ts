import Phaser from 'phaser';
import { PROJECTILE_RADIUS } from '../constants';
import { Team, AbilityDef } from '../types';
import { Hero } from './Hero';
import { VFXManager } from '../systems/VFXManager';

export class Projectile extends Phaser.GameObjects.Arc {
  abilityDef: AbilityDef;
  ownerTeam: Team;
  ownerId: string;
  damage: number;
  speed: number;
  body!: Phaser.Physics.Arcade.Body;
  private maxDistance: number;
  private startX: number;
  private startY: number;
  private glowImage: Phaser.GameObjects.Image | null = null;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  heroColor: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    ability: AbilityDef,
    owner: Hero
  ) {
    const color = owner.stats.color;
    super(scene, x, y, ability.radius || PROJECTILE_RADIUS, 0, 360, false, color);

    this.abilityDef = ability;
    this.ownerTeam = owner.team;
    this.ownerId = owner.getUniqueId();
    this.damage = ability.damage || 0;
    this.speed = ability.projectileSpeed || 400;
    this.maxDistance = ability.range || 400;
    this.startX = x;
    this.startY = y;
    this.heroColor = color;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCircle(ability.radius || PROJECTILE_RADIUS);
    this.body.setCollideWorldBounds(true);
    this.body.onWorldBounds = true;

    // Set velocity
    const vx = Math.cos(angle) * this.speed;
    const vy = Math.sin(angle) * this.speed;
    this.body.setVelocity(vx, vy);

    this.setDepth(5);

    // Glow behind projectile
    if (scene.textures.exists('glow_circle')) {
      this.glowImage = scene.add.image(x, y, 'glow_circle');
      this.glowImage.setTint(color);
      this.glowImage.setAlpha(0.4);
      this.glowImage.setBlendMode(Phaser.BlendModes.ADD);
      this.glowImage.setScale(1.2);
      this.glowImage.setDepth(4);
    }

    // Particle trail
    const battleScene = scene as any;
    if (battleScene.vfxManager) {
      const element = VFXManager.getElement(owner.stats.id);
      this.trailEmitter = battleScene.vfxManager.createTrail(this, element, color);
    }
  }

  update(): void {
    // Update glow position
    if (this.glowImage) {
      this.glowImage.setPosition(this.x, this.y);
    }

    // Destroy if traveled max distance
    const dist = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
    if (dist >= this.maxDistance) {
      this.destroyProjectile();
    }
  }

  destroyProjectile(): void {
    // Impact particles
    const battleScene = this.scene as any;
    if (battleScene.vfxManager) {
      const element = VFXManager.getElement(this.abilityDef.id?.split('_')[0] || '');
      battleScene.vfxManager.spawnImpact(this.x, this.y, element, this.heroColor);
    }

    if (this.glowImage) {
      this.glowImage.destroy();
      this.glowImage = null;
    }
    if (this.trailEmitter) {
      this.trailEmitter.stop();
      this.scene.time.delayedCall(400, () => {
        if (this.trailEmitter?.active) this.trailEmitter.destroy();
      });
      this.trailEmitter = null;
    }
    this.destroy();
  }

  preDestroy(): void {
    if (this.glowImage?.active) {
      this.glowImage.destroy();
    }
    if (this.trailEmitter?.active) {
      this.trailEmitter.stop();
      const emitter = this.trailEmitter;
      this.scene?.time?.delayedCall(400, () => {
        if (emitter?.active) emitter.destroy();
      });
    }
  }
}
