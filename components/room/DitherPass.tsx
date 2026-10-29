"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";
import { DITHER_CELL_CSS, DITHER_GLSL, DITHER_HIGH, DITHER_LOW } from "@/lib/dither";

const fragmentShader = /* glsl */ `
uniform float uCell;
${DITHER_GLSL}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  vec3 srgb = ditherLinearToSrgb(clamp(inputColor.rgb, 0.0, 1.0));
  float luma = dot(srgb, vec3(0.2126, 0.7152, 0.0722));
  float on = step(bayer4(cell), luma);
  vec3 low = ditherSrgbToLinear(vec3(${DITHER_LOW.toFixed(4)}));
  vec3 high = ditherSrgbToLinear(vec3(${DITHER_HIGH.toFixed(4)}));
  outputColor = vec4(mix(low, high, on), 1.0);
}
`;

class DitherEffect extends Effect {
  constructor() {
    super("DitherEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([["uCell", new THREE.Uniform(DITHER_CELL_CSS)]]),
    });
  }

  set cell(value: number) {
    (this.uniforms.get("uCell") as THREE.Uniform).value = value;
  }
}

export default function DitherPass() {
  const effect = useMemo(() => new DitherEffect(), []);

  useEffect(() => () => effect.dispose(), [effect]);

  // the cell is 3 CSS px, so it has to follow the device pixel ratio
  useFrame((state) => {
    effect.cell = DITHER_CELL_CSS * state.viewport.dpr;
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false} autoClear>
      <primitive object={effect} />
    </EffectComposer>
  );
}
