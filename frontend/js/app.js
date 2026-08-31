const SIDEBAR_LOGO = '<img src="../Batangas_State_Logo.png" alt="Batangas State University logo">';

const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  analytics: '<svg viewBox="0 0 24 24"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V8"/></svg>',
  newTrack: '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  track: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V6"/><path d="M8 10l4-4 4 4"/><path d="M4 18h16"/></svg>',
  accounts: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.2"/><path d="M16.5 19c.4-1.8 1.8-3.2 3.5-3.8"/></svg>',
  funds: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14" r="1.5"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
};

const NAV_BY_ROLE = {
  requesting: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'fund-allocation.html', label: 'Fund Allocation', icon: 'funds' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'new-track.html', label: 'New Track', icon: 'newTrack' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'upload.html', label: 'Upload Documents', icon: 'upload' },
  ],
  budget: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'fund-allocation.html', label: 'Fund Allocation', icon: 'funds' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
  ],
  procurement: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'fund-allocation.html', label: 'Fund Allocation', icon: 'funds' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'manage-accounts.html', label: 'Account Management', icon: 'accounts' },
  ],
  accounting: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'fund-allocation.html', label: 'Fund Allocation', icon: 'funds' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'upload.html', label: 'Upload Documents', icon: 'upload' },
  ],
  cashier: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'fund-allocation.html', label: 'Fund Allocation', icon: 'funds' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
  ],
};

function displayUsername(username) {
  return String(username || '').replace(/_user$/i, '');
}

function initAppLayout(session) {
  document.body.classList.add('app-layout');

  let sidebar = document.querySelector('.app-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="sidebar-logo">${SIDEBAR_LOGO}</div>
        <div class="sidebar-brand-text">
          <span class="sidebar-app-name">PROCUREMENT</span>
          <span class="sidebar-app-full">Monitoring System</span>
        </div>
      </div>
      <div class="sidebar-office">
        <span class="sidebar-office-label">Office</span>
        <strong class="sidebar-office-name" id="roleBadge">—</strong>
        <span class="sidebar-user-name" id="userBadge"></span>
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
        (el) =>
          el !== sidebar &&
          el.tagName !== 'SCRIPT' &&
          el.tagName !== 'DIALOG' &&
          !el.classList.contains('modal-overlay')
      );
      toMove.forEach((el) => mainWrap.appendChild(el));
      document.body.appendChild(mainWrap);
    }
  } else if (!document.getElementById('mainNav')) {
    sidebar.insertAdjacentHTML(
      'beforeend',
      '<nav class="sidebar-nav" id="mainNav" aria-label="Main navigation"></nav>'
    );
  }

  renderHeader(session.role_label, displayUsername(session.username));
  buildNav(session);
  initTopNavbar(session);
}

const PAGE_TITLES = {
  'dashboard.html': 'Dashboard',
  'fund-allocation.html': 'Fund Allocation',
  'analytics.html': 'System Analytics',
  'new-track.html': 'New Track',
  'track.html': 'Track Request',
  'upload.html': 'Upload Documents',
  'details.html': 'Request Details',
  'manage-accounts.html': 'Account Management',
  'create-account.html': 'Account Management',
};

function initTopNavbar(session) {
  const mainWrap = document.querySelector('.app-main');
  if (!mainWrap) return;

  let navbar = mainWrap.querySelector('.top-navbar');
  if (!navbar) {
    const username = displayUsername(session?.username);
    const initial = (username || 'U').slice(0, 1).toUpperCase();
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
      <div class="top-navbar-actions">
        <button type="button" class="icon-btn" id="notifBtn" aria-label="Notifications" title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
        </button>
        <div class="user-menu-wrap">
          <button type="button" class="user-chip" id="userMenuBtn" aria-haspopup="true" aria-expanded="false">
            <span class="user-avatar">${initial}</span>
            <span class="user-chip-meta">
              <span class="user-chip-name">${username}</span>
              <span class="user-chip-office">${session?.role_label || ''}</span>
            </span>
          </button>
          <div class="user-menu hidden" id="userMenu">
            <a href="#" data-logout="1">Logout</a>
          </div>
        </div>
      </div>
    `;
    mainWrap.insertBefore(navbar, mainWrap.firstChild);
    bindGlobalSearch();
    bindUserMenu();
  }

  setTopNavbarTitle();
}

function bindUserMenu() {
  const btn = document.getElementById('userMenuBtn');
  const menu = document.getElementById('userMenu');
  if (!btn || !menu || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  document.addEventListener('click', () => {
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  });

  menu.querySelector('[data-logout]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await Api.logout();
    window.location.href = 'login.html';
  });
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

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  const aliases = {
    'requesting office': 'requesting',
    'budget office': 'budget',
    'procurement office': 'procurement',
    'accounting office': 'accounting',
  };
  return aliases[r] || r;
}

function getNavLinksForRole(role) {
  const office = normalizeRole(role);
  return NAV_BY_ROLE[office] || NAV_BY_ROLE.budget;
}

function buildNav(session) {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  const role = typeof session === 'string' ? session : session?.role;
  const current = window.location.pathname.split('/').pop() || 'dashboard.html';
  const links = getNavLinksForRole(role);

  nav.innerHTML =
    links
      .map((l) => {
        const active =
          l.href === current ||
          (l.href === 'manage-accounts.html' && current === 'create-account.html')
            ? ' active'
            : '';
        const icon = ICONS[l.icon] || '';
        return `<a href="${l.href}" class="sidebar-link${active}">${icon}<span>${l.label}</span></a>`;
      })
      .join('') +
    `<div class="sidebar-nav-footer">` +
    (normalizeRole(role) === 'requesting'
      ? `<div class="sidebar-cta"><a href="new-track.html" class="btn btn-primary">New Request</a></div>`
      : '') +
    `<a href="#" class="sidebar-link sidebar-link-logout" data-logout="1">${ICONS.logout}<span>Logout</span></a>` +
    `</div>`;

  nav.querySelector('[data-logout]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await Api.logout();
    window.location.href = 'login.html';
  });
}
