import Phaser from 'phaser';

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
    const cx = 6, cy = 6, outer = 6, inner = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 === 0 ? outer : inner;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
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
  }
}
