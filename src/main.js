// ========================
// Tahun copyright
// ========================
document.getElementById("year").textContent = new Date().getFullYear();

// ========================
// Navbar: shrink on scroll + hamburger
// ========================
const navbar = document.getElementById("navbar");
const navLogo = document.getElementById("nav-logo");
const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const hamburgerLines = document.querySelectorAll("#hamburger span");

window.addEventListener("scroll", () => {
  const isMobile = window.innerWidth < 640;
  if (window.scrollY > 50) {
    navbar.classList.add("shadow-md");
    if (isMobile) {
      navLogo.classList.replace("h-10", "h-8");
    } else {
      navLogo.classList.replace("h-16", "h-12");
    }
  } else {
    navbar.classList.remove("shadow-md");
    if (isMobile) {
      navLogo.classList.replace("h-8", "h-10");
    } else {
      navLogo.classList.replace("h-12", "h-16");
    }
  }
});

let menuOpen = false;
menuBtn.addEventListener("click", () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle("hidden", !menuOpen);

  // Animasi hamburger -> X
  if (menuOpen) {
    hamburgerLines[0].style.transform = "rotate(45deg) translate(4px, 5px)";
    hamburgerLines[1].style.opacity = "0";
    hamburgerLines[2].style.transform = "rotate(-45deg) translate(4px, -5px)";
  } else {
    hamburgerLines[0].style.transform = "";
    hamburgerLines[1].style.opacity = "1";
    hamburgerLines[2].style.transform = "";
  }
});

// Tutup mobile menu saat link diklik
document.querySelectorAll(".mobile-link").forEach((link) => {
  link.addEventListener("click", () => {
    menuOpen = false;
    mobileMenu.classList.add("hidden");
    hamburgerLines[0].style.transform = "";
    hamburgerLines[1].style.opacity = "1";
    hamburgerLines[2].style.transform = "";
  });
});

// Klik logo atau Home: scroll mulus ke puncak tanpa tertutup navbar
document.addEventListener("click", (e) => {
  const target = e.target.closest('a[href="#hero"]');
  if (target) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ========================
// Active nav link on scroll
// ========================
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link");

const observerOptions = {
  rootMargin: "-40% 0px -55% 0px",
  threshold: 0,
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach((link) => {
        const href = link.getAttribute("href").replace("#", "");
        if (href === id) {
          link.classList.add("text-primary", "after:w-full");
          link.classList.remove("text-gray-600");
        } else {
          link.classList.remove("text-primary", "after:w-full");
          link.classList.add("text-gray-600");
        }
      });
    }
  });
}, observerOptions);

sections.forEach((section) => sectionObserver.observe(section));

// ========================
// !! GANTI NOMOR WA DI SINI !!
// Isi dengan nomor WhatsApp Anda (format internasional, tanpa + dan tanpa spasi)
// Contoh: "628113244321" untuk +62 811-3244-321
// ========================
const WA_NUMBER = "628113244321"; // <-- GANTI NOMOR WA ANDA DI SINI

// ========================
// Tombol WA per card Layanan
// ========================
document.querySelectorAll(".wa-service-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const service = btn.dataset.service;
    const text = `Halo IDS, saya ingin menanyakan informasi lebih lanjut mengenai layanan *${service}*.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, "_blank");
  });
});

// ========================
// Contact Form — kirim via WhatsApp
// ========================
const form = document.getElementById("contact-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !message) return;

  // Susun teks pesan WA
  const waText = [
    `Halo IDS, saya ingin menghubungi Anda.`,
    ``,
    `*Nama:* ${name}`,
    `*Email:* ${email}`,
    phone ? `*No. HP:* ${phone}` : null,
    ``,
    `*Pesan:*`,
    message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`;

  // Buka WhatsApp di tab baru
  window.open(waUrl, "_blank");

  form.reset();
});

// ========================
// Gallery — fetch from API + load more
// ========================
const GALLERY_API = "https://server.rijuna.id/api/public/pt-infra-digital-solusindo/photos";
const IMG_BASE = "https://server.rijuna.id";
const GALLERY_STEP = 6;

let galleryPhotos = [];
let galleryShown = 0;

function buildPhotoCard(photo) {
  const card = document.createElement("div");
  card.className =
    "group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-300 opacity-0 translate-y-5";
  card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  card.innerHTML = `
    <img src="${IMG_BASE}${photo.url}" alt="${photo.title}"
      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      loading="lazy" />
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
      <span class="text-white font-bold text-lg tracking-wide">${photo.title}</span>
    </div>`;
  return card;
}

function renderNextBatch() {
  const grid = document.getElementById("gallery-grid");
  const btnWrap = document.getElementById("gallery-btn-wrap");
  const batch = galleryPhotos.slice(galleryShown, galleryShown + GALLERY_STEP);

  batch.forEach((p, i) => {
    const card = buildPhotoCard(p);
    grid.appendChild(card);
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, i * 60);
  });

  galleryShown += batch.length;

  if (galleryShown >= galleryPhotos.length) {
    btnWrap.classList.add("hidden");
  } else {
    btnWrap.classList.remove("hidden");
  }
}

async function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  // Jika CMS sudah merender foto sendiri, jangan timpa
  if (grid.querySelectorAll("img").length > 0) {
    return;
  }

  try {
    const res = await fetch(GALLERY_API);
    const json = await res.json();
    galleryPhotos = json.data || [];

    if (galleryPhotos.length > 0) {
      grid.innerHTML = "";
      renderNextBatch();
    }
  } catch {
    // Biarkan fallback dari CMS atau tampilkan pesan jika benar-benar kosong
    if (grid.querySelectorAll("img").length === 0) {
      grid.innerHTML = `<p class="col-span-3 text-center text-gray-400 py-10">Gagal memuat galeri eksternal.</p>`;
    }
  }
}

// Beri jeda kecil agar CMS Engine render terlebih dahulu jika ada data lokal
setTimeout(loadGallery, 300);

const loadMoreBtn = document.getElementById("gallery-load-more");
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", renderNextBatch);
}

// ========================
// Scroll reveal animation (sederhana)
// ========================
const revealElements = document.querySelectorAll(
  "section > div, .grid > div, .grid > a"
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

revealElements.forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
  revealObserver.observe(el);
});
