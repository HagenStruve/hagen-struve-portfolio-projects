export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.fireQueued = false;
    this.pointer = {
      active: false,
      pressed: false,
      x: 0,
      y: 0,
    };

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.key.toLowerCase());
      if (event.code === "Space") {
        event.preventDefault();
        this.fireQueued = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    const updatePointerPosition = (event) => {
      const point = event.touches ? event.touches[0] : event;
      this.pointer.x = point.clientX;
      this.pointer.y = point.clientY;
    };

    const activatePointer = (event) => {
      updatePointerPosition(event);
      this.pointer.pressed = true;
      this.pointer.active = true;
    };

    const deactivatePointer = () => {
      this.pointer.pressed = false;
      this.pointer.active = false;
    };

    canvas.addEventListener("pointermove", updatePointerPosition, { passive: true });
    canvas.addEventListener("pointerdown", activatePointer, { passive: true });
    canvas.addEventListener("touchmove", (event) => {
      if (this.pointer.pressed) updatePointerPosition(event);
    }, { passive: true });
    canvas.addEventListener("touchstart", activatePointer, { passive: true });

    window.addEventListener("pointerup", deactivatePointer);
    window.addEventListener("touchend", deactivatePointer);
    window.addEventListener("touchcancel", deactivatePointer);
    canvas.addEventListener("pointerleave", deactivatePointer);
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

  queueFire() {
    this.fireQueued = true;
  }

  consumeFire() {
    const fire = this.fireQueued || this.keys.has(" ");
    this.fireQueued = false;
    return fire;
  }
}
