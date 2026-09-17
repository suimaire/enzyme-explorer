import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ribbonGeometry, ribbonRuns} from './ribbon';
import {PickRegistry, TapGuard} from '../picking/picking';
import {DIMMED, HIGHLIGHT_COLOR, MEASURE_COLOR, METAL_COLOR, RIBBON_COLOR, SELECT_COLOR, SOLVENT_COLOR, elementColor, isMetal, vdwRadius} from '../pdb/elements';
import {residueLabel, type PdbResidue, type Structure, type Vec3} from '../pdb/parsePdb';
import {residueOfAtom} from '../measurements/distance';

export type Representation = 'ribbon' | 'sticks' | 'spacefill';

/** A distance to draw and label, given as two atom indices. Its value is always recomputed from coordinates. */
export type Measurement = {a: number; b: number; note?: string};

export type StructureView = {
  representation: Representation;
  /** Residue indices drawn as sticks on top of the representation and labelled. */
  highlighted: Set<number>;
  /** Residue indices drawn as spheres — the metal ion and any solvent molecule under discussion. */
  spheres: Set<number>;
  selected: number | null;
  measurements: Measurement[];
  showLabels: boolean;
  /** Opacity of the ribbon, so a study stage can keep the fold as faint context behind its stick models. Default 1. */
  ribbonOpacity?: number;
  /** Single atoms to ring and, optionally, name — for example the atom of a residue nearest the metal. */
  markedAtoms?: {atom: number; label?: string}[];
  /** Short text appended to a residue's label, keyed by residue index. */
  labelNotes?: Map<number, string>;
};

/** `atoms` frames a given set of atoms (for example one residue together with the metal). */
export type CameraPreset = 'overview' | 'active-site' | 'fit' | 'atoms';

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export type SceneOptions = {
  ariaLabel: string;
  /** Target and stand-off distance of the active-site camera preset. */
  focus?: {target: Vec3; distance: number};
};

const toVector = (p: Vec3) => new T.Vector3(p[0], p[1], p[2]);

/**
 * Which label keeps its place when two collide: the measured distance, then the residue being examined, its
 * nearest atom, the metal, and finally the other residue and solvent labels.
 */
const LABEL_PRIORITY: Record<string, number> = {measure: 0, selected: 1, atom: 2, metal: 3, solvent: 3, residue: 4};

/**
 * Three.js view of one experimental structure.
 *
 * Built on the viewer architecture of the Protein 3D Explorer project — renderer and OrbitControls setup,
 * instanced spheres and cylinders, a ribbon through real Cα positions, screen-projected HTML labels, camera
 * fitting from the projected extent, and explicit disposal — reimplemented here so this app has no runtime
 * dependency on that project. Coordinates are never modified.
 */
export class StructureScene {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(36, 1, 0.5, 900);
  private controls: OrbitControls;
  private group = new T.Group();
  private resize: ResizeObserver;
  private sphere = new T.SphereGeometry(1, 20, 14);
  private cylinder = new T.CylinderGeometry(1, 1, 1, 10);
  private positions: T.Vector3[];
  private owner: Int32Array;
  private center = new T.Vector3();
  private picks = new PickRegistry();
  private tap = new TapGuard();
  private labels: HTMLSpanElement[] = [];
  private pending: {element: HTMLSpanElement; at: T.Vector3; dx: number; dy: number; priority: number}[] = [];
  private flight: number | null = null;
  private disposed = false;

  constructor(
    private host: HTMLDivElement,
    private structure: Structure,
    private bonds: [number, number][],
    private onPick: (residue: number) => void,
    private options: SceneOptions,
  ) {
    this.renderer = new T.WebGLRenderer({antialias: true, alpha: false});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf7f9fb);
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', options.ariaLabel);
    host.append(canvas);

    this.scene.add(new T.AmbientLight(0xffffff, 1.9));
    const light = new T.DirectionalLight(0xffffff, 2.5);
    light.position.set(5, 10, 12);
    this.camera.add(light);
    this.scene.add(this.camera);
    this.scene.add(this.group);

