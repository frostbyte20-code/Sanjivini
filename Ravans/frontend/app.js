/**
 * MedFind – app.js
 * Frontend JavaScript for Medicine Locator
 * Connects to backend at http://localhost:5000
 */

// ── Config ──────────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';
let authToken = localStorage.getItem('medfind_token') || null;
let currentUser = JSON.parse(localStorage.getItem('medfind_user') || 'null');

// ── State ────────────────────────────────────────────────────
const state = {
  searchMed: '',
  searchLat: null,
  searchLng: null,
  searchRadius: 10,
  searchResults: [],
  currentPage: 1,
  totalPages: 1,
  allPharmacies: [],
};

// ── DOM Helpers ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');

// ── API Helper ───────────────────────────────────────────────
async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

// ── Toast ────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = 'success') {
  const toast = $('toast');
  const icon  = $('toast-icon');
  $('toast-msg').textContent = msg;
  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => hide(toast), 3500);
}

// ── Navbar Scroll Effect ─────────────────────────────────────
window.addEventListener('scroll', () => {
  const navbar = $('navbar');
  if (window.scrollY > 20) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
}, { passive: true });

// ── View Navigation ──────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const view = $(`view-${name}`);
  if (view) { view.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const navLink = document.querySelector(`.nav-link[data-view="${name}"]`);
  if (navLink) navLink.classList.add('active');
  if (name === 'pharmacies') loadAllPharmacies();
  closeMenu();
}

// Nav links
document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showView(el.dataset.view);
  });
});

