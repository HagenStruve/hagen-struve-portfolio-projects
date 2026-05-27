import { Renderer } from "./renderer.js";
import { Input } from "./input.js";
import { SpaceBackground } from "./background.js";
import { Player } from "./player.js";
import { Fragment, Asteroid } from "./entities.js";
import { circleCollision, outsideBounds } from "./collision.js";
import { ParticleSystem } from "./particles.js";
import { UpgradePart, applyUpgrade, createDroppedPart } from "./upgrades.js";
import { createPlayerShot } from "./projectiles.js";
import { Drone } from "./enemies.js";

const canvas = document.querySelector("#gameCanvas");
const startScreen = document.querySelector("#startScreen");
const pauseScreen = document.querySelector("#pauseScreen");
const gameOverScreen = document.querySelector("#gameOverScreen");
const hud = document.querySelector("#hud");
const startButton = document.querySelector("#startButton");
const resumeButton = document.querySelector("#resumeButton");
const restartButton = document.querySelector("#restartButton");
const howToButton = document.querySelector("#howToButton");
const howToPanel = document.querySelector("#howToPanel");
const energyFill = document.querySelector("#energyFill");
const scoreText = document.querySelector("#scoreText");
const statusText = document.querySelector("#statusText");
const abilityText = document.querySelector("#abilityText");
const shieldText = document.querySelector("#shieldText");
const finalScore = document.querySelector("#finalScore");
const finalTime = document.querySelector("#finalTime");
const collectFlash = document.querySelector("#collectFlash");
const damageFlash = document.querySelector("#damageFlash");
const fireButton = document.querySelector("#fireButton");
const energyPanel = energyFill.closest(".hud__panel");
const scorePanel = scoreText.closest(".hud__panel");

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const background = new SpaceBackground(renderer.width, renderer.height);
const player = new Player(renderer.width * 0.5, renderer.height * 0.62);
const particles = new ParticleSystem();

const game = {
  state: "menu",
  lastTime: 0,
  score: 0,
  displayScore: 0,
  elapsed: 0,
  fragmentTimer: 0,
  partTimer: 7,
  asteroidTimer: 1.2,
  enemyTimer: 2.5,
  weaponTimer: 0,
  difficulty: {
    level: 1,
    spawnInterval: 1.65,
    asteroidSpeedMultiplier: 1,
    maxAsteroids: 6,
  },
  shake: 0,
  fragments: [],
  parts: [],
  asteroids: [],
  enemies: [],
  playerProjectiles: [],
  enemyProjectiles: [],
  statusLock: 0,
  status: "SCANNING",
};

function setState(nextState) {
  game.state = nextState;

  startScreen.classList.toggle("screen--active", nextState === "menu");
  pauseScreen.classList.toggle("screen--active", nextState === "pause");
  gameOverScreen.classList.toggle("screen--active", nextState === "gameover");
  hud.classList.toggle("hud--hidden", nextState !== "playing");
}

function startGame() {
  player.x = renderer.width * 0.5;
  player.y = renderer.height * 0.62;
  player.vx = 0;
  player.vy = 0;
  player.rotation = 0;
  player.resetUpgrades();
  player.energy = 100;
  player.invulnerable = 0;
  game.score = 0;
  game.displayScore = 0;
  game.elapsed = 0;
  game.fragmentTimer = 0;
  game.partTimer = 5.5;
  game.asteroidTimer = 1;
  game.enemyTimer = 2.5;
  game.weaponTimer = 0;
  game.difficulty = getDifficulty();
  game.shake = 0;
  game.fragments = [];
  game.parts = [];
  game.asteroids = [];
  game.enemies = [];
  game.playerProjectiles = [];
  game.enemyProjectiles = [];
  game.statusLock = 0;
  game.status = "SCANNING";
  particles.clear();

  for (let i = 0; i < 4; i++) spawnFragment();
  setState("playing");
}

function togglePause() {
  if (game.state === "playing") setState("pause");
  else if (game.state === "pause") setState("playing");
}

startButton.addEventListener("click", startGame);
resumeButton.addEventListener("click", () => setState("playing"));
restartButton.addEventListener("click", startGame);
howToButton.addEventListener("click", () => howToPanel.classList.toggle("howto--open"));
fireButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  input.queueFire();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") togglePause();
  if (event.key === "Enter" && game.state === "menu") startGame();
  if (event.key === "Enter" && game.state === "gameover") startGame();
});

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function spawnFragment() {
  if (game.fragments.length >= 5) return;
  game.fragments.push(new Fragment(renderer, game.asteroids));
}

function spawnPart() {
  if (game.parts.length >= 2) return;
  game.parts.push(new UpgradePart(renderer));
}

