"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Room from "./Room";
import Character from "./Character";
import DitherPass from "./DitherPass";
import Hud from "./Hud";
import styles from "./room.module.css";

const INTERIOR_HALF = 8; // logical room half width, walls are wider so no edge enters the shot
const PLAYER_HALF = 0.25; // half width of the placeholder box
const PLAYER_SPEED = 3.2; // units per second
const PLAYER_Z = 0.2;
const CAM_Z = 9;
const MAX_CAM_Z = 20;
const MIN_HALF_WIDTH = 4.6; // narrow viewports pull back until this half width is visible
const CAM_Y = 2;
const LOOK_Y = 1.3;
const WALL_Z = -2.2;

type Direction = "left" | "right";
type Held = Record<Direction, boolean>;

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function zoneAt(x: number): string {
  if (x > 2.4) return "At the turntable";
  if (x < -3.6) return "At the speaker";
  if (Math.abs(x - 0.4) < 1.4) return "Under the television";
  return "In the middle of the room";
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function RoomScene() {
  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, 6]} intensity={2.1} />
      <pointLight position={[3.6, 2.4, 0.2]} intensity={18} distance={10} decay={2} />
      <Room />
    </>
  );
}

function PlayerRig({
  held,
  playerX,
  direction,
  reduced,
  onReady,
  onZone,
}: {
  held: React.RefObject<Held>;
  playerX: React.RefObject<number>;
  direction: React.RefObject<number>;
  reduced: boolean;
  onReady: () => void;
  onZone: (label: string) => void;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const readySent = useRef(false);
  const zoneRef = useRef<string | null>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const dir = (held.current.right ? 1 : 0) - (held.current.left ? 1 : 0);
    direction.current = dir;

    // Framing is measured at the back wall and at the character plane, so the
    // room edges stay out of shot and the character never leaves the frame.
    // Narrow viewports pull the camera back so the room still reads.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const camZ = THREE.MathUtils.clamp(
      MIN_HALF_WIDTH / (tan * camera.aspect) + WALL_Z,
      CAM_Z,
      MAX_CAM_Z
    );
    const halfWall = tan * (camZ - WALL_Z) * camera.aspect;
    const halfPlayer = tan * (camZ - PLAYER_Z) * camera.aspect;
    const minCam = -INTERIOR_HALF + halfWall;
    const maxCam = INTERIOR_HALF - halfWall;
    const camMax = minCam <= maxCam ? maxCam : 0;
    const limit = Math.min(INTERIOR_HALF, camMax + halfPlayer - PLAYER_HALF - 0.2);

    if (dir !== 0) playerX.current += dir * PLAYER_SPEED * dt;
    playerX.current = THREE.MathUtils.clamp(playerX.current, -limit, limit);

    const targetX =
      minCam <= maxCam ? THREE.MathUtils.clamp(playerX.current, minCam, maxCam) : 0;
    camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 6);

    const time = state.clock.elapsedTime;
    const swayX = reduced ? 0 : Math.sin(time * 0.33) * 0.04;
    const swayY = reduced ? 0 : Math.sin(time * 0.47) * 0.025;
    camera.position.set(camera.position.x, CAM_Y, camZ);
    camera.lookAt(camera.position.x + swayX, LOOK_Y + swayY, 0);

    if (!readySent.current) {
      readySent.current = true;
      onReady();
    }

    const label = zoneAt(playerX.current);
    if (label !== zoneRef.current) {
      zoneRef.current = label;
      onZone(label);
    }
  }, -1);

  return null;
}

// The character lives in its own scene so it is composited after the room
// dither instead of being dithered twice.
function CharacterLayer({
  playerX,
  direction,
}: {
  playerX: React.RefObject<number>;
  direction: React.RefObject<number>;
}) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const spriteScene = useMemo(() => new THREE.Scene(), []);

  useFrame(() => {
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.clearDepth();
    gl.render(spriteScene, camera);
    gl.autoClear = autoClear;
  }, 2);

  return createPortal(
    <Suspense fallback={null}>
      <Character playerX={playerX} direction={direction} />
    </Suspense>,
    spriteScene
  );
}

export default function Scene() {
  const reduced = useReducedMotion();
  const [glFailed, setGlFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [zone, setZone] = useState<string | null>(null);
  const held = useRef<Held>({ left: false, right: false });
  const playerX = useRef(0);
  const direction = useRef(0);

  useEffect(() => {
    setGlFailed(!webglAvailable());
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    };
    const apply = (event: KeyboardEvent, down: boolean) => {
      const key = event.key.toLowerCase();
      if (key === "a" || key === "arrowleft") held.current.left = down;
      else if (key === "d" || key === "arrowright") held.current.right = down;
      else return;
      if (down) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTyping(event.target)) apply(event, true);
    };
    const onKeyUp = (event: KeyboardEvent) => apply(event, false);
    const onBlur = () => {
      held.current.left = false;
      held.current.right = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const onZone = useCallback((label: string) => setZone(label), []);
  const press = useCallback((dir: Direction) => {
    held.current[dir] = true;
  }, []);
  const release = useCallback((dir: Direction) => {
    held.current[dir] = false;
  }, []);

  return (
    <main className={styles.page}>
      {!glFailed && (
        <Canvas
          className={styles.canvas}
          dpr={[1, 1.5]}
          shadows={false}
          flat
          camera={{ fov: 30, near: 0.1, far: 60, position: [0, CAM_Y, CAM_Z] }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          fallback={<p className={styles.fallback}>WebGL is not available in this browser.</p>}
        >
          <Suspense fallback={null}>
            <RoomScene />
            <PlayerRig
              held={held}
              playerX={playerX}
              direction={direction}
              reduced={reduced}
              onReady={onReady}
              onZone={onZone}
            />
            <DitherPass />
            <CharacterLayer playerX={playerX} direction={direction} />
          </Suspense>
        </Canvas>
      )}

      <Hud
        ready={ready && !glFailed}
        glFailed={glFailed}
        zone={zone}
        reduced={reduced}
        onPress={press}
        onRelease={release}
      />
    </main>
  );
}