// Hamburger
const hamburger = $('hamburger');
const mobileMenu = $('mobile-menu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
function closeMenu() { mobileMenu.classList.remove('open'); }

// ── Auth State ────────────────────────────────────────────────
function updateAuthUI() {
  const navAuth = $('nav-auth');
  const navUser = $('nav-user');
  if (currentUser) {
    hide(navAuth);
    show(navUser);
    $('user-initials').textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
  } else {
    show(navAuth);
    hide(navUser);
  }
}
updateAuthUI();

// ── Login Modal ───────────────────────────────────────────────
function openLoginModal() {
  show($('modal-login'));
  $('login-email').focus();
}
function closeLoginModal() { hide($('modal-login')); }

$('btn-login').addEventListener('click', openLoginModal);
$('mobile-login').addEventListener('click', () => { closeMenu(); openLoginModal(); });
$('close-login').addEventListener('click', closeLoginModal);
$('modal-login').addEventListener('click', (e) => { if (e.target === $('modal-login')) closeLoginModal(); });

$('toggle-login-pw').addEventListener('click', () => {
  const inp = $('login-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

$('switch-to-register').addEventListener('click', (e) => {
  e.preventDefault();
  closeLoginModal();
  openRegisterModal();
});

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = $('login-email').value.trim();
  const password = $('login-password').value;
  let valid = true;

  $('login-email-err').textContent = '';
  $('login-password-err').textContent = '';
  hide($('login-global-err'));

  if (!email)    { $('login-email-err').textContent = 'Email is required'; valid = false; }
  if (!password) { $('login-password-err').textContent = 'Password is required'; valid = false; }
  if (!valid) return;

  const btn = $('login-submit-btn');
  btn.querySelector('span').textContent = 'Signing in...';
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    authToken   = res.data?.token || res.token;
    currentUser = res.data?.user  || res.user;
    localStorage.setItem('medfind_token', authToken);
    localStorage.setItem('medfind_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeLoginModal();
    showToast(`Welcome back, ${currentUser?.name || 'User'}! 👋`);
    $('login-form').reset();
  } catch (err) {
    const errEl = $('login-global-err');
    errEl.textContent = err.message || 'Login failed. Please try again.';
    show(errEl);
  } finally {
    btn.querySelector('span').textContent = 'Sign In';
    btn.querySelector('.btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
});

// ── Register Modal ────────────────────────────────────────────
function openRegisterModal() {
  show($('modal-register'));
  $('reg-name').focus();
}
function closeRegisterModal() { hide($('modal-register')); }

$('btn-register').addEventListener('click', openRegisterModal);
$('mobile-register').addEventListener('click', () => { closeMenu(); openRegisterModal(); });
$('close-register').addEventListener('click', closeRegisterModal);
$('modal-register').addEventListener('click', (e) => { if (e.target === $('modal-register')) closeRegisterModal(); });

$('toggle-reg-pw').addEventListener('click', () => {
  const inp = $('reg-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

$('switch-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  closeRegisterModal();
  openLoginModal();
});

$('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name     = $('reg-name').value.trim();
  const email    = $('reg-email').value.trim();
  const password = $('reg-password').value;
  let valid = true;

  $('reg-name-err').textContent = '';
  $('reg-email-err').textContent = '';
  $('reg-password-err').textContent = '';
  hide($('reg-global-err'));

  if (!name)               { $('reg-name-err').textContent = 'Name is required'; valid = false; }
  if (!email)              { $('reg-email-err').textContent = 'Email is required'; valid = false; }
  if (password.length < 6) { $('reg-password-err').textContent = 'Min 6 characters'; valid = false; }
  if (!valid) return;

  const btn = $('reg-submit-btn');
  btn.querySelector('span').textContent = 'Creating...';
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    authToken   = res.data?.token || res.token;
    currentUser = res.data?.user  || res.user;
    localStorage.setItem('medfind_token', authToken);
    localStorage.setItem('medfind_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeRegisterModal();
    showToast(`Account created! Welcome, ${currentUser?.name || 'User'}! 🎉`);
    $('register-form').reset();
  } catch (err) {
    const errEl = $('reg-global-err');
    errEl.textContent = err.message || 'Registration failed.';
    show(errEl);
  } finally {
    btn.querySelector('span').textContent = 'Create Account';
    btn.querySelector('.btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
});

// Logout
$('btn-logout').addEventListener('click', () => {
  authToken   = null;
  currentUser = null;
  localStorage.removeItem('medfind_token');
  localStorage.removeItem('medfind_user');
  updateAuthUI();
  showToast('Logged out successfully', 'success');
});

// ── Hero Search Autocomplete ──────────────────────────────────
let heroDebounce;
const heroInput    = $('hero-search-input');
const heroDropdown = $('hero-dropdown');
const heroDropList = $('hero-dropdown-list');
const heroLoader   = $('hero-dropdown-loader');
const heroEmpty    = $('hero-dropdown-empty');

heroInput.addEventListener('input', () => {
  const q = heroInput.value.trim();
  clearTimeout(heroDebounce);
  if (!q) { hide(heroDropdown); return; }
  show(heroDropdown);
  hide(heroEmpty);
  show(heroLoader);
  heroDropList.innerHTML = '';
  heroDebounce = setTimeout(() => searchMedicinesHero(q), 300);
});

heroInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    hide(heroDropdown);
    triggerMainSearch(heroInput.value.trim());
  }
  if (e.key === 'Escape') hide(heroDropdown);
});

document.addEventListener('click', (e) => {
  if (!$('hero-search-box').contains(e.target)) hide(heroDropdown);
});

async function searchMedicinesHero(q) {
  try {
    const res = await apiRequest(`/medicines/search?q=${encodeURIComponent(q)}&limit=6`);
    const meds = res.data?.medicines || res.data || [];
    hide(heroLoader);
    if (!meds.length) { show(heroEmpty); return; }
    heroDropList.innerHTML = meds.map(m => `
      <li data-name="${m.name}" data-id="${m._id}">
        <span class="med-name">${m.name}</span>
        <span class="med-meta">${[m.genericName, m.category].filter(Boolean).join(' · ') || 'Medicine'}</span>
      </li>
    `).join('');
    heroDropList.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        heroInput.value = li.dataset.name;
        hide(heroDropdown);
        triggerMainSearch(li.dataset.name);
      });
    });
  } catch {
    hide(heroLoader);
  }
}

function triggerMainSearch(medName) {
  if (!medName) return;
  $('med-search-input').value = medName;
  state.searchMed = medName;
  showView('search');
}

$('hero-search-btn').addEventListener('click', () => {
  hide(heroDropdown);
  triggerMainSearch(heroInput.value.trim());
});

// Popular tags
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', () => triggerMainSearch(tag.dataset.med));
});

// ── Stats Counter Animation ───────────────────────────────────
function animateCounters() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

// Trigger counter when stats bar is visible
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounters(); statsObserver.disconnect(); } });
}, { threshold: 0.3 });
const statsBar = document.querySelector('.stats-bar');
if (statsBar) statsObserver.observe(statsBar);

// ── Search View: Medicine Autocomplete ────────────────────────
let medDebounce;
const medInput      = $('med-search-input');
const medAutocomplete = $('med-autocomplete');
const medAutoList   = $('med-autocomplete-list');

