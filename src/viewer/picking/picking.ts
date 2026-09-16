import * as T from 'three';

/** A drawn object plus the rule for turning a ray hit on it into a residue index. */
export type Pickable = {object: T.Object3D; resolve: (hit: T.Intersection) => number};

/**
 * Raycast picking against whatever the scene last drew. The registry is rebuilt on every update, so an
 * object that is no longer visible can never be picked.
 */
export class PickRegistry {
  private items: Pickable[] = [];

  clear(): void {
    this.items = [];
  }

  add(object: T.Object3D, resolve: (hit: T.Intersection) => number): void {
    this.items.push({object, resolve});
  }

  /** Residue index nearest the camera under a screen point, or null. */
  pick(camera: T.Camera, canvas: HTMLCanvasElement, clientX: number, clientY: number): number | null {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1),
      camera,
    );
    let best: {distance: number; residue: number} | null = null;
    for (const item of this.items) {
      const hit = ray.intersectObject(item.object, false)[0];
      if (hit && (!best || hit.distance < best.distance)) best = {distance: hit.distance, residue: item.resolve(hit)};
    }
    return best && best.residue >= 0 ? best.residue : null;
  }
}

/**
 * Tells a selection tap apart from a rotate or a pinch.
 *
 * Pointer events cover mouse, pen and touch with the same code, so selection works identically on a desktop
 * and on a tablet. A gesture that moves more than `slop` pixels, or that involves a second finger, is an
 * orbit and must not also select something.
 */
export class TapGuard {
  private start: {x: number; y: number; id: number} | null = null;
  private multiTouch = false;
  private active = 0;

  constructor(private slop = 6) {}

  down(event: PointerEvent): void {
    this.active++;
    if (this.active > 1) {
      this.multiTouch = true;
      this.start = null;
      return;
    }
    this.multiTouch = false;
    this.start = {x: event.clientX, y: event.clientY, id: event.pointerId};
  }

  /** True when this pointer-up completes a tap that should select. */
  up(event: PointerEvent): boolean {
    this.active = Math.max(this.active - 1, 0);
    const start = this.start;
    this.start = null;
    if (this.multiTouch || !start || start.id !== event.pointerId) return false;
    return Math.hypot(event.clientX - start.x, event.clientY - start.y) <= this.slop;
  }

  cancel(): void {
    this.start = null;
    this.active = Math.max(this.active - 1, 0);
  }
}
