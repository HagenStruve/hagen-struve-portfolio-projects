const randomRange = (min, max) => min + Math.random() * (max - min);

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.thrusterClock = 0;
  }

  emitBurst(x, y, color, count = 18, power = 190) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(power * 0.28, power);
      const life = randomRange(0.38, 0.82);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: randomRange(1.5, 4.8),
        life,
        maxLife: life,
        color,
      });
    }
  }

  emitThruster(player, dt) {
    if (player.thrustPower <= 0.05) return;
    const speed = Math.hypot(player.vx, player.vy);
    const threshold = speed > 460 ? 0.010 : 0.018;
    this.thrusterClock += dt;
    if (this.thrusterClock < threshold) return;
    this.thrusterClock = 0;

    const backX = player.x - Math.sin(player.rotation) * 18;
    const backY = player.y + Math.cos(player.rotation) * 24;
    const backVx = -Math.sin(player.rotation);
    const backVy = Math.cos(player.rotation);
    const life = randomRange(0.22, 0.42);
    this.particles.push({
      x: backX + randomRange(-7, 7),
      y: backY + randomRange(-2, 8),
      vx: backVx * randomRange(92, 178) + randomRange(-30, 30) - player.vx * 0.06,
      vy: backVy * randomRange(92, 178) + randomRange(-30, 30) - player.vy * 0.06,
      radius: randomRange(1.3, speed > 460 ? 4.8 : 3.5),
      life,
      maxLife: life,
      color: "rgba(68,247,255,",
    });
  }

  update(dt) {
    for (const particle of this.particles) {
      if (!particle.maxLife) particle.maxLife = particle.life;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.12, dt);
      particle.vy *= Math.pow(0.12, dt);
      particle.life -= dt;
    }

    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = `${particle.color}${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (0.65 + alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.thrusterClock = 0;
  }
}
