import { scaleGlow } from "./quality.js";

const randomRange = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class Fragment {
  constructor(bounds, hazards = []) {
    const riskyHazard = hazards.length && Math.random() > 0.55
      ? hazards[Math.floor(Math.random() * hazards.length)]
      : null;

    if (riskyHazard) {
      const angle = randomRange(0, Math.PI * 2);
      const distance = randomRange(86, 152);
      this.x = clamp(riskyHazard.x + Math.cos(angle) * distance, 54, bounds.width - 54);
      this.y = clamp(riskyHazard.y + Math.sin(angle) * distance, 78, bounds.height * 0.78);
      this.value = 125;
      this.risky = true;
    } else {
      this.x = randomRange(54, bounds.width - 54);
      this.y = randomRange(76, bounds.height * 0.78);
      this.value = 100;
      this.risky = false;
    }

    this.vx = randomRange(-24, 24);
    this.vy = randomRange(18, 52);
    this.radius = 15;
    this.phase = randomRange(0, Math.PI * 2);
  }

  update(dt, bounds) {
    this.phase += dt * 4.2;
    this.x += this.vx * dt + Math.sin(this.phase) * 18 * dt;
    this.y += this.vy * dt;

    if (this.y > bounds.height + 60) {
      this.y = -40;
      this.x = randomRange(54, bounds.width - 54);
    }
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.phase) * 0.12;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.phase * 0.35);
    ctx.scale(pulse, pulse);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 42);
    glow.addColorStop(0, "rgba(255,255,255,0.9)");
    glow.addColorStop(0.22, this.risky ? "rgba(255,255,255,0.72)" : "rgba(68,247,255,0.5)");
    glow.addColorStop(1, "rgba(68,247,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(122, 252, 255, 0.95)";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export class Asteroid {
  constructor(bounds, speedMultiplier = 1, player = null) {
    const roll = Math.random();
    const variant = roll > 0.72 ? "small-fast" : roll > 0.34 ? "medium" : "large-slow";
    const radius = variant === "small-fast"
      ? randomRange(16, 28)
      : variant === "large-slow"
        ? randomRange(48, 70)
        : randomRange(28, 46);
    const fromSide = Math.random() > (variant === "small-fast" ? 0.54 : 0.68);

    this.radius = radius;
    this.x = fromSide
      ? (Math.random() > 0.5 ? bounds.width + radius : -radius)
      : randomRange(radius, bounds.width - radius);
    this.y = fromSide ? randomRange(60, bounds.height * 0.52) : -radius;

    if (player && !fromSide) {
      let attempts = 0;
      while (Math.abs(this.x - player.x) < 86 && attempts < 4) {
        this.x = randomRange(radius, bounds.width - radius);
        attempts += 1;
      }
    }
    const sideDrift = variant === "small-fast" ? randomRange(96, 170) : randomRange(58, 128);
    const topDrift = variant === "large-slow" ? randomRange(-42, 42) : randomRange(-82, 82);
    const verticalSpeed = variant === "small-fast"
      ? randomRange(142, 245)
      : variant === "large-slow"
        ? randomRange(62, 112)
        : randomRange(98, 170);

    this.vx = (fromSide
      ? (this.x > bounds.width ? -sideDrift : sideDrift)
      : topDrift) * speedMultiplier;
    this.vy = verticalSpeed * speedMultiplier;
    this.rotation = randomRange(0, Math.PI * 2);
    this.spin = randomRange(-1.2, 1.2);
    this.damage = Math.round(radius * (variant === "small-fast" ? 0.32 : 0.38));
    this.sides = Math.floor(randomRange(8, 13));
    this.seed = Math.random() * 99;
    this.variant = variant;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = "rgba(255,79,216,0.34)";
    ctx.shadowBlur = scaleGlow(22);
    ctx.fillStyle = "rgba(76, 82, 114, 0.92)";
    ctx.strokeStyle = "rgba(255, 176, 235, 0.42)";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for (let i = 0; i < this.sides; i++) {
      const angle = (i / this.sides) * Math.PI * 2;
      const rough = 0.74 + Math.sin(i * 2.17 + this.seed) * 0.14 + Math.cos(i * 1.43) * 0.08;
      const r = this.radius * rough;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(-this.radius * 0.18, -this.radius * 0.12, this.radius * 0.32, 0, Math.PI * 1.4);
    ctx.stroke();

    ctx.restore();
  }
}
