# 🚀 Panduan Deployment — PT Infra Digital Solusindo (IDS)

Panduan lengkap langkah demi langkah untuk mengunggah proyek ke **GitHub** dan mendeploy ke **Server Production (VPS Ubuntu/Debian, cPanel, atau Cloud Hosting)**.

---

## 📋 Daftar Isi
1. [Spesifikasi & Kebutuhan Sistem](#1-spesifikasi--kebutuhan-sistem)
2. [Langkah 1: Upload Proyek ke GitHub](#2-langkah-1-upload-proyek-ke-github)
3. [Langkah 2: Deployment ke VPS Linux (Rekomendasi Utama)](#3-langkah-2-deployment-ke-vps-linux-rekomendasi-utama)
4. [Langkah 3: Konfigurasi Nginx & SSL HTTPS Gratis (Certbot)](#4-langkah-3-konfigurasi-nginx--ssl-https-gratis-certbot)
5. [Langkah 4: Deployment Alternatif (cPanel Node.js Selector)](#5-langkah-4-deployment-alternatif-cpanel-nodejs-selector)
6. [Langkah 5: Cara Update Website di Server (CI/CD Manual)](#6-langkah-5-cara-update-website-di-server)
7. [Langkah 6: Checklist Keamanan & Pemeliharaan](#7-langkah-6-checklist-keamanan--pemeliharaan)

---

## 1. Spesifikasi & Kebutuhan Sistem

- **Node.js**: Versi `18.x`, `20.x`, atau `22.x` (LTS)
- **NPM**: Versi 9+
- **Database**: Berbasis file lokal terstruktur (`data/site-data.json`) dengan auto-backup berkala (tidak membutuhkan database eksternal seperti MySQL atau MongoDB).
- **Port Default Server**: `3000` (atau otomatis mengikuti variabel environment `PORT`).
- **Akses Admin Panel**: Privat via `https://domain-anda.com/admin` atau `https://domain-anda.com/admin.html` (terlindungi dari publik & SEO crawler).

---

## 2. Langkah 1: Upload Proyek ke GitHub

### 2.1 Buat Repositori Baru di GitHub
1. Buka [GitHub.com](https://github.com/) dan login ke akun Anda.
2. Klik tombol **New** (Buat repositori baru).
3. Beri nama repositori, misalnya: `ids-landing` atau `ids-website`.
4. Pilih visibilitas: **Private** (disarankan agar konfigurasi data internal terlindungi) atau **Public**.
5. Jangan centang "Initialize this repository with a README" (karena kita sudah punya file lokal).
6. Klik **Create repository**.

### 2.2 Inisialisasi Git dan Push dari Komputer Lokal
Buka terminal (PowerShell / Command Prompt / Git Bash) di folder proyek:

```bash
# 1. Masuk ke folder proyek (jika belum)
cd "d:\AI Code\ids-landing-main"

# 2. Inisialisasi git lokal
git init

# 3. Tambahkan semua file (file node_modules otomatis diabaikan oleh .gitignore)
git add .

# 4. Buat commit pertama
git commit -m "feat: initial release IDS landing page and CMS panel"

# 5. Ganti branch utama menjadi 'main'
git branch -M main

# 6. Hubungkan dengan URL repositori GitHub Anda (ganti username & nama-repo)
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git

# 7. Unggah (push) ke GitHub
git push -u origin main
```

---

## 3. Langkah 2: Deployment ke VPS Linux (Rekomendasi Utama)

Metode ini menggunakan **Ubuntu 22.04 / 24.04 LTS** atau **Debian 12** pada VPS (seperti DigitalOcean, Linode, AWS EC2, Biznet GIO, Niagahoster, DomaiNesia, dll).

### 3.1 Login ke VPS via SSH
```bash
ssh root@IP_SERVER_ANDA
```

### 3.2 Update Paket & Install Node.js
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Git & Curl
sudo apt install -y git curl ufw

# Install Node.js 20.x (LTS) via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node -v
npm -v
```

### 3.3 Clone Repositori ke Direktori Server
```bash
# Buat folder web dan clone proyek
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git ids-landing

# Masuk ke folder proyek
cd ids-landing

# Install dependencies dan build Tailwind CSS untuk mode produksi
npm install
npm run build
```

### 3.4 Jalankan Server dengan Process Manager (PM2)
**PM2** memastikan aplikasi Node.js tetap hidup 24/7 di latar belakang dan otomatis menyala kembali jika server reboot atau terjadi error:

```bash
# Install PM2 secara global
sudo npm install -g pm2

# Jalankan server IDS
pm2 start server.js --name "ids-landing"

# Konfigurasi agar otomatis jalan saat server reboot
pm2 startup
# (Jalankan perintah sudo env PATH... yang ditampilkan di terminal jika ada)
pm2 save
```

Perintah berguna PM2:
- Cek status aplikasi: `pm2 status`
- Cek log realtime: `pm2 logs ids-landing`
- Restart aplikasi: `pm2 restart ids-landing`

---

## 4. Langkah 3: Konfigurasi Nginx & SSL HTTPS Gratis (Certbot)

Nginx berfungsi sebagai **Reverse Proxy** untuk meneruskan permintaan dari domain publik (`port 80/443`) ke aplikasi Node.js Anda (`port 3000`).

### 4.1 Arahkan Domain (DNS Management)
Di panel registrar domain Anda (Cloudflare, Rumahweb, Niagahoster, dll), tambahkan DNS Record:
- **Tipe**: `A`
- **Name / Host**: `@` (atau subdomain yang diinginkan)
- **Target / IP**: `IP_SERVER_VPS_ANDA`
- **TTL**: Auto / 300

### 4.2 Install & Konfigurasi Nginx
```bash
sudo apt install -y nginx

# Buka firewall port HTTP & HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

Buat file konfigurasi Nginx untuk domain Anda:
```bash
sudo nano /etc/nginx/sites-available/ids.net.id
```

Salin konfigurasi berikut (sesuaikan nama domain):
```nginx
server {
    listen 80;
    server_name ids.net.id www.ids.net.id;

    # Limit ukuran upload foto/logo hingga 10MB
    client_max_body_size 10M;

    # Gzip Compression untuk percepatan load website
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proteksi khusus folder data/ dan api/
    location /data/backups/ {
        deny all;
        return 404;
    }
}
```

Aktifkan konfigurasi Nginx:
```bash
# Buat symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/ids.net.id /etc/nginx/sites-enabled/

# Uji apakah konfigurasi Nginx valid
sudo nginx -t

# Muat ulang Nginx
sudo systemctl reload nginx
```

### 4.3 Pasang SSL Gratis (Let's Encrypt dengan Certbot)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Jalankan penerbitan sertifikat SSL otomatis
sudo certbot --nginx -d ids.net.id -d www.ids.net.id
```
Ikuti instruksi di layar, masukkan email Anda, dan pilih opsi **Redirect all HTTP traffic to HTTPS**.

Website Anda kini dapat diakses secara aman di **`https://ids.net.id`**! 🎉

---

## 5. Langkah 4: Deployment Alternatif (cPanel Node.js Selector)

Jika hosting Anda menggunakan cPanel dengan fitur **Setup Node.js App** (CloudLinux):

1. **Upload File**:
   - Kompres seluruh isi folder proyek menjadi `.zip` (kecuali folder `node_modules`).
   - Masuk ke cPanel > **File Manager**, buat folder baru (misal `/home/user/ids-landing`).
   - Upload dan ekstrak file `.zip` ke folder tersebut.
2. **Setup Node.js App**:
   - Buka menu **Setup Node.js App** di cPanel.
   - Klik **Create Application**:
     - **Node.js version**: Pilih versi `18.x` atau `20.x`.
     - **Application mode**: `Production`.
     - **Application root**: `ids-landing`.
     - **Application startup file**: `server.js`.
     - **Application URL**: Pilih domain atau subdomain Anda.
   - Klik **Create**.
3. **Install Dependencies**:
   - Klik tombol **Run NPM Install** di halaman Node.js Selector.
   - Buka terminal cPanel atau via SSH, jalankan `npm run build` untuk memproses CSS Tailwind.
4. **Restart Aplikasi**:
   - Klik tombol **Restart** di panel cPanel Node.js App.

---

## 6. Langkah 5: Cara Update Website di Server

Jika di kemudian hari Anda melakukan perubahan coding di komputer lokal:

### Di Komputer Lokal:
```bash
git add .
git commit -m "Update konten atau fitur baru"
git push origin main
```

### Di Server VPS:
```bash
cd /var/www/ids-landing
git pull origin main
npm run build
pm2 restart ids-landing
```
Website di server akan langsung terbarui tanpa downtime!

---

## 7. Langkah 6: Checklist Keamanan & Pemeliharaan

- [ ] **Ganti PIN/Password Default**:
  - Akses `https://domain-anda.com/admin`
  - Masuk dengan default PIN: `admin123`
  - Buka menu **Keamanan / Akun Admin**, dan segera ganti kata sandi ke PIN yang kuat dan unik.
- [ ] **Verifikasi Sitemap & Robots**:
  - Buka `https://domain-anda.com/robots.txt` — pastikan baris `Disallow: /admin.html` dan `Disallow: /admin` aktif.
  - Buka `https://domain-anda.com/sitemap.xml` — pastikan link publik terdaftar rapi tanpa ada URL admin.
- [ ] **Backup Rutin**:
  - File inti konten disimpan di `data/site-data.json`.
  - Sistem otomatis membuat snapshot backup di `data/backups/` setiap kali perubahan disimpan melalui CMS.
  - Anda dapat mengunduh atau mencadangkan file `data/site-data.json` secara berkala ke komputer lokal.

---
*Dokumentasi ini dibuat untuk PT Infra Digital Solusindo (IDS).*
