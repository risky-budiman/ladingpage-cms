# PT Infra Digital Solusindo (IDS) — Landing Page & CMS Panel

Website Company Profile resmi **PT Infra Digital Solusindo (IDS)** — penyedia solusi jaringan fiber optik, koneksi internet berkecepatan tinggi, integrasi sistem, dan layanan IT di Medan, Binjai, Langkat, dan sekitarnya.

Website ini dilengkapi dengan **Admin Panel CMS mandiri**, optimasi **SEO modern & AI Crawlers**, serta **desain antarmuka responsif dan berkinerja tinggi**.

---

## 🌟 Fitur Utama

- 🎨 **Landing Page Modern**:
  - Hero Section dinamis dengan quick CTA & badge status jaringan.
  - Showcase Layanan (Fiber Optic, Dedicated Internet, IT Solution, Network Maintenance).
  - Galeri Dokumentasi Proyek interaktif dengan filter kategori.
  - Tentang Kami & Nilai Keunggulan Perusahaan.
  - FAQ (Pertanyaan yang Sering Diajukan) accordion interaktif.
  - Formulir Konsultasi WhatsApp Cepat & Terintegrasi.
  - Footer komprehensif dengan jam kerja dinamis dan kontak resmi.
- ⚙️ **Admin Panel CMS Lengkap**:
  - Kelola seluruh teks, deskripsi, gambar, logo, jam kerja, kontak, dan tautan navbar/footer tanpa menyentuh kode program.
  - Sistem ganti password/PIN Admin CMS dengan verifikasi keamanan.
  - Real-time preview & auto-sync antar modul form.
  - Sistem pencadangan data otomatis (*automatic JSON backups*) setiap kali data disimpan.
- 🔒 **Akses Admin Tersembunyi & Anti-Index SEO**:
  - Tidak ada tombol login admin di landing page publik (privat untuk pemilik).
  - Dilengkapi `robots.txt`, meta `noindex, nofollow`, dan header HTTP `X-Robots-Tag` agar aman dari pencarian publik & AI crawlers.
- ⚡ **Ringan & Cepat**:
  - Ditenagai oleh Vanilla JavaScript, Tailwind CSS terkompilasi, dan Node.js native tanpa ketergantungan framework berat.

---

## 📁 Struktur Direktori

```text
├── admin.html             # Halaman antarmuka Admin Panel CMS (Privat)
├── index.html             # Halaman Landing Page publik
├── server.js              # Server backend Node.js (API CMS & Static Server)
├── package.json           # Dependensi Tailwind & skrip npm
├── robots.txt             # Aturan akses search engine & AI bot
├── sitemap.xml            # Peta situs SEO otomatis
├── .gitignore             # Daftar file yang diabaikan oleh Git
├── DEPLOYMENT.md          # 📖 Panduan lengkap cara deploy ke Server
├── data/
│   ├── site-data.json     # Database file utama konten website
│   └── backups/           # Direktori backup otomatis CMS
├── dist/
│   └── output.css         # CSS Tailwind terkompilasi & terminifikasi
├── images/                # Asset gambar, logo, ikon, dan foto galeri
└── src/
    ├── admin.js           # Logika interaktif & kontrol Admin Panel CMS
    ├── cms-engine.js      # Rendering data dinamis ke Landing Page
    ├── input.css          # Sumber styling Tailwind CSS
    └── main.js            # Interaksi UI landing page (accordion, filter, mobile menu)
```

---

## 💻 Menjalankan di Komputer Lokal (Development)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18, 20, atau 22 LTS).

### 2. Instalasi & Menjalankan Server
```bash
# Clone atau buka folder proyek
cd ids-landing-main

# Install dependensi (Tailwind CSS)
npm install

# Build asset CSS Tailwind
npm run build

# Jalankan server
npm start
```

Buka di browser:
- **Landing Page Publik**: `http://localhost:3000/`
- **Admin Panel CMS**: `http://localhost:3000/admin` *(Default PIN: `admin123`)*

---

## 🚀 Panduan Deployment ke Server

Untuk panduan lengkap cara upload ke **GitHub** dan mendeploy ke **Server Production (VPS Ubuntu/Debian dengan Nginx + SSL HTTPS, atau cPanel)**, silakan baca dokumentasi terperinci di:

👉 **[Baca Panduan Deployment Lengkap (DEPLOYMENT.md)](./DEPLOYMENT.md)**

---

## 🛡️ Hak Cipta & Lisensi
Hak Cipta © 2026 **PT Infra Digital Solusindo**. Seluruh hak cipta dilindungi undang-undang.