    this.positions = structure.atoms.map((a) => toVector(a.position));
    this.owner = residueOfAtom(structure);
    const polymer = structure.residues
      .slice(...structure.ranges.polymer)
      .flatMap((r) => r.atoms)
      .map((i) => this.positions[i]);
    new T.Box3().setFromPoints(polymer.length ? polymer : this.positions).getCenter(this.center);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 320;
    this.controls.addEventListener('change', this.render);

    canvas.addEventListener('keydown', this.keyboard);
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);

    this.camera.aspect = Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1);
    this.camera.updateProjectionMatrix();
    this.resize = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h || this.disposed) return;
      this.renderer.setSize(w, h);
      const previous = this.camera.aspect;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      // Re-fit only when the shape of the viewport really changed, so a scroll bar does not reset the view.
      if (Math.abs(previous - this.camera.aspect) > 0.01 && this.host.dataset.cameraPreset === 'overview') this.cameraView('fit');
      this.render();
    });
    this.resize.observe(host);
    this.cameraView('overview');
  }

  // ---------- interaction ----------

  private keyboard = (e: KeyboardEvent) => {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const s = new T.Spherical().setFromVector3(offset);
    if (e.key === 'ArrowLeft') s.theta -= 0.12;
    else if (e.key === 'ArrowRight') s.theta += 0.12;
    else if (e.key === 'ArrowUp') s.phi -= 0.12;
    else if (e.key === 'ArrowDown') s.phi += 0.12;
    else if (e.key === '+' || e.key === '=') s.radius *= 0.9;
    else if (e.key === '-') s.radius *= 1.1;
    else return;
    e.preventDefault();
    this.stopFlight();
    s.makeSafe();
    s.radius = T.MathUtils.clamp(s.radius, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(new T.Vector3().setFromSpherical(s));
    this.controls.update();
  };

  private down = (e: PointerEvent) => {
    // A student who grabs the view mid-flight takes over the camera.
    this.stopFlight();
    this.tap.down(e);
  };
  private cancel = () => this.tap.cancel();
  private up = (e: PointerEvent) => {
    if (!this.tap.up(e)) return;
    const residue = this.picks.pick(this.camera, this.renderer.domElement, e.clientX, e.clientY);
    if (residue !== null) this.onPick(residue);
  };

  // ---------- drawing helpers ----------

  private material(color: number, opacity = 1) {
    return new T.MeshStandardMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      roughness: 0.5,
      depthWrite: opacity === 1,
      side: T.DoubleSide,
    });
  }

  private instanced(geometry: T.BufferGeometry, count: number, opacity = 1) {
    const mesh = new T.InstancedMesh(geometry, this.material(0xffffff, opacity), Math.max(count, 1));
    mesh.count = count;
    this.group.add(mesh);
    return mesh;
  }

  private setBall(mesh: T.InstancedMesh, i: number, p: T.Vector3, r: number, color: number) {
    mesh.setMatrixAt(i, new T.Matrix4().compose(p, new T.Quaternion(), new T.Vector3(r, r, r)));
    mesh.setColorAt(i, new T.Color(color));
  }

  private setStick(mesh: T.InstancedMesh, i: number, a: T.Vector3, b: T.Vector3, r: number, color: number) {
    mesh.setMatrixAt(
      i,
      new T.Matrix4().compose(
        a.clone().add(b).multiplyScalar(0.5),
        new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()),
        new T.Vector3(r, a.distanceTo(b), r),
      ),
    );
    mesh.setColorAt(i, new T.Color(color));
  }

  private sticks(atoms: number[], bonds: [number, number][], ball: number, stick: number, color: (atom: number) => number, pickable: boolean) {
    const balls = this.instanced(this.sphere, atoms.length);
    const rods = this.instanced(this.cylinder, bonds.length * 2);
    atoms.forEach((a, k) => {
      const r = (this.structure.atoms[a].element === 'C' ? 0.85 : 1) * ball;
      this.setBall(balls, k, this.positions[a], r, color(a));
    });
    bonds.forEach(([a, b], k) => {
      const mid = this.positions[a].clone().lerp(this.positions[b], 0.5);
      this.setStick(rods, 2 * k, this.positions[a], mid, stick, color(a));
      this.setStick(rods, 2 * k + 1, mid, this.positions[b], stick, color(b));
    });
    if (pickable) {
      this.picks.add(balls, (hit) => this.owner[atoms[hit.instanceId!]]);
      this.picks.add(rods, (hit) => this.owner[bonds[Math.floor(hit.instanceId! / 2)][hit.instanceId! % 2]]);
    }
  }

  private spheres(atoms: number[], radius: (atom: number) => number, color: (atom: number) => number, opacity: number, pickable: boolean) {
    const mesh = this.instanced(this.sphere, atoms.length, opacity);
    atoms.forEach((a, k) => this.setBall(mesh, k, this.positions[a], radius(a), color(a)));
    if (pickable) this.picks.add(mesh, (hit) => this.owner[atoms[hit.instanceId!]]);
  }

  private ribbon(view: StructureView) {
    const residues = this.structure.residues.slice(...this.structure.ranges.polymer);
    const opacity = T.MathUtils.clamp(view.ribbonOpacity ?? 1, 0.05, 1);
    for (const run of ribbonRuns(residues, this.structure.atoms, this.positions)) {
      const {geometry, vertexResidue} = ribbonGeometry(run, this.structure.atoms, this.positions, (r) =>
        view.highlighted.has(r.index) ? HIGHLIGHT_COLOR : RIBBON_COLOR,
      );
      const material = this.material(0xffffff, opacity);
      material.vertexColors = true;
      const mesh = new T.Mesh(geometry, material);
      // A faint ribbon is context: it is drawn after the stick models and never takes a tap away from them.
      if (opacity < 1) mesh.renderOrder = 1;
      this.group.add(mesh);
      this.picks.add(mesh, (hit) => vertexResidue[hit.face!.a], opacity < 1 ? -1 : 0);
    }
  }

  private label(text: string, at: T.Vector3, className: string, dx = 10, dy = -26) {
    const element = document.createElement('span');
    element.className = `atom-label ${className}`;
    element.textContent = text;
    element.hidden = true;
    this.host.append(element);
    this.labels.push(element);
    this.pending.push({element, at: at.clone(), dx, dy, priority: LABEL_PRIORITY[className] ?? LABEL_PRIORITY.residue});
    // Earlier entries claim screen space first when labels collide.
    this.pending.sort((a, b) => a.priority - b.priority);
  }

  private clear() {
    this.group.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.LineSegments || o instanceof T.Line) {
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => m.dispose());
        if (o.geometry !== this.sphere && o.geometry !== this.cylinder) o.geometry.dispose();
      }
    });
    this.group.clear();
    this.picks.clear();
    this.labels.forEach((l) => l.remove());
    this.labels = [];
    this.pending = [];
  }

  // ---------- update ----------

  update(view: StructureView): void {
    if (this.disposed) return;
    this.clear();
    const {structure} = this;
    const atoms = structure.atoms;
    const polymerAtoms = structure.residues.slice(...structure.ranges.polymer).flatMap((r) => r.atoms);
    const highlightedAtoms = (test: (atom: number) => boolean) => polymerAtoms.filter((i) => view.highlighted.has(this.owner[i]) && test(i));
    const byElement = (a: number) => elementColor(atoms[a].element);

    if (view.representation === 'ribbon') {
      this.ribbon(view);
    } else if (view.representation === 'sticks') {
      const bonds = this.bonds.filter(([a, b]) => atoms[a].kind === 'polymer' && atoms[b].kind === 'polymer');
      this.sticks(polymerAtoms, bonds, 0.22, 0.1, (a) => (view.highlighted.has(this.owner[a]) ? byElement(a) : DIMMED), true);
    } else {
      this.spheres(polymerAtoms, (a) => vdwRadius(atoms[a].element), (a) => (view.highlighted.has(this.owner[a]) ? byElement(a) : DIMMED), 1, true);
    }

    // Highlighted residues always get an all-atom stick model on top, so their chemistry is legible in any mode.
    if (view.representation !== 'spacefill' && view.highlighted.size) {
      const list = highlightedAtoms(() => true);
      const set = new Set(list);
      const bonds = this.bonds.filter(([a, b]) => set.has(a) && set.has(b) && this.owner[a] === this.owner[b]);
      this.sticks(list, bonds, 0.3, 0.16, byElement, true);
    }

    // Metal ions and the solvent molecules under discussion, as spheres in every representation.
    const sphereAtoms = [...view.spheres].flatMap((index) => structure.residues[index]?.atoms ?? []);
    if (sphereAtoms.length)
      this.spheres(
        sphereAtoms,
        (a) => (isMetal(atoms[a].element) ? 0.95 : view.representation === 'spacefill' ? vdwRadius(atoms[a].element) : 0.55),
        (a) => (isMetal(atoms[a].element) ? METAL_COLOR : atoms[a].kind === 'water' ? SOLVENT_COLOR : byElement(a)),
        1,
        true,
      );

    if (view.selected !== null) {
      const residue = structure.residues[view.selected];
      if (residue) {
        const halo = this.instanced(this.sphere, residue.atoms.length, 0.24);
        residue.atoms.forEach((a, k) =>
          this.setBall(halo, k, this.positions[a], view.representation === 'spacefill' ? vdwRadius(atoms[a].element) + 0.25 : 0.62, SELECT_COLOR),
        );
        this.label(this.residueText(view, residue), this.positions[this.anchorAtom(residue)], 'selected');
      }
    }

    const marked = view.markedAtoms ?? [];
    if (marked.length) {
      const rings = this.instanced(this.sphere, marked.length, 0.35);
      marked.forEach(({atom, label}, k) => {
        const radius = view.representation === 'spacefill' ? vdwRadius(atoms[atom].element) + 0.35 : 0.78;
        this.setBall(rings, k, this.positions[atom], radius, MEASURE_COLOR);
        if (label) this.label(label, this.positions[atom], 'atom', 8, 6);
      });
    }

    if (view.showLabels)
      for (const index of view.highlighted) {
        if (index === view.selected) continue;
        const residue = structure.residues[index];
        if (residue) this.label(this.residueText(view, residue), this.positions[this.anchorAtom(residue)], view.labelNotes?.has(index) ? 'noted' : '');
      }
    for (const index of view.spheres) {
      if (index === view.selected) continue;
      const residue = structure.residues[index];
      if (!residue) continue;
      const metal = residue.atoms.some((a) => isMetal(atoms[a].element));
      if (metal || view.showLabels)
        this.label(metal ? residue.resName : 'Zn²⁺ 결합 solvent', this.positions[this.anchorAtom(residue)], metal ? 'metal' : 'solvent', 10, metal ? -26 : 12);
    }

    this.drawMeasurements(view.measurements);

    const d = this.host.dataset;
    d.representation = view.representation;
    d.highlighted = [...view.highlighted]
      .map((i) => structure.residues[i]?.resSeq)
      .filter((n) => n !== undefined)
      .sort((a, b) => a! - b!)
      .join(',');
    d.selectedResidue = view.selected === null ? '' : String(structure.residues[view.selected]?.resSeq ?? '');
    d.measurements = view.measurements.map((m) => this.measured(m).toFixed(2)).join(',');
    d.markedAtoms = marked.map(({atom}) => `${atoms[atom].resSeq}:${atoms[atom].name}`).join(',');
    d.ribbonOpacity = String(view.ribbonOpacity ?? 1);
    this.render();
  }

  private residueText(view: StructureView, residue: PdbResidue): string {
    const note = view.labelNotes?.get(residue.index);
    return note ? `${residueLabel(residue)} · ${note}` : residueLabel(residue);
  }

  private anchorAtom(residue: PdbResidue): number {
    return (
      residue.atoms.find((i) => isMetal(this.structure.atoms[i].element)) ??
      residue.atoms.find((i) => this.structure.atoms[i].name === 'CA') ??
      residue.atoms[0]
    );
  }

  /** Distance of a measurement, Å, recomputed from the deposited coordinates. */
  measured(m: Measurement): number {
    return this.positions[m.a].distanceTo(this.positions[m.b]);
  }

  private drawMeasurements(measurements: Measurement[]) {
    if (!measurements.length) return;
    const points: number[] = [];
    for (const m of measurements) {
      points.push(...this.positions[m.a].toArray(), ...this.positions[m.b].toArray());
      const mid = this.positions[m.a].clone().lerp(this.positions[m.b], 0.5);
      this.label(`${this.measured(m).toFixed(2)} Å`, mid, 'measure', 6, -8);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    const material = new T.LineDashedMaterial({color: MEASURE_COLOR, dashSize: 0.35, gapSize: 0.25, linewidth: 1});
    const lines = new T.LineSegments(geometry, material);
    lines.computeLineDistances();
    this.group.add(lines);
  }

  // ---------- camera ----------

  /** Direction from the protein centre out through `target`, so the surrounding chain does not sit in front of it. */
  private outward(target: T.Vector3): T.Vector3 {
    const direction = target.clone().sub(this.center);
    return direction.lengthSq() < 1e-6 ? new T.Vector3(0.35, 0.2, 1).normalize() : direction.normalize();
  }

  /**
   * Viewing direction for a framed set of atoms that contains a metal: from outside the protein, but turned
   * side-on to the line from the metal to the other atoms, so a measured distance is not foreshortened.
   */
  private sideView(atoms: readonly number[], target: T.Vector3): T.Vector3 {
    const direction = this.outward(target);
    const metal = atoms.find((i) => isMetal(this.structure.atoms[i].element));
    const others = atoms.filter((i) => i !== metal);
    if (metal === undefined || !others.length) return direction;
    const axis = others
      .reduce((sum, i) => sum.add(this.positions[i]), new T.Vector3())
      .multiplyScalar(1 / others.length)
      .sub(this.positions[metal]);
    if (axis.lengthSq() < 1e-6) return direction;
    axis.normalize();
    const side = direction.clone().addScaledVector(axis, -direction.dot(axis));
    if (side.lengthSq() < 0.09) side.copy(new T.Vector3(0, 1, 0).cross(axis));
    if (side.lengthSq() < 1e-6) side.copy(new T.Vector3(1, 0, 0).cross(axis));
    return side.normalize();
  }

  private stopFlight() {
    if (this.flight !== null) cancelAnimationFrame(this.flight);
    this.flight = null;
  }

  /** Moves the camera to look at `target` from `position`, smoothly unless the student prefers reduced motion. */
  private flyTo(target: T.Vector3, position: T.Vector3) {
    this.stopFlight();
    this.camera.up.set(0, 1, 0);
    if (prefersReducedMotion()) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
      this.render();
      return;
    }
    const fromTarget = this.controls.target.clone();
    const fromPosition = this.camera.position.clone();
    const start = performance.now();
    const duration = 520;
    const step = (now: number) => {
      if (this.disposed) return;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.controls.target.lerpVectors(fromTarget, target, eased);
      this.camera.position.lerpVectors(fromPosition, position, eased);
      this.controls.update();
      this.render();
      this.flight = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.flight = requestAnimationFrame(step);
  }

  cameraView(preset: CameraPreset, atoms: readonly number[] = []): void {
    if (this.disposed) return;
    if (preset === 'atoms' && atoms.length) {
      // Frame the given atoms (a residue together with the metal) with room left for their labels.
      const points = atoms.map((i) => this.positions[i]);
      const target = new T.Box3().setFromPoints(points).getCenter(new T.Vector3());
      const radius = Math.max(...points.map((p) => p.distanceTo(target))) + 3.5;
      const halfV = T.MathUtils.degToRad(this.camera.fov / 2);
      const halfH = Math.atan(Math.tan(halfV) * this.camera.aspect);
      const distance = T.MathUtils.clamp(radius / Math.sin(Math.min(halfV, halfH)), this.controls.minDistance, this.controls.maxDistance);
      this.host.dataset.cameraPreset = 'atoms';
      this.host.dataset.cameraAtoms = [...new Set(atoms.map((i) => this.structure.atoms[i].resSeq))].join(',');
      this.flyTo(target, target.clone().addScaledVector(this.sideView(atoms, target), distance));
      return;
    }
    if (preset === 'active-site' && this.options.focus) {
      const target = toVector(this.options.focus.target);
      this.host.dataset.cameraPreset = 'active-site';
      this.flyTo(target, target.clone().addScaledVector(this.outward(target), this.options.focus.distance));
      return;
    }
    this.stopFlight();
    const keepDirection = preset === 'fit';
    const direction = keepDirection
      ? this.camera.position.clone().sub(this.controls.target).normalize()
      : new T.Vector3(0.35, 0.2, 1).normalize();
    const up = keepDirection ? this.camera.up.clone() : new T.Vector3(0, 1, 0);
    if (!keepDirection) this.host.dataset.cameraPreset = 'overview';
    const right = up.clone().cross(direction).normalize();
    const screenUp = direction.clone().cross(right).normalize();
    const tan = Math.tan(T.MathUtils.degToRad(this.camera.fov / 2));
    let distance = this.controls.minDistance;
    for (const p of this.positions) {
      const v = p.clone().sub(this.center);
      const z = v.dot(direction);
      distance = Math.max(distance, (Math.abs(v.dot(right)) + 3) / (tan * this.camera.aspect) + z, (Math.abs(v.dot(screenUp)) + 3) / tan + z);
    }
    this.controls.target.copy(this.center);
    this.camera.position.copy(this.center).addScaledVector(direction, distance);
    this.camera.up.copy(up);
    this.controls.update();
    this.render();
  }

  // ---------- render ----------

  private render = () => {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    // Labels are placed in priority order. One that would cover an already placed label is nudged a line up
    // or down; if neither fits it is hidden, except the two labels a student is actively reading.
    const placed: {left: number; top: number; right: number; bottom: number}[] = [];
    const collides = (box: (typeof placed)[number]) =>
      placed.some((o) => box.left < o.right && o.left < box.right && box.top < o.bottom && o.top < box.bottom);
    for (const {element, at, dx, dy, priority} of this.pending) {
      const p = at.clone().project(this.camera);
      const offscreen = Math.abs(p.z) > 1 || p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1;
      element.hidden = offscreen;
      if (offscreen) continue;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const left = T.MathUtils.clamp(((p.x + 1) * w) / 2 + dx, 4, Math.max(4, w - width - 4));
      const baseTop = ((1 - p.y) * h) / 2 + dy;
      const step = height + 2;
      let box = null;
      for (const shift of [0, step, -step, 2 * step, -2 * step]) {
        const top = T.MathUtils.clamp(baseTop + shift, 4, Math.max(4, h - height - 4));
        const candidate = {left, top, right: left + width, bottom: top + height};
        if (!collides(candidate)) {
          box = candidate;
          break;
        }
      }
      if (!box && priority <= LABEL_PRIORITY.selected) {
        const top = T.MathUtils.clamp(baseTop, 4, Math.max(4, h - height - 4));
        box = {left, top, right: left + width, bottom: top + height};
      }
      element.hidden = !box;
      if (!box) continue;
      placed.push(box);
      element.style.left = `${box.left}px`;
      element.style.top = `${box.top}px`;
    }
    const d = this.host.dataset;
    d.cameraDistance = this.camera.position.distanceTo(this.controls.target).toFixed(3);
  };

  /** Screen position of a residue's anchor atom, for automated picking checks. */
  screenPoint(residue: number): {x: number; y: number} {
    const p = this.positions[this.anchorAtom(this.structure.residues[residue])].clone().project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {x: rect.left + ((p.x + 1) * rect.width) / 2, y: rect.top + ((1 - p.y) * rect.height) / 2};
  }

  dispose(): void {
    if (this.disposed) return;
    this.stopFlight();
    this.disposed = true;
    this.resize.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('keydown', this.keyboard);
    canvas.removeEventListener('pointerdown', this.down);
    canvas.removeEventListener('pointerup', this.up);
    canvas.removeEventListener('pointercancel', this.cancel);
    this.clear();
    this.sphere.dispose();
    this.cylinder.dispose();
    this.renderer.dispose();
    canvas.remove();
  }
}
