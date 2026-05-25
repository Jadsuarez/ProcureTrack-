const SIDEBAR_LOGO = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="10" fill="currentColor" fill-opacity="0.15"/>
  <path d="M12 14h16v2H12v-2zm0 5h16v2H12v-2zm0 5h10v2H12v-2z" fill="currentColor"/>
  <path d="M26 26l4 4 2-2-4-4-2 2z" fill="currentColor" fill-opacity="0.85"/>
</svg>`;

function initAppLayout(session) {
  document.body.classList.add('app-layout');

  let sidebar = document.querySelector('.app-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="sidebar-logo" aria-hidden="true">${SIDEBAR_LOGO}</div>
        <div class="sidebar-brand-text">
          <span class="sidebar-app-name">PMS</span>
          <span class="sidebar-app-full">Procurement Monitoring</span>
        </div>
      </div>
      <div class="sidebar-office">
        <span class="sidebar-office-label">Office</span>
        <strong class="sidebar-office-name" id="roleBadge">—</strong>
      </div>
      <nav class="sidebar-nav" id="mainNav" aria-label="Main navigation"></nav>
    `;
    document.body.insertBefore(sidebar, document.body.firstChild);

    const header = document.querySelector('.app-header');
    if (header) header.remove();

    let mainWrap = document.querySelector('.app-main');
    if (!mainWrap) {
      mainWrap = document.createElement('div');
      mainWrap.className = 'app-main';
      const toMove = [...document.body.children].filter(
        (el) => el !== sidebar && el.tagName !== 'SCRIPT'
      );
      toMove.forEach((el) => mainWrap.appendChild(el));
      document.body.appendChild(mainWrap);
    }
  }

  renderHeader(session.role_label);
  buildNav(session.role);
  initTopNavbar();
}

const PAGE_TITLES = {
  'dashboard.html': 'Dashboard',
  'analytics.html': 'Analytics',
  'new-track.html': 'New Track',
  'track.html': 'Track Request',
  'upload.html': 'Upload Documents',
  'details.html': 'Request Details',
};

function initTopNavbar() {
  const mainWrap = document.querySelector('.app-main');
  if (!mainWrap) return;

  let navbar = mainWrap.querySelector('.top-navbar');
  if (!navbar) {
    navbar = document.createElement('header');
    navbar.className = 'top-navbar';
    navbar.innerHTML = `
      <div class="top-navbar-left">
        <h1 class="top-navbar-title" id="pageTitle">Dashboard</h1>
      </div>
      <form class="top-navbar-search" id="globalSearchForm" role="search">
        <input
          type="search"
          id="globalSearchInput"
          placeholder="Search tracking ID…"
          autocomplete="off"
          aria-label="Search tracking ID"
        >
        <button type="submit" class="btn btn-primary btn-sm top-navbar-search-btn" aria-label="Search">
          Search
        </button>
      </form>
    `;
    mainWrap.insertBefore(navbar, mainWrap.firstChild);
    bindGlobalSearch();
  }

  setTopNavbarTitle();
}

function setTopNavbarTitle() {
  const el = document.getElementById('pageTitle');
  if (!el) return;

  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('tracking');

  if (page === 'details.html' && tracking) {
    el.textContent = tracking;
    return;
  }

  el.textContent = PAGE_TITLES[page] || 'Procurement Monitoring';
}

function bindGlobalSearch() {
  const form = document.getElementById('globalSearchForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('globalSearchInput')?.value.trim();
    if (!q) return;
    window.location.href = `details.html?tracking=${encodeURIComponent(q)}`;
  });

  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('tracking');
  const input = document.getElementById('globalSearchInput');
  if (input && tracking) {
    input.value = tracking;
  }
}

function buildNav(role) {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  const current = window.location.pathname.split('/').pop() || 'dashboard.html';

  const links = [];

  if (role === 'requesting') {
    links.push(
      { href: 'dashboard.html', label: 'Dashboard' },
      { href: 'analytics.html', label: 'Analytics' },
      { href: 'new-track.html', label: 'New Track' },
      { href: 'track.html', label: 'Track Request' },
      { href: 'upload.html', label: 'Upload Documents' }
    );
  } else if (role === 'accounting') {
    links.push(
      { href: 'dashboard.html', label: 'Dashboard' },
      { href: 'analytics.html', label: 'Analytics' },
      { href: 'track.html', label: 'Track Request' },
      { href: 'upload.html', label: 'Upload Documents' }
    );
  } else {
    links.push(
      { href: 'dashboard.html', label: 'Dashboard' },
      { href: 'analytics.html', label: 'Analytics' },
      { href: 'track.html', label: 'Track Request' }
    );
  }

  links.push({ href: '#', label: 'Logout', logout: true });

  nav.innerHTML = links
    .map((l) => {
      const active = l.href === current ? ' active' : '';
      const extra = l.logout ? ' sidebar-link-logout' : '';
      if (l.logout) {
        return `<a href="${l.href}" class="sidebar-link${extra}" data-logout="1">${l.label}</a>`;
      }
      return `<a href="${l.href}" class="sidebar-link${active}${extra}">${l.label}</a>`;
    })
    .join('');

  nav.querySelector('[data-logout]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await Api.logout();
    window.location.href = 'login.html';
  });
}
