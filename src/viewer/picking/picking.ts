import * as T from 'three';

/** A drawn object plus the rule for turning a ray hit on it into a residue index. */
export type Pickable = {object: T.Object3D; resolve: (hit: T.Intersection) => number; priority: number};

/**
 * Raycast picking against whatever the scene last drew. The registry is rebuilt on every update, so an
 * object that is no longer visible can never be picked.
 */
export class PickRegistry {
  private items: Pickable[] = [];

  clear(): void {
    this.items = [];
  }

  /**
   * `priority` lets a see-through layer (a faint ribbon drawn over a stick model) stay pickable without
   * stealing taps from the atoms behind it: a hit on a higher-priority object wins over a nearer, lower one.
   */
  add(object: T.Object3D, resolve: (hit: T.Intersection) => number, priority = 0): void {
    this.items.push({object, resolve, priority});
  }

  /** Residue index under a screen point — highest priority first, then nearest the camera — or null. */
  pick(camera: T.Camera, canvas: HTMLCanvasElement, clientX: number, clientY: number): number | null {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1),
      camera,
    );
    let best: {distance: number; residue: number; priority: number} | null = null;
    for (const item of this.items) {
      const hit = ray.intersectObject(item.object, false)[0];
      if (!hit) continue;
      const better = !best || item.priority > best.priority || (item.priority === best.priority && hit.distance < best.distance);
      if (better) best = {distance: hit.distance, residue: item.resolve(hit), priority: item.priority};
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