function maybeDropPart(x, y, source = "asteroid") {
  const combat = getCombatDifficulty();
  const chance = source === "enemy"
    ? Math.min(0.78, 0.48 + combat.maxEnemies * 0.08)
    : 0.18;

  if (Math.random() > chance || game.parts.length >= 4) return;

  game.parts.push(createDroppedPart(renderer, x, y, source));
}

function spawnAsteroid() {
  if (game.asteroids.length >= game.difficulty.maxAsteroids) return;
  game.asteroids.push(new Asteroid(renderer, game.difficulty.asteroidSpeedMultiplier));
}

function spawnEnemy() {
  const settings = getCombatDifficulty();
  if (settings.maxEnemies === 0 || game.enemies.length >= settings.maxEnemies) return;
  game.enemies.push(new Drone(renderer, settings));
}

function addScore(amount) {
  game.score += amount;
  flashPanel(scorePanel);
}

function flashPanel(panel) {
  panel.classList.remove("hud__panel--flash");
  void panel.offsetWidth;
  panel.classList.add("hud__panel--flash");
}

function triggerFlash(element) {
  element.classList.add("is-active");
  window.setTimeout(() => element.classList.remove("is-active"), 90);
}

function setMomentaryStatus(status, seconds = 0.7) {
  game.status = status;
  game.statusLock = seconds;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function endGame() {
  finalScore.textContent = Math.floor(game.score).toString().padStart(4, "0");
  finalTime.textContent = formatTime(game.elapsed);
  setState("gameover");
}

function getDifficulty() {
  const level = game.elapsed >= 60 ? 4 : game.elapsed >= 40 ? 3 : game.elapsed >= 20 ? 2 : 1;
  return {
    level,
    spawnInterval: Math.max(0.58, 1.62 - (level - 1) * 0.24 - game.elapsed * 0.006),
    asteroidSpeedMultiplier: 1 + (level - 1) * 0.18 + Math.min(0.28, game.elapsed * 0.003),
    maxAsteroids: Math.min(10, 5 + level),
  };
}

function getCombatDifficulty() {
  const score = game.score;
  if (score < 1000) {
    return { scoreLevel: score, maxEnemies: 0, spawnInterval: 99, fireInterval: 2.5, aggression: 0.45, projectileSpeed: 230 };
  }

  if (score < 2000) {
    return { scoreLevel: score, maxEnemies: 1, spawnInterval: 5.8, fireInterval: 2.45, aggression: 0.48, projectileSpeed: 240 };
  }

  if (score < 3500) {
    return { scoreLevel: score, maxEnemies: 1, spawnInterval: 4.6, fireInterval: 1.9, aggression: 0.58, projectileSpeed: 285 };
  }

  if (score < 5000) {
    return { scoreLevel: score, maxEnemies: 2, spawnInterval: 4.2, fireInterval: 1.55, aggression: 0.68, projectileSpeed: 330 };
  }

  return { scoreLevel: score, maxEnemies: 3, spawnInterval: 3.6, fireInterval: 1.2, aggression: 0.82, projectileSpeed: 390 };
}

function update(dt) {
  background.resize(renderer.width, renderer.height);
  background.update(dt);
  particles.update(dt);

  if (game.state === "playing") {
    game.elapsed += dt;
    game.difficulty = getDifficulty();
    game.statusLock = Math.max(0, game.statusLock - dt);

    player.update(dt, input, renderer);
    particles.emitThruster(player, dt);
    applySpeedFeel(dt);
    game.weaponTimer = Math.max(0, game.weaponTimer - dt);
    handleShooting();

    game.fragmentTimer -= dt;
    if (game.fragmentTimer <= 0) {
      spawnFragment();
      game.fragmentTimer = randomRange(1.05, 1.85) - Math.min(0.38, game.elapsed * 0.004);
    }

    game.partTimer -= dt;
    if (game.partTimer <= 0) {
      spawnPart();
      game.partTimer = randomRange(9, 14);
    }

    game.asteroidTimer -= dt;
    if (game.asteroidTimer <= 0) {
      spawnAsteroid();
      game.asteroidTimer = randomRange(game.difficulty.spawnInterval * 0.72, game.difficulty.spawnInterval * 1.22);
    }

    const combat = getCombatDifficulty();
    game.enemyTimer -= dt;
    if (game.enemyTimer <= 0) {
      if (combat.maxEnemies > 0) {
        spawnEnemy();
        game.enemyTimer = randomRange(combat.spawnInterval * 0.75, combat.spawnInterval * 1.25);
      } else {
        game.enemyTimer = 0.8;
      }
    }

    for (const fragment of game.fragments) fragment.update(dt, renderer);
    for (const part of game.parts) part.update(dt, renderer);
    for (const asteroid of game.asteroids) asteroid.update(dt);
    updateProjectiles(dt);
    updateEnemies(dt, combat);

    handleCollisions();

    game.asteroids = game.asteroids.filter((asteroid) => !outsideBounds(asteroid, renderer));
    game.enemies = game.enemies.filter((enemy) => !outsideBounds(enemy, renderer, 160));
    game.playerProjectiles = game.playerProjectiles.filter((projectile) => projectile.life > 0 && !outsideBounds(projectile, renderer, 80));
    game.enemyProjectiles = game.enemyProjectiles.filter((projectile) => projectile.life > 0 && !outsideBounds(projectile, renderer, 80));
    game.displayScore += (game.score - game.displayScore) * Math.min(1, dt * 8);
    updateStatus();

    if (player.energy <= 0) endGame();
  }
}

function handleShooting() {
  if (!input.consumeFire() || !player.weaponUnlocked || game.weaponTimer > 0) return;

  game.playerProjectiles.push(createPlayerShot(player));
  game.weaponTimer = player.fireRate;
  particles.emitBurst(player.x, player.y - 18, "rgba(68,247,255,", 8, 120);
  game.shake = Math.max(game.shake, 0.7);
}

function updateProjectiles(dt) {
  for (const projectile of game.playerProjectiles) projectile.update(dt);
  for (const projectile of game.enemyProjectiles) projectile.update(dt);
}

function updateEnemies(dt, settings) {
  for (const enemy of game.enemies) {
    const shot = enemy.update(dt, player, settings);
    if (shot) game.enemyProjectiles.push(shot);
  }
}

function applySpeedFeel(dt) {
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > 610) {
    game.shake = Math.max(game.shake, 1.1);
  }

  const nearMiss = game.asteroids.some((asteroid) => {
    const distance = Math.hypot(asteroid.x - player.x, asteroid.y - player.y);
    return distance > player.radius + asteroid.radius && distance < player.radius + asteroid.radius + 22;
  });

  if (nearMiss) {
    game.shake = Math.max(game.shake, 1.6);
  }

  game.shake = Math.max(0, game.shake - dt * 4);
}

