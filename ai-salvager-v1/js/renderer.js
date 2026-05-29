import { quality } from "./quality.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.visualViewport?.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resize(), 120));
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
    this.width = Math.floor(window.visualViewport?.width || window.innerWidth);
    this.height = Math.floor(window.visualViewport?.height || window.innerHeight);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    this.ctx.fillStyle = "#030612";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}
