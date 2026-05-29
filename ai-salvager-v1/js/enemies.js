import { createEnemyShot } from "./projectiles.js";
import { scaleGlow } from "./quality.js";

const randomRange = (min, max) => min + Math.random() * (max - min);

export class Drone {
  constructor(bounds, settings, player = null) {
    this.x = randomRange(70, bounds.width - 70);
    if (player) {
      let attempts = 0;
      while (Math.abs(this.x - player.x) < 92 && attempts < 4) {
        this.x = randomRange(70, bounds.width - 70);
        attempts += 1;
      }
    }
    this.y = -42;
    this.vx = randomRange(-24, 24);
    this.vy = randomRange(36, 64);
    this.radius = 21;
    this.health = settings.scoreLevel >= 5000 ? 3 : 2;
    this.phase = randomRange(0, Math.PI * 2);
    this.fireCooldown = randomRange(0.8, settings.fireInterval);
  }

  update(dt, player, settings) {
    this.phase += dt * 3.2;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const targetVx = (dx / distance) * settings.aggression * 72;
    const targetVy = 48 + Math.max(0, dy / distance) * settings.aggression * 32;

    this.vx += (targetVx - this.vx) * Math.min(1, dt * 1.5);
    this.vy += (targetVy - this.vy) * Math.min(1, dt * 1.2);
    this.x += this.vx * dt + Math.sin(this.phase) * 10 * dt;
    this.y += this.vy * dt;

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && this.y > 24) {
      this.fireCooldown = settings.fireInterval * randomRange(0.85, 1.2);
      return createEnemyShot(this, player, settings.projectileSpeed);
    }

    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = "lighter";

    ctx.shadowColor = "rgba(255,79,216,0.7)";
    ctx.shadowBlur = scaleGlow(22);
    ctx.fillStyle = "rgba(35, 18, 64, 0.92)";
    ctx.strokeStyle = "rgba(255, 127, 231, 0.82)";
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(22, -3);
    ctx.lineTo(13, 18);
    ctx.lineTo(-13, 18);
    ctx.lineTo(-22, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
