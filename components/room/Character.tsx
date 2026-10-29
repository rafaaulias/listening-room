"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DITHER_CELL_CSS, DITHER_GLSL, DITHER_HIGH, DITHER_LOW } from "@/lib/dither";

const SHEET_W = 423;
const SHEET_H = 72;
const CELL_W = 47;
const CELL_H = 72;
const WALK_FRAMES = 8;
const IDLE_FRAME = 8;
const WALK_FPS = 10;
const WORLD_HEIGHT = 1.35;
const PLAYER_Z = 0.2;
const SPRITE_EXPOSURE = 1.5;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// The character is composited after the room dither, so it dithers itself on
// the same screen grid and lands on the same two values.
const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform vec2 uUvMin;
uniform vec2 uUvMax;
uniform float uCell;
varying vec2 vUv;
${DITHER_GLSL}

void main() {
  vec4 texel = texture2D(map, mix(uUvMin, uUvMax, vUv));
  if (texel.a < 0.5) discard;
  vec3 srgb = ditherLinearToSrgb(texel.rgb);
  float luma = dot(srgb, vec3(0.2126, 0.7152, 0.0722));
  // The character carries its own exposure so it stays the brightest shape in
  // the dithered room instead of sinking into the wall.
  luma = clamp(luma * ${SPRITE_EXPOSURE.toFixed(3)}, 0.0, 1.0);
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  float on = step(bayer4(cell), luma);
  gl_FragColor = vec4(vec3(mix(${DITHER_LOW.toFixed(4)}, ${DITHER_HIGH.toFixed(4)}, on)), 1.0);
}
`;

type Props = {
  playerX: React.RefObject<number>;
  direction: React.RefObject<number>;
};

export default function Character({ playerX, direction }: Props) {
  const texture = useLoader(THREE.TextureLoader, "/sprites/listener.png");
  const group = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const frame = useRef(IDLE_FRAME);
  const elapsed = useRef(0);
  const facing = useRef(1);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          map: { value: texture },
          uUvMin: { value: new THREE.Vector2() },
          uUvMax: { value: new THREE.Vector2() },
          uCell: { value: DITHER_CELL_CSS },
        },
        side: THREE.DoubleSide,
      }),
    [texture]
  );

  useEffect(() => {
    setFrame(IDLE_FRAME);
    return () => material.dispose();
  }, [material]);

  useMemo(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const setFrame = (index: number) => {
    const uMin = material.uniforms.uUvMin.value as THREE.Vector2;
    const uMax = material.uniforms.uUvMax.value as THREE.Vector2;
    uMin.set((index * CELL_W + 0.5) / SHEET_W, 0.5 / SHEET_H);
    uMax.set(((index + 1) * CELL_W - 0.5) / SHEET_W, (SHEET_H - 0.5) / SHEET_H);
  };

  useFrame((state, delta) => {
    const dir = direction.current;
    if (dir !== 0) {
      facing.current = dir;
      elapsed.current += delta;
      const step = 1 / WALK_FPS;
      while (elapsed.current >= step) {
        elapsed.current -= step;
        frame.current = (frame.current + 1) % WALK_FRAMES;
      }
      if (frame.current >= WALK_FRAMES) frame.current = 0;
      setFrame(frame.current);
    } else if (frame.current !== IDLE_FRAME) {
      frame.current = IDLE_FRAME;
      setFrame(IDLE_FRAME);
    }
    if (plane.current) plane.current.scale.x = facing.current;

    material.uniforms.uCell.value = DITHER_CELL_CSS * state.viewport.dpr;

    // Snap the sprite to the screen grid so its pixels stay locked to the
    // dither cells while the camera pans.
    const dpr = viewport.dpr;
    const deviceW = size.width * dpr;
    const deviceH = size.height * dpr;
    const world = new THREE.Vector3(playerX.current, 0, PLAYER_Z).project(camera);
    const px = (world.x * 0.5 + 0.5) * deviceW;
    const py = (world.y * 0.5 + 0.5) * deviceH;
    const cell = DITHER_CELL_CSS * dpr;
    const sx = Math.round(px / cell) * cell;
    const sy = Math.round(py / cell) * cell;
    const distance = camera.position.z - PLAYER_Z;
    const visibleHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    const unitsPerPixel = visibleHeight / deviceH;

    if (group.current) {
      group.current.position.set(
        playerX.current + (sx - px) * unitsPerPixel,
        -(sy - py) * unitsPerPixel - WORLD_HEIGHT / CELL_H,
        PLAYER_Z
      );
    }
  });

  return (
    <group ref={group}>
      <mesh ref={plane} position={[0, WORLD_HEIGHT / 2, 0]} material={material}>
        <planeGeometry args={[WORLD_HEIGHT * (CELL_W / CELL_H), WORLD_HEIGHT]} />
      </mesh>
    </group>
  );
}
