export const VERT = /* glsl */ `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Pola dither menempel ke grid pixel layar (gl_FragCoord / uPx).
export const FRAG = /* glsl */ `
precision highp float;
uniform float uFlow, uBass, uMid, uHigh, uPulse, uPx;
uniform vec2 uRes;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
float m2(vec2 p) { return 2.0 * abs(p.x - p.y) + p.y; }
float bayer4(vec2 p) {
  vec2 f = mod(floor(p), 4.0);
  return (4.0 * m2(mod(f, 2.0)) + m2(floor(f / 2.0)) + 0.5) / 16.0;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uPx);
  vec2 uv = (cell * uPx - 0.5 * uRes) / uRes.y;
  vec2 p = uv * 2.2;

  vec2 q = vec2(fbm(p + uFlow), fbm(p + vec2(5.2, 1.3) - uFlow));
  float n = fbm(p + (0.6 + uBass * 1.6) * q);       // bass: domain warp
  n += (hash(cell + fract(uFlow)) - 0.5) * uHigh * 0.35; // high: grain
  n = smoothstep(0.25, 0.75, n) + uPulse * 0.15;    // beat: lonjakan sesaat

  float on = step(bayer4(cell), clamp(n, 0.0, 1.0));
  gl_FragColor = vec4(vec3(mix(0.04, 0.93, on)), 1.0);
}
`;