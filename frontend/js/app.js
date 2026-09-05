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
        <div class="notif-wrap">
          <button type="button" class="icon-btn" id="notifBtn" aria-label="Notifications" title="Notifications" aria-haspopup="true" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
            <span class="notif-badge hidden" id="notifBadge">0</span>
          </button>
          <div class="notif-menu hidden" id="notifMenu">
            <div class="notif-menu-header">
              <span>Notifications</span>
              <button type="button" class="notif-clear-btn" id="clearNotifBtn">Clear</button>
            </div>
            <ul class="notif-menu-list" id="notifMenuList">
              <li class="text-muted">Loading…</li>
            </ul>
          </div>
        </div>
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
    bindNotifMenu(session);
  } else {
    bindNotifMenu(session);
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
    closeNotifMenu();
    const open = menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  document.addEventListener('click', () => {
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
    closeNotifMenu();
  });

  menu.querySelector('[data-logout]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await Api.logout();
    window.location.href = 'login.html';
  });
}

function notifStorageKey(kind = 'seen') {
  const user = window.__notifUserKey || 'anon';
  return kind === 'cleared' ? `notifClearedId:${user}` : `notifSeenId:${user}`;
}

function getStoredNotifId(kind) {
  const n = Number(localStorage.getItem(notifStorageKey(kind)) || '0');
  return Number.isFinite(n) ? n : 0;
}

function setStoredNotifId(kind, id) {
  const current = getStoredNotifId(kind);
  if (id > current) {
    localStorage.setItem(notifStorageKey(kind), String(id));
  }
}

function getSeenNotifId() {
  return getStoredNotifId('seen');
}

function setSeenNotifId(id) {
  setStoredNotifId('seen', id);
}

function getClearedNotifId() {
  return getStoredNotifId('cleared');
}

function setClearedNotifId(id) {
  setStoredNotifId('cleared', id);
  setSeenNotifId(id);
}

function closeNotifMenu() {
  const menu = document.getElementById('notifMenu');
  const btn = document.getElementById('notifBtn');
  menu?.classList.add('hidden');
  btn?.setAttribute('aria-expanded', 'false');
}

function renderNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function loadNavbarNotifications() {
  const list = document.getElementById('notifMenuList');
  const menu = document.getElementById('notifMenu');
  if (!list || typeof Api.notifications !== 'function') return [];

  try {
    const data = await Api.notifications();
    if (!data.success) {
      list.innerHTML = '<li class="text-muted">Unable to load notifications.</li>';
      return [];
    }

    const allItems = data.notifications || [];
    const clearedId = getClearedNotifId();
    const items = allItems.filter((n) => Number(n.id) > clearedId);
    const seenId = Math.max(getSeenNotifId(), clearedId);
    const unread = items.filter((n) => Number(n.id) > seenId).length;
    renderNotifBadge(unread);

    const latestSource = allItems.length ? allItems : items;
    if (menu && latestSource.length) {
      menu.dataset.latestId = String(Math.max(...latestSource.map((n) => Number(n.id) || 0)));
    }

    const clearBtn = document.getElementById('clearNotifBtn');
    if (clearBtn) clearBtn.disabled = items.length === 0;

    if (!items.length) {
      list.innerHTML = '<li class="text-muted">No notifications.</li>';
      return items;
    }

    list.innerHTML = items
      .map((n) => {
        const unreadClass = Number(n.id) > seenId ? ' unread' : '';
        return `<li class="notif-item${unreadClass}">
          <a ${n.can_view === false ? 'aria-disabled="true"' : `href="details.html?tracking=${encodeURIComponent(n.tracking_number)}"`}>
            <strong>${n.tracking_number}</strong>
            <span>${n.message}</span>
            <span class="meta">${formatDate(n.created_at)}</span>
          </a>
        </li>`;
      })
      .join('');
    return items;
  } catch (err) {
    list.innerHTML = '<li class="text-muted">Unable to load notifications.</li>';
    return [];
  }
}

function bindNotifMenu(session) {
  const btn = document.getElementById('notifBtn');
  const menu = document.getElementById('notifMenu');
  if (!btn || !menu) return;

  if (session?.username) {
    window.__notifUserKey = session.username;
  }

  loadNavbarNotifications();

  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  document.getElementById('clearNotifBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const latest = Number(menu.dataset.latestId || '0');
    if (latest) setClearedNotifId(latest);
    const list = document.getElementById('notifMenuList');
    if (list) list.innerHTML = '<li class="text-muted">No notifications.</li>';
    document.getElementById('clearNotifBtn').disabled = true;
    renderNotifBadge(0);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userMenu')?.classList.add('hidden');
    document.getElementById('userMenuBtn')?.setAttribute('aria-expanded', 'false');

    const opening = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', opening ? 'true' : 'false');

    if (opening) {
      loadNavbarNotifications().then(() => {
        const latest = Number(menu.dataset.latestId || '0');
        if (latest) setSeenNotifId(latest);
        renderNotifBadge(0);
        menu.querySelectorAll('.notif-item').forEach((li) => li.classList.remove('unread'));
      });
    }
  });

  menu.addEventListener('click', (e) => e.stopPropagation());

  if (!window.__notifPoll) {
    window.__notifPoll = setInterval(loadNavbarNotifications, 10000);
    window.addEventListener('focus', loadNavbarNotifications);
  }
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

    const page = window.location.pathname.split('/').pop() || 'dashboard.html';
    if (page === 'dashboard.html') {
      const dashboardInput = document.getElementById('searchInput');
      const dashboardForm = document.getElementById('searchForm');
      if (dashboardInput && dashboardForm) {
        dashboardInput.value = q;
        dashboardForm.requestSubmit();
        return;
      }
    }

    window.location.href = `dashboard.html?search=${encodeURIComponent(q)}`;
  });

  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('tracking') || params.get('search');
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
