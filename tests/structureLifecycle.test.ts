import {afterEach, describe, expect, it, vi} from 'vitest';
import * as T from 'three';
import {StructureScene} from '../src/viewer/rendering/StructureScene';

afterEach(() => vi.unstubAllGlobals());

describe('structure scene teardown', () => {
  it.each([null, 47])('releases the WebGL context and scene resources once (flight %s)', flight => {
    const cancelFrame = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    let contextAlive = true;
    const canvas = {removeEventListener: vi.fn(), remove: vi.fn()};
    const renderer = {
      domElement: canvas,
      dispose: vi.fn(),
      forceContextLoss: vi.fn(() => {contextAlive = false;}),
    };
    const controls = {dispose: vi.fn(), removeEventListener: vi.fn()};
    const resize = {disconnect: vi.fn()};
    const picks = {clear: vi.fn()};
    const label = {remove: vi.fn()};
    const sphere = new T.SphereGeometry();
    const cylinder = new T.CylinderGeometry();
    const geometry = new T.BufferGeometry();
    const material = new T.MeshBasicMaterial();
    const disposals = [sphere, cylinder, geometry, material].map(resource => vi.spyOn(resource, 'dispose'));
    const group = new T.Group();
    group.add(new T.Mesh(geometry, material));
    // Exercise the real teardown without requiring a GPU in the unit-test environment.
    const scene = Object.assign(Object.create(StructureScene.prototype) as object, {
      renderer, controls, resize, picks, sphere, cylinder, group,
      labels: [label], pending: [], disposed: false, flight,
      keyboard: vi.fn(), down: vi.fn(), up: vi.fn(), cancel: vi.fn(), markCameraAdjusted: vi.fn(),
    }) as unknown as StructureScene;

    scene.dispose();
    expect(contextAlive).toBe(false);
    expect(group.children).toHaveLength(0);
    expect(renderer.dispose).toHaveBeenCalledBefore(renderer.forceContextLoss);
    if (flight === null) expect(cancelFrame).not.toHaveBeenCalled();
    else expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(flight);

    scene.dispose();
    for (const dispose of [...disposals, renderer.dispose, renderer.forceContextLoss, controls.dispose, resize.disconnect, picks.clear, label.remove, canvas.remove]) {
      expect(dispose).toHaveBeenCalledTimes(1);
    }
    expect(canvas.removeEventListener).toHaveBeenCalledTimes(4);
    expect(controls.removeEventListener).toHaveBeenCalledExactlyOnceWith('start', expect.any(Function));
  });
});
