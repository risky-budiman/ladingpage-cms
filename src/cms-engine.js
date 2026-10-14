/**
 * PT Infra Digital Solusindo (IDS) — Dynamic CMS Rendering Engine & SEO Hydration
 * Mengontrol rendering dinamis seluruh section landing page berdasarkan data CMS (data/site-data.json / localStorage / server API)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ids_cms_site_data';
  const API_CONTENT_URL = '/api/content';
  const STATIC_JSON_URL = './data/site-data.json';

  // State
  let siteData = null;

  // Icons Helper
  const SVG_ICONS = {
    speed: `<svg class="w-7 h-7 text-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
    shield: `<svg class="w-7 h-7 text-accent group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
    map: `<svg class="w-7 h-7 text-purple-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    loop: `<svg class="w-7 h-7 text-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    monitor: `<svg class="w-7 h-7 text-accent group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>`,
    cable: `<svg class="w-7 h-7 text-purple-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
    whatsapp: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
  };

  /**
   * Mengambil data konten dari API server / local file / localStorage
   */
  async function fetchSiteData() {
    // 1. Cek apakah ada di localStorage (override dari browser)
    const localSaved = localStorage.getItem(STORAGE_KEY);
    if (localSaved) {
      try {
        siteData = JSON.parse(localSaved);
        console.log('✅ CMS: Memuat data dari LocalStorage');
        applyDataToDOM(siteData);
      } catch (e) {
        console.warn('CMS: Gagal parse data dari LocalStorage', e);
      }
    }

    // 2. Cek API backend server (jika server Node.js aktif)
    try {
      const res = await fetch(API_CONTENT_URL);
      if (res.ok) {
        const json = await res.json();
        // Simpan hanya jika local belum meng-override atau ingin sinkron
        if (!localSaved) {
          siteData = json;
          applyDataToDOM(siteData);
        }
        return siteData;
      }
    } catch (e) {
      // Server backend tidak aktif / static hosting
    }

    // 3. Fallback: Cek file static JSON (data/site-data.json)
    if (!siteData) {
      try {
        const res = await fetch(STATIC_JSON_URL);
        if (res.ok) {
          siteData = await res.json();
          console.log('✅ CMS: Memuat data dari data/site-data.json');
          applyDataToDOM(siteData);
        }
      } catch (err) {
        console.error('❌ CMS: Gagal memuat data/site-data.json', err);
      }
    }

    return siteData;
  }

  /**
   * Terapkan seluruh data ke elemen DOM & SEO
   */
  function applyDataToDOM(data) {
    if (!data) return;

    applySEO(data.seo, data.contact);
    applyNavbar(data.navbar);
    applyHero(data.hero);
    applyPartners(data.partners);
    applyAdvantages(data.advantages);
    applyServices(data.services, data.contact);
    applyGallery(data.gallery);
    applyAbout(data.about);
    applyFAQ(data.seo ? data.seo.faqs : null);
    applyCtaBanner(data.ctaBanner);
    applyContact(data.contact);
    applyFooter(data.footer, data.navbar, data.contact);

    // Trigger event setelah render
    window.dispatchEvent(new CustomEvent('ids-content-rendered', { detail: data }));
  }

  /**
   * 1. SEO & AI Search Engine Hydration (Google & AI Overviews / Perplexity / ChatGPT)
   */
  function applySEO(seo, contact) {
    if (!seo) return;

    if (seo.siteTitle) document.title = seo.siteTitle;

    // Helper update meta
    const setMeta = (nameOrProp, val, isProp = false) => {
      if (!val) return;
      const selector = isProp ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(isProp ? 'property' : 'name', nameOrProp);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    };

    setMeta('description', seo.metaDescription);
    setMeta('keywords', seo.keywords);
    setMeta('author', seo.author || 'PT Infra Digital Solusindo');
    setMeta('geo.region', seo.geoRegion || 'ID-SU');
    setMeta('geo.placename', seo.geoPlacename || 'Medan');
    setMeta('geo.position', seo.geoCoordinates || '3.5952;98.6722');
    setMeta('ICBM', seo.geoCoordinates ? seo.geoCoordinates.replace(';', ', ') : '3.5952, 98.6722');

    // Canonical link
    if (seo.canonicalUrl) {
      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', seo.canonicalUrl);
    }

    // Open Graph
    setMeta('og:title', seo.siteTitle, true);
    setMeta('og:description', seo.metaDescription, true);
    setMeta('og:url', seo.canonicalUrl, true);
    setMeta('og:type', 'website', true);
    setMeta('og:site_name', 'PT Infra Digital Solusindo', true);
    setMeta('og:locale', 'id_ID', true);
    if (seo.ogImage) setMeta('og:image', seo.ogImage, true);

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', seo.siteTitle);
    setMeta('twitter:description', seo.metaDescription);
    if (seo.ogImage) setMeta('twitter:image', seo.ogImage);

    // AI & Google JSON-LD Schema Generation
    injectJSONLDSchema(seo, contact);
  }

  function injectJSONLDSchema(seo, contact) {
    const contactData = contact || {};
    const siteUrl = (seo && seo.canonicalUrl) ? seo.canonicalUrl : 'https://ids.net.id/';

    // Schema: LocalBusiness & InternetServiceProvider
    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": ["InternetServiceProvider", "LocalBusiness"],
      "@id": `${siteUrl}#organization`,
      "name": "PT Infra Digital Solusindo",
      "alternateName": ["IDS", "Infra Digital Solusindo"],
      "url": siteUrl,
      "logo": `${siteUrl}images/logo.png`,
      "image": `${siteUrl}images/logo.png`,
      "description": seo.metaDescription || "Penyedia Jartaplok PS terpercaya di Medan, Binjai, Langkat dan sekitarnya.",
      "telephone": contactData.phone || "+628113244321",
      "email": contactData.email || "admin@ids.net.id",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Jl. Setia Budi, Medan Sunggal",
        "addressLocality": "Medan",
        "addressRegion": "Sumatera Utara",
        "postalCode": "20122",
        "addressCountry": "ID"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 3.5952,
        "longitude": 98.6722
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "17:00"
        }
      ],
      "areaServed": [
        { "@type": "City", "name": "Medan" },
        { "@type": "City", "name": "Binjai" },
        { "@type": "AdministrativeArea", "name": "Kabupaten Langkat" },
        { "@type": "AdministrativeArea", "name": "Deli Serdang" }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Layanan Jartaplok PS & IT IDS",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Local Loop Fiber Optik",
              "description": "Koneksi jaringan lokal dari titik akses ke lokasi pelanggan berkecepatan tinggi."
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "IT Solution Enterprise",
              "description": "Perencanaan, instalasi, dan pemeliharaan infrastruktur jaringan IT terpadu."
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Dark Fiber Infrastructure",
              "description": "Sewa kabel serat optik pasif untuk kebutuhan bandwidth besar dan aman."
            }
          }
        ]
      }
    };

    // Schema: FAQPage (Sangat disukai oleh Google Rich Snippets & AI Crawler seperti Perplexity/ChatGPT)
    let faqSchema = null;
    if (seo.faqs && seo.faqs.length > 0) {
      faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": seo.faqs.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      };
    }

    // Remove old schema script tags
    document.querySelectorAll('script[data-schema="ids-cms"]').forEach(el => el.remove());

    const script1 = document.createElement('script');
    script1.type = 'application/ld+json';
    script1.setAttribute('data-schema', 'ids-cms');
    script1.textContent = JSON.stringify(localBusinessSchema);
    document.head.appendChild(script1);

    if (faqSchema) {
      const script2 = document.createElement('script');
      script2.type = 'application/ld+json';
      script2.setAttribute('data-schema', 'ids-cms');
      script2.textContent = JSON.stringify(faqSchema);
      document.head.appendChild(script2);
    }
  }

  /**
   * 2. Navbar & Menu
   */
  function applyNavbar(navbar) {
    if (!navbar) return;

    // Logo
    const navLogo = document.getElementById('nav-logo');
    if (navLogo && navbar.logoUrl) {
      navLogo.src = navbar.logoUrl;
      navLogo.alt = navbar.brandName || 'Logo IDS';
    }

    const showCta = navbar.showCta !== false;
    const ctaHtmlDesktop = showCta ? `
      <li>
        <a href="${navbar.ctaUrl || '#kontak'}"
          class="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md">
          ${navbar.ctaText || 'Hubungi Kami'}
        </a>
      </li>
    ` : '';

    const ctaHtmlMobile = showCta ? `
      <li>
        <a href="${navbar.ctaUrl || '#kontak'}"
          class="mobile-link block bg-primary text-white text-center px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition-colors">
          ${navbar.ctaText || 'Hubungi Kami'}
        </a>
      </li>
    ` : '';

    // Desktop Menu
    const desktopContainer = document.getElementById('desktop-menu-list');
    if (desktopContainer && navbar.menuItems) {
      desktopContainer.innerHTML = navbar.menuItems.map(item => `
        <li>
          <a href="${item.url}" ${item.isExternal ? 'target="_blank" rel="noopener"' : ''}
            class="nav-link text-gray-600 font-medium hover:text-primary transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">
            ${item.title}
          </a>
        </li>
      `).join('') + ctaHtmlDesktop;
    }

    // Mobile Menu
    const mobileContainer = document.getElementById('mobile-menu-list');
    if (mobileContainer && navbar.menuItems) {
      mobileContainer.innerHTML = navbar.menuItems.map(item => `
        <li>
          <a href="${item.url}" ${item.isExternal ? 'target="_blank" rel="noopener"' : ''}
            class="mobile-link block text-gray-700 font-medium hover:text-primary py-1">
            ${item.title}
          </a>
        </li>
      `).join('') + ctaHtmlMobile;

      // Re-bind click handlers for closing mobile menu
      mobileContainer.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
          const mobileMenu = document.getElementById('mobile-menu');
          const hamburgerLines = document.querySelectorAll('#hamburger span');
          if (mobileMenu) mobileMenu.classList.add('hidden');
          if (hamburgerLines.length >= 3) {
            hamburgerLines[0].style.transform = '';
            hamburgerLines[1].style.opacity = '1';
            hamburgerLines[2].style.transform = '';
          }
        });
      });
    }
  }

  /**
   * 3. Hero Section
   */
  function applyHero(hero) {
    if (!hero) return;

    const badgeEl = document.getElementById('hero-badge');
    if (badgeEl && hero.badgeText) {
      badgeEl.innerHTML = `
        <span class="w-2 h-2 bg-primary rounded-full ${hero.badgePulse ? 'animate-pulse' : ''}"></span>
        ${hero.badgeText}
      `;
    }

    const titleEl = document.getElementById('hero-title');
    if (titleEl) {
      titleEl.innerHTML = `
        ${hero.titlePrefix || 'Infrastruktur Jaringan Andal untuk'}
        <span class="gradient-text">${hero.titleHighlight1 || 'Komunitas'}</span> ${hero.titleMid || 'dan'}
        <span class="gradient-text">${hero.titleHighlight2 || 'Bisnis Anda'}</span>
      `;
    }

    const descEl = document.getElementById('hero-desc');
    if (descEl && hero.description) {
      descEl.textContent = hero.description;
    }

    const primaryBtn = document.getElementById('hero-btn-primary');
    if (primaryBtn) {
      primaryBtn.textContent = hero.primaryBtnText || 'Lihat Layanan Kami';
      primaryBtn.setAttribute('href', hero.primaryBtnUrl || '#layanan');
    }

    const secondaryBtn = document.getElementById('hero-btn-secondary');
    if (secondaryBtn) {
      secondaryBtn.textContent = hero.secondaryBtnText || 'Konsultasi Gratis';
      secondaryBtn.setAttribute('href', hero.secondaryBtnUrl || '#kontak');
    }

    const statsContainer = document.getElementById('hero-stats');
    if (statsContainer && hero.stats) {
      statsContainer.innerHTML = hero.stats.map((s, idx) => `
        ${idx > 0 ? '<div class="w-px self-stretch bg-gray-200"></div>' : ''}
        <div class="flex-1 text-center">
          <p class="text-xl sm:text-2xl font-bold text-gray-900">${s.value}</p>
          <p class="text-xs sm:text-sm text-gray-500">${s.label}</p>
        </div>
      `).join('');
    }

    const heroImg = document.getElementById('hero-image');
    if (heroImg && hero.heroImage) {
      heroImg.src = hero.heroImage;
    }
  }

  /**
   * 4. Partners
   */
  function applyPartners(partners) {
    if (!partners) return;

    const titleEl = document.getElementById('partners-title');
    if (titleEl && partners.sectionTitle) {
      titleEl.textContent = partners.sectionTitle;
    }

    const track = document.getElementById('partners-track');
    if (track && partners.logos) {
      // Loop dua kali untuk efek infinite loop
      const list = [...partners.logos, ...partners.logos];
      track.innerHTML = list.map(item => `
        <div class="flex-shrink-0 w-[130px] sm:w-[200px] flex items-center justify-center px-4 sm:px-8 h-14 sm:h-16">
          <img src="${item.url}" alt="${item.name}"
            class="max-h-10 object-contain opacity-60 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300"
            title="${item.name}" loading="lazy" />
        </div>
      `).join('');
    }
  }

  /**
   * 5. Keunggulan (Advantages / Why Us)
   */
  function applyAdvantages(advantages) {
    if (!advantages) return;

    const titleEl = document.getElementById('adv-title');
    if (titleEl) {
      titleEl.innerHTML = `${advantages.title || 'Mengapa Memilih'} <span class="gradient-text">${advantages.highlight || 'IDS?'}</span>`;
    }

    const subtitleEl = document.getElementById('adv-subtitle');
    if (subtitleEl && advantages.subtitle) {
      subtitleEl.textContent = advantages.subtitle;
    }

    const grid = document.getElementById('adv-grid');
    if (grid && advantages.items) {
      grid.innerHTML = advantages.items.map(item => {
        let bgIconClass = 'bg-blue-50 text-primary group-hover:bg-primary';
        if (item.colorScheme === 'green') bgIconClass = 'bg-green-50 text-accent group-hover:bg-accent';
        if (item.colorScheme === 'purple') bgIconClass = 'bg-purple-50 text-purple-500 group-hover:bg-purple-500';

        const iconSvg = SVG_ICONS[item.iconType] || SVG_ICONS.speed;

        return `
          <div class="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${bgIconClass} group-hover:scale-110 transition-all duration-300">
              ${iconSvg}
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">${item.title}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">${item.description}</p>
          </div>
        `;
      }).join('');
    }
  }

  /**
   * 6. Layanan (Services)
   */
  function applyServices(services, contact) {
    if (!services) return;

    const titleEl = document.getElementById('services-title');
    if (titleEl) {
      titleEl.innerHTML = `${services.title || 'Solusi Layanan'} <span class="gradient-text">${services.highlight || 'Konektivitas & IT'}</span>`;
    }

    const subtitleEl = document.getElementById('services-subtitle');
    if (subtitleEl && services.subtitle) {
      subtitleEl.textContent = services.subtitle;
    }

    const grid = document.getElementById('services-grid');
    if (grid && services.items) {
      const waNumber = (contact && contact.waNumber) ? contact.waNumber.replace(/[^0-9]/g, '') : '628113244321';

      grid.innerHTML = services.items.map(item => {
        let bgIconClass = 'bg-blue-50 text-primary group-hover:bg-primary';
        if (item.colorScheme === 'green') bgIconClass = 'bg-green-50 text-accent group-hover:bg-accent';
        if (item.colorScheme === 'purple') bgIconClass = 'bg-purple-50 text-purple-500 group-hover:bg-purple-500';

        const iconSvg = SVG_ICONS[item.iconType] || SVG_ICONS.loop;
        const encodedMsg = encodeURIComponent(item.waMessage || `Halo IDS, saya ingin bertanya tentang layanan ${item.title}`);

        return `
          <div class="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 flex flex-col relative">
            ${item.badge ? `
              <span class="absolute top-4 right-4 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                ${item.badge}
              </span>
            ` : ''}
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${bgIconClass} group-hover:scale-110 transition-all duration-300">
              ${iconSvg}
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">${item.title}</h3>
            <p class="text-gray-500 text-sm leading-relaxed flex-1">${item.description}</p>
            <a href="https://wa.me/${waNumber}?text=${encodedMsg}" target="_blank" rel="noopener"
              class="wa-service-btn mt-6 w-full py-2.5 rounded-xl border-2 border-[#25D366] text-[#25D366] font-semibold text-sm hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center gap-2">
              ${SVG_ICONS.whatsapp}
              Tanya via WA
            </a>
          </div>
        `;
      }).join('');
    }
  }

  /**
   * 7. Galeri
   */
  function applyGallery(gallery) {
    if (!gallery) return;

    const titleEl = document.getElementById('gallery-title');
    if (titleEl) {
      titleEl.innerHTML = `${gallery.title || 'Galeri'} <span class="gradient-text">${gallery.highlight || 'Kegiatan'}</span>`;
    }

    const subtitleEl = document.getElementById('gallery-subtitle');
    if (subtitleEl && gallery.subtitle) {
      subtitleEl.textContent = gallery.subtitle;
    }

    const grid = document.getElementById('gallery-grid');
    if (grid && gallery.items && gallery.items.length > 0) {
      grid.innerHTML = gallery.items.map(item => `
        <div class="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-300">
          <img src="${item.url}" alt="${item.title}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
            ${item.tag ? `<span class="text-xs font-semibold text-primary-light uppercase tracking-wider mb-1">${item.tag}</span>` : ''}
            <span class="text-white font-bold text-lg tracking-wide">${item.title}</span>
          </div>
        </div>
      `).join('');
    }
  }

  /**
   * 8. Tentang Kami
   */
  function applyAbout(about) {
    if (!about) return;

    const titleEl = document.getElementById('about-title');
    if (titleEl) {
      titleEl.innerHTML = `${about.title || 'Tentang'} <span class="gradient-text">${about.highlight || 'Kami'}</span>`;
    }

    const subtitleEl = document.getElementById('about-subtitle');
    if (subtitleEl && about.subtitle) {
      subtitleEl.textContent = about.subtitle;
    }

    const visiEl = document.getElementById('about-visi');
    if (visiEl && about.visi) {
      visiEl.textContent = about.visi;
    }

    const misiList = document.getElementById('about-misi-list');
    if (misiList && about.misi) {
      misiList.innerHTML = about.misi.map(item => `
        <li class="flex items-start gap-2 text-sm text-gray-500">
          <svg class="w-4 h-4 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          ${item}
        </li>
      `).join('');
    }

    const nilaiList = document.getElementById('about-nilai-list');
    if (nilaiList && about.nilai) {
      nilaiList.innerHTML = about.nilai.map(item => `
        <li class="text-sm text-gray-500">
          <span class="font-semibold text-gray-700">${item.keyword}</span> — ${item.desc}
        </li>
      `).join('');
    }
  }

  /**
   * 9. FAQ Section (Penting untuk SEO Google One-Page & AI Search Overview)
   */
  function applyFAQ(faqs) {
    const faqContainer = document.getElementById('faq-accordion');
    if (!faqContainer || !faqs || faqs.length === 0) return;

    faqContainer.innerHTML = faqs.map((f, i) => `
      <div class="border border-gray-200 rounded-2xl bg-white overflow-hidden transition-all duration-200">
        <button type="button" class="faq-toggle w-full px-6 py-5 text-left font-semibold text-gray-900 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors" data-faq="${i}">
          <span>${f.question}</span>
          <svg class="w-5 h-5 text-primary transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="faq-content hidden px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-3">
          ${f.answer}
        </div>
      </div>
    `).join('');

    // Accordion Toggle
    faqContainer.querySelectorAll('.faq-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const content = btn.nextElementSibling;
        const icon = btn.querySelector('svg');
        const isOpen = !content.classList.contains('hidden');

        // Tutup yang lain
        faqContainer.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
        faqContainer.querySelectorAll('.faq-toggle svg').forEach(svg => svg.style.transform = '');

        if (!isOpen) {
          content.classList.remove('hidden');
          icon.style.transform = 'rotate(180deg)';
        }
      });
    });
  }

  /**
   * 10. CTA Banner
   */
  function applyCtaBanner(cta) {
    if (!cta) return;

    const titleEl = document.getElementById('cta-title');
    if (titleEl && cta.title) titleEl.textContent = cta.title;

    const subtitleEl = document.getElementById('cta-subtitle');
    if (subtitleEl && cta.subtitle) subtitleEl.textContent = cta.subtitle;

    const primaryBtn = document.getElementById('cta-btn-primary');
    if (primaryBtn) {
      primaryBtn.textContent = cta.primaryBtnText || 'Daftar Sekarang';
      primaryBtn.setAttribute('href', cta.primaryBtnUrl || '#kontak');
    }

    const secondaryBtn = document.getElementById('cta-btn-secondary');
    if (secondaryBtn) {
      secondaryBtn.textContent = cta.secondaryBtnText || 'Lihat Layanan';
      secondaryBtn.setAttribute('href', cta.secondaryBtnUrl || '#layanan');
    }
  }

  /**
   * 11. Kontak
   */
  function applyContact(contact) {
    if (!contact) return;

    const titleEl = document.getElementById('contact-title');
    if (titleEl) {
      titleEl.innerHTML = `${contact.title || 'Hubungi'} <span class="gradient-text">${contact.highlight || 'Kami'}</span>`;
    }

    const subtitleEl = document.getElementById('contact-subtitle');
    if (subtitleEl && contact.subtitle) subtitleEl.textContent = contact.subtitle;

    const addrEl = document.getElementById('contact-address');
    if (addrEl && contact.address) addrEl.textContent = contact.address;

    const phoneEl = document.getElementById('contact-phone');
    if (phoneEl && contact.phone) phoneEl.textContent = contact.phone;

    const emailEl = document.getElementById('contact-email');
    if (emailEl && contact.email) emailEl.textContent = contact.email;

    const hoursEl = document.getElementById('contact-hours');
    if (hoursEl) {
      hoursEl.innerHTML = `${contact.workHoursWeekday || 'Senin – Jumat: 09:00 – 17:00 WIB'}<br />${contact.workHoursWeekend || 'Sabtu – Minggu: Tutup'}`;
    }

    // Bind WhatsApp Contact Form
    bindWhatsAppForm(contact.waNumber || '628113244321');
  }

  function bindWhatsAppForm(waNumber) {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // Remove previous listeners by cloning
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const phone = document.getElementById('phone')?.value.trim();
      const message = document.getElementById('message')?.value.trim();

      if (!name || !email || !message) {
        alert('Silakan lengkapi formulir sebelum mengirim.');
        return;
      }

      const waCleanNumber = waNumber.replace(/[^0-9]/g, '');
      const waText = [
        `Halo IDS, saya ingin menghubungi Anda.`,
        ``,
        `*Nama:* ${name}`,
        `*Email:* ${email}`,
        phone ? `*No. HP:* ${phone}` : null,
        ``,
        `*Pesan:*`,
        message,
      ].filter(Boolean).join('\n');

      const waUrl = `https://wa.me/${waCleanNumber}?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, '_blank');
      newForm.reset();
    });
  }

  /**
   * 12. Footer
   */
  function applyFooter(footer, navbar, contact) {
    if (!footer) return;

    // Logo Footer
    const footerLogoEl = document.getElementById('footer-logo');
    if (footerLogoEl) {
      if (footer.logoUrl) footerLogoEl.src = footer.logoUrl;
      if (footer.logoAlt) footerLogoEl.alt = footer.logoAlt;
    }

    const descEl = document.getElementById('footer-brand-desc');
    if (descEl && footer.brandDescription) descEl.textContent = footer.brandDescription;

    const copyEl = document.getElementById('footer-copy-text');
    if (copyEl && footer.copyrightText) copyEl.textContent = footer.copyrightText;

    // Tombol Admin Link Footer (Default disembunyikan untuk privasi)
    const adminLinkWrapper = document.getElementById('footer-admin-link-wrapper');
    if (adminLinkWrapper) {
      if (footer.showAdminLink === true) {
        adminLinkWrapper.classList.remove('hidden');
        adminLinkWrapper.style.display = 'block';
        const linkTxt = (footer.adminLinkText || 'Login Admin Panel CMS').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        adminLinkWrapper.innerHTML = `
          <a href="admin.html" class="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span id="footer-admin-link-text">${linkTxt}</span>
          </a>
        `;
      } else {
        adminLinkWrapper.classList.add('hidden');
        adminLinkWrapper.style.display = 'none';
        adminLinkWrapper.innerHTML = '';
      }
    }

    // Footer Navigation Links
    const navTitleEl = document.getElementById('footer-nav-title');
    if (navTitleEl && footer.navTitle) navTitleEl.textContent = footer.navTitle;

    const navListEl = document.getElementById('footer-nav-list');
    const footerLinks = (footer.menuItems && footer.menuItems.length > 0) ? footer.menuItems : (navbar && navbar.menuItems ? navbar.menuItems : []);
    if (navListEl && footerLinks.length > 0) {
      navListEl.innerHTML = footerLinks.map(it => `
        <li>
          <a href="${it.url}" class="text-sm text-gray-400 hover:text-white hover:pl-1 transition-all">
            ${it.title}
          </a>
        </li>
      `).join('');
    }

    // Jam Kerja Footer (Sanitasi agar tidak dobel nama hari)
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

    const hoursTitleEl = document.getElementById('footer-hours-title');
    if (hoursTitleEl) hoursTitleEl.textContent = footer.hoursTitle || 'Jam Kerja';

    const wdayLbl = footer.hoursWeekdayLabel || 'Senin – Jumat';
    const rawWday = footer.hoursWeekdayTime || contact?.workHoursWeekday || '09:00 – 17:00 WIB';
    const cleanWday = stripDayPrefix(rawWday, wdayLbl) || '09:00 – 17:00 WIB';

    const wendLbl = footer.hoursWeekendLabel || 'Sabtu – Minggu';
    const rawWend = footer.hoursWeekendTime || contact?.workHoursWeekend || 'Tutup (Layanan Darurat On-Call)';
    const cleanWend = stripDayPrefix(rawWend, wendLbl) || 'Tutup (Layanan Darurat On-Call)';

    const wdayLblEl = document.getElementById('footer-hours-wday-label');
    if (wdayLblEl) wdayLblEl.textContent = wdayLbl;

    const wdayTimeEl = document.getElementById('footer-hours-wday-time');
    if (wdayTimeEl) wdayTimeEl.textContent = cleanWday;

    const wendLblEl = document.getElementById('footer-hours-wend-label');
    if (wendLblEl) wendLblEl.textContent = wendLbl;

    const wendTimeEl = document.getElementById('footer-hours-wend-time');
    if (wendTimeEl) wendTimeEl.textContent = cleanWend;

    const hoursNoteEl = document.getElementById('footer-hours-note');
    if (hoursNoteEl) {
      hoursNoteEl.textContent = footer.hoursNote || '';
      hoursNoteEl.style.display = footer.hoursNote ? 'block' : 'none';
    }

    // Kontak Footer
    const contactTitleEl = document.getElementById('footer-contact-title');
    if (contactTitleEl) contactTitleEl.textContent = footer.contactTitle || 'Kontak';

    const addrEl = document.getElementById('footer-contact-address');
    if (addrEl) addrEl.textContent = footer.address || contact?.address || 'Jl. Setia Budi, Medan Sunggal';

    const phoneEl = document.getElementById('footer-contact-phone');
    if (phoneEl) phoneEl.textContent = footer.phone || contact?.phone || '+62 811-3244-321';

    const emailEl = document.getElementById('footer-contact-email');
    if (emailEl) emailEl.textContent = footer.email || contact?.email || 'admin@ids.net.id';

    const webEl = document.getElementById('footer-contact-website');
    if (webEl) webEl.textContent = footer.website || contact?.website || 'www.ids.net.id';
  }

  // Global API untuk interaksi dari luar / Admin preview
  window.IDS_CMS = {
    getData: () => siteData,
    setData: (newData) => {
      siteData = newData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      applyDataToDOM(newData);
    },
    resetData: () => {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    },
    refresh: fetchSiteData
  };

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchSiteData);
  } else {
    fetchSiteData();
  }
})();
