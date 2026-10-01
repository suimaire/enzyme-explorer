import {Box3, MathUtils, Vector3} from 'three';

/** Fit the selected coordinates in camera space, including depth, without a fixed camera position. */
export function fitSelection(points: readonly Vector3[], direction: Vector3, up: Vector3, aspect: number, fov: number, occupancy = 0.84) {
  const target = new Box3().setFromPoints([...points]).getCenter(new Vector3());
  const right = up.clone().cross(direction).normalize();
  const screenUp = direction.clone().cross(right).normalize();
  const tan = Math.tan(MathUtils.degToRad(fov / 2)) * occupancy;
  const horizontal = tan * aspect;
  let left = Infinity, rightEdge = -Infinity, bottom = Infinity, top = -Infinity;
  for (const point of points) {
    const offset = point.clone().sub(target);
    const depth = offset.dot(direction);
    const x = offset.dot(right), y = offset.dot(screenUp);
    left = Math.min(left, x - horizontal * depth);
    rightEdge = Math.max(rightEdge, x + horizontal * depth);
    bottom = Math.min(bottom, y - tan * depth);
    top = Math.max(top, y + tan * depth);
  }
  // Centre the projected extents, not the world-axis box: asymmetric folds otherwise waste screen space.
  target.addScaledVector(right, (left + rightEdge) / 2).addScaledVector(screenUp, (bottom + top) / 2);
  const distance = Math.max(8, (rightEdge - left + 1.2) / (2 * horizontal), (top - bottom + 1.2) / (2 * tan));
  return {target, distance};
}