function handleCollisions() {
  game.fragments = game.fragments.filter((fragment) => {
    if (!circleCollision(player, fragment)) return true;

    addScore(fragment.value);
    player.heal(fragment.risky ? 4 : 3);
    particles.emitBurst(fragment.x, fragment.y, "rgba(68,247,255,", fragment.risky ? 32 : 26, fragment.risky ? 300 : 250);
    triggerFlash(collectFlash);
    flashPanel(energyPanel);
    setMomentaryStatus("SALVAGING");
    return false;
  });

  game.parts = game.parts.filter((part) => {
    if (!circleCollision(player, part)) return true;

    const label = applyUpgrade(player, part.type);
    particles.emitBurst(part.x, part.y, partParticleColor(part.type), 30, 260);
    triggerFlash(collectFlash);
    flashPanel(energyPanel);
    setMomentaryStatus(label, 1.25);
    return false;
  });

  resolvePlayerShots();
  resolveEnemyDamage();

  game.asteroids = game.asteroids.filter((asteroid) => {
    if (!circleCollision(player, asteroid)) return true;
    if (!player.takeDamage(asteroid.damage)) return true;

    game.shake = Math.min(18, 7 + asteroid.radius * 0.18);
    particles.emitBurst(asteroid.x, asteroid.y, "rgba(255,79,216,", 32, 290);
    triggerFlash(damageFlash);
    flashPanel(energyPanel);
    setMomentaryStatus(player.energy <= 24 ? "CRITICAL" : "DANGER", 1);
    return false;
  });

  game.enemies = game.enemies.filter((enemy) => {
    if (!circleCollision(player, enemy)) return true;
    if (!player.takeDamage(18)) return true;

    particles.emitBurst(enemy.x, enemy.y, "rgba(255,79,216,", 26, 250);
    game.shake = Math.max(game.shake, 10);
    setMomentaryStatus(player.energy <= 24 ? "CRITICAL" : "DANGER", 1);
    return false;
  });
}

function partParticleColor(type) {
  if (type === "weapon") return "rgba(68,247,255,";
  if (type === "engine") return "rgba(255,189,86,";
  if (type === "energy") return "rgba(104,255,171,";
  return "rgba(168,85,255,";
}

