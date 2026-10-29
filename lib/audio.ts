export type Levels = { bass: number; mid: number; high: number; pulse: number };

export type AudioEngine = {
  ctx: AudioContext;
  read: () => Levels;
  load: (url: string) => Promise<void>;
  dispose: () => void;
};

export function createAudio(): AudioEngine {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0; // smoothing kita atur sendiri (envelope)

  const el = new Audio();
  el.crossOrigin = "anonymous";
  ctx.createMediaElementSource(el).connect(analyser);
  analyser.connect(ctx.destination);

  const buf = new Uint8Array(analyser.frequencyBinCount);
  const hzPerBin = ctx.sampleRate / analyser.fftSize;
  const band = (lo: number, hi: number) => {
    const a = Math.floor(lo / hzPerBin);
    const b = Math.max(a + 1, Math.ceil(hi / hzPerBin));
    let s = 0;
    for (let i = a; i < b; i++) s += buf[i];
    return s / ((b - a) * 255);
  };

  const env: Levels = { bass: 0, mid: 0, high: 0, pulse: 0 };
  let bassAvg = 0;
  let currentUrl: string | null = null;

  return {
    ctx,
    read() {
      analyser.getByteFrequencyData(buf);
      const t = { bass: band(20, 150), mid: band(150, 2000), high: band(2000, 12000) };
      // attack instan, release lambat
      env.bass = Math.max(t.bass, env.bass * 0.92);
      env.mid = Math.max(t.mid, env.mid * 0.92);
      env.high = Math.max(t.high, env.high * 0.92);
      bassAvg = bassAvg * 0.98 + t.bass * 0.02;
      env.pulse = t.bass > bassAvg * 1.35 + 0.05 ? 1 : env.pulse * 0.9;
      return env;
    },
    async load(url) {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = url;
      el.src = url;
      await el.play();
    },
    dispose() {
      el.pause();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      void ctx.close();
    },
  };
}