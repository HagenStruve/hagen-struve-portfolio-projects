const randomRange = (min, max) => min + Math.random() * (max - min);

export class UpgradePart {
  constructor(bounds) {
    this.x = randomRange(58, bounds.width - 58);
    this.y = randomRange(82, bounds.height * 0.72);
    this.vx = randomRange(-18, 18);
    this.vy = randomRange(20, 46);
    this.radius = 17;
    this.rotation = randomRange(0, Math.PI * 2);
    this.spin = randomRange(-1.8, 1.8);
  }

  update(dt, bounds) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;

    if (this.y > bounds.height + 70) {
      this.y = -50;
      this.x = randomRange(58, bounds.width - 58);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalCompositeOperation = "lighter";

    ctx.shadowColor = "rgba(255, 189, 86, 0.58)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(178, 185, 202, 0.9)";
    ctx.strokeStyle = "rgba(255, 222, 154, 0.82)";
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = i % 2 ? 13 : 18;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "rgba(20, 24, 40, 0.82)";
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.stroke();

    ctx.restore();
  }
}

export function applyRandomUpgrade(player) {
  const pool = [
    "speed",
    "energy",
    "projectileSpeed",
    "fireRate",
    "shield",
  ];

  if (!player.weaponUnlocked) pool.unshift("weapon", "weapon", "weapon");

  const upgrade = pool[Math.floor(Math.random() * pool.length)];

  if (upgrade === "weapon") {
    player.weaponUnlocked = true;
    return "WEAPON ONLINE";
  }

  if (upgrade === "speed") {
    player.speedLevel += 1;
    player.speedMultiplier = Math.min(1.34, player.speedMultiplier + 0.08);
    return `SPEED LV ${player.speedLevel}`;
  }

  if (upgrade === "energy") {
    player.maxEnergy = Math.min(140, player.maxEnergy + 12);
    player.heal(16);
    return `ENERGY ${player.maxEnergy}`;
  }

  if (upgrade === "projectileSpeed") {
    player.projectileSpeed = Math.min(1040, player.projectileSpeed + 90);
    return "PROJECTILE BOOST";
  }

  if (upgrade === "fireRate") {
    player.fireRate = Math.max(0.16, player.fireRate - 0.04);
    return "FIRE RATE UP";
  }

  player.shield = Math.max(player.shield, 6);
  return "SHIELD ACTIVE";
}
