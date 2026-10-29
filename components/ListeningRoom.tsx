"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import gsap from "gsap";
import { VERT, FRAG } from "@/lib/shader";
import { createAudio, type AudioEngine } from "@/lib/audio";

export default function ListeningRoom() {
  const host = useRef<HTMLDivElement>(null);
  const gate = useRef<HTMLButtonElement>(null);
  const audio = useRef<AudioEngine | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [track, setTrack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glFailed, setGlFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5), alpha: false });
    } catch {
      setGlFailed(true);
      return;
    }
    const gl = renderer.gl;
    el.appendChild(gl.canvas);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uFlow: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 },
        uHigh: { value: 0 }, uPulse: { value: 0 }, uPx: { value: 3 }, uRes: { value: [1, 1] },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const u = program.uniforms;

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      u.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      u.uPx.value = 3 * renderer.dpr; // sel dither = 3 CSS px
      renderer.render({ scene: mesh });
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    let last = performance.now();
    let flow = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const lv = audio.current?.read() ?? { bass: 0, mid: 0, high: 0, pulse: 0 };
      flow += dt * (0.04 + lv.mid * 0.5); // mid: kecepatan aliran
      u.uFlow.value = flow;
      u.uBass.value = lv.bass;
      u.uMid.value = lv.mid;
      u.uHigh.value = lv.high;
      u.uPulse.value = lv.pulse;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(frame);
    };
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  useEffect(() => () => audio.current?.dispose(), []);

  const enter = async () => {
    try {
      const a = createAudio();
      await a.ctx.resume();
      audio.current = a;
    } catch {
      setError("Audio is not available in this browser.");
    }
    gsap.to(gate.current, { opacity: 0, duration: 0.8, onComplete: () => setInRoom(true) });
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audio.current) return;
    setError(null);
    if (!file.type.startsWith("audio/")) {
      setError("That file is not audio. Try MP3, WAV or OGG.");
      return;
    }
    try {
      await audio.current.load(URL.createObjectURL(file));
      setTrack(file.name);
    } catch {
      setError("This file could not be played. Try another one.");
    }
  };

  return (
    <main className="room">
      <div ref={host} className="stage" aria-hidden="true" />
      {glFailed && <p role="alert" className="note">WebGL is not available in this browser.</p>}
      {!inRoom && (
        <button ref={gate} className="gate" onClick={enter}>
          Enter the room
        </button>
      )}
      {inRoom && (
        <footer className="hud">
          <p className="title">{track ?? "No track loaded"}</p>
          <label className="pick">
            <input type="file" accept="audio/*" onChange={onFile} />
            <span>{track ? "Change track" : "Choose an audio file"}</span>
          </label>
          {error && <p role="alert" className="err">{error}</p>}
        </footer>
      )}
    </main>
  );
}