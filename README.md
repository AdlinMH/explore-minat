# Jelajah Minat — Eksplorasi Minat Karier

Aplikasi web berbahasa Indonesia untuk siswa SMK (pilot XII RPL 1 dan XII RPL 2 SMKN 9 Medan) mengenali ketertarikan awal pada 8 bidang kerja, plus dashboard pemateri. Ini kuesioner minat yang **belum tervalidasi**, bukan tes kemampuan atau tes psikologi.

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS 4, shadcn/ui, Lucide, Recharts, Supabase Postgres, OpenAI Responses API (opsional), Vercel.

## Ringkasan arsitektur

| Bagian | Lokasi |
|---|---|
| Konfigurasi kuesioner berversi (pertanyaan, kategori, profesi, aktivitas) | `src/config/questionnaire.ts` |
| Scoring deterministik (server) | `src/lib/scoring.ts` |
| Statistik admin (rata-rata, distribusi berbobot seri, per kelas) | `src/lib/stats.ts` |
| Validasi Zod, kolom ekspor bersama, CSV aman, XLSX | `src/lib/validation.ts`, `src/lib/export-rows.ts`, `src/lib/csv.ts`, `src/lib/xlsx.ts` |
| Alasan per bidang di kartu hasil (“Kenapa bidang ini muncul?”) | `src/lib/reasons.ts` |
| Penjelasan AI (tidak ditampilkan di halaman hasil sejak 20 Nov 2026; kode, endpoint, dan tes tetap ada untuk diaktifkan lagi) | `src/lib/explanation/`, `src/server/explanations.ts` |
| Akses data server-only (Postgres), auth admin, rate limit, cache AI | `src/server/` |
| Server Actions (kirim kuis, login, kelas) | `src/app/actions/` |
| Halaman siswa | `/`, `/isi`, `/hasil/[id]` |
| Halaman admin | `/admin/login`, `/admin`, `/admin/responden/[id]`, `/admin/kelas`, `/admin/ekspor/excel` (.xlsx), `/admin/ekspor` (CSV) |
| Endpoint penjelasan AI (pemilik respons/admin saja) | `POST /api/hasil/[id]/penjelasan` |
| Migration & seed | `supabase/migrations/`, `supabase/seed.sql` |
| Tes | `tests/unit/`, `tests/db/` |

Alur data: browser → Server Action/Route Handler → validasi Zod + pemeriksaan origin + otorisasi → Postgres (koneksi server-only). Browser tidak pernah mengakses Supabase langsung. Skor dihitung ulang di server dari 24 jawaban; nilai skor/kategori dari klien diabaikan.

**Skema** (`supabase/migrations/20261120000000_init.sql`): `classes`, `responses` (nama, kelas, jawaban JSONB, versi, skor server, `submission_key` unik, hash token pemilik), `admin_sessions` (hash token saja), `rate_limits` (fixed window persisten), `result_explanations` (cache AI privat dengan status/lease/attempts). Semua tabel RLS aktif tanpa policy, dan hak `anon`/`authenticated` dicabut.

## Setup lokal

Butuh Node.js ≥ 20.9.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Isi `.env.local` (lihat keterangan di `.env.example`):

1. `DATABASE_URL`: Supabase Dashboard → **Connect** → *Transaction pooler* (port 6543).
2. `ADMIN_PIN_HASH`: jalankan perintah di bawah, ketik PIN 6 digit (tidak tampil di layar atau riwayat shell), lalu salin hash yang dicetak.

```bash
npm run hash-pin
```

