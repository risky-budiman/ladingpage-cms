const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, 'data', 'site-data.json');
const BACKUP_DIR = path.join(ROOT_DIR, 'data', 'backups');

// Pastikan direktori backup tersedia
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Enable CORS for flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: GET /api/content
  if (req.method === 'GET' && pathname === '/api/content') {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(raw);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File data tidak ditemukan' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: POST /api/save-content
  if (req.method === 'POST' && pathname === '/api/save-content') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Batasi ukuran request (maks 10MB)
      if (body.length > 10 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload terlalu besar' }));
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);

        // Buat backup snapshot otomatis
        if (fs.existsSync(DATA_FILE)) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = path.join(BACKUP_DIR, `site-data-${timestamp}.json`);
          fs.copyFileSync(DATA_FILE, backupPath);
        }

        // Tulis data baru dengan formatting rapi (indent 2)
        fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');

        // Juga buat/update sitemap.xml dan robots.txt dinamis jika diinginkan
        generateSitemapAndRobots(parsed);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Konten berhasil disimpan ke server dan dibuatkan backup otomatis!',
          updatedAt: new Date().toISOString()
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Format JSON tidak valid atau gagal menyimpan: ' + err.message }));
      }
    });
    return;
  }

  // API: GET /api/backups
  if (req.method === 'GET' && pathname === '/api/backups') {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          return { name: f, size: stat.size, time: stat.mtime };
        })
        .sort((a, b) => b.time - a.time);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ backups: files }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Routing file statis
  let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

  // Jika URL adalah /admin, redirect atau layani admin.html
  if (pathname === '/admin' || pathname === '/admin/') {
    filePath = path.join(ROOT_DIR, 'admin.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>Halaman atau file tidak ditemukan di server IDS.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = { 'Content-Type': contentType };

    // Proteksi SEO: Jangan biarkan admin.html atau data sensitif diindeks oleh crawler
    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html' || pathname.startsWith('/data/') || pathname.startsWith('/api/')) {
      headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive, nosnippet';
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Otomatis sinkronkan robots.txt & sitemap.xml jika data diupdate
function generateSitemapAndRobots(data) {
  try {
    const siteUrl = (data.seo && data.seo.canonicalUrl) ? data.seo.canonicalUrl.replace(/\/$/, '') : 'https://ids.net.id';
    
    // Sitemap (Hanya halaman publik, TIDAK memuat admin panel)
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/#layanan</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/#tentang</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteUrl}/#kontak</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapContent, 'utf-8');

    // Robots.txt: Blokir tegas akses crawler/bot ke admin dan data
    const robotsContent = `User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /data/

# AI Search & Crawlers (Halaman publik terindeks, Panel Admin & Data terproteksi penuh)
User-agent: GPTBot
Allow: /
Disallow: /admin.html
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /data/

User-agent: PerplexityBot
Allow: /
Disallow: /admin.html
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /data/

User-agent: ClaudeBot
Allow: /
Disallow: /admin.html
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /data/

User-agent: Google-Extended
Allow: /
Disallow: /admin.html
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /data/

Sitemap: ${siteUrl}/sitemap.xml
`;
    fs.writeFileSync(path.join(ROOT_DIR, 'robots.txt'), robotsContent, 'utf-8');
  } catch (e) {
    console.error('Error generating SEO files:', e.message);
  }
}

// Inisialisasi sitemap & robots saat start
if (fs.existsSync(DATA_FILE)) {
  try {
    const initialData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    generateSitemapAndRobots(initialData);
  } catch(e) {}
}

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`====================================================`);
    console.log(`🚀 Server IDS CMS & Landing Page berjalan!`);
    console.log(`🌐 Website Utama: http://localhost:${portToTry}/`);
    console.log(`⚙️  Admin Panel CMS: http://localhost:${portToTry}/admin`);
    console.log(`====================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = PORT + 1;
    console.log(`Port ${PORT} sedang dipakai, mencoba port ${nextPort}...`);
    startServer(nextPort);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
