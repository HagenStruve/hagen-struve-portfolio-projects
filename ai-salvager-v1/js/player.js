const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 22;
    this.rotation = 0;
    this.energy = 100;
    this.enginePulse = 0;
  }

  update(dt, input, bounds) {
    const axis = input.axis();
    const speed = 760;
    const damping = Math.pow(0.001, dt);

    this.vx += axis.x * speed * dt;
    this.vy += axis.y * speed * dt;

    if (input.pointer.active) {
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 16) {
        this.vx += (dx / distance) * speed * 0.62 * dt;
        this.vy += (dy / distance) * speed * 0.62 * dt;
      }
    }

    this.vx *= damping;
    this.vy *= damping;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, 28, bounds.width - 28);
    this.y = clamp(this.y, 34, bounds.height - 34);

    const targetRotation = clamp(this.vx * 0.004, -0.62, 0.62);
    this.rotation += (targetRotation - this.rotation) * Math.min(1, dt * 10);
    this.enginePulse += dt * 18;

    const drain = (Math.abs(axis.x) + Math.abs(axis.y) > 0 || input.pointer.active) ? 1.8 : -4;
    this.energy = clamp(this.energy - drain * dt, 0, 100);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    this.drawEngine(ctx);
    this.drawShip(ctx);

    ctx.restore();
  }

  drawEngine(ctx) {
    const flameLength = 32 + Math.sin(this.enginePulse) * 7;
    const gradient = ctx.createLinearGradient(0, 20, 0, 20 + flameLength);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.25, "rgba(68,247,255,0.72)");
    gradient.addColorStop(1, "rgba(255,79,216,0)");

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-9, 20);
    ctx.quadraticCurveTo(0, 20 + flameLength, 9, 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawShip(ctx) {
    ctx.save();
    ctx.shadowColor = "rgba(68,247,255,0.85)";
    ctx.shadowBlur = 24;

    const body = ctx.createLinearGradient(0, -28, 0, 28);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.3, "#7ff8ff");
    body.addColorStop(0.75, "#5268ff");
    body.addColorStop(1, "#201a68");

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -31);
    ctx.lineTo(24, 23);
    ctx.lineTo(7, 14);
    ctx.lineTo(0, 31);
    ctx.lineTo(-7, 14);
    ctx.lineTo(-24, 23);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "rgba(239,247,255,0.72)";
    ctx.stroke();

    ctx.shadowColor = "rgba(255,79,216,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -4, 6.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
