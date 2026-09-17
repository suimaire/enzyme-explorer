import {useEffect, useRef, useState} from 'react';
import {StructureScene, type CameraPreset, type SceneOptions, type StructureView} from '../../viewer/rendering/StructureScene';
import type {Structure} from '../../viewer/pdb/parsePdb';

/** A camera request. The token makes repeated presses of the same preset take effect; `atoms` is what the `atoms` preset frames. */
export type CameraRequest = {preset: CameraPreset; token: number; atoms?: readonly number[]};

let webglSupport: boolean | null = null;

/** Whether this browser can give us a WebGL context at all, tested once and cached. */
function webglSupported(): boolean {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement('canvas');
      webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const WebglError = () => (
  <p role="alert" className="webgl-error">
    3D 화면을 시작하지 못했습니다. WebGL을 지원하는 브라우저에서 하드웨어 가속을 켜고 새로고침해 주세요.
  </p>
);

/**
 * React wrapper around the framework-independent `StructureScene`. The scene owns all three.js state; this
 * component only creates it, forwards view and camera changes, and disposes it on unmount.
 */
export function StructureViewer({
  structure,
  bonds,
  view,
  camera,
  onPick,
  options,
  testId = 'structure-viewer',
}: {
  structure: Structure;
  bonds: [number, number][];
  view: StructureView;
  camera: CameraRequest;
  onPick: (residue: number) => void;
  options: SceneOptions;
  testId?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<StructureScene | null>(null);
  const pick = useRef(onPick);
  const sceneOptions = useRef(options);
  const [failed, setFailed] = useState(false);
  const supported = webglSupported();

  // Keeps the picking callback current without making the scene depend on its identity.
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    sceneOptions.current = options;
  }, [options]);

  useEffect(() => {
    if (!supported) return;
    try {
      scene.current = new StructureScene(host.current!, structure, bonds, (r) => pick.current(r), sceneOptions.current);
    } catch {
      // A context that is advertised but cannot actually be created (blocklisted driver, lost context on
      // startup) is an external failure with no other way to reach the user than re-rendering the error.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [structure, bonds, supported]);

  useEffect(() => {
    scene.current?.update(view);
  }, [view]);

  useEffect(() => {
    if (camera.token) scene.current?.cameraView(camera.preset, camera.atoms);
  }, [camera]);

  return (
    <div ref={host} className="molecule-viewer" data-testid={testId}>
      {supported && !failed ? null : <WebglError />}
    </div>
  );
}