medInput.addEventListener('input', () => {
  const q = medInput.value.trim();
  const clearBtn = $('med-clear-btn');
  if (q) show(clearBtn); else hide(clearBtn);
  clearTimeout(medDebounce);
  if (!q) { hide(medAutocomplete); return; }
  medDebounce = setTimeout(() => loadMedAutocomplete(q), 300);
});

$('med-clear-btn').addEventListener('click', () => {
  medInput.value = '';
  hide(medAutocomplete);
  hide($('med-clear-btn'));
});

document.addEventListener('click', (e) => {
  if (!medInput.parentElement.contains(e.target)) hide(medAutocomplete);
});

async function loadMedAutocomplete(q) {
  try {
    const res = await apiRequest(`/medicines/search?q=${encodeURIComponent(q)}&limit=7`);
    const meds = res.data?.medicines || res.data || [];
    if (!meds.length) { hide(medAutocomplete); return; }
    medAutoList.innerHTML = meds.map(m => `
      <li data-name="${m.name}">${m.name}${m.genericName ? ` <small style="color:var(--text-muted)">(${m.genericName})</small>` : ''}</li>
    `).join('');
    show(medAutocomplete);
    medAutoList.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        medInput.value = li.dataset.name;
        state.searchMed = li.dataset.name;
        hide(medAutocomplete);
      });
    });
  } catch {
    hide(medAutocomplete);
  }
}

// ── Location Detection ────────────────────────────────────────
$('btn-locate').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser', 'error');
    return;
  }
  const btn = $('btn-locate');
  btn.textContent = 'Detecting...';
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.searchLat = pos.coords.latitude;
      state.searchLng = pos.coords.longitude;
      $('lat-input').value = pos.coords.latitude.toFixed(6);
      $('lng-input').value = pos.coords.longitude.toFixed(6);
      const locStatus = $('loc-status');
      $('loc-status-text').textContent = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      show(locStatus);
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        Location Detected ✓
      `;
      btn.disabled = false;
      btn.style.color = 'var(--emerald)';
      btn.style.borderColor = 'var(--emerald)';
      showToast('Location detected successfully!');
    },
    (err) => {
      btn.textContent = 'Use My Location';
      btn.disabled = false;
      showToast('Could not detect location. Enter manually.', 'error');
    }
  );
});

// Radius slider
const radiusSlider = $('radius-slider');
const radiusVal    = $('radius-val');
radiusSlider.addEventListener('input', () => {
  const val = radiusSlider.value;
  radiusVal.textContent = val;
  state.searchRadius = parseInt(val, 10);
  const pct = ((val - 1) / (50 - 1)) * 100;
  radiusSlider.style.setProperty('--prog', `${pct}%`);
});

// Lat/lng manual inputs
$('lat-input').addEventListener('change', () => { state.searchLat = parseFloat($('lat-input').value); });
$('lng-input').addEventListener('change', () => { state.searchLng = parseFloat($('lng-input').value); });

// ── Find Nearby ───────────────────────────────────────────────
$('btn-find-nearby').addEventListener('click', findNearby);

async function findNearby(page = 1) {
  const medName = medInput.value.trim() || state.searchMed;
  const lat = state.searchLat || parseFloat($('lat-input').value);
  const lng = state.searchLng || parseFloat($('lng-input').value);
  const radius = state.searchRadius;

  if (!medName) { showToast('Please enter a medicine name', 'error'); medInput.focus(); return; }
  if (!lat || !lng) { showToast('Please set your location', 'error'); return; }

  state.searchMed = medName;
  state.currentPage = page;

  hide($('results-empty'));
  hide($('results-list'));
  hide($('results-error'));
  show($('results-loading'));

  try {
    const qs = new URLSearchParams({
      medicine: medName, lat, lng,
      radius: radius * 1000, // convert to meters
      page, limit: 8
    });
    const res = await apiRequest(`/pharmacies/nearby?${qs}`);
    const pharmacies = res.data?.pharmacies || res.data || [];
    const total      = res.data?.total || pharmacies.length;
    const pages      = res.data?.pages || 1;

    state.searchResults = pharmacies;
    state.totalPages    = pages;

    hide($('results-loading'));
    show($('results-list'));

    $('results-title').textContent = `Pharmacies with "${medName}"`;
    $('results-subtitle').textContent = `${total} found within ${radius} km`;

    renderPharmacyCards(pharmacies);

    // Pagination
    const pagination = $('pagination');
    if (pages > 1) {
      show(pagination);
      $('page-info').textContent = `Page ${page} of ${pages}`;
      $('prev-page').disabled = page === 1;
      $('next-page').disabled = page === pages;
    } else {
      hide(pagination);
    }
  } catch (err) {
    hide($('results-loading'));
    show($('results-error'));
    $('results-error-title').textContent = 'Search Failed';
    $('results-error-msg').textContent = err.message || 'Something went wrong. Is the backend running?';
  }
}

$('prev-page').addEventListener('click', () => findNearby(state.currentPage - 1));
$('next-page').addEventListener('click', () => findNearby(state.currentPage + 1));

$('sort-select').addEventListener('change', () => {
  const sorted = [...state.searchResults];
  if ($('sort-select').value === 'stock') {
    sorted.sort((a, b) => {
      const ai = a.hasStock !== undefined ? (a.hasStock ? 0 : 1) : 0;
      const bi = b.hasStock !== undefined ? (b.hasStock ? 0 : 1) : 0;
      return ai - bi;
    });
  } else {
    sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }
  renderPharmacyCards(sorted);
});

function renderPharmacyCards(pharmacies) {
  const container = $('pharmacy-cards');
  if (!pharmacies.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px;color:var(--text-secondary)">
        <div style="font-size:2.5rem;margin-bottom:12px">🏥</div>
        <p>No pharmacies found with this medicine nearby.<br>Try increasing the radius.</p>
      </div>`;
    return;
  }
  container.innerHTML = pharmacies.map(p => {
    const dist = p.distance !== undefined ? (p.distance / 1000).toFixed(1) : 'N/A';
    const inStock = p.hasStock !== false;
    return `
    <div class="pharmacy-card" data-id="${p._id}" role="button" tabindex="0">
      <div class="pc-left">
        <div class="pc-name">${p.name}</div>
        <div class="pc-address">${p.address}, ${p.city}, ${p.state} – ${p.pincode}</div>
        <div class="pc-meta">
          ${p.phone ? `<span class="pc-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.35a16 16 0 006.72 6.72l1.59-1.59a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>${p.phone}</span>` : ''}
          ${p.openingHours ? `<span class="pc-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${p.openingHours}</span>` : ''}
        </div>
      </div>
      <div class="pc-right">
        <div class="pc-distance">${dist}<span> km</span></div>
        <div class="stock-badge ${inStock ? 'in-stock' : 'out-stock'}">
          ${inStock ? '✓ In Stock' : '✗ Out of Stock'}
        </div>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.pharmacy-card').forEach(card => {
    card.addEventListener('click', () => openPharmacyDetail(card.dataset.id));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPharmacyDetail(card.dataset.id); });
  });
}

