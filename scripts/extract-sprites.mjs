import { readPNG, writePNG } from "./png.mjs";

const SRC = "assets/listener-source-sheet.png";
const OUT = "public/sprites/listener.png";
const TARGET_H = 70; // native art pixels for the character height
const MARGIN = 1; // transparent texel around the art inside each cell

// source bboxes of the nine frames, measured from the sheet
const FRAMES = [
  { name: "walk1", x0: 127, y0: 201, x1: 274, y1: 481 },
  { name: "walk2", x0: 406, y0: 202, x1: 558, y1: 481 },
  { name: "walk3", x0: 682, y0: 203, x1: 824, y1: 482 },
  { name: "walk4", x0: 948, y0: 203, x1: 1096, y1: 483 },
  { name: "walk5", x0: 124, y0: 597, x1: 271, y1: 874 },
  { name: "walk6", x0: 401, y0: 597, x1: 550, y1: 874 },
  { name: "walk7", x0: 681, y0: 599, x1: 826, y1: 876 },
  { name: "walk8", x0: 950, y0: 598, x1: 1099, y1: 875 },
  { name: "idle", x0: 1302, y0: 286, x1: 1425, y1: 603 },
];

const src = readPNG(SRC);
const { width: W, rgba } = src;

const alphaAt = (x, y) => rgba[(y * W + x) * 4 + 3];
const rgbAt = (x, y) => {
  const o = (y * W + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2]];
};

function measure(frame) {
  const { x0, y0, x1, y1 } = frame;
  const width = x1 - x0 + 1;
  // the ground line is the wide flat band of ink at the bottom of the frame
  const rowExtent = (y) => {
    let minx = x1 + 1;
    let maxx = x0 - 1;
    for (let x = x0; x <= x1; x++) {
      if (alphaAt(x, y) > 128) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
      }
    }
    return maxx >= minx ? maxx - minx + 1 : 0;
  };
  let shadowTop = -1;
  for (let y = y1; y >= y0; y--) {
    if (rowExtent(y) >= width * 0.8) {
      shadowTop = y;
      break;
    }
  }
  if (shadowTop >= 0) {
    // the line is a few pixels thick, walk up while the band is still wide
    while (shadowTop > y0 && rowExtent(shadowTop - 1) >= width * 0.8) shadowTop--;
  }
  const top = y0;
  const bottom = shadowTop >= 0 ? shadowTop - 1 : y1;
  let left = x1;
  let right = x0;
  for (let y = top; y <= bottom; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alphaAt(x, y) > 128) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  // the head band anchors the frames so the body does not jitter
  const bandEnd = top + Math.max(2, Math.round((bottom - top) * 0.12));
  let hMin = x1;
  let hMax = x0;
  for (let y = top; y <= bandEnd; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alphaAt(x, y) > 128) {
        if (x < hMin) hMin = x;
        if (x > hMax) hMax = x;
      }
    }
  }
  return {
    left,
    right,
    top,
    bottom,
    headCenter: (hMin + hMax) / 2,
    headWidth: hMax - hMin + 1,
  };
}

function resample(frame, box, nativeW, nativeH) {
  const out = Buffer.alloc(nativeW * nativeH * 4);
  const srcW = box.right - box.left + 1;
  const srcH = box.bottom - box.top + 1;
  for (let ny = 0; ny < nativeH; ny++) {
    const sy0 = box.top + (ny * srcH) / nativeH;
    const sy1 = box.top + ((ny + 1) * srcH) / nativeH;
    for (let nx = 0; nx < nativeW; nx++) {
      const sx0 = box.left + (nx * srcW) / nativeW;
      const sx1 = box.left + ((nx + 1) * srcW) / nativeW;
      let r = 0, g = 0, b = 0, wa = 0, aSum = 0, n = 0;
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) {
        if (y < 0 || y >= src.height) continue;
        for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
          if (x < 0 || x >= W) continue;
          const a = alphaAt(x, y) / 255;
          const [pr, pg, pb] = rgbAt(x, y);
          r += pr * a;
          g += pg * a;
          b += pb * a;
          wa += a;
          aSum += a;
          n++;
        }
      }
      const o = (ny * nativeW + nx) * 4;
      if (n === 0 || aSum / n < 0.5) continue;
      out[o] = Math.round(r / wa);
      out[o + 1] = Math.round(g / wa);
      out[o + 2] = Math.round(b / wa);
      out[o + 3] = 255;
    }
  }
  return out;
}

const measured = FRAMES.map((frame) => ({ ...frame, box: measure(frame) }));
for (const m of measured) {
  console.log(
    `${m.name.padEnd(6)} art x ${m.box.left}-${m.box.right} y ${m.box.top}-${m.box.bottom} ` +
      `(${(m.box.bottom - m.box.top + 1)}x${m.box.right - m.box.left + 1}) head centre ${m.box.headCenter.toFixed(1)} width ${m.box.headWidth}`
  );
}

const scaled = measured.map((m) => {
  const srcH = m.box.bottom - m.box.top + 1;
  const srcW = m.box.right - m.box.left + 1;
  const nativeH = TARGET_H;
  const nativeW = Math.max(1, Math.round((srcW * nativeH) / srcH));
  const pixels = resample(m, m.box, nativeW, nativeH);
  const headCenter = (m.box.headCenter - m.box.left) * (nativeW / srcW);
  return { ...m, pixels, nativeW, nativeH, headCenter };
});

const walk = scaled.filter((s) => s.name !== "idle");
const anchor = walk.reduce((sum, s) => sum + s.headCenter, 0) / walk.length;
const left = Math.max(...scaled.map((s) => anchor - s.headCenter));
const right = Math.max(...scaled.map((s) => s.headCenter + s.nativeW - anchor));
const cellW = Math.ceil(left + right) + MARGIN * 2;
const cellH = TARGET_H + MARGIN * 2;

const sheet = Buffer.alloc(cellW * scaled.length * cellH * 4);
scaled.forEach((frame, index) => {
  const cellX = index * cellW;
  const originX = cellX + Math.round(anchor - frame.headCenter) + MARGIN;
  const originY = MARGIN;
  for (let y = 0; y < frame.nativeH; y++) {
    for (let x = 0; x < frame.nativeW; x++) {
      const s = (y * frame.nativeW + x) * 4;
      const d = ((originY + y) * cellW * scaled.length + originX + x) * 4;
      sheet[d] = frame.pixels[s];
      sheet[d + 1] = frame.pixels[s + 1];
      sheet[d + 2] = frame.pixels[s + 2];
      sheet[d + 3] = frame.pixels[s + 3];
    }
  }
});

writePNG(OUT, cellW * scaled.length, cellH, sheet);
console.log(`\nanchor ${anchor.toFixed(2)}  cell ${cellW}x${cellH}  sheet ${cellW * scaled.length}x${cellH} -> ${OUT}`);
