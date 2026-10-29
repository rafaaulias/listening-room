// Shared dither pieces so the room pass and the character layer land on the
// same screen grid and the same two values as the v1 visualizer.

export const DITHER_LOW = 0.04;
export const DITHER_HIGH = 0.93;
export const DITHER_CELL_CSS = 3;

export const DITHER_GLSL = /* glsl */ `
float m2(vec2 p) { return 2.0 * abs(p.x - p.y) + p.y; }
float bayer4(vec2 p) {
  vec2 f = mod(floor(p), 4.0);
  return (4.0 * m2(mod(f, 2.0)) + m2(floor(f / 2.0)) + 0.5) / 16.0;
}
vec3 ditherLinearToSrgb(vec3 c) {
  vec3 x = max(c, vec3(0.0));
  return mix(x * 12.92, 1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), x));
}
vec3 ditherSrgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
`;