function resolvePlayerShots() {
  game.playerProjectiles = game.playerProjectiles.filter((projectile) => {
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
      const asteroid = game.asteroids[i];
      if (!circleCollision(projectile, asteroid)) continue;

      game.asteroids.splice(i, 1);
      addScore(Math.round(35 + asteroid.radius));
      particles.emitBurst(asteroid.x, asteroid.y, "rgba(255,189,86,", 24, 260);
      maybeDropPart(asteroid.x, asteroid.y, "asteroid");
      game.shake = Math.max(game.shake, 3);
      return false;
    }

    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const enemy = game.enemies[i];
      if (!circleCollision(projectile, enemy)) continue;

      enemy.health -= projectile.damage;
      particles.emitBurst(projectile.x, projectile.y, "rgba(68,247,255,", 10, 150);
      if (enemy.health <= 0) {
        game.enemies.splice(i, 1);
        addScore(250);
        particles.emitBurst(enemy.x, enemy.y, "rgba(255,79,216,", 34, 290);
        maybeDropPart(enemy.x, enemy.y, "enemy");
        game.shake = Math.max(game.shake, 5);
      }
      return false;
    }

    return true;
  });
}

function resolveEnemyDamage() {
  game.enemyProjectiles = game.enemyProjectiles.filter((projectile) => {
    if (!circleCollision(player, projectile)) return true;
    if (!player.takeDamage(projectile.damage)) return false;

    particles.emitBurst(projectile.x, projectile.y, "rgba(255,79,216,", 18, 210);
    triggerFlash(damageFlash);
    flashPanel(energyPanel);
    game.shake = Math.max(game.shake, 6);
    setMomentaryStatus(player.energy <= 24 ? "CRITICAL" : "DANGER", 1);
    return false;
  });
}

function updateStatus() {
  if (game.statusLock > 0) return;

  const dangerClose = game.asteroids.some((asteroid) => {
    const distance = Math.hypot(asteroid.x - player.x, asteroid.y - player.y);
    return distance < player.radius + asteroid.radius + 72;
  });
  const enemyAlert = game.score >= 1000 && (game.enemies.length > 0 || getCombatDifficulty().maxEnemies > 0);

  if (player.energy <= 22) game.status = "CRITICAL";
  else if (dangerClose) game.status = "DANGER";
  else if (enemyAlert) game.status = "DRONE SIGNAL";
  else if (Math.hypot(player.vx, player.vy) > 560) game.status = "HIGH VELOCITY";
  else if (player.energy <= 42 || game.asteroids.length >= game.difficulty.maxAsteroids - 1) game.status = "DANGER";
  else if (game.fragments.some((fragment) => Math.hypot(fragment.x - player.x, fragment.y - player.y) < 120)) game.status = "SALVAGING";
  else game.status = "SCANNING";
}

function draw() {
  const ctx = renderer.ctx;
  renderer.clear();

  ctx.save();

  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    game.shake *= 0.9;
  }

  const speed = Math.hypot(player.vx, player.vy);
  if (game.state === "playing" && speed > 360) {
    ctx.translate(-player.vx * 0.012, -player.vy * 0.012);
  }

  background.draw(ctx);

  if (game.state !== "menu") {
    for (const fragment of game.fragments) fragment.draw(ctx);
    for (const part of game.parts) part.draw(ctx);
    for (const asteroid of game.asteroids) asteroid.draw(ctx);
    for (const enemy of game.enemies) enemy.draw(ctx);
    for (const projectile of game.playerProjectiles) projectile.draw(ctx);
    for (const projectile of game.enemyProjectiles) projectile.draw(ctx);
    particles.draw(ctx);
    player.draw(ctx);
  } else {
    drawAmbientShip(ctx);
  }

  ctx.restore();

  energyFill.style.width = `${(player.energy / player.maxEnergy) * 100}%`;
  energyFill.classList.toggle("energy-low", game.state === "playing" && player.energy <= 28);
  scoreText.textContent = Math.floor(game.displayScore).toString().padStart(4, "0");
  statusText.textContent = game.status;
  abilityText.textContent = player.weaponUnlocked ? `WEAPON / SPEED ${player.speedLevel}` : `SPEED ${player.speedLevel}`;
  shieldText.textContent = player.shield > 0 ? `${Math.ceil(player.shield)}S` : "OFF";
  fireButton.classList.toggle("fire-button--active", game.state === "playing" && player.weaponUnlocked);
}

function drawAmbientShip(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.translate(renderer.width * 0.5, renderer.height * 0.72 + Math.sin(performance.now() * 0.001) * 10);
  ctx.scale(0.9, 0.9);
  player.drawShip(ctx);
  ctx.restore();
}

function loop(time = 0) {
  const dt = Math.min(0.033, (time - game.lastTime) / 1000 || 0);
  game.lastTime = time;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

setState("menu");
requestAnimationFrame(loop);
