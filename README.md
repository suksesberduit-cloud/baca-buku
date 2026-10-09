# Baca Buku
Pembaca EPUB local-first (PWA) dengan antrean terjemahan ke Bahasa Indonesia dan TTS.

## Status (Fase 1)
Selesai (belum diuji di perangkat nyata): impor EPUB dan FB2 (termasuk encoding windows-1251), pembaca per bab, tema/font/ukuran/jarak, posisi baca tersimpan, TTS Web Speech, antrean terjemahan dengan **MOCK provider** (hasil berlabel `[MOCK]`).
Fokus: EPUB (FB2 sebagai tambahan). DJVU/OCR dibatalkan; LIT harus dikonversi ke EPUB. Belum ada: ekspor/impor cadangan, pemindai kunci API di CI. Semua fitur belum diuji di perangkat nyata.

## Jalankan
`npm install && npm run dev` · tes: `npm test` · build: `npm run build`
Deploy: push ke `main`, aktifkan Settings › Pages › Source: GitHub Actions.

## Keamanan
Tidak ada API key di repo. Terjemahan nyata direncanakan hanya di APK (kunci di penyimpanan native), bukan di PWA.

## APK Android (Capacitor 6)
Folder `android/` dibuat otomatis oleh CI (`npx cap add android`), jadi tidak ada di repo. Workflow `Build APK debug` menghasilkan `app-debug.apk` sebagai artefak build (Actions › run › Artifacts).
Lokal: `npx cap add android && npm run cap:sync && cd android && ./gradlew assembleDebug` (butuh JDK 17 + Android SDK).
TTS di APK memakai plugin `@capacitor-community/text-to-speech` (Android TextToSpeech). Jeda di native = berhenti lalu mengulang paragraf berjalan. **Pembacaan saat layar mati belum diuji dan belum dijamin.**
APK release (keystore) belum disiapkan; jangan pernah commit keystore.

## Terjemahan nyata (hanya APK)
Penyedia: Google Cloud Translation Basic v2 dan Azure AI Translator (v3.0). Yandex belum diimplementasikan (ketersediaan API belum diverifikasi). Kunci disimpan lewat secure storage (Android Keystore) dan tidak pernah di localStorage/IndexedDB/repo. Di PWA hanya MOCK. Request memakai `CapacitorHttp` (lewat native, menghindari masalah CORS). Batas karakter bisa diatur; pemakaian dicatat di perangkat.

## Cari dan penanda
Cari teks di buku (teks asli atau terjemahan, mengikuti mode baca; maks. 100 hasil). Penanda: tombol Tandai memberi tanda pada paragraf pertama yang terlihat; daftar di tombol Tanda. Bahasa sumber diasumsikan Inggris (en), tujuan Indonesia (id).

## Cadangan dan keamanan
Ekspor ringan (terjemahan, posisi, penanda, pengaturan) atau penuh (termasuk teks buku) ke berkas JSON; di APK lewat menu bagikan. Kunci API tidak diekspor. `npm run scan` (juga di CI) memindai repo dan `dist/` untuk pola kunci/keystore dan menggagalkan build jika ada.

## Gambar, sampul, dan terjemahan seluruh buku
Gambar EPUB (maks. 6 MB per gambar) dan sampul disimpan di IndexedDB dan tampil di pembaca. Gambar luar (http) diabaikan. Terjemahan seluruh buku: panel Terjemah, tombol "Hitung dan mulai" (menampilkan jumlah karakter dan meminta konfirmasi). Tombol Kembali Android menutup panel/pembaca lebih dulu sebelum keluar. Perpustakaan menampilkan progres bab, tombol Lanjutkan, dan filter judul/penulis.

## ML Kit, terjemah otomatis, ketuk paragraf, dan ikon
Penyedia "ML Kit (offline, gratis)" (hanya APK): model Inggris dan Indonesia diunduh sekali; kualitas untuk terjemahan sederhana (lihat dokumentasi Google ML Kit; atribusi ML Kit dicantumkan di panel). Terjemah otomatis: opsi di panel Terjemah, menerjemahkan bab yang dibuka. Ketuk paragraf (mode Teks asli) untuk menerjemahkan satu paragraf. Ikon dibuat oleh `scripts/make-icons.py` (Pillow); hasilnya di `public/` dan `assets/android-res/`, disalin ke proyek Android oleh workflow APK.

## Mode baca halaman dan menu tersembunyi
Teks memenuhi layar. Geser kanan ke kiri = halaman berikutnya, kiri ke kanan = sebelumnya (di ujung bab pindah bab). Menu (Kembali, Isi, Cari, Tanda, Tampilan, Terjemah, dan kontrol bawah) muncul dengan menyentuh sudut atas kiri dan kanan bersamaan memakai dua jari; tombol ✕ atau tombol Kembali Android menutupnya. Mode "Gulir" tersedia di Tampilan. Judul bab di Isi digabung dengan nomor bab, dan daftar isi buku lama diperbarui otomatis saat dibuka. Status bar Android disembunyikan saat membaca.

## Tes koneksi, tombol putar kecil, TTS latar belakang
Panel Terjemah punya "Tes koneksi" (menerjemahkan satu kalimat contoh dan menampilkan hasil atau pesan galat). Tombol putar kecil di pojok kanan bawah tetap tampil saat menu tersembunyi (bisa dimatikan di Tampilan). TTS native mengantrekan hingga 20 paragraf sekaligus ke mesin Android agar terus berbicara walau JavaScript ditahan saat layar mati. Belum ada layanan foreground; jika masih berhenti di latar belakang, langkah berikutnya adalah plugin foreground service. Di HP Xiaomi/MIUI atur Hemat baterai aplikasi ke "Tanpa batasan".

## Buka dengan
Di APK, EPUB dan FB2 dari pengelola berkas bisa dibuka dengan "Baca Buku" (ditambahkan ke daftar pilihan aplikasi; pilih Selalu untuk menjadikannya bawaan). Buku otomatis diimpor lalu dibuka. Filter dipasang oleh `scripts/patch-manifest.py` saat build APK. Jika pengelola berkas melaporkan tipe berkas yang tidak dikenal, gunakan tombol Impor buku di aplikasi.

## PDF, MOBI, AZW3 dan rata kiri-kanan
PDF: hanya yang berisi teks (pdf.js); paragraf disusun dari posisi teks, nomor halaman/header berulang dibuang, bab dari daftar isi PDF atau per 10 halaman. PDF hasil pindaian ditolak (tanpa OCR), PDF berkata sandi belum didukung; tata letak kolom ganda/tabel bisa kurang rapi. MOBI/AZW3: lewat @lingo-reader/mobi-parser; parser KF8 selalu dicoba dulu (parser MOBI lama memotong isi berkas KF8), lalu MOBI lama. Gambar dan sampul diambil dari blob pustaka; berkas ber-DRM tidak bisa dibaca dan pesan galat menyertakan detail teknis. Teks rata kiri-kanan (justify) bisa dimatikan di Tampilan; suku kata dipotong otomatis (hyphens:auto) sesuai bahasa teks (en/id).
