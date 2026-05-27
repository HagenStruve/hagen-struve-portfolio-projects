export class Projectile {
  constructor({ x, y, vx, vy, owner, radius = 4, damage = 1, life = 1.4, color = "rgba(68,247,255," }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
    this.radius = radius;
    this.damage = damage;
    this.life = life;
    this.color = color;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = this.owner === "player" ? "rgba(68,247,255,0.9)" : "rgba(255,79,216,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = `${this.color}0.95)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function createPlayerShot(player) {
  const dx = Math.sin(player.rotation);
  const dy = -Math.cos(player.rotation);
  const speed = player.projectileSpeed;

  return new Projectile({
    x: player.x + dx * 26,
    y: player.y + dy * 30,
    vx: dx * speed + player.vx * 0.14,
    vy: dy * speed + player.vy * 0.14,
    owner: "player",
    radius: 4.2,
    damage: 1,
    life: 1.2,
    color: "rgba(68,247,255,",
  });
}

export function createEnemyShot(enemy, player, speed) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;

  return new Projectile({
    x: enemy.x,
    y: enemy.y + 16,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    owner: "enemy",
    radius: 5,
    damage: 12,
    life: 2.2,
    color: "rgba(255,79,216,",
  });
}
