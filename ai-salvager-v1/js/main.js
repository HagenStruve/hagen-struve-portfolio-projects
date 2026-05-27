import { Renderer } from "./renderer.js";
import { Input } from "./input.js";
import { SpaceBackground } from "./background.js";
import { Player } from "./player.js";
import { Fragment, Asteroid } from "./entities.js";
import { circleCollision, outsideBounds } from "./collision.js";
import { ParticleSystem } from "./particles.js";

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
const finalScore = document.querySelector("#finalScore");
const finalTime = document.querySelector("#finalTime");
const collectFlash = document.querySelector("#collectFlash");
const damageFlash = document.querySelector("#damageFlash");
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
  survivalTimer: 0,
  fragmentTimer: 0,
  asteroidTimer: 1.2,
  difficulty: {
    level: 1,
    spawnInterval: 1.65,
    asteroidSpeedMultiplier: 1,
    maxAsteroids: 6,
  },
  shake: 0,
  fragments: [],
  asteroids: [],
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
  player.energy = 100;
  player.invulnerable = 0;
  game.score = 0;
  game.displayScore = 0;
  game.elapsed = 0;
  game.survivalTimer = 0;
  game.fragmentTimer = 0;
  game.asteroidTimer = 1;
  game.difficulty = getDifficulty();
  game.shake = 0;
  game.fragments = [];
  game.asteroids = [];
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

function spawnAsteroid() {
  if (game.asteroids.length >= game.difficulty.maxAsteroids) return;
  game.asteroids.push(new Asteroid(renderer, game.difficulty.asteroidSpeedMultiplier));
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

    game.fragmentTimer -= dt;
    if (game.fragmentTimer <= 0) {
      spawnFragment();
      game.fragmentTimer = randomRange(1.05, 1.85) - Math.min(0.38, game.elapsed * 0.004);
    }

    game.asteroidTimer -= dt;
    if (game.asteroidTimer <= 0) {
      spawnAsteroid();
      game.asteroidTimer = randomRange(game.difficulty.spawnInterval * 0.72, game.difficulty.spawnInterval * 1.22);
    }

    for (const fragment of game.fragments) fragment.update(dt, renderer);
    for (const asteroid of game.asteroids) asteroid.update(dt);

    handleCollisions();

    game.survivalTimer += dt;
    if (game.survivalTimer >= 5) {
      game.survivalTimer = 0;
      addScore(15);
    }

    game.asteroids = game.asteroids.filter((asteroid) => !outsideBounds(asteroid, renderer));
    game.displayScore += (game.score - game.displayScore) * Math.min(1, dt * 8);
    updateStatus();

    if (player.energy <= 0) endGame();
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

  game.asteroids = game.asteroids.filter((asteroid) => {
    if (!circleCollision(player, asteroid)) return true;
    if (!player.takeDamage(asteroid.damage)) return true;

    game.shake = Math.min(18, 7 + asteroid.radius * 0.18);
    particles.emitBurst(asteroid.x, asteroid.y, "rgba(255,79,216,", 32, 290);
    triggerFlash(damageFlash);
    flashPanel(energyPanel);
    setMomentaryStatus(player.energy <= 24 ? "CRITICAL" : "WARNING", 1);
    return false;
  });
}

function updateStatus() {
  if (game.statusLock > 0) return;

  const dangerClose = game.asteroids.some((asteroid) => {
    const distance = Math.hypot(asteroid.x - player.x, asteroid.y - player.y);
    return distance < player.radius + asteroid.radius + 72;
  });

  if (player.energy <= 22) game.status = "CRITICAL";
  else if (dangerClose) game.status = "DANGER";
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
    for (const asteroid of game.asteroids) asteroid.draw(ctx);
    particles.draw(ctx);
    player.draw(ctx);
  } else {
    drawAmbientShip(ctx);
  }

  ctx.restore();

  energyFill.style.width = `${player.energy}%`;
  energyFill.classList.toggle("energy-low", game.state === "playing" && player.energy <= 28);
  scoreText.textContent = Math.floor(game.displayScore).toString().padStart(4, "0");
  statusText.textContent = game.status;
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