// ── Pharmacy Detail Modal ─────────────────────────────────────
async function openPharmacyDetail(id) {
  show($('modal-pharmacy'));
  const content = $('pharmacy-detail-content');
  content.innerHTML = `<div class="detail-loading"><div class="loader-spinner"></div></div>`;

  try {
    const [phRes, stockRes] = await Promise.all([
      apiRequest(`/pharmacies/${id}`),
      apiRequest(`/pharmacies/${id}/stock`).catch(() => ({ data: [] }))
    ]);
    const ph    = phRes.data?.pharmacy || phRes.data || {};
    const stock = stockRes.data?.stock || stockRes.data || [];

    content.innerHTML = `
      <div class="pharmacy-detail">
        <h2>${ph.name || 'Pharmacy'}</h2>
        <div class="detail-city">${ph.city || ''}, ${ph.state || ''}</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <span class="di-label">Address</span>
            <span class="di-value">${ph.address || '—'}</span>
          </div>
          <div class="detail-info-item">
            <span class="di-label">Pincode</span>
            <span class="di-value">${ph.pincode || '—'}</span>
          </div>
          <div class="detail-info-item">
            <span class="di-label">Phone</span>
            <span class="di-value">${ph.phone || '—'}</span>
          </div>
          <div class="detail-info-item">
            <span class="di-label">Email</span>
            <span class="di-value">${ph.email || '—'}</span>
          </div>
          <div class="detail-info-item">
            <span class="di-label">Opening Hours</span>
            <span class="di-value">${ph.openingHours || '—'}</span>
          </div>
        </div>
        <div class="detail-stock-section">
          <h3>Current Stock (${stock.length} items)</h3>
          ${stock.length ? `
            <div class="detail-stock-list">
              ${stock.map(s => `
                <div class="detail-stock-item">
                  <span class="si-name">${s.medicine?.name || s.medicineName || '—'}</span>
                  <span class="si-qty">Qty: ${s.quantity ?? '?'}</span>
                  <div class="stock-badge ${s.available && s.quantity > 0 ? 'in-stock' : 'out-stock'}">
                    ${s.available && s.quantity > 0 ? '✓ Available' : '✗ Unavailable'}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color:var(--text-muted);font-size:0.88rem">No stock data available.</p>'}
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `
      <div style="text-align:center;padding:40px">
        <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
        <h3 style="margin-bottom:8px">Could not load details</h3>
        <p style="color:var(--text-secondary);font-size:0.88rem">${err.message}</p>
      </div>`;
  }
}

$('close-pharmacy').addEventListener('click', () => hide($('modal-pharmacy')));
$('modal-pharmacy').addEventListener('click', (e) => { if (e.target === $('modal-pharmacy')) hide($('modal-pharmacy')); });

// ── Pharmacies View ───────────────────────────────────────────
let allPharmaciesLoaded = false;

async function loadAllPharmacies() {
  if (allPharmaciesLoaded) return;
  const grid    = $('ph-grid');
  const loading = $('ph-loading');
  const empty   = $('ph-empty');

  show(loading);
  hide(empty);
  grid.innerHTML = '';

  try {
    // Fetch a few pages or use a general endpoint
    const res = await apiRequest('/medicines/search?q=a&limit=1').catch(() => null);
    // The backend doesn't have a "get all pharmacies" endpoint directly listed
    // We'll attempt to use the nearby endpoint with a broad search, or show a message
    // Actually, we'll try /pharmacies with a helper fetch
    const phRes = await fetch(`${API_BASE}/pharmacies/nearby?medicine=a&lat=20.5937&lng=78.9629&radius=5000000`).then(r => r.json()).catch(() => null);
    const pharmacies = phRes?.data?.pharmacies || phRes?.data || [];

    state.allPharmacies = pharmacies;
    allPharmaciesLoaded = true;
    hide(loading);

    if (!pharmacies.length) {
      show(empty);
      $('ph-empty').innerHTML = `
        <div style="font-size:3rem;margin-bottom:12px">🏥</div>
        <p>No pharmacies data available yet.<br><small style="color:var(--text-muted)">Make sure your backend is running and has been seeded with <code>npm run seed</code></small></p>`;
      return;
    }
    renderPharmaciesGrid(pharmacies);
  } catch (err) {
    hide(loading);
    show(empty);
    $('ph-empty').innerHTML = `
      <div style="font-size:3rem;margin-bottom:12px">🔌</div>
      <p style="color:var(--text-secondary)">Could not connect to backend.<br><small style="color:var(--text-muted)">Make sure the server is running on port 5000.</small></p>`;
  }
}

function renderPharmaciesGrid(pharmacies) {
  const grid = $('ph-grid');
  grid.innerHTML = pharmacies.map(p => `
    <div class="ph-card" data-id="${p._id}" role="button" tabindex="0">
      <div class="ph-card-header">
        <span class="ph-card-name">${p.name}</span>
        <span class="ph-card-city">${p.city}</span>
      </div>
      <div class="ph-card-address">${p.address}, ${p.state} – ${p.pincode}</div>
      <div class="ph-card-footer">
        <span class="ph-card-phone">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.35a16 16 0 006.72 6.72l1.59-1.59a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          ${p.phone}
        </span>
        ${p.openingHours ? `<span class="ph-card-hours">${p.openingHours}</span>` : ''}
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.ph-card').forEach(card => {
    card.addEventListener('click', () => openPharmacyDetail(card.dataset.id));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPharmacyDetail(card.dataset.id); });
  });
}

// Pharmacy filter
$('ph-filter-input').addEventListener('input', () => {
  const q = $('ph-filter-input').value.toLowerCase();
  const filtered = state.allPharmacies.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.city?.toLowerCase().includes(q) ||
    p.address?.toLowerCase().includes(q)
  );
  renderPharmaciesGrid(filtered);
});

// ── Hero logo link → home ─────────────────────────────────────
$('logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  showView('home');
});

// ── Keyboard: close modals with Escape ────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hide($('modal-login'));
    hide($('modal-register'));
    hide($('modal-pharmacy'));
    hide($('hero-dropdown'));
    hide(medAutocomplete);
  }
});

// ── Initial Radius Slider Setup ───────────────────────────────
(function() {
  const pct = ((radiusSlider.value - 1) / (50 - 1)) * 100;
  radiusSlider.style.setProperty('--prog', `${pct}%`);
})();
