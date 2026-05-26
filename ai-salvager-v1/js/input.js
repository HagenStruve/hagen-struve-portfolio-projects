export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pointer = {
      active: false,
      x: 0,
      y: 0,
    };

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.key.toLowerCase());
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    const updatePointer = (event) => {
      const point = event.touches ? event.touches[0] : event;
      this.pointer.x = point.clientX;
      this.pointer.y = point.clientY;
      this.pointer.active = true;
    };

    canvas.addEventListener("pointermove", updatePointer, { passive: true });
    canvas.addEventListener("pointerdown", updatePointer, { passive: true });
    canvas.addEventListener("touchmove", updatePointer, { passive: true });
    canvas.addEventListener("touchstart", updatePointer, { passive: true });

    canvas.addEventListener("pointerleave", () => {
      this.pointer.active = false;
    });
  }

  axis() {
    let x = 0;
    let y = 0;

    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;

    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }
}
