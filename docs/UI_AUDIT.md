# UI Audit — Halaman Checkout QRIS (`src/web/checkout.js`)

> Audit berdasarkan design-taste-frontend skill (audit-first, redesign mode).
> Tanggal: 2026-10-24 · Mode: audit saja, belum ada perubahan kode.
>
> **STATUS: SELESAI** — Semua temuan P0/P1/P2 telah diimplementasikan di `src/web/checkout.js` (2026-10-24). Verifikasi: format ✓ · lint ✓ · build ✓ · 37/37 tests ✓.

**Scope note:** Ini halaman checkout pembayaran single-purpose, bukan landing page. Bagian skill yang diterapkan: typography, color calibration, kontras, interactive states, a11y, mobile mechanics, AI tells, copy audit. Bagian hero/bento/marquee tidak relevan.

**Design Read:** halaman checkout pembayaran untuk konsumen GoPay/QRIS, bahasa trust-first dark fintech, mobile-first.

**Dial reading (kondisi existing):** `DESIGN_VARIANCE: 2` · `MOTION_INTENSITY: 3` · `VISUAL_DENSITY: 3` — tepat untuk preset trust-first (3 / 2-3 / 4-5). Tidak perlu diubah.

---

## 1. Temuan Prioritas

### P0 — Kepercayaan & fungsional (perbaiki sebelum dipakai serius)

| #   | Temuan                              | Lokasi   | Masalah                                                                                                                                                                                                                                      |
| --- | ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Google Fonts via `<link>` eksternal | L22      | Halaman pembayaran melakukan panggilan jaringan ke `fonts.googleapis.com`. Bertentangan dengan positioning produk "0 panggilan pihak ketiga" (README/BENCHMARK). Kebocoran IP + timing pengunjung, render-blocking, single point of failure. |
| 2   | Error network senyap                | L169-170 | `checkStatusManual()` gagal hanya `console.error`; pengguna tidak melihat apa pun. Di halaman pembayaran, feedback kegagalan wajib inline (mis. "Gagal memeriksa status, coba lagi").                                                        |
| 3   | Tidak ada `aria-live`               | L68-71   | Perubahan status (PENDING → PAID/EXPIRED) hanya visual. Pengguna screen reader tidak pernah tahu pembayaran lunas. Tambahkan `role="status"` / `aria-live="polite"` pada badge status.                                                       |

### P1 — Mobile & aksesibilitas

| #   | Temuan                            | Lokasi      | Masalah                                                                                                                                                                 |
| --- | --------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | `min-height: 100vh`               | L25         | Gunakan `100dvh`; di iOS Safari address bar collapse membuat card "melompat" saat centering. Halaman ini mobile-first, dampaknya nyata.                                 |
| 5   | Timer tanpa alternatif non-visual | L63-66      | Countdown per-detik tidak bermakna bagi screen reader. Beri `aria-hidden="true"` pada nilai timer + sampaikan durasi dalam teks ("5 menit") atau announce di milestone. |
| 6   | Kontras tombol borderline         | L38         | `#0284c7` + teks putih ≈ 4.5:1 — lolos AA tapi nyaris kalah. Turunkan ke `#0369a1` (sky-700) sebagai base atau pertebal font.                                           |
| 7   | Emoji sebagai ikon status & CTA   | L69, 75, 84 | `🟢🟡🔴🔄✅` — rendering beda antar platform (Windows/Android/iOS). Status pembayaran butuh SVG konsisten; emoji di dalam label tombol CTA juga mengganggu hierarki.    |

### P2 — Polish

| #   | Temuan                                 | Lokasi      | Masalah                                                                                                                                                                                    |
| --- | -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8   | `qrImageUrl` tanpa escape              | L60         | Disisipkan mentah ke `src="..."`. Server-controlled (dari `PUBLIC_BASE_URL`), tapi verifikasi provenance: pastikan berasal dari env, bukan `Host` header request (residu SEC-07 di audit). |
| 9   | Inline script + `onclick`              | L73, 79, 91 | Menghalangi penerapan CSP strict di masa depan. Refactor bertahap ke script terpisah/nonce saat CSP jadi prioritas.                                                                        |
| 10  | `<meta name="theme-color">` tidak ada  | L18-22      | Tambahkan `#0f172a` agar chrome browser mobile menyatu dengan halaman gelap.                                                                                                               |
| 11  | Copy: "Belum Dibayar (Dicoba lagi...)" | L162        | Lebih natural: "Belum dibayar. Coba lagi." Konsistenkan kapitalisasi status.                                                                                                               |
| 12  | Timer awal hardcoded "05:00"           | L65         | Jika `QRIS_EXPIRY_MS` diubah (mis. 10 menit), tampilan awal salah 1 detik sebelum koreksi. Hitung dari `expiresTimestamp` server-side.                                                     |
| 13  | Ikon QR hand-rolled SVG                | L52         | Geometris dan sederhana — masih acceptable. Jika nanti butuh lebih banyak ikon, pindah ke satu icon library (Phosphor/Tabler), jangan campur.                                              |

## 2. Yang Sudah Baik (preserve)

- Dial kalibrasi tepat untuk trust-first: layout simetris single-card, motion fungsional minimal (spinner, hover lift 1px, transisi status).
- Dark theme locked konsisten, QR di atas putih (scannability benar).
- Plus Jakarta Sans (bukan Inter), `display=swap`.
- Semua interpolasi server-side yang user-influenced di-escape (`safeAmount`, `safeQrisId`, field transaksi).
- State machine lengkap: pending/paid/expired, disabled state tombol + checkbox, auto-poll opt-in (default off, selaras klaim "polling terkontrol").
- Mobile-first: single card `max-width: 420px`, padding 16px, `lang="id"`, `viewport` benar, `label for` benar.
- Shadow tinted ke background (bukan pure-black di light bg), radius system koheren (12/16/20).
- Tidak ada AI tells berat: tanpa em-dash, tanpa version footer, tanpa eyebrow, copy register konsisten.

## 3. Rekomendasi Implementasi (urutan)

1. **P0 batch** (±30 menit): self-host font / fallback ke system stack tanpa link eksternal; tambahkan inline error feedback di catch; tambahkan `aria-live="polite"` pada status badge.
2. **P1 batch** (±30 menit): `100dvh`, `theme-color`, timer a11y, kontras tombol, ganti emoji ke SVG inline (3 ikon status + spinner sudah ada + ikon centang).
3. **P2**: verifikasi provenance `qrImageUrl`, copy fixes, timer awal dari server, (opsional) persiapan CSP.

Setelah implementasi: jalankan `bun test` (ada assertion di `tests/integration/qrisRoutes.test.js` yang memeriksa isi HTML checkout) + verifikasi manual di perangkat iOS Safari.
