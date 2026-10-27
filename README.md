# Reaksi Saluran WhatsApp

Tempel link postingan Saluran WhatsApp, pilih 1 sampai 5 emoji, lalu kirim reaksi.
Frontend statis + backend serverless Vercel (`/api/react`).

## Struktur

```
public/index.html   tampilan web
api/react.js        backend (validasi, rate-limit, panggil API)
lib/react_ch.js     skrip sendreactch asli (credit Zx dipertahankan)
package.json        dependensi axios, dipasang otomatis oleh Vercel
vercel.json         durasi fungsi 60 detik + header keamanan
```

## Deploy di Vercel

1. Ekstrak zip, lalu upload ke GitHub (repo baru).
2. Di vercel.com pilih **Add New > Project**, impor repo tadi.
3. Framework Preset: **Other**. Build Command dan Output Directory dikosongkan. Klik **Deploy**.

Atau pakai CLI:

```
npm i -g vercel
vercel --prod
```

Axios terpasang otomatis dari `package.json` saat deploy. Tidak perlu `npm install` manual.

## Jalankan lokal

```
npm i -g vercel
npm install
vercel dev
```

Buka http://localhost:3000

## Pengaturan opsional

- `REACT_MODE=separate`: kirim satu request per emoji (bukan digabung koma).
  Pakai ini kalau di hasil hanya emoji pertama yang masuk. Atur di Vercel: Settings > Environment Variables.

## Catatan

- Link harus berbentuk `https://whatsapp.com/channel/<idSaluran>/<idPostingan>`.
- Backend membatasi emoji ke daftar yang diizinkan, maksimal 5, dan 6 permintaan per menit per IP (best-effort).
- Pengiriman memakai API pihak ketiga (`apis.davidcyriltech.my.id`). Pesan "Server is busy" itu wajar saat server mereka ramai.
- Kalau membagikan ulang, pertahankan credit Zx di `lib/react_ch.js`.
