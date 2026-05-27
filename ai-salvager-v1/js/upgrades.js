const randomRange = (min, max) => min + Math.random() * (max - min);

const DROP_TYPES = ["weapon", "engine", "energy", "shield"];

export class UpgradePart {
  constructor(bounds, type = randomDropType(), x = null, y = null) {
    this.type = type;
    this.x = x ?? randomRange(58, bounds.width - 58);
    this.y = y ?? randomRange(82, bounds.height * 0.72);
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

    const palette = dropPalette(this.type);
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = palette.fill;
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    const sides = this.type === "energy" ? 4 : this.type === "shield" ? 8 : 6;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
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

export function createDroppedPart(bounds, x, y, source = "asteroid") {
  return new UpgradePart(bounds, weightedDropType(source), x, y);
}

export function applyUpgrade(player, type) {
  if (type === "weapon") {
    if (player.weaponUnlocked) {
      player.fireRate = Math.max(0.16, player.fireRate - 0.045);
      player.projectileSpeed = Math.min(1040, player.projectileSpeed + 70);
      return "WEAPON CORE";
    }
    player.weaponUnlocked = true;
    return "WEAPON ONLINE";
  }

  if (type === "engine") {
    player.speedLevel = Math.min(5, player.speedLevel + 1);
    player.speedMultiplier = 1 + (player.speedLevel - 1) * 0.12;
    player.accelerationMultiplier = 1 + (player.speedLevel - 1) * 0.07;
    return "ENGINE UPGRADE";
  }

  if (type === "energy") {
    player.maxEnergy = Math.min(140, player.maxEnergy + 8);
    player.heal(34);
    return "ENERGY RESTORED";
  }

  player.shield = Math.max(player.shield, 7);
  return "SHIELD ACTIVE";
}

function randomDropType() {
  return DROP_TYPES[Math.floor(Math.random() * DROP_TYPES.length)];
}

function weightedDropType(source) {
  const roll = Math.random();
  if (source === "enemy") {
    if (roll < 0.34) return "weapon";
    if (roll < 0.62) return "engine";
    if (roll < 0.82) return "shield";
    return "energy";
  }

  if (roll < 0.34) return "engine";
  if (roll < 0.58) return "energy";
  if (roll < 0.78) return "shield";
  return "weapon";
}

function dropPalette(type) {
  if (type === "weapon") {
    return {
      fill: "rgba(186, 218, 232, 0.92)",
      stroke: "rgba(68, 247, 255, 0.9)",
      shadow: "rgba(68, 247, 255, 0.62)",
    };
  }

  if (type === "engine") {
    return {
      fill: "rgba(190, 202, 220, 0.9)",
      stroke: "rgba(255, 189, 86, 0.9)",
      shadow: "rgba(255, 189, 86, 0.62)",
    };
  }

  if (type === "energy") {
    return {
      fill: "rgba(146, 255, 204, 0.88)",
      stroke: "rgba(104, 255, 171, 0.92)",
      shadow: "rgba(104, 255, 171, 0.62)",
    };
  }

  return {
    fill: "rgba(169, 183, 255, 0.9)",
    stroke: "rgba(168, 85, 255, 0.92)",
    shadow: "rgba(168, 85, 255, 0.62)",
  };
}
