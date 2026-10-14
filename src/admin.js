/**
 * PT Infra Digital Solusindo (IDS) — Admin CMS Controller Logic
 * Mengontrol autentikasi admin, manipulasi formulir dinamis, sinkronisasi data, dan pratinjau live
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ids_cms_site_data';
  const AUTH_KEY = 'ids_admin_logged_in';
  const DEFAULT_PIN = 'admin123';
  const API_CONTENT_URL = '/api/content';
  const API_SAVE_URL = '/api/save-content';
  const STATIC_JSON_URL = '/data/site-data.json';

  // Preset foto galeri lokal untuk kemudahan pemilihan
  const LOCAL_GALLERY_PRESETS = [
    { label: 'Splicing', path: '/images/galery/splice.jpg' },
    { label: 'ODP', path: '/images/galery/odp.jpg' },
    { label: 'Penarikan', path: '/images/galery/penarikan.jpg' },
    { label: 'OPM Redaman', path: '/images/galery/opm.jpg' },
    { label: 'Joint Closure', path: '/images/galery/join.jpg' },
    { label: 'Kabel Optik', path: '/images/galery/kabel.jpg' }
  ];

  // Quick section targets
  const QUICK_SECTION_ANCHORS = [
    { label: 'Home', target: '#hero' },
    { label: 'Layanan', target: '#layanan' },
    { label: 'Galeri', target: '#galeri' },
    { label: 'Tentang Kami', target: '#tentang' },
    { label: 'FAQ', target: '#faq' },
    { label: 'Kontak', target: '#kontak' }
  ];

  // State
  let currentData = null;
  let isServerConnected = false;

  // DOM Elements
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  const adminPinInput = document.getElementById('admin-pin');
  const togglePwdBtn = document.getElementById('toggle-pwd-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const saveAllBtn = document.getElementById('save-all-btn');
  const serverStatusPill = document.getElementById('server-status-pill');
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');

  // ==========================================
  // 1. AUTENTIKASI LOGIN & KATA SANDI
  // ==========================================
  function getActivePassword() {
    return localStorage.getItem('ids_admin_pwd') || currentData?.adminPassword || DEFAULT_PIN;
  }

  function checkAuth() {
    const isLoggedIn = sessionStorage.getItem(AUTH_KEY) === 'true';
    if (isLoggedIn) {
      loginModal.classList.add('hidden');
    } else {
      loginModal.classList.remove('hidden');
    }
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredPin = adminPinInput.value.trim();
    const activePwd = getActivePassword();

    if (enteredPin === activePwd) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      loginModal.classList.add('hidden');
      showToast('Berhasil masuk ke Admin Panel!', true);
    } else {
      alert('Kata sandi / PIN salah! Silakan coba lagi.');
      adminPinInput.focus();
    }
  });

  // Handler Ganti Password Admin
  const changePwdForm = document.getElementById('change-pwd-form');
  if (changePwdForm) {
    changePwdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPwd = document.getElementById('pwd-current').value.trim();
      const newPwd = document.getElementById('pwd-new').value.trim();
      const confirmPwd = document.getElementById('pwd-confirm').value.trim();

      const activePwd = getActivePassword();
      if (currentPwd !== activePwd) {
        alert('Password saat ini salah!');
        document.getElementById('pwd-current').focus();
        return;
      }

      if (newPwd.length < 6) {
        alert('Password baru minimal 6 karakter!');
        document.getElementById('pwd-new').focus();
        return;
      }

      if (newPwd !== confirmPwd) {
        alert('Konfirmasi password baru tidak cocok!');
        document.getElementById('pwd-confirm').focus();
        return;
      }

      // Simpan password baru
      localStorage.setItem('ids_admin_pwd', newPwd);
      if (currentData) {
        currentData.adminPassword = newPwd;
        saveAllData();
      }

      changePwdForm.reset();
      showToast('Kata sandi admin berhasil diperbarui!', true, '🔒');
    });
  }

  logoutBtn.addEventListener('click', () => {
    if (confirm('Yakin ingin keluar dari panel admin?')) {
      sessionStorage.removeItem(AUTH_KEY);
      location.reload();
    }
  });

  togglePwdBtn.addEventListener('click', () => {
    const type = adminPinInput.type === 'password' ? 'text' : 'password';
    adminPinInput.type = type;
  });

  // ==========================================
  // 2. NAVIGASI TAB (DESKTOP & MOBILE)
  // ==========================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const mobileNavTabs = document.querySelectorAll('.mobile-nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(targetId) {
    // Desktop Tabs
    navTabs.forEach((t) => {
      const match = t.dataset.tab === targetId;
      t.classList.toggle('active-tab', match);
      t.classList.toggle('bg-primary/10', match);
      t.classList.toggle('text-primary', match);
      t.classList.toggle('text-slate-600', !match);
    });

    // Mobile Tabs
    mobileNavTabs.forEach((m) => {
      const match = m.dataset.tab === targetId;
      m.className = match
        ? 'mobile-nav-tab whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white'
        : 'mobile-nav-tab whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600';
    });

    // Contents
    tabContents.forEach((c) => c.classList.add('hidden'));
    const activeContent = document.getElementById(targetId);
    if (activeContent) activeContent.classList.remove('hidden');

    // Scroll to top of window smoothly when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  mobileNavTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ==========================================
  // 3. LOAD DATA DARI SERVER / LOCAL
  // ==========================================
  async function loadData() {
    // Cek koneksi server
    try {
      const res = await fetch(API_CONTENT_URL);
      if (res.ok) {
        currentData = await res.json();
        isServerConnected = true;
        updateServerStatus(true);
      }
    } catch (e) {
      isServerConnected = false;
      updateServerStatus(false);
    }

    // Jika server offline, cek localStorage atau file static
    if (!currentData) {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        try {
          currentData = JSON.parse(localData);
        } catch (e) { }
      }
    }

    // Fallback static JSON jika masih null
    if (!currentData) {
      try {
        const res = await fetch(STATIC_JSON_URL);
        if (res.ok) {
          currentData = await res.json();
        }
      } catch (e) {
        console.error('Gagal memuat static JSON', e);
      }
    }

    if (currentData) {
      populateAllFields(currentData);
      updateDashboardStats();
    }
  }

  function updateServerStatus(connected) {
    if (!serverStatusPill) return;
    if (connected) {
      serverStatusPill.className = 'hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
      serverStatusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Server Aktif (Auto-Save JSON)</span>';
    } else {
      serverStatusPill.className = 'hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200';
      serverStatusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Mode Statis (Local Storage)</span>';
    }
  }

  // ==========================================
  // 4. POPULASI FORMULIR DARI DATA
  // ==========================================
  function populateAllFields(data) {
    // SEO
    if (data.seo) {
      setVal('seo-title', data.seo.siteTitle);
      setVal('seo-desc', data.seo.metaDescription);
      setVal('seo-keywords', data.seo.keywords);
      setVal('seo-canonical', data.seo.canonicalUrl);
      setVal('seo-geo-region', data.seo.geoRegion);
      setVal('seo-geo-placename', data.seo.geoPlacename);
      setVal('seo-geo-coordinates', data.seo.geoCoordinates);
      setVal('seo-ai-summary', data.seo.aiSearchSummary);

      updateGoogleSnippetPreview(data.seo);
    }

    // Navbar
    if (data.navbar) {
      setVal('nav-brand-name', data.navbar.brandName || 'IDS');
      setVal('nav-logo-url', data.navbar.logoUrl || './images/logo.png');
      setVal('nav-cta-text', data.navbar.ctaText || 'Hubungi Kami');
      setVal('nav-cta-url', data.navbar.ctaUrl || '#kontak');

      const showCtaCheckbox = document.getElementById('nav-show-cta');
      if (showCtaCheckbox) {
        showCtaCheckbox.checked = data.navbar.showCta !== false;
      }

      renderMenuItems(data.navbar.menuItems || []);
      updateNavbarLivePreview();
    }

    // Hero
    if (data.hero) {
      setVal('hero-badge-text', data.hero.badgeText);
      setVal('hero-image-path', data.hero.heroImage);
      setVal('hero-title-prefix', data.hero.titlePrefix);
      setVal('hero-title-hl1', data.hero.titleHighlight1);
      setVal('hero-title-mid', data.hero.titleMid);
      setVal('hero-title-hl2', data.hero.titleHighlight2);
      setVal('hero-desc-input', data.hero.description);
      setVal('hero-btn1-text', data.hero.primaryBtnText);
      setVal('hero-btn1-url', data.hero.primaryBtnUrl);
      setVal('hero-btn2-text', data.hero.secondaryBtnText);
      setVal('hero-btn2-url', data.hero.secondaryBtnUrl);

      if (data.hero.stats) {
        if (data.hero.stats[0]) {
          setVal('stat1-val', data.hero.stats[0].value);
          setVal('stat1-lbl', data.hero.stats[0].label);
        }
        if (data.hero.stats[1]) {
          setVal('stat2-val', data.hero.stats[1].value);
          setVal('stat2-lbl', data.hero.stats[1].label);
        }
        if (data.hero.stats[2]) {
          setVal('stat3-val', data.hero.stats[2].value);
          setVal('stat3-lbl', data.hero.stats[2].label);
        }
      }
    }

    // Partners
    if (data.partners) {
      setVal('partners-heading', data.partners.sectionTitle);
      renderPartners(data.partners.logos || []);
    }

    // Advantages
    if (data.advantages) {
      setVal('adv-title-input', data.advantages.title);
      setVal('adv-hl-input', data.advantages.highlight);
      setVal('adv-sub-input', data.advantages.subtitle);
      renderAdvantages(data.advantages.items || []);
    }

    // Services
    if (data.services) {
      setVal('services-title-input', data.services.title || 'Solusi Layanan');
      setVal('services-hl-input', data.services.highlight || 'Konektivitas & IT');
      setVal('services-sub-input', data.services.subtitle || '');
      renderServices(data.services.items || []);
    }

    // Gallery
    if (data.gallery) {
      setVal('gallery-title-input', data.gallery.title);
      setVal('gallery-sub-input', data.gallery.subtitle);
      renderGallery(data.gallery.items || []);
    }

    // About
    if (data.about) {
      setVal('about-desc-input', data.about.subtitle);
      setVal('about-visi-input', data.about.visi);
      renderMisiList(data.about.misi || []);
      renderNilaiList(data.about.nilai || []);
    }

    // FAQ
    if (data.seo && data.seo.faqs) {
      renderFAQs(data.seo.faqs);
    }

    // CTA Banner
    if (data.ctaBanner) {
      setVal('cta-title-input', data.ctaBanner.title);
      setVal('cta-sub-input', data.ctaBanner.subtitle);
      setVal('cta-btn1-input', data.ctaBanner.primaryBtnText);
      setVal('cta-btn1-url-input', data.ctaBanner.primaryBtnUrl);
      setVal('cta-btn2-input', data.ctaBanner.secondaryBtnText);
      setVal('cta-btn2-url-input', data.ctaBanner.secondaryBtnUrl);
    }

    // Contact
    if (data.contact) {
      setVal('contact-wa-number', data.contact.waNumber);
      setVal('contact-phone-display', data.contact.phone);
      setVal('contact-email-input', data.contact.email);
      setVal('contact-addr-input', data.contact.address);
      setVal('contact-hours-weekday', data.contact.workHoursWeekday);
      setVal('contact-hours-weekend', data.contact.workHoursWeekend);
    }

    // Footer
    if (data.footer) {
      // Logo & Brand Footer
      setVal('footer-logo-url-input', data.footer.logoUrl || './images/logo.png');
      setVal('footer-logo-alt-input', data.footer.logoAlt || 'PT Infra Digital Solusindo');
      setVal('footer-desc-input', data.footer.brandDescription);
      setVal('footer-copy-input', data.footer.copyrightText);
      setVal('footer-admin-btn-text-input', data.footer.adminLinkText || 'Login Admin Panel CMS');
      const showAdminBtn = document.getElementById('footer-show-admin-btn');
      if (showAdminBtn) showAdminBtn.checked = Boolean(data.footer.showAdminLink);
      const logoPrev = document.getElementById('footer-logo-preview');
      if (logoPrev) logoPrev.src = data.footer.logoUrl || './images/logo.png';

      // Navigasi Footer
      setVal('footer-nav-title-input', data.footer.navTitle || 'Navigasi');
      renderFooterLinks(data.footer.menuItems || data.navbar?.menuItems || []);

      // Jam Kerja Footer (Dibersihkan dari duplikasi nama hari)
      const wdayLbl = data.footer.hoursWeekdayLabel || 'Senin – Jumat';
      const rawWday = data.footer.hoursWeekdayTime || data.contact?.workHoursWeekday || '09:00 – 17:00 WIB';
      const cleanWday = stripDayPrefix(rawWday, wdayLbl) || '09:00 – 17:00 WIB';

      const wendLbl = data.footer.hoursWeekendLabel || 'Sabtu – Minggu';
      const rawWend = data.footer.hoursWeekendTime || data.contact?.workHoursWeekend || 'Tutup (Layanan Darurat On-Call)';
      const cleanWend = stripDayPrefix(rawWend, wendLbl) || 'Tutup (Layanan Darurat On-Call)';

      setVal('footer-hours-title-input', data.footer.hoursTitle || 'Jam Kerja');
      setVal('footer-hours-note-input', data.footer.hoursNote || '');
      setVal('footer-hours-wday-label-input', wdayLbl);
      setVal('footer-hours-wday-time-input', cleanWday);
      setVal('footer-hours-wend-label-input', wendLbl);
      setVal('footer-hours-wend-time-input', cleanWend);

      // Sinkronkan ke input kontak jika kosong
      if (!getVal('contact-hours-weekday')) {
        setVal('contact-hours-weekday', `${wdayLbl}: ${cleanWday}`);
      }
      if (!getVal('contact-hours-weekend')) {
        setVal('contact-hours-weekend', `${wendLbl}: ${cleanWend}`);
      }

      // Kontak Footer
      setVal('footer-contact-title-input', data.footer.contactTitle || 'Kontak');
      setVal('footer-contact-web-input', data.footer.website || data.contact?.website || 'www.ids.net.id');
      setVal('footer-contact-addr-input', data.footer.address || data.contact?.address || '');
      setVal('footer-contact-phone-input', data.footer.phone || data.contact?.phone || '');
      setVal('footer-contact-email-input', data.footer.email || data.contact?.email || '');
    }

    // AI Automation
    populateAiAutomation(data);
  }

  function stripDayPrefix(str, label) {
    if (!str) return '';
    let s = str.trim();
    s = s.replace(/^(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\s*[-–]\s*(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\s*:\s*/i, '');
    if (label) {
      const escaped = label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      s = s.replace(new RegExp('^' + escaped + '\\s*:\\s*', 'i'), '');
    }
    return s.trim();
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) {
      el.value = val;
    }
  }

  function getVal(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? el.value.trim() : fallback;
  }

  // Live SEO Preview Listener
  ['seo-title', 'seo-desc', 'seo-canonical'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updateGoogleSnippetPreview({
          siteTitle: getVal('seo-title'),
          metaDescription: getVal('seo-desc'),
          canonicalUrl: getVal('seo-canonical')
        });
      });
    }
  });

  function updateGoogleSnippetPreview(seo) {
    const previewTitle = document.getElementById('preview-google-title');
    const previewDesc = document.getElementById('preview-google-desc');
    const previewUrl = document.getElementById('preview-google-url');

    if (previewTitle && seo.siteTitle) previewTitle.textContent = seo.siteTitle;
    if (previewDesc && seo.metaDescription) previewDesc.textContent = seo.metaDescription;
    if (previewUrl && seo.canonicalUrl) previewUrl.textContent = seo.canonicalUrl;
  }

  // Live Navbar Preview Listener
  ['nav-brand-name', 'nav-logo-url', 'nav-cta-text', 'nav-show-cta'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateNavbarLivePreview);
      el.addEventListener('change', updateNavbarLivePreview);
    }
  });

  function updateNavbarLivePreview() {
    const previewLogo = document.getElementById('nav-preview-logo');
    const previewLinks = document.getElementById('nav-preview-links');
    const previewCta = document.getElementById('nav-preview-cta');

    const logoUrl = getVal('nav-logo-url', './images/logo.png');
    if (previewLogo) previewLogo.src = logoUrl;

    const showCta = document.getElementById('nav-show-cta')?.checked !== false;
    const ctaText = getVal('nav-cta-text', 'Hubungi Kami');
    if (previewCta) {
      previewCta.style.display = showCta ? 'block' : 'none';
      const ctaBtn = previewCta.querySelector('span');
      if (ctaBtn) ctaBtn.textContent = ctaText;
    }

    const items = collectMenuItems();
    if (previewLinks) {
      previewLinks.innerHTML = items.map(it => `
        <span class="hover:text-primary transition-colors cursor-pointer">${it.title}</span>
      `).join('');
    }
  }

  // ==========================================
  // 5. RENDER DYNAMIC LISTS (DENGAN REORDERING & ANCHORS)
  // ==========================================

  // Menu Items
  function renderMenuItems(items) {
    const list = document.getElementById('menu-items-list');
    if (!list) return;

    list.innerHTML = items.map((item, idx) => `
      <div class="menu-item-row p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 transition-all" data-index="${idx}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <!-- Tombol Geser Urutan -->
            <button type="button" class="move-menu-up p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30" title="Pindah ke Atas" ${idx === 0 ? 'disabled' : ''}>
              ▲
            </button>
            <button type="button" class="move-menu-down p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30" title="Pindah ke Bawah" ${idx === items.length - 1 ? 'disabled' : ''}>
              ▼
            </button>
            <span class="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">#${idx + 1}</span>
            <span class="text-xs font-bold text-slate-800">${item.title}</span>
          </div>

          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" class="menu-blank rounded" ${item.isExternal ? 'checked' : ''} />
              <span>Tab Baru</span>
            </label>
            <button type="button" class="del-menu-btn text-rose-500 hover:text-rose-700 text-xs font-semibold p-1" title="Hapus Menu">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Label Menu</label>
            <input type="text" class="menu-title w-full px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white" value="${item.title}" placeholder="Judul Menu" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target URL / Hash</label>
            <input type="text" class="menu-url w-full px-3 py-1.5 rounded-lg border text-xs bg-white font-mono" value="${item.url}" placeholder="cth: #hero atau https://..." />
          </div>
        </div>

        <!-- Quick Section Anchor Buttons -->
        <div class="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span class="text-slate-400 text-[10px] font-semibold">Pilih Cepat Target:</span>
          ${QUICK_SECTION_ANCHORS.map(a => `
            <button type="button" class="quick-anchor-btn px-2 py-0.5 rounded border border-slate-200 bg-white hover:border-primary hover:text-primary transition-colors text-[10px]" data-target="${a.target}">
              ${a.label} (${a.target})
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Bind Quick Anchor Buttons
    list.querySelectorAll('.menu-item-row').forEach(row => {
      const urlInput = row.querySelector('.menu-url');
      const titleInput = row.querySelector('.menu-title');

      row.querySelectorAll('.quick-anchor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          urlInput.value = btn.dataset.target;
          updateNavbarLivePreview();
        });
      });

      titleInput.addEventListener('input', updateNavbarLivePreview);
      urlInput.addEventListener('input', updateNavbarLivePreview);
    });

    // Move Up
    list.querySelectorAll('.move-menu-up').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        if (idx > 0) {
          const currentItems = collectMenuItems();
          const temp = currentItems[idx];
          currentItems[idx] = currentItems[idx - 1];
          currentItems[idx - 1] = temp;
          renderMenuItems(currentItems);
          updateNavbarLivePreview();
        }
      });
    });

    // Move Down
    list.querySelectorAll('.move-menu-down').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const currentItems = collectMenuItems();
        if (idx < currentItems.length - 1) {
          const temp = currentItems[idx];
          currentItems[idx] = currentItems[idx + 1];
          currentItems[idx + 1] = temp;
          renderMenuItems(currentItems);
          updateNavbarLivePreview();
        }
      });
    });

    // Delete
    list.querySelectorAll('.del-menu-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const currentItems = collectMenuItems();
        currentItems.splice(idx, 1);
        renderMenuItems(currentItems);
        updateNavbarLivePreview();
      });
    });
  }

  document.getElementById('add-menu-btn').addEventListener('click', () => {
    const items = collectMenuItems();
    items.push({ id: 'm' + Date.now(), title: 'Menu Baru', url: '#', isExternal: false });
    renderMenuItems(items);
    updateNavbarLivePreview();
  });

  function collectMenuItems() {
    const rows = document.querySelectorAll('.menu-item-row');
    const items = [];
    rows.forEach((r, idx) => {
      const title = r.querySelector('.menu-title').value.trim();
      const url = r.querySelector('.menu-url').value.trim();
      const isExternal = r.querySelector('.menu-blank')?.checked || false;
      if (title) items.push({ id: 'm' + (idx + 1), title, url, isExternal });
    });
    return items;
  }

  // Partners
  function renderPartners(logos) {
    const list = document.getElementById('partners-list');
    if (!list) return;

    list.innerHTML = logos.map((p, idx) => `
      <div class="partner-row flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl" data-index="${idx}">
        <div class="w-12 h-10 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center">
          <img src="${p.url}" alt="${p.name}" class="max-h-8 max-w-full object-contain" />
        </div>
        <input type="text" class="partner-name w-1/4 px-3 py-1.5 rounded-lg border text-xs font-semibold" value="${p.name}" placeholder="Nama Partner" />
        <input type="text" class="partner-url flex-1 px-3 py-1.5 rounded-lg border text-xs" value="${p.url}" placeholder="URL Logo (SVG/PNG)" />
        <button type="button" class="del-partner-btn text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `).join('');

    list.querySelectorAll('.del-partner-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        logos.splice(idx, 1);
        renderPartners(logos);
      });
    });
  }

  document.getElementById('add-partner-btn').addEventListener('click', () => {
    const logos = collectPartners();
    logos.push({ name: 'Mitra Baru', url: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Nokia_2023.svg' });
    renderPartners(logos);
  });

  function collectPartners() {
    const rows = document.querySelectorAll('.partner-row');
    const logos = [];
    rows.forEach((r) => {
      const name = r.querySelector('.partner-name').value.trim();
      const url = r.querySelector('.partner-url').value.trim();
      if (name) logos.push({ name, url });
    });
    return logos;
  }

  // Advantages (Why Us)
  function renderAdvantages(items) {
    const list = document.getElementById('adv-items-list');
    if (!list) return;

    list.innerHTML = items.map((item, idx) => `
      <div class="adv-row p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3" data-index="${idx}">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700">Keunggulan #${idx + 1}</span>
          <button type="button" class="del-adv-btn text-slate-400 hover:text-rose-600 text-xs font-semibold">Hapus</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" class="adv-title px-3 py-1.5 rounded-lg border text-xs font-semibold" value="${item.title}" placeholder="Judul" />
          <select class="adv-color px-3 py-1.5 rounded-lg border text-xs">
            <option value="blue" ${item.colorScheme === 'blue' ? 'selected' : ''}>Warna Biru (Primary)</option>
            <option value="green" ${item.colorScheme === 'green' ? 'selected' : ''}>Warna Hijau (Accent)</option>
            <option value="purple" ${item.colorScheme === 'purple' ? 'selected' : ''}>Warna Ungu</option>
          </select>
          <select class="adv-icon px-3 py-1.5 rounded-lg border text-xs">
            <option value="speed" ${item.iconType === 'speed' ? 'selected' : ''}>Ikon Petir / Kecepatan</option>
            <option value="shield" ${item.iconType === 'shield' ? 'selected' : ''}>Ikon Perisai / Andal</option>
            <option value="map" ${item.iconType === 'map' ? 'selected' : ''}>Ikon Peta / Jangkauan</option>
          </select>
        </div>
        <textarea class="adv-desc w-full px-3 py-1.5 rounded-lg border text-xs" rows="2" placeholder="Deskripsi">${item.description}</textarea>
      </div>
    `).join('');

    list.querySelectorAll('.del-adv-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        items.splice(idx, 1);
        renderAdvantages(items);
      });
    });
  }

  document.getElementById('add-adv-btn').addEventListener('click', () => {
    const items = collectAdvantages();
    items.push({ id: 'adv' + Date.now(), title: 'Keunggulan Baru', description: 'Deskripsi keunggulan jaringan IDS.', colorScheme: 'blue', iconType: 'speed' });
    renderAdvantages(items);
  });

  function collectAdvantages() {
    const rows = document.querySelectorAll('.adv-row');
    const items = [];
    rows.forEach((r, idx) => {
      const title = r.querySelector('.adv-title').value.trim();
      const colorScheme = r.querySelector('.adv-color').value;
      const iconType = r.querySelector('.adv-icon').value;
      const description = r.querySelector('.adv-desc').value.trim();
      if (title) items.push({ id: 'adv' + (idx + 1), title, colorScheme, iconType, description });
    });
    return items;
  }

  // Services (Bebas / Fleksibel)
  function renderServices(items) {
    const list = document.getElementById('services-items-list');
    if (!list) return;

    list.innerHTML = items.map((item, idx) => `
      <div class="service-row p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3" data-index="${idx}">
        <div class="flex items-center justify-between border-b border-slate-200/60 pb-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">${idx + 1}</span>
            <span class="text-xs font-bold text-slate-800">${item.title}</span>
          </div>
          <button type="button" class="del-service-btn text-xs font-semibold text-rose-500 hover:text-rose-700">Hapus Layanan</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" class="service-title px-3 py-1.5 rounded-lg border text-xs font-semibold" value="${item.title}" placeholder="Nama Layanan" />
          <input type="text" class="service-badge px-3 py-1.5 rounded-lg border text-xs" value="${item.badge || ''}" placeholder="Badge (cth: Terpopuler, Enterprise)" />
          <select class="service-color px-3 py-1.5 rounded-lg border text-xs">
            <option value="blue" ${item.colorScheme === 'blue' ? 'selected' : ''}>Aksen Biru</option>
            <option value="green" ${item.colorScheme === 'green' ? 'selected' : ''}>Aksen Hijau</option>
            <option value="purple" ${item.colorScheme === 'purple' ? 'selected' : ''}>Aksen Ungu</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-1">Deskripsi Layanan</label>
          <textarea class="service-desc w-full px-3 py-1.5 rounded-lg border text-xs" rows="2">${item.description}</textarea>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-500 mb-1">Template Pesan WhatsApp Otomatis (Saat Tombol Diklik)</label>
          <input type="text" class="service-wa w-full px-3 py-1.5 rounded-lg border text-xs text-emerald-800 bg-emerald-50/50" value="${item.waMessage || ''}" placeholder="Halo IDS, saya ingin bertanya tentang layanan ini." />
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.del-service-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        items.splice(idx, 1);
        renderServices(items);
      });
    });
  }

  document.getElementById('add-service-btn').addEventListener('click', () => {
    const items = collectServices();
    items.push({
      id: 'srv' + Date.now(),
      title: 'Layanan Baru',
      description: 'Deskripsi lengkap spesifikasi layanan.',
      badge: 'Baru',
      colorScheme: 'blue',
      iconType: 'loop',
      waMessage: 'Halo IDS, saya ingin menanyakan informasi tentang layanan ini.'
    });
    renderServices(items);
  });

  function collectServices() {
    const rows = document.querySelectorAll('.service-row');
    const items = [];
    rows.forEach((r, idx) => {
      const title = r.querySelector('.service-title').value.trim();
      const badge = r.querySelector('.service-badge').value.trim();
      const colorScheme = r.querySelector('.service-color').value;
      const description = r.querySelector('.service-desc').value.trim();
      const waMessage = r.querySelector('.service-wa').value.trim();
      if (title) {
        items.push({
          id: 'srv' + (idx + 1),
          title,
          badge,
          colorScheme,
          iconType: idx % 3 === 0 ? 'loop' : (idx % 3 === 1 ? 'monitor' : 'cable'),
          description,
          waMessage
        });
      }
    });
    return items;
  }

  // Gallery
  function renderGallery(items) {
    const list = document.getElementById('gallery-items-list');
    if (!list) return;

    list.innerHTML = items.map((item, idx) => `
      <div class="gallery-card bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-3" data-index="${idx}">
        <div class="aspect-[4/3] rounded-lg overflow-hidden bg-slate-200 relative group">
          <img src="${item.url}" alt="${item.title}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span class="text-white text-[11px] font-bold">Ganti di bawah</span>
          </div>
        </div>

        <div class="space-y-2">
          <input type="text" class="gal-title w-full px-3 py-1.5 rounded-lg border text-xs font-semibold" value="${item.title}" placeholder="Judul Foto" />
          <input type="text" class="gal-url w-full px-3 py-1.5 rounded-lg border text-xs font-mono" value="${item.url}" placeholder="Path Foto / URL" />
          <input type="text" class="gal-tag w-full px-3 py-1.5 rounded-lg border text-xs" value="${item.tag || ''}" placeholder="Kategori Tag (cth: Instalasi)" />
          
          <!-- Preset Picker Cepat -->
          <div class="pt-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Preset Foto Lapangan:</p>
            <div class="flex flex-wrap gap-1">
              ${LOCAL_GALLERY_PRESETS.map(p => `
                <button type="button" class="preset-pick-btn text-[10px] bg-white border border-slate-200 hover:border-primary hover:text-primary px-2 py-0.5 rounded font-medium transition-colors" data-path="${p.path}">
                  ${p.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <button type="button" class="del-gal-btn text-rose-500 hover:text-rose-700 text-xs font-semibold w-full text-right pt-2 border-t border-slate-200/60">
          Hapus Foto
        </button>
      </div>
    `).join('');

    // Bind preset picker buttons
    list.querySelectorAll('.gallery-card').forEach(card => {
      const urlInput = card.querySelector('.gal-url');
      const imgPreview = card.querySelector('img');

      card.querySelectorAll('.preset-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const path = btn.dataset.path;
          urlInput.value = path;
          imgPreview.src = path;
        });
      });

      urlInput.addEventListener('input', () => {
        imgPreview.src = urlInput.value.trim();
      });
    });

    list.querySelectorAll('.del-gal-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        items.splice(idx, 1);
        renderGallery(items);
      });
    });
  }

  document.getElementById('add-photo-btn').addEventListener('click', () => {
    const items = collectGallery();
    items.push({
      id: 'gal' + Date.now(),
      title: 'Dokumentasi Lapangan Baru',
      url: './images/galery/splice.jpg',
      tag: 'Teknisi'
    });
    renderGallery(items);
  });

  function collectGallery() {
    const cards = document.querySelectorAll('.gallery-card');
    const items = [];
    cards.forEach((c, idx) => {
      const title = c.querySelector('.gal-title').value.trim();
      const url = c.querySelector('.gal-url').value.trim();
      const tag = c.querySelector('.gal-tag').value.trim();
      if (title && url) {
        items.push({ id: 'gal' + (idx + 1), title, url, tag });
      }
    });
    return items;
  }

  // Misi & Nilai
  function renderMisiList(misiList) {
    const container = document.getElementById('about-misi-container');
    if (!container) return;

    container.innerHTML = misiList.map((m, idx) => `
      <div class="misi-row flex items-center gap-2">
        <span class="text-xs font-bold text-slate-400 w-4">${idx + 1}.</span>
        <input type="text" class="misi-val flex-1 px-3 py-1.5 rounded-lg border text-xs" value="${m}" />
        <button type="button" class="del-misi-btn text-slate-400 hover:text-rose-600 text-xs px-2 py-1">Hapus</button>
      </div>
    `).join('');

    container.querySelectorAll('.del-misi-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        misiList.splice(idx, 1);
        renderMisiList(misiList);
      });
    });
  }

  document.getElementById('add-misi-btn').addEventListener('click', () => {
    const list = collectMisi();
    list.push('Butir komitmen layanan baru');
    renderMisiList(list);
  });

  function collectMisi() {
    const rows = document.querySelectorAll('.misi-row');
    const list = [];
    rows.forEach(r => {
      const val = r.querySelector('.misi-val').value.trim();
      if (val) list.push(val);
    });
    return list;
  }

  function renderNilaiList(nilaiList) {
    const container = document.getElementById('about-nilai-container');
    if (!container) return;

    container.innerHTML = nilaiList.map((n, idx) => `
      <div class="nilai-row flex items-center gap-2">
        <input type="text" class="nilai-kw w-1/3 px-3 py-1.5 rounded-lg border text-xs font-bold" value="${n.keyword}" placeholder="Kata Kunci (Inovasi)" />
        <input type="text" class="nilai-desc flex-1 px-3 py-1.5 rounded-lg border text-xs" value="${n.desc}" placeholder="Penjelasan Nilai" />
        <button type="button" class="del-nilai-btn text-slate-400 hover:text-rose-600 text-xs px-2 py-1">Hapus</button>
      </div>
    `).join('');

    container.querySelectorAll('.del-nilai-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        nilaiList.splice(idx, 1);
        renderNilaiList(nilaiList);
      });
    });
  }

  document.getElementById('add-nilai-btn').addEventListener('click', () => {
    const list = collectNilai();
    list.push({ keyword: 'Integritas', desc: 'Pelayanan prima dan transparan' });
    renderNilaiList(list);
  });

  function collectNilai() {
    const rows = document.querySelectorAll('.nilai-row');
    const list = [];
    rows.forEach(r => {
      const keyword = r.querySelector('.nilai-kw').value.trim();
      const desc = r.querySelector('.nilai-desc').value.trim();
      if (keyword) list.push({ keyword, desc });
    });
    return list;
  }

  // FAQs
  function renderFAQs(faqs) {
    const list = document.getElementById('faq-items-list');
    if (!list) return;

    list.innerHTML = faqs.map((f, idx) => `
      <div class="faq-row p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2" data-index="${idx}">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700">Pertanyaan #${idx + 1}</span>
          <button type="button" class="del-faq-btn text-rose-500 hover:text-rose-700 text-xs font-semibold">Hapus</button>
        </div>
        <input type="text" class="faq-q w-full px-3 py-1.5 rounded-lg border text-xs font-bold" value="${f.question}" placeholder="Pertanyaan seputar layanan..." />
        <textarea class="faq-a w-full px-3 py-1.5 rounded-lg border text-xs" rows="2" placeholder="Jawaban informatif">${f.answer}</textarea>
      </div>
    `).join('');

    list.querySelectorAll('.del-faq-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        faqs.splice(idx, 1);
        renderFAQs(faqs);
      });
    });
  }

  document.getElementById('add-faq-btn').addEventListener('click', () => {
    const faqs = collectFAQs();
    faqs.push({
      question: 'Pertanyaan baru seputar layanan IDS?',
      answer: 'Penjelasan detail yang ramah dan mudah dipahami pelanggan.'
    });
    renderFAQs(faqs);
  });

  function collectFAQs() {
    const rows = document.querySelectorAll('.faq-row');
    const faqs = [];
    rows.forEach(r => {
      const question = r.querySelector('.faq-q').value.trim();
      const answer = r.querySelector('.faq-a').value.trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    });
    return faqs;
  }

  // Footer Navigation Menu Items
  function renderFooterLinks(items) {
    const list = document.getElementById('footer-links-list');
    if (!list) return;

    list.innerHTML = items.map((it, idx) => `
      <div class="footer-link-row flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl" data-index="${idx}">
        <span class="text-xs font-bold text-slate-400 w-5 text-center">${idx + 1}</span>
        <input type="text" class="footer-link-title w-1/3 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white" value="${it.title}" placeholder="Judul Link" />
        <input type="text" class="footer-link-url flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono bg-white" value="${it.url}" placeholder="URL Target (#layanan)" />
        <button type="button" class="del-footer-link-btn text-rose-500 hover:text-rose-700 p-1.5 rounded-lg" title="Hapus">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `).join('');

    list.querySelectorAll('.del-footer-link-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const links = collectFooterLinks();
        links.splice(idx, 1);
        renderFooterLinks(links);
      });
    });
  }

  function collectFooterLinks() {
    const rows = document.querySelectorAll('.footer-link-row');
    const links = [];
    rows.forEach((r, idx) => {
      const title = r.querySelector('.footer-link-title').value.trim();
      const url = r.querySelector('.footer-link-url').value.trim();
      if (title) links.push({ id: 'fm' + (idx + 1), title, url });
    });
    return links;
  }

  const addFooterLinkBtn = document.getElementById('add-footer-link-btn');
  if (addFooterLinkBtn) {
    addFooterLinkBtn.addEventListener('click', () => {
      const links = collectFooterLinks();
      links.push({ id: 'fm' + Date.now(), title: 'Link Baru', url: '#' });
      renderFooterLinks(links);
    });
  }

  const copyNavToFooterBtn = document.getElementById('copy-nav-to-footer-btn');
  if (copyNavToFooterBtn) {
    copyNavToFooterBtn.addEventListener('click', () => {
      const navLinks = collectMenuItems();
      if (navLinks.length > 0) {
        const mapped = navLinks.map(n => ({ id: 'fm' + Date.now() + Math.random(), title: n.title, url: n.url }));
        renderFooterLinks(mapped);
        showToast('Link navbar berhasil disalin ke menu footer!');
      } else {
        alert('Menu navbar masih kosong!');
      }
    });
  }

  const copyContactHoursBtn = document.getElementById('copy-contact-hours-to-footer-btn');
  if (copyContactHoursBtn) {
    copyContactHoursBtn.addEventListener('click', () => {
      const rawWday = getVal('contact-hours-weekday', '09:00 – 17:00 WIB');
      const rawWend = getVal('contact-hours-weekend', 'Tutup (Layanan Darurat On-Call)');
      const wdayLbl = getVal('footer-hours-wday-label-input', 'Senin – Jumat');
      const wendLbl = getVal('footer-hours-wend-label-input', 'Sabtu – Minggu');
      setVal('footer-hours-wday-time-input', stripDayPrefix(rawWday, wdayLbl) || '09:00 – 17:00 WIB');
      setVal('footer-hours-wend-time-input', stripDayPrefix(rawWend, wendLbl) || 'Tutup (Layanan Darurat On-Call)');
      showToast('Jam operasional dari modul Kontak berhasil disalin ke Footer (tanpa duplikasi)!');
    });
  }

  // Sinkronisasi realtime input jam kerja antara modul Kontak dan Footer
  const contactWdayEl = document.getElementById('contact-hours-weekday');
  const footerWdayEl = document.getElementById('footer-hours-wday-time-input');
  const footerWdayLblEl = document.getElementById('footer-hours-wday-label-input');

  if (contactWdayEl && footerWdayEl) {
    contactWdayEl.addEventListener('input', () => {
      const lbl = footerWdayLblEl ? footerWdayLblEl.value.trim() : 'Senin – Jumat';
      const clean = stripDayPrefix(contactWdayEl.value, lbl);
      if (clean) footerWdayEl.value = clean;
    });
    footerWdayEl.addEventListener('input', () => {
      const lbl = footerWdayLblEl ? footerWdayLblEl.value.trim() : 'Senin – Jumat';
      contactWdayEl.value = `${lbl}: ${footerWdayEl.value.trim()}`;
    });
  }

  const contactWendEl = document.getElementById('contact-hours-weekend');
  const footerWendEl = document.getElementById('footer-hours-wend-time-input');
  const footerWendLblEl = document.getElementById('footer-hours-wend-label-input');

  if (contactWendEl && footerWendEl) {
    contactWendEl.addEventListener('input', () => {
      const lbl = footerWendLblEl ? footerWendLblEl.value.trim() : 'Sabtu – Minggu';
      const clean = stripDayPrefix(contactWendEl.value, lbl);
      if (clean) footerWendEl.value = clean;
    });
    footerWendEl.addEventListener('input', () => {
      const lbl = footerWendLblEl ? footerWendLblEl.value.trim() : 'Sabtu – Minggu';
      contactWendEl.value = `${lbl}: ${footerWendEl.value.trim()}`;
    });
  }

  const copyContactInfoBtn = document.getElementById('copy-contact-info-to-footer-btn');
  if (copyContactInfoBtn) {
    copyContactInfoBtn.addEventListener('click', () => {
      const addr = getVal('contact-addr-input');
      const phone = getVal('contact-phone-display');
      const email = getVal('contact-email-input');
      if (addr) setVal('footer-contact-addr-input', addr);
      if (phone) setVal('footer-contact-phone-input', phone);
      if (email) setVal('footer-contact-email-input', email);
      showToast('Info alamat & kontak berhasil disalin ke Footer!');
    });
  }

  // Live preview logo footer
  const footerLogoInput = document.getElementById('footer-logo-url-input');
  if (footerLogoInput) {
    footerLogoInput.addEventListener('input', () => {
      const prev = document.getElementById('footer-logo-preview');
      if (prev) prev.src = footerLogoInput.value.trim() || './images/logo.png';
    });
  }

  // Tombol Salin Logo dari Navbar
  const copyNavLogoBtn = document.getElementById('copy-navbar-logo-to-footer-btn');
  if (copyNavLogoBtn) {
    copyNavLogoBtn.addEventListener('click', () => {
      const navLogoUrl = getVal('nav-logo-url', './images/logo.png');
      setVal('footer-logo-url-input', navLogoUrl);
      const prev = document.getElementById('footer-logo-preview');
      if (prev) prev.src = navLogoUrl;
      showToast('Logo dari navbar berhasil disalin ke Footer!');
    });
  }

  // ==========================================
  // 5.B OTOMASI AI SEO (GOOGLE GEMINI / OPENAI)
  // ==========================================
  function populateAiAutomation(data) {
    const ai = data.aiAutomation || {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-1.5-flash',
      frequency: 'daily',
      targetRegion: 'Medan, Binjai, Langkat, Deli Serdang, Sumatera Utara',
      focusTopics: 'Internet Dedicated, Fiber Optic, Local Loop, Dark Fiber, Managed IT Solutions',
      autoUpdateMeta: true,
      autoUpdateAiSummary: true,
      autoUpdateFaq: true,
      lastRun: null,
      lastStatus: 'Nonaktif (Belum pernah dijalankan)'
    };

    const toggle = document.getElementById('ai-master-toggle');
    if (toggle) {
      toggle.checked = Boolean(ai.enabled);
      updateAiMasterToggleUI(toggle.checked);
    }

    setVal('ai-provider-select', ai.provider || 'gemini');
    updateAiModelOptions(ai.provider || 'gemini', ai.model || 'gemini-1.5-flash');
    setVal('ai-api-key-input', ai.apiKey || '');
    setVal('ai-frequency-select', ai.frequency || 'daily');
    setVal('ai-target-region-input', ai.targetRegion || 'Medan, Binjai, Langkat, Deli Serdang, Sumatera Utara');
    setVal('ai-focus-topics-input', ai.focusTopics || 'Internet Dedicated, Fiber Optic, Local Loop, Dark Fiber, Managed IT Solutions');

    const metaCheck = document.getElementById('ai-update-meta-check');
    if (metaCheck) metaCheck.checked = ai.autoUpdateMeta !== false;

    const aiSumCheck = document.getElementById('ai-update-ai-summary-check');
    if (aiSumCheck) aiSumCheck.checked = ai.autoUpdateAiSummary !== false;

    const faqCheck = document.getElementById('ai-update-faq-check');
    if (faqCheck) faqCheck.checked = ai.autoUpdateFaq !== false;

    updateAiStatusUI(ai);
  }

  function updateAiMasterToggleUI(isEnabled) {
    const statusPill = document.getElementById('ai-status-pill');
    const toggleLabel = document.getElementById('ai-toggle-label');
    const masterCard = document.getElementById('ai-master-card');
    const sidebarBadge = document.getElementById('sidebar-ai-badge');

    if (isEnabled) {
      if (statusPill) {
        statusPill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300';
        statusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>🟢 AKTIF (ON)</span>';
      }
      if (toggleLabel) {
        toggleLabel.textContent = 'ON';
        toggleLabel.className = 'text-sm font-extrabold text-emerald-600 w-12';
      }
      if (masterCard) {
        masterCard.className = 'bg-emerald-50/70 p-6 rounded-2xl border-2 border-emerald-300 shadow-sm transition-all';
      }
      if (sidebarBadge) {
        sidebarBadge.textContent = 'ON';
        sidebarBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs';
      }
    } else {
      if (statusPill) {
        statusPill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-500 border border-slate-200';
        statusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span><span>⚪ NONAKTIF (OFF)</span>';
      }
      if (toggleLabel) {
        toggleLabel.textContent = 'OFF';
        toggleLabel.className = 'text-sm font-extrabold text-slate-400 w-12';
      }
      if (masterCard) {
        masterCard.className = 'bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm transition-all';
      }
      if (sidebarBadge) {
        sidebarBadge.textContent = 'OFF';
        sidebarBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500';
      }
    }
  }

  function updateAiStatusUI(ai) {
    const lastRunPill = document.getElementById('ai-last-run-pill');
    const lastStatusText = document.getElementById('ai-last-status-text');
    const lastRunTime = document.getElementById('ai-last-run-time');

    if (lastStatusText) {
      if (ai.enabled) {
        lastStatusText.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>${ai.lastStatus || 'Aktif (Otomasi Berjalan Sesuai Jadwal)'}</span>
        </span>`;
      } else {
        lastStatusText.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
          <span class="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>${ai.lastStatus || 'Nonaktif (Dimatikan oleh Admin)'}</span>
        </span>`;
      }
    }
    if (lastRunTime) {
      lastRunTime.textContent = ai.lastRun ? new Date(ai.lastRun).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }) : 'Belum pernah dijalankan';
    }
    if (lastRunPill) {
      lastRunPill.textContent = ai.lastRun ? 'Terakhir: ' + new Date(ai.lastRun).toLocaleDateString('id-ID') : 'Belum pernah';
    }
  }

  function updateAiModelOptions(provider, selectedModel) {
    const modelSelect = document.getElementById('ai-model-select');
    const helpLink = document.getElementById('ai-key-help-link');
    if (!modelSelect) return;

    if (provider === 'gemini') {
      modelSelect.innerHTML = `
        <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest (Paling Cepat &amp; Stabil)</option>
        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
        <option value="gemini-2.0-flash">gemini-2.0-flash</option>
        <option value="gemini-1.5-pro-latest">gemini-1.5-pro-latest (Analisis Mendalam)</option>
        <option value="gemini-pro">gemini-pro</option>
      `;
      if (helpLink) {
        helpLink.href = 'https://aistudio.google.com/app/apikey';
        helpLink.innerHTML = '<span>Dapatkan API Key Gratis di Google AI Studio</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>';
      }
    } else {
      modelSelect.innerHTML = `
        <option value="gpt-4o-mini">gpt-4o-mini (Cepat & Hemat Biaya)</option>
        <option value="gpt-4o">gpt-4o (Akurasi Maksimal)</option>
      `;
      if (helpLink) {
        helpLink.href = 'https://platform.openai.com/api-keys';
        helpLink.innerHTML = '<span>Dapatkan API Key di OpenAI Platform</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>';
      }
    }

    if (selectedModel) {
      modelSelect.value = selectedModel;
    }
  }

  function collectAiAutomationData() {
    const toggle = document.getElementById('ai-master-toggle');
    const isEnabled = Boolean(toggle && toggle.checked);
    const existing = currentData?.aiAutomation || {};

    let statusText = '';
    if (isEnabled) {
      if (existing.lastRun) {
        statusText = `Aktif (Terakhir dioptimasi ${new Date(existing.lastRun).toLocaleDateString('id-ID')})`;
      } else {
        statusText = 'Aktif (Menunggu jadwal optimasi pertama)';
      }
    } else {
      statusText = 'Nonaktif (Dimatikan oleh admin)';
    }

    return {
      enabled: isEnabled,
      provider: getVal('ai-provider-select', 'gemini'),
      apiKey: getVal('ai-api-key-input', '').trim(),
      model: getVal('ai-model-select', 'gemini-1.5-flash'),
      frequency: getVal('ai-frequency-select', 'daily'),
      targetRegion: getVal('ai-target-region-input', 'Medan, Binjai, Langkat, Deli Serdang, Sumatera Utara'),
      focusTopics: getVal('ai-focus-topics-input', 'Internet Dedicated, Fiber Optic, Local Loop, Dark Fiber, Managed IT Solutions'),
      autoUpdateMeta: Boolean(document.getElementById('ai-update-meta-check')?.checked),
      autoUpdateAiSummary: Boolean(document.getElementById('ai-update-ai-summary-check')?.checked),
      autoUpdateFaq: Boolean(document.getElementById('ai-update-faq-check')?.checked),
      lastRun: existing.lastRun || null,
      lastStatus: statusText
    };
  }

  // Bind Event Listeners Modul AI
  const aiMasterToggle = document.getElementById('ai-master-toggle');
  const aiToggleLabel = document.getElementById('ai-toggle-label');

  if (aiMasterToggle) {
    aiMasterToggle.addEventListener('change', () => {
      const isEnabled = aiMasterToggle.checked;
      updateAiMasterToggleUI(isEnabled);

      // Sinkronkan ke objek data di memori seketika
      if (currentData) {
        if (!currentData.aiAutomation) currentData.aiAutomation = {};
        currentData.aiAutomation.enabled = isEnabled;
        currentData.aiAutomation.lastStatus = isEnabled
          ? 'Aktif (Menunggu jadwal berikutnya)'
          : 'Nonaktif (Dimatikan oleh admin)';
        updateAiStatusUI(currentData.aiAutomation);
      }

      if (isEnabled) {
        const key = getVal('ai-api-key-input', '').trim();
        if (!key) {
          showToast('⚠️ Jangan lupa isi API Key Anda agar AI dapat mengeksekusi!', false, '⚠️');
        } else {
          showToast('🟢 Otomasi AI SEO diaktifkan! Klik Simpan untuk menerapkan.', true, '🤖');
        }
      } else {
        showToast('⚪ Otomasi AI SEO dinonaktifkan.', true, '⏸️');
      }
    });
  }

  if (aiToggleLabel && aiMasterToggle) {
    aiToggleLabel.addEventListener('click', () => {
      aiMasterToggle.checked = !aiMasterToggle.checked;
      aiMasterToggle.dispatchEvent(new Event('change'));
    });
  }

  const aiProviderSelect = document.getElementById('ai-provider-select');
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener('change', (e) => {
      updateAiModelOptions(e.target.value);
    });
  }

  const toggleAiKeyVisBtn = document.getElementById('toggle-ai-key-vis');
  const aiApiKeyInput = document.getElementById('ai-api-key-input');
  if (toggleAiKeyVisBtn && aiApiKeyInput) {
    toggleAiKeyVisBtn.addEventListener('click', () => {
      aiApiKeyInput.type = aiApiKeyInput.type === 'password' ? 'text' : 'password';
    });
  }

  const btnSaveAiConfig = document.getElementById('btn-save-ai-config');
  if (btnSaveAiConfig) {
    btnSaveAiConfig.addEventListener('click', async () => {
      btnSaveAiConfig.disabled = true;
      const origHtml = btnSaveAiConfig.innerHTML;
      btnSaveAiConfig.innerHTML = `
        <svg class="w-4 h-4 animate-spin text-white inline-block mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        <span>Menyimpan Pengaturan AI...</span>
      `;
      try {
        await saveAllData();
      } finally {
        btnSaveAiConfig.disabled = false;
        btnSaveAiConfig.innerHTML = origHtml;
      }
    });
  }

  const btnRunAiNow = document.getElementById('btn-run-ai-now');
  if (btnRunAiNow) {
    btnRunAiNow.addEventListener('click', async () => {
      const config = collectAiAutomationData();
      if (!config.apiKey) {
        alert('Mohon masukkan API Key (Gemini atau OpenAI) Anda terlebih dahulu sebelum menjalankan optimasi!');
        document.getElementById('ai-api-key-input')?.focus();
        return;
      }

      btnRunAiNow.disabled = true;
      const originalText = btnRunAiNow.innerHTML;
      btnRunAiNow.innerHTML = `
        <svg class="w-4 h-4 animate-spin text-white inline-block mr-1.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        <span>Sedang Menganalisis &amp; Mengoptimasi Konten...</span>
      `;

      try {
        const res = await fetch('/api/ai-optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Terjadi kesalahan saat memanggil API AI');
        }

        // Tampilkan hasil di preview container
        const outContainer = document.getElementById('ai-output-container');
        const outTimestamp = document.getElementById('ai-output-timestamp');
        const outDetails = document.getElementById('ai-output-details');

        if (outContainer && outDetails && data.aiResult) {
          outContainer.classList.remove('hidden');
          if (outTimestamp) outTimestamp.textContent = new Date().toLocaleTimeString('id-ID');
          
          let faqHtml = '';
          if (Array.isArray(data.aiResult.suggestedFaq) && data.aiResult.suggestedFaq.length > 0) {
            faqHtml = `<div class="mt-2 pt-2 border-t border-emerald-200">
              <span class="font-bold text-emerald-900">Pertanyaan FAQ Baru yang Ditambahkan:</span>
              <p class="font-semibold text-slate-800">Q: ${data.aiResult.suggestedFaq[0].question}</p>
              <p class="text-slate-600">A: ${data.aiResult.suggestedFaq[0].answer}</p>
            </div>`;
          }

          outDetails.innerHTML = `
            <div><span class="font-bold text-emerald-900">Judul Baru:</span> ${data.aiResult.siteTitle || '-'}</div>
            <div><span class="font-bold text-emerald-900">Deskripsi:</span> ${data.aiResult.metaDescription || '-'}</div>
            <div><span class="font-bold text-emerald-900">Keywords:</span> <span class="font-mono text-[11px]">${data.aiResult.keywords || '-'}</span></div>
            <div><span class="font-bold text-emerald-900">Ringkasan AI:</span> ${data.aiResult.aiSearchSummary || '-'}</div>
            ${faqHtml}
          `;
        }

        // Sinkronkan ke form SEO langsung jika dipilih
        if (config.autoUpdateMeta && data.aiResult.siteTitle) {
          setVal('seo-title', data.aiResult.siteTitle);
          if (data.aiResult.metaDescription) setVal('seo-desc', data.aiResult.metaDescription);
          if (data.aiResult.keywords) setVal('seo-keywords', data.aiResult.keywords);
          updateGoogleSnippetPreview({
            siteTitle: data.aiResult.siteTitle,
            metaDescription: data.aiResult.metaDescription
          });
        }
        if (config.autoUpdateAiSummary && data.aiResult.aiSearchSummary) {
          setVal('seo-ai-summary', data.aiResult.aiSearchSummary);
        }

        // Update status & last run UI
        config.lastRun = data.lastRun || new Date().toISOString();
        config.lastStatus = data.message || 'Sukses dioptimasi oleh AI';
        updateAiStatusUI(config);

        showToast('⚡ AI Berhasil mengoptimasi SEO & konten website!', true, '🤖');
      } catch (err) {
        console.error('Error run AI now:', err);
        alert('Gagal mengeksekusi AI Optimasi: ' + err.message);
      } finally {
        btnRunAiNow.disabled = false;
        btnRunAiNow.innerHTML = originalText;
      }
    });
  }

  // ==========================================
  // 6. SIMPAN SEMUA PERUBAHAN
  // ==========================================
  async function saveAllData() {
    saveAllBtn.disabled = true;
    saveAllBtn.innerHTML = `
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      Menyimpan...
    `;

    const showCtaVal = document.getElementById('nav-show-cta')?.checked !== false;

    const wdayLbl = getVal('footer-hours-wday-label-input', 'Senin – Jumat');
    const cleanWday = stripDayPrefix(getVal('footer-hours-wday-time-input', '09:00 – 17:00 WIB'), wdayLbl) || '09:00 – 17:00 WIB';

    const wendLbl = getVal('footer-hours-wend-label-input', 'Sabtu – Minggu');
    const cleanWend = stripDayPrefix(getVal('footer-hours-wend-time-input', 'Tutup (Layanan Darurat On-Call)'), wendLbl) || 'Tutup (Layanan Darurat On-Call)';

    setVal('footer-hours-wday-time-input', cleanWday);
    setVal('footer-hours-wend-time-input', cleanWend);

    let contactWday = getVal('contact-hours-weekday');
    if (!contactWday || contactWday.startsWith(wdayLbl) || !contactWday.includes(':')) {
      contactWday = `${wdayLbl}: ${cleanWday}`;
      setVal('contact-hours-weekday', contactWday);
    }
    let contactWend = getVal('contact-hours-weekend');
    if (!contactWend || contactWend.startsWith(wendLbl) || !contactWend.includes(':')) {
      contactWend = `${wendLbl}: ${cleanWend}`;
      setVal('contact-hours-weekend', contactWend);
    }

    // Susun objek data komprehensif
    const updatedData = {
      seo: {
        siteTitle: getVal('seo-title'),
        metaDescription: getVal('seo-desc'),
        keywords: getVal('seo-keywords'),
        canonicalUrl: getVal('seo-canonical'),
        author: 'PT Infra Digital Solusindo',
        ogImage: './images/logo.png',
        geoRegion: getVal('seo-geo-region'),
        geoPlacename: getVal('seo-geo-placename'),
        geoCoordinates: getVal('seo-geo-coordinates'),
        aiSearchSummary: getVal('seo-ai-summary'),
        faqs: collectFAQs()
      },
      navbar: {
        brandName: getVal('nav-brand-name', 'IDS'),
        logoUrl: getVal('nav-logo-url', './images/logo.png'),
        showCta: showCtaVal,
        ctaText: getVal('nav-cta-text', 'Hubungi Kami'),
        ctaUrl: getVal('nav-cta-url', '#kontak'),
        menuItems: collectMenuItems()
      },
      hero: {
        badgeText: getVal('hero-badge-text'),
        badgePulse: true,
        titlePrefix: getVal('hero-title-prefix'),
        titleHighlight1: getVal('hero-title-hl1'),
        titleMid: getVal('hero-title-mid'),
        titleHighlight2: getVal('hero-title-hl2'),
        description: getVal('hero-desc-input'),
        primaryBtnText: getVal('hero-btn1-text'),
        primaryBtnUrl: getVal('hero-btn1-url'),
        secondaryBtnText: getVal('hero-btn2-text'),
        secondaryBtnUrl: getVal('hero-btn2-url'),
        stats: [
          { id: 's1', value: getVal('stat1-val'), label: getVal('stat1-lbl') },
          { id: 's2', value: getVal('stat2-val'), label: getVal('stat2-lbl') },
          { id: 's3', value: getVal('stat3-val'), label: getVal('stat3-lbl') }
        ],
        heroImage: getVal('hero-image-path')
      },
      partners: {
        sectionTitle: getVal('partners-heading'),
        logos: collectPartners()
      },
      advantages: {
        badge: 'KEUNGGULAN',
        title: getVal('adv-title-input'),
        highlight: getVal('adv-hl-input'),
        subtitle: getVal('adv-sub-input'),
        items: collectAdvantages()
      },
      services: {
        title: getVal('services-title-input', 'Solusi Layanan'),
        highlight: getVal('services-hl-input', 'Konektivitas & IT'),
        subtitle: getVal('services-sub-input'),
        items: collectServices()
      },
      gallery: {
        title: getVal('gallery-title-input'),
        highlight: 'Kegiatan',
        subtitle: getVal('gallery-sub-input'),
        useApiFallback: false,
        items: collectGallery()
      },
      about: {
        title: 'Tentang',
        highlight: 'Kami',
        subtitle: getVal('about-desc-input'),
        visi: getVal('about-visi-input'),
        misi: collectMisi(),
        nilai: collectNilai()
      },
      ctaBanner: {
        title: getVal('cta-title-input'),
        subtitle: getVal('cta-sub-input'),
        primaryBtnText: getVal('cta-btn1-input'),
        primaryBtnUrl: getVal('cta-btn1-url-input'),
        secondaryBtnText: getVal('cta-btn2-input'),
        secondaryBtnUrl: getVal('cta-btn2-url-input')
      },
      contact: {
        title: 'Hubungi',
        highlight: 'Kami',
        subtitle: 'Ceritakan kebutuhan Anda — tim kami siap merespons dan memberikan solusi terbaik.',
        addressTitle: 'Alamat Kantor',
        address: getVal('contact-addr-input'),
        phone: getVal('contact-phone-display'),
        waNumber: getVal('contact-wa-number'),
        email: getVal('contact-email-input'),
        website: 'www.ids.net.id',
        workHoursWeekday: contactWday,
        workHoursWeekend: contactWend,
        formHeading: 'Konsultasi Cepat via WhatsApp',
        formSubmitText: 'Kirim via WhatsApp'
      },
      footer: {
        logoUrl: getVal('footer-logo-url-input', './images/logo.png'),
        logoAlt: getVal('footer-logo-alt-input', 'PT Infra Digital Solusindo'),
        brandDescription: getVal('footer-desc-input'),
        copyrightText: getVal('footer-copy-input'),
        showAdminLink: Boolean(document.getElementById('footer-show-admin-btn')?.checked),
        adminLinkText: getVal('footer-admin-btn-text-input', 'Login Admin Panel CMS'),
        navTitle: getVal('footer-nav-title-input', 'Navigasi'),
        menuItems: collectFooterLinks(),
        hoursTitle: getVal('footer-hours-title-input', 'Jam Kerja'),
        hoursNote: getVal('footer-hours-note-input'),
        hoursWeekdayLabel: wdayLbl,
        hoursWeekdayTime: cleanWday,
        hoursWeekendLabel: wendLbl,
        hoursWeekendTime: cleanWend,
        contactTitle: getVal('footer-contact-title-input', 'Kontak'),
        website: getVal('footer-contact-web-input', 'www.ids.net.id'),
        address: getVal('footer-contact-addr-input'),
        phone: getVal('footer-contact-phone-input'),
        email: getVal('footer-contact-email-input')
      },
      aiAutomation: collectAiAutomationData(),
      adminPassword: getActivePassword()
    };

    // 1. Simpan ke LocalStorage agar langsung aktif di browser
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

    // 2. Jika server backend aktif, simpan ke file JSON permanen
    let serverSaved = false;
    try {
      const res = await fetch(API_SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        serverSaved = true;
      }
    } catch (e) {
      console.warn('Simpan ke server gagal, tersimpan di localStorage', e);
    }

    currentData = updatedData;
    updateDashboardStats();
    updateNavbarLivePreview();

    setTimeout(() => {
      saveAllBtn.disabled = false;
      saveAllBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        Simpan Semua
      `;

      if (serverSaved) {
        showToast('Berhasil disimpan permanen ke server & landing page!', true);
      } else {
        showToast('Berhasil disimpan ke browser & landing page!', true);
      }
    }, 400);
  }

  saveAllBtn.addEventListener('click', saveAllData);

  // ==========================================
  // 7. TOAST NOTIFICATION
  // ==========================================
  let toastTimer = null;
  function showToast(msg, isSuccess = true, customIcon = null) {
    if (!toastEl) return;
    const iconEl = document.getElementById('toast-icon');

    // Bersihkan emoji di awal teks pesan agar tidak ganda dengan toast-icon
    let cleanMsg = msg;
    let icon = customIcon || (isSuccess ? '✅' : '⚠️');
    const emojiMatch = msg.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[✅⚠️🔒📋🕒📍🖼️📥])\s*/u);
    if (emojiMatch) {
      if (!customIcon) icon = emojiMatch[1];
      cleanMsg = msg.substring(emojiMatch[0].length);
    }

    if (iconEl) iconEl.textContent = icon;
    if (toastMsg) toastMsg.textContent = cleanMsg;

    toastEl.classList.remove('translate-y-[-100px]', 'opacity-0');
    toastEl.classList.add('translate-y-0', 'opacity-100');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('translate-y-0', 'opacity-100');
      toastEl.classList.add('translate-y-[-100px]', 'opacity-0');
    }, 3500);
  }

  // ==========================================
  // 8. BACKUP, EKSPOR & IMPOR
  // ==========================================
  const downloadBtn = document.getElementById('download-json-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!currentData) return;
      const jsonStr = JSON.stringify(currentData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ids-site-data-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('File backup berhasil diunduh!');
    });
  }

  const importFile = document.getElementById('import-json-file');
  if (importFile) {
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          currentData = parsed;
          populateAllFields(parsed);
          saveAllData();
          showToast('Data berhasil dipulihkan dari file backup!');
        } catch (err) {
          alert('Format file JSON tidak valid!');
        }
      };
      reader.readAsText(file);
    });
  }

  const resetFactoryBtn = document.getElementById('reset-factory-btn');
  if (resetFactoryBtn) {
    resetFactoryBtn.addEventListener('click', async () => {
      if (confirm('PERINGATAN: Semua perubahan khusus akan dihapus dan dikembalikan ke bawaan pabrik. Lanjutkan?')) {
        localStorage.removeItem(STORAGE_KEY);
        try {
          const res = await fetch(STATIC_JSON_URL);
          if (res.ok) {
            currentData = await res.json();
            populateAllFields(currentData);
            saveAllData();
          }
        } catch (e) {
          location.reload();
        }
      }
    });
  }

  // Update Metric Counters
  function updateDashboardStats() {
    if (!currentData) return;
    const menuCount = (currentData.navbar && currentData.navbar.menuItems) ? currentData.navbar.menuItems.length : 0;
    const srvCount = (currentData.services && currentData.services.items) ? currentData.services.items.length : 0;
    const galCount = (currentData.gallery && currentData.gallery.items) ? currentData.gallery.items.length : 0;

    const elMenu = document.getElementById('stat-menu-count');
    const elSrv = document.getElementById('stat-service-count');
    const elGal = document.getElementById('stat-gallery-count');

    if (elMenu) elMenu.textContent = menuCount;
    if (elSrv) elSrv.textContent = srvCount;
    if (elGal) elGal.textContent = galCount;
  }

  // Inisialisasi
  checkAuth();
  loadData();
})();
