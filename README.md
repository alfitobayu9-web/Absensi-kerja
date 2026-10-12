# RuangKerja — Absensi

Aplikasi absensi React dengan API Node.js dan penyimpanan catatan di `data/attendance.json`. Proyek Laravel asal tidak diubah.

## Menjalankan di Windows / Laragon

Pasang Node.js 18 atau versi lebih baru, buka terminal di folder proyek, lalu jalankan:

```powershell
npm install
npm run dev
```

Buka alamat Vite yang ditampilkan di terminal (biasanya `http://localhost:5173`). Perintah pengembangan menjalankan API dan Vite bersamaan; biarkan terminal tersebut tetap terbuka.

Untuk mencoba versi produksi:

```powershell
npm run build
npm start
```

Buka `http://localhost:3001`. File JSON dibuat otomatis pada absensi pertama. Simpan cadangan `data/attendance.json` secara berkala.

## Aturan absensi

- Nama karyawan digunakan untuk mencari absensi; setiap nama hanya dapat memiliki satu catatan per tanggal WIB.
- Jam kerja dihitung dari waktu masuk hingga pulang.
- Jika durasi kerja lebih dari 8 jam (480 menit), bonus tetap Rp25.000 diberikan satu kali pada catatan hari tersebut.
- Catatan terbaru ditampilkan di dashboard, dengan maksimal 30 catatan.
- Nama karyawan belum diverifikasi dengan akun atau kata sandi; tambahkan autentikasi sebelum aplikasi dipakai untuk data absensi resmi.

Contoh data tersimpan:

```json
[
  {
    "id": "id-unik",
    "employeeName": "Budi Santoso",
    "workDate": "2026-10-05",
    "checkInAt": "2026-10-05T01:00:00.000Z",
    "checkOutAt": "2026-10-05T10:01:00.000Z",
    "workMinutes": 541,
    "overtimeMinutes": 61,
    "bonusAmount": 25000
  }
]
```

Jalankan tes aturan perhitungan dengan `npm test`.
"# Absensi-kerja" 
