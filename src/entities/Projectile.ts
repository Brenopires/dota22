import Phaser from 'phaser';
import { PROJECTILE_RADIUS } from '../constants';
import { Team, AbilityDef } from '../types';
import { Hero } from './Hero';

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
  }

  update(): void {
    // Trail visual
    const radius = this.abilityDef.radius || PROJECTILE_RADIUS;
    const trail = this.scene.add.circle(this.x, this.y, radius * 0.6, this.fillColor, 0.4);
    trail.setDepth(4);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 200,
      onComplete: () => trail.destroy(),
    });

    // Destroy if traveled max distance
    const dist = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
    if (dist >= this.maxDistance) {
      this.destroy();
    }
  }
}
