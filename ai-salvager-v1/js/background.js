const randomRange = (min, max) => min + Math.random() * (max - min);

export class SpaceBackground {
  constructor(width, height) {
    this.layers = [
      this.createStars(90, 0.18, 1.1),
      this.createStars(60, 0.36, 1.8),
      this.createStars(36, 0.7, 2.7),
    ];
    this.nebulaOffset = 0;
    this.resize(width, height);
  }

  createStars(count, speed, size) {
    return Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: randomRange(0.45, size),
      speed,
      pulse: randomRange(0, Math.PI * 2),
    }));
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  update(dt) {
    this.nebulaOffset += dt * 8;

    for (const layer of this.layers) {
      for (const star of layer) {
        star.y += (star.speed * dt * 0.018);
        star.pulse += dt * 1.5;
        if (star.y > 1.05) {
          star.y = -0.05;
          star.x = Math.random();
        }
      }
    }
  }

  draw(ctx) {
    const gradient = ctx.createRadialGradient(
      this.width * 0.55,
      this.height * 0.38,
      30,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height)
    );
    gradient.addColorStop(0, "#16245c");
    gradient.addColorStop(0.42, "#07122b");
    gradient.addColorStop(1, "#030612");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawNebula(ctx);

    for (const layer of this.layers) {
      for (const star of layer) {
        const alpha = 0.35 + Math.sin(star.pulse) * 0.22;
        ctx.beginPath();
        ctx.fillStyle = `rgba(210, 250, 255, ${alpha})`;
        ctx.arc(star.x * this.width, star.y * this.height, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawNebula(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const blobs = [
      { x: 0.18, y: 0.28, r: 0.42, color: "rgba(68, 247, 255, 0.055)" },
      { x: 0.80, y: 0.25, r: 0.34, color: "rgba(255, 79, 216, 0.05)" },
      { x: 0.55, y: 0.78, r: 0.46, color: "rgba(85, 119, 255, 0.06)" },
    ];

    for (const blob of blobs) {
      const x = blob.x * this.width + Math.sin(this.nebulaOffset * 0.01 + blob.x) * 24;
      const y = blob.y * this.height + Math.cos(this.nebulaOffset * 0.012 + blob.y) * 18;
      const radius = blob.r * Math.max(this.width, this.height);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }
}
