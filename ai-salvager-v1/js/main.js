import { Renderer } from "./renderer.js";
import { Input } from "./input.js";
import { SpaceBackground } from "./background.js";
import { Player } from "./player.js";

const canvas = document.querySelector("#gameCanvas");
const startScreen = document.querySelector("#startScreen");
const pauseScreen = document.querySelector("#pauseScreen");
const hud = document.querySelector("#hud");
const startButton = document.querySelector("#startButton");
const resumeButton = document.querySelector("#resumeButton");
const howToButton = document.querySelector("#howToButton");
const howToPanel = document.querySelector("#howToPanel");
const energyFill = document.querySelector("#energyFill");
const scoreText = document.querySelector("#scoreText");

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const background = new SpaceBackground(renderer.width, renderer.height);
const player = new Player(renderer.width * 0.5, renderer.height * 0.62);

const game = {
  state: "menu",
  lastTime: 0,
  score: 0,
  shake: 0,
};

function setState(nextState) {
  game.state = nextState;

  startScreen.classList.toggle("screen--active", nextState === "menu");
  pauseScreen.classList.toggle("screen--active", nextState === "pause");
  hud.classList.toggle("hud--hidden", nextState !== "playing");
}

function startGame() {
  player.x = renderer.width * 0.5;
  player.y = renderer.height * 0.62;
  player.vx = 0;
  player.vy = 0;
  player.energy = 100;
  game.score = 0;
  setState("playing");
}

function togglePause() {
  if (game.state === "playing") setState("pause");
  else if (game.state === "pause") setState("playing");
}

startButton.addEventListener("click", startGame);
resumeButton.addEventListener("click", () => setState("playing"));
howToButton.addEventListener("click", () => howToPanel.classList.toggle("howto--open"));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") togglePause();
  if (event.key === "Enter" && game.state === "menu") startGame();
});

function update(dt) {
  background.resize(renderer.width, renderer.height);
  background.update(dt);

  if (game.state === "playing") {
    player.update(dt, input, renderer);
    game.score += dt * 12;
  }
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
    player.draw(ctx);
  } else {
    drawAmbientShip(ctx);
  }

  ctx.restore();

  energyFill.style.width = `${player.energy}%`;
  scoreText.textContent = Math.floor(game.score).toString().padStart(4, "0");
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
