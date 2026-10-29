# PRD: Listening Room (versi 2.5D)

## 1. Ringkasan
Ruangan 3D kecil yang bisa dijelajahi, di-render 1-bit (dither hitam-putih). Di dalamnya ada satu karakter sprite 2D orisinal, si "pendengar", yang jalan kiri-kanan (side-scroll, kamera perspektif). Dia berinteraksi dengan turntable buat memutar lagu, dan seluruh ruangan (lampu, speaker, TV, karakter) bereaksi ke audio.

Tujuan: showpiece portfolio RAPDESIGN + bahan PKL front-end / UI-UX. Visualizer 1-bit dari versi 1 tetap dipakai, jadi layar TV di dalam ruangan.

## 2. Goals
- G1: Terasa seperti satu dunia utuh (ruangan, karakter, suara), bukan visualizer yang ditempeli karakter.
- G2: 60 fps di laptop menengah (DPR max 1.5).
- G3: Identitas visual konsisten: dither Bayer 1-bit, dua nilai (hampir hitam, hampir putih), restraint.
- G4: Bisa dikontrol penuh lewat keyboard dan punya fallback DOM untuk aksesibilitas.

## 3. Non-goals
- Bukan game platformer: tanpa fisika, lompat, musuh, atau progres.
- Satu ruangan saja di MVP.
- Tanpa backend dan tanpa akun.
- Tidak membundel lagu berhak cipta. Karakter dan aset harus orisinal, tidak meniru karakter game/film yang sudah ada.

## 4. Alur user
1. Gate: layar hitam + tombol `Enter the room` (user gesture untuk AudioContext).
2. Ruangan muncul, karakter berdiri idle, hint: "Walk to the turntable".
3. A/D atau panah buat jalan. Dekat turntable muncul prompt `E` buat berinteraksi.
4. Interaksi membuka pemilih file audio. Lagu main, ruangan hidup.
5. Karakter berganti ke pose "listen" (angguk ke bass). Ganti track kapan saja lewat turntable.

## 5. Requirements fungsional
| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR1 | Scene 3D: lantai, dinding, turntable, speaker, lampu, TV. Kamera perspektif FOV rendah, mengikuti karakter di sumbu X | Must |
| FR2 | Post-process dither Bayer 4x4 di grid pixel layar (sel = 3 CSS px) | Must |
| FR3 | Karakter sprite: plane + sprite sheet 1-bit, NearestFilter, `alphaTest`, billboard sumbu Y, posisi di-snap ke grid pixel | Must |
| FR4 | State karakter: idle, walk, listen. Animasi via offset UV, 8-10 fps | Must |
| FR5 | Input: A/D + panah, E buat interaksi. Touch: tombol kiri/kanan + tap | Must |
| FR6 | Audio engine dari versi 1 (`lib/audio.ts`): band bass/mid/high, envelope, beat pulse | Must |
| FR7 | Turntable: interaksi memuat file audio lokal. Piringan berputar saat lagu main | Must |
| FR8 | Objek reaktif: intensitas lampu ke bass, cone speaker berdenyut, karakter angguk ke `uPulse` | Must |
| FR9 | TV di ruangan menampilkan shader visualizer v1 (render ke render target, jadi texture) | Should |
| FR10 | Fallback DOM: tombol "Choose an audio file", status `aria-live` ("Now playing: ...") | Must |
| FR11 | Share tab audio (`getDisplayMedia`, Chrome/Edge desktop) | Could |
| FR12 | Capture: freeze frame, export PNG poster 1-bit | Could |

## 6. Mapping audio
| Sumber | Efek |
|--------|------|
| Bass | Intensitas lampu, cone speaker, amplitudo warp di layar TV |
| Mid | Kecepatan aliran shader TV, putaran piringan halus |
| High | Grain di layar TV |
| Beat (`pulse`) | Karakter angguk, kilatan sesaat di lampu |

## 7. Arsitektur
- Next.js (App Router) + React Three Fiber + drei + three. Next 15 / React 19 butuh R3F v9. Cek peer dependency sebelum install, pin versi persis.
- Post-process dither lewat `@react-three/postprocessing` (custom Effect) atau `ShaderPass`.
- **Keputusan terbuka (selesaikan di M5):** sprite karakter ikut kena dither layar (bisa berkilau saat bergerak, "shower door effect") atau di-composite setelah dither sebagai layer sendiri (art sudah 1-bit, di-snap ke grid). Mulai dengan layer terpisah.
- Pencahayaan: material sederhana + beberapa light, tanpa shadow map di MVP. Luminance hasil lighting inilah yang di-dither.
- Loop animasi pakai `useFrame` + ref. Jangan `setState` per frame.
- Rute baru `/room`. Rute `/` (visualizer v1) tetap sampai M4.

## 8. Aset
- Karakter: ~32x48 px per frame, 1-bit, 3 animasi (idle, walk, listen). Owner menggambar (Aseprite/Piskel). Sampai ada art final, pakai placeholder yang digambar via canvas saat runtime.
- Ruangan: primitif (box, cylinder) dulu. Model low-poly GLB boleh nanti, buatan sendiri atau lisensi jelas.
- Label piringan hitam: teks judul lagu di-render ke canvas texture (diegetic).

## 9. Non-functional
- Perf: DPR max 1.5, di bawah ~100 draw call, tanpa shadow map, texture atlas untuk sprite.
- A11y: kontras teks DOM minimal 4.5:1, focus ring terlihat, semua aksi punya jalur keyboard dan DOM, `prefers-reduced-motion` (tanpa kamera sway, animasi angguk dimatikan).
- Browser: Chrome, Safari, Firefox terbaru. Di layar sempit: kontrol touch.

## 10. State UI (wajib)
Gate, loading aset (progress), empty (belum ada track, hint ke turntable), playing, error (bukan audio, gagal diputar, WebGL tidak ada, audio tidak tersedia), reduced motion.

## 11. Arah desain
Dark, monokrom, editorial, restraint. Dua nilai di canvas, satu aksen opsional untuk teks UI. Tipografi belum dipilih (placeholder sistem), keputusan owner, tulis alasannya di `DESIGN.md` sebelum ship.

## 12. Milestone
- **M0** Scaffold R3F, blockout ruangan (primitif), kamera side-scroll mengikuti titik bergerak.
- **M1** Post-process dither Bayer di atas scene.
- **M2** Karakter placeholder: gerak A/D, state machine idle/walk, snap ke grid pixel.
- **M3** Audio engine + turntable (E, load file, piringan berputar) + objek reaktif + fallback DOM.
- **M4** TV dengan shader v1, state listen + angguk ke beat.
- **M5** Selesaikan keputusan layer sprite vs dither, polish, reduced motion, perf pass, art final.
- **M6** Stretch: tab audio, capture poster, ruangan kedua.

## 13. Risiko
| Risiko | Mitigasi |
|--------|----------|
| Sprite berkilau saat bergerak | Layer sprite terpisah + snap grid (keputusan M5) |
| Aset karakter lambat jadi | Placeholder canvas, kode tidak menunggu art |
| Scope melebar | Satu ruangan, tanpa fisika, kerjakan per milestone |
| Safari menahan AudioContext | Buat dan resume hanya di handler klik gate |
| Berat di HP | DPR cap, sel dither lebih besar di layar kecil |
| Copyright | Hanya file upload user atau track bebas royalti, karakter orisinal |

## 14. Pertanyaan terbuka
- Desain karakter (siapa dia, siluet, aksesori) dan tema ruangan.
- Track bebas royalti bawaan untuk demo?
- Tipografi dan aksen warna UI.