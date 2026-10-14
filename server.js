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

  // API: POST /api/ai-optimize (Eksekusi AI SEO Optimization on-demand)
  if (req.method === 'POST' && pathname === '/api/ai-optimize') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload terlalu besar' }));
        req.connection.destroy();
      }
    });

    req.on('end', async () => {
      try {
        let payload = {};
        if (body.trim()) {
          try { payload = JSON.parse(body); } catch(e) {}
        }

        const currentRaw = fs.readFileSync(DATA_FILE, 'utf-8');
        const currentData = JSON.parse(currentRaw);

        // Gunakan config dari request atau fallback ke yang tersimpan di site-data.json
        const aiConfig = Object.assign({}, currentData.aiAutomation || {}, payload.config || {});

        const result = await executeAiOptimization(aiConfig, currentData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Error saat eksekusi AI SEO:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: err.message || 'Gagal mengeksekusi optimasi AI' 
        }));
      }
    });
    return;
  }

  // Normalisasi path jika ada request asset di bawah prefix /admin/ (misal /admin/dist/output.css atau /admin/src/admin.js)
  let cleanPath = pathname;
  if (cleanPath.startsWith('/admin/') && cleanPath !== '/admin/') {
    cleanPath = cleanPath.substring('/admin'.length);
  }

  // Routing file statis
  let filePath = path.join(ROOT_DIR, cleanPath === '/' ? 'index.html' : cleanPath);

  // Jika URL adalah /admin atau /admin/, layani admin.html
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
    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html' || pathname.startsWith('/data/') || pathname.startsWith('/api/') || pathname.includes('admin.js')) {
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

/**
 * Eksekusi Optimasi Konten & SEO dengan AI (Google Gemini / OpenAI)
 */
