# AGENTS.md

Panduan untuk AI coding agent di repo ini. Baca `PRD.md` dulu. Kerjakan satu milestone per sesi.

## Proyek
Listening Room 2.5D: ruangan 3D di-render 1-bit (dither), karakter sprite 2D orisinal, semua bereaksi ke audio.

## Stack
Next.js (App Router, TypeScript), three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, GSAP 3.12.x, Web Audio API. Cek peer dependency (Next 15 / React 19 butuh R3F v9) dan pin versi persis. Dependency di luar daftar ini butuh alasan tertulis.

## Perintah
```
npm install
npm run dev
npm run build
npm run lint
```

## Struktur
```
app/page.tsx                    visualizer v1 (tetap sampai M4)
app/room/page.tsx               rute ruangan 2.5D
components/room/Scene.tsx       canvas, kamera, lighting
components/room/Character.tsx   sprite, state machine
components/room/Turntable.tsx   interaksi + piringan
components/room/DitherPass.tsx  post-process
components/room/Hud.tsx         fallback DOM (a11y)
lib/audio.ts                    audio engine (dari v1, dipakai ulang)
lib/shader.ts                   shader v1 (jadi layar TV)
public/sprites/                 sprite sheet 1-bit
```

## Aturan teknis
1. Waktu audio = `AudioContext.currentTime` / `audio.currentTime`. Jangan `setTimeout` atau `Date.now` buat sinkronisasi.
2. Animasi hidup di `useFrame` + ref. Jangan `setState` per frame.
3. `AudioContext` hanya dibuat dan di-resume di handler user gesture.
4. Dispose semua geometry, material, texture, render target saat unmount. Bersihkan juga rAF, listener, object URL, AudioContext.
5. Sprite: `NearestFilter`, `alphaTest`, tanpa mipmap, posisi di-snap ke grid pixel layar. Jangan pakai transparansi biasa (masalah sorting).
6. Dither menempel ke grid pixel layar (`gl_FragCoord`), bukan UV. Sel = 3 CSS px x DPR.
7. Uniform dari audio dikirim sudah di-smooth (attack cepat, release lambat). Jangan kirim nilai FFT mentah.
8. Cap DPR di 1.5. Tanpa shadow map di MVP.
9. Karakter dan aset harus orisinal. Dilarang meniru karakter atau aset game/film yang sudah ada. Jangan commit audio atau aset berhak cipta.

## Aturan UI
- Dark, monokrom, editorial, restraint. Dua nilai di canvas, satu aksen maksimal.
- Tiap keputusan visual punya alasan satu kalimat. Tanpa gradient, glow, atau efek dekoratif tanpa tujuan.
- Teks UI: tanpa em dash, tanpa CTA generik, tanpa statistik atau klaim karangan.
- Semua aksi bisa lewat keyboard dan punya padanan DOM (canvas bukan satu-satunya jalur). Status lagu lewat `aria-live`.
- Kontras teks minimal 4.5:1, focus ring terlihat.
- Wajib ada state loading, empty, dan error. Hormati `prefers-reduced-motion`.
- Jangan pakai font Inter, Roboto, atau Arial. Tipografi final ditentukan owner.

## Definition of done (per milestone)
- `npm run build` dan `npm run lint` lulus.
- Dicoba manual: gate, jalan A/D dan touch, interaksi turntable, file valid dan bukan audio, resize, tab di-background lalu balik, keyboard saja.
- Tidak ada error di console. Laporkan apa yang sudah dan belum diverifikasi, jangan klaim yang belum dijalankan.

## Jangan
- Jangan ubah mapping audio (PRD bagian 6) tanpa update PRD.
- Jangan loncat ke milestone berikutnya tanpa diminta.
- Jangan fabrikasi konten (testimoni, angka, link mati).