3. Opsional dan saat ini tidak dipakai (panel penjelasan AI disembunyikan), `OPENAI_API_KEY` dan `OPENAI_MODEL`. Pilih model dari [daftar model OpenAI](https://developers.openai.com/api/docs/models) yang tersedia untuk project Anda dan mendukung Responses API dengan Structured Outputs. Tanpa keduanya, aplikasi memakai penjelasan template.

Terapkan database: buka Supabase → **SQL Editor**, jalankan isi `supabase/migrations/20261120000000_init.sql`, lalu `supabase/seed.sql`. Keduanya aman dijalankan ulang.

```bash
npm run dev
```

## Pemeriksaan

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

`npm test` menjalankan tes unit. Tes database (`tests/db/`) hanya berjalan jika `TEST_DATABASE_URL` menunjuk Postgres **lokal** (dibatasi ke localhost). Skema harus sudah diterapkan, begitu juga role `anon`/`authenticated` seperti di Supabase. Tes otomatis tidak pernah memanggil API OpenAI berbayar; pemanggil AI di-mock.

```bash
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:54329/emk_test npm test
```

## Deployment Vercel

1. Push repository ini ke GitHub, lalu impor di Vercel (framework terdeteksi otomatis sebagai Next.js).
2. **Project Settings → Environment Variables**: isi `DATABASE_URL`, `ADMIN_PIN_HASH`, serta `OPENAI_API_KEY` + `OPENAI_MODEL` (opsional) untuk *Production*. Untuk *Preview*, sebaiknya pakai database/PIN terpisah atau jangan isi agar preview tidak menyentuh data siswa. Jangan menaruh nilai rahasia di perintah deploy atau log.
3. Setiap perubahan environment variable baru berlaku setelah **redeploy**.
4. Cookie memakai prefix `__Host-` + `Secure` di production, jadi aplikasi harus diakses lewat HTTPS (domain `*.vercel.app` atau domain kustom). Jika memakai domain kustom di belakang proxy lain, tambahkan origin-nya ke `APP_ORIGIN`.
5. Smoke test setelah deploy: buka `/`, isi kuis dengan nama uji, cek `/hasil/...`, login `/admin`, cek dashboard/ekspor, lalu hapus data uji di SQL Editor (`delete from responses where name = '...'`).
6. Penjelasan AI baru dianggap aktif di production setelah hasil uji menampilkan label “Penjelasan dibantu AI”.

## Keamanan dan privasi

- Rahasia hanya dari environment server. Tidak ada `NEXT_PUBLIC_` untuk rahasia. `.env*` diabaikan Git kecuali `.env.example`.
- Hasil siswa hanya bisa dibuka di perangkat pengirim: cookie HttpOnly berisi kunci pengiriman acak (UUID v4), dan database menyimpan hash-nya. ID respons acak (UUID), bukan berurutan.
- Sesi admin: token acak 32 byte, database hanya menyimpan hash SHA-256. Cookie HttpOnly, Secure (production), SameSite=Lax, berlaku 8 jam. Logout mencabut sesi. Mengganti `ADMIN_PIN_HASH` atau `ADMIN_SESSION_EPOCH` mencabut semua sesi.
- PIN diverifikasi dengan scrypt dan perbandingan waktu-konstan. Pesan gagal dibuat generik.
- Rate limit persisten di Postgres, berlaku lintas instance:
  - Login: 8 per 15 menit per sumber, 60 per 15 menit global.
  - Kirim kuis: 150 per 10 menit per sumber (longgar karena satu kelas bisa berbagi Wi-Fi), 3000 global.
  - Generasi AI: maksimal 2 percobaan per respons, `AI_HOURLY_LIMIT` per jam global.
- IP diambil dari header Vercel. Di luar Vercel, header proxy hanya dipercaya jika `TRUST_PROXY=1`; tanpa itu semua klien berbagi satu bucket dan batas global tetap berlaku. IP disimpan sebagai hash.
- Mutasi diperiksa origin-nya: Server Action memeriksanya secara bawaan, dan ada pemeriksaan eksplisit tambahan. Data personal/admin dikirim dengan `Cache-Control: private, no-store`, `noindex`, dan `X-Frame-Options: DENY`.
- Ekspor tersedia sebagai Excel (.xlsx) dan CSV, dengan kolom dan filter yang sama. File Excel menyimpan skor/jawaban sebagai angka, waktu sebagai tanggal WIB, baris judul dibekukan, dan semua teks sebagai sel teks (tidak pernah formula), jadi aman dibuka dengan klik dua kali di Excel berbahasa Indonesia.
- CSV ekspor menetralkan sel yang diawali `= + - @`, tab, atau CR, termasuk nama, kelas, dan teks bebas. CSV memakai pemisah koma; di Excel berformat Indonesia, buka lewat **Data → From Text/CSV**.
- Data ke OpenAI hanya berisi ID/teks pertanyaan dari konfigurasi, skor, peringkat server, status eksplorasi, dan katalog profesi. Nama, kelas, ID respons, dan teks bebas siswa tidak dikirim. `store: false`.
- Keluaran AI divalidasi dengan schema (Structured Outputs + Zod), panjang teks, kategori harus sesuai rekomendasi server, ID profesi harus ada di katalog, dan klaim seperti bakat/kepribadian/“pasti cocok” ditolak. Jika gagal, aplikasi memakai template tanpa label AI.

## Batasan yang diketahui

- Nama tidak diverifikasi; satu siswa bisa mengirim lebih dari sekali dengan perangkat atau sesi berbeda. Dashboard menyebut “respons”, bukan “siswa”.
- Hasil hanya dapat dibuka ulang di perangkat/browser yang sama selama 30 hari. Pada perangkat bersama, pengirim berikutnya menggantikan akses pengirim sebelumnya.
- Generasi AI berjalan dalam request `POST` dengan timeout 20 detik (`maxDuration` 60 detik). Jika request terputus, lease 45 detik memungkinkan klaim ulang.
- Rate limit fixed window bisa mengizinkan lonjakan kecil di batas window.