async function executeAiOptimization(config, currentData) {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('API Key belum diisi. Masukkan API Key Gemini atau OpenAI Anda di panel pengaturan.');
  }

  const provider = (config.provider || 'gemini').toLowerCase();
  const targetRegion = config.targetRegion || 'Medan, Binjai, Langkat, Deli Serdang, Sumatera Utara';
  const focusTopics = config.focusTopics || 'Internet Dedicated Fiber Optic, Local Loop, Dark Fiber, Managed IT Solutions';
  const currentTitle = currentData.seo?.siteTitle || 'PT Infra Digital Solusindo (IDS)';
  const currentDesc = currentData.seo?.metaDescription || '';
  const currentKeywords = currentData.seo?.keywords || '';
  const currentAiSummary = currentData.seo?.aiSearchSummary || '';

  const prompt = `Anda adalah seorang Master SEO & AI Engine Optimization (GEO) berstandar internasional yang ahli dalam pasar Indonesia, khususnya wilayah ${targetRegion}.
Tugas Anda adalah memperbarui metadata dan konten untuk PT Infra Digital Solusindo (IDS), penyedia internet dedicated fiber optik, local loop, dark fiber, dan managed service B2B terbaik.

Fokus Topik & Layanan: ${focusTopics}
Target Wilayah: ${targetRegion}

Data Saat Ini:
- Judul Website: ${currentTitle}
- Meta Description: ${currentDesc}
- Keywords: ${currentKeywords}
- AI Search Summary: ${currentAiSummary}

Instruksi:
1. Buat judul halaman (siteTitle) yang sangat menarik, natural, berdaya saing tinggi untuk mendominasi peringkat 1 Google (maksimal 60 karakter, mencakup nama brand IDS dan wilayah/layanan utama).
2. Buat meta description (metaDescription) yang memiliki Click-Through-Rate (CTR) sangat tinggi, persuasif bagi direktur perusahaan, IT manager, dan kantor pemerintahan di wilayah ${targetRegion} (panjang 140-160 karakter).
3. Buat 10-15 keywords bernilai tinggi dipisahkan tanda koma.
4. Buat ringkasan faktual otoritatif (aiSearchSummary) 3-4 kalimat singkat dan padat untuk dikutip oleh mesin pencari AI (seperti Google AI Overviews, Perplexity AI, ChatGPT Search).
5. Buat 1 pertanyaan FAQ baru (suggestedFaq) yang sangat sering dicari oleh pengusaha/instansi di ${targetRegion} mengenai kebutuhan internet dedicated / fiber optic, lengkap dengan jawaban yang meyakinkan bahwa IDS adalah solusinya.

Output WAJIB berupa JSON MURNI (valid JSON) persis dengan format berikut tanpa teks pembuka atau penutup lain:
{
  "siteTitle": "...",
  "metaDescription": "...",
  "keywords": "...",
  "aiSearchSummary": "...",
  "suggestedFaq": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}`;

  let rawJsonText = '';

  if (provider === 'gemini') {
    const model = config.model || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey.trim())}`;
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      })
    });

    const resData = await res.json();
    if (resData.error) {
      throw new Error(`Google Gemini Error: ${resData.error.message || JSON.stringify(resData.error)}`);
    }

    rawJsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      throw new Error('Tidak ada respon konten dari Google Gemini.');
    }
  } else if (provider === 'openai') {
    const model = config.model || 'gpt-4o-mini';
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are an elite SEO & AI Engine Optimization strategist in Indonesia. Always respond with pure valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const resData = await res.json();
    if (resData.error) {
      throw new Error(`OpenAI Error: ${resData.error.message || JSON.stringify(resData.error)}`);
    }

    rawJsonText = resData.choices?.[0]?.message?.content;
    if (!rawJsonText) {
      throw new Error('Tidak ada respon konten dari OpenAI.');
    }
  } else {
    throw new Error(`Provider "${provider}" tidak didukung. Pilih 'gemini' atau 'openai'.`);
  }

  // Parse JSON dari AI
  let aiResult;
  try {
    const jsonMatch = rawJsonText.match(/\{[\s\S]*\}/);
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : rawJsonText);
  } catch (err) {
    throw new Error('Gagal memproses respon JSON dari AI: ' + err.message);
  }

  // Update data situs sesuai opsi yang dipilih
  if (!currentData.seo) currentData.seo = {};
  if (!currentData.faq) currentData.faq = { title: 'Pertanyaan Umum', subtitle: '', items: [] };

  if (config.autoUpdateMeta !== false) {
    if (aiResult.siteTitle) currentData.seo.siteTitle = aiResult.siteTitle;
    if (aiResult.metaDescription) currentData.seo.metaDescription = aiResult.metaDescription;
    if (aiResult.keywords) currentData.seo.keywords = aiResult.keywords;
  }

  if (config.autoUpdateAiSummary !== false && aiResult.aiSearchSummary) {
    currentData.seo.aiSearchSummary = aiResult.aiSearchSummary;
  }

  if (config.autoUpdateFaq !== false && Array.isArray(aiResult.suggestedFaq) && aiResult.suggestedFaq.length > 0) {
    aiResult.suggestedFaq.forEach(faqItem => {
      if (faqItem.question && faqItem.answer) {
        const exists = currentData.faq.items.some(f => f.question.toLowerCase().trim() === faqItem.question.toLowerCase().trim());
        if (!exists) {
          currentData.faq.items.unshift({
            id: 'faq_' + Date.now() + Math.random().toString(36).substring(2, 6),
            question: faqItem.question,
            answer: faqItem.answer
          });
        }
      }
    });
  }

  const now = new Date();
  if (!currentData.aiAutomation) currentData.aiAutomation = {};
  currentData.aiAutomation.enabled = config.enabled !== undefined ? config.enabled : currentData.aiAutomation.enabled;
  currentData.aiAutomation.provider = provider;
  currentData.aiAutomation.apiKey = config.apiKey;
  currentData.aiAutomation.model = config.model;
  currentData.aiAutomation.frequency = config.frequency || 'daily';
  currentData.aiAutomation.targetRegion = targetRegion;
  currentData.aiAutomation.focusTopics = focusTopics;
  currentData.aiAutomation.autoUpdateFaq = config.autoUpdateFaq !== false;
  currentData.aiAutomation.autoUpdateMeta = config.autoUpdateMeta !== false;
  currentData.aiAutomation.autoUpdateAiSummary = config.autoUpdateAiSummary !== false;
  currentData.aiAutomation.lastRun = now.toISOString();
  currentData.aiAutomation.lastStatus = `Sukses diperbarui oleh AI (${provider.toUpperCase()}) pada ${now.toLocaleString('id-ID')}`;

  // Buat backup snapshot & tulis data baru
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `site-data-ai-auto-${timestamp}.json`));
  fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2), 'utf-8');

  // Regenerate sitemap & robots
  generateSitemapAndRobots(currentData);

  return {
    success: true,
    message: currentData.aiAutomation.lastStatus,
    aiResult,
    lastRun: currentData.aiAutomation.lastRun
  };
}

// Background Cron Scheduler (Cek setiap 30 menit)
function initAiBackgroundCron() {
  setInterval(async () => {
    try {
      if (!fs.existsSync(DATA_FILE)) return;
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);

      const ai = data.aiAutomation;
      // JIKA MASTER SWITCH NONAKTIF: JANGAN PERNAH JALANKAN APAPUN
      if (!ai || !ai.enabled || !ai.apiKey) {
        return;
      }

      const now = Date.now();
      const lastRunTime = ai.lastRun ? new Date(ai.lastRun).getTime() : 0;
      const hoursDiff = (now - lastRunTime) / (1000 * 60 * 60);

      const requiredIntervalHours = ai.frequency === 'weekly' ? 168 : 24; // Daily = 24 jam, Weekly = 7 hari

      if (hoursDiff >= requiredIntervalHours) {
        console.log(`[AI Auto-Cron] Menjalankan optimasi otomatis (${ai.frequency})...`);
        const result = await executeAiOptimization(ai, data);
        console.log(`[AI Auto-Cron] Selesai: ${result.message}`);
      }
    } catch (err) {
      console.error('[AI Auto-Cron] Error:', err.message);
    }
  }, 30 * 60 * 1000); // 30 menit
}

// Mulai scheduler background
initAiBackgroundCron();

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
