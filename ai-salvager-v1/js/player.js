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
    this.invulnerable = 0;
    this.thrustPower = 0;
    this.resetUpgrades();
  }

  resetUpgrades() {
    this.maxEnergy = 100;
    this.weaponUnlocked = false;
    this.speedLevel = 1;
    this.speedMultiplier = 1;
    this.accelerationMultiplier = 1;
    this.projectileSpeed = 720;
    this.fireRate = 0.34;
    this.shield = 0;
  }

  update(dt, input, bounds) {
    const controls = input.flightControls();
    const acceleration = 880 * this.accelerationMultiplier;
    const reverseAcceleration = 520 * this.accelerationMultiplier;
    const maxSpeed = 600 * this.speedMultiplier;
    const damping = controls.thrust || controls.reverse ? Math.pow(0.012, dt) : Math.pow(0.028, dt);
    const rotationSpeed = 3.6;

    this.rotation += controls.rotation * rotationSpeed * dt;

    const forwardX = Math.sin(this.rotation);
    const forwardY = -Math.cos(this.rotation);
    const thrustForce = controls.thrust * acceleration - controls.reverse * reverseAcceleration;

    this.vx += forwardX * thrustForce * dt;
    this.vy += forwardY * thrustForce * dt;

    this.vx *= damping;
    this.vy *= damping;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, 28, bounds.width - 28);
    this.y = clamp(this.y, 34, bounds.height - 34);

    this.rotation = normalizeAngle(this.rotation);
    this.thrustPower += ((controls.thrust || controls.reverse ? Math.abs(thrustForce) / acceleration : 0) - this.thrustPower) * Math.min(1, dt * 12);
    this.enginePulse += dt * (18 + speed * 0.018);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.shield = Math.max(0, this.shield - dt);

    const drain = controls.active ? 2.25 : -2.4;
    this.energy = clamp(this.energy - drain * dt, 0, this.maxEnergy);
  }

  heal(amount) {
    this.energy = clamp(this.energy + amount, 0, this.maxEnergy);
  }

  takeDamage(amount) {
    if (this.invulnerable > 0) return false;
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - 1.5);
      this.invulnerable = 0.28;
      return true;
    }
    this.energy = clamp(this.energy - amount, 0, this.maxEnergy);
    this.invulnerable = 0.72;
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.invulnerable > 0 ? 0.58 + Math.sin(this.enginePulse * 1.6) * 0.28 : 1;

    this.drawEngine(ctx);
    this.drawShip(ctx);
    if (this.shield > 0) this.drawShield(ctx);

    ctx.restore();
  }

  drawEngine(ctx) {
    const speed = Math.hypot(this.vx, this.vy);
    const flameLength = 18 + this.thrustPower * 26 + Math.sin(this.enginePulse) * 5 + Math.min(18, speed * 0.03);
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

  drawShield(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(68,247,255,0.42)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(68,247,255,0.85)";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, 38 + Math.sin(this.enginePulse) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function normalizeAngle(angle) {
  const full = Math.PI * 2;
  return ((angle % full) + full) % full;
}
