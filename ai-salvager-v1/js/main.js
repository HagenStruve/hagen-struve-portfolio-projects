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
  if (game.fragments.length >= 6) return;
  game.fragments.push(new Fragment(renderer));
}

function spawnAsteroid() {
  if (game.asteroids.length >= 8) return;
  game.asteroids.push(new Asteroid(renderer));
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

function update(dt) {
  background.resize(renderer.width, renderer.height);
  background.update(dt);
  particles.update(dt);

  if (game.state === "playing") {
    game.elapsed += dt;
    game.statusLock = Math.max(0, game.statusLock - dt);

    player.update(dt, input, renderer);
    particles.emitThruster(player, dt);

    game.fragmentTimer -= dt;
    if (game.fragmentTimer <= 0) {
      spawnFragment();
      game.fragmentTimer = randomRange(0.75, 1.55);
    }

    game.asteroidTimer -= dt;
    if (game.asteroidTimer <= 0) {
      spawnAsteroid();
      game.asteroidTimer = randomRange(0.85, Math.max(0.95, 1.9 - game.elapsed * 0.012));
    }

    for (const fragment of game.fragments) fragment.update(dt, renderer);
    for (const asteroid of game.asteroids) asteroid.update(dt);

    handleCollisions();

    game.survivalTimer += dt;
    if (game.survivalTimer >= 5) {
      game.survivalTimer = 0;
      addScore(25);
    }

    game.asteroids = game.asteroids.filter((asteroid) => !outsideBounds(asteroid, renderer));
    game.displayScore += (game.score - game.displayScore) * Math.min(1, dt * 8);
    updateStatus();

    if (player.energy <= 0) endGame();
  }
}

function handleCollisions() {
  game.fragments = game.fragments.filter((fragment) => {
    if (!circleCollision(player, fragment)) return true;

    addScore(fragment.value);
    player.heal(5);
    particles.emitBurst(fragment.x, fragment.y, "rgba(68,247,255,", 26, 250);
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

  if (player.energy <= 22) game.status = "CRITICAL";
  else if (player.energy <= 42 || game.asteroids.length >= 6) game.status = "WARNING";
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
