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
    { href: 'status.html', label: 'My Requests', icon: 'track' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'new-track.html', label: 'New Track', icon: 'newTrack' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'upload.html', label: 'Upload Documents', icon: 'upload' },
  ],
  budget: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Office Requests', icon: 'track' },
    { href: 'fund-allocation.html', label: 'Fund Allocation', icon: 'funds' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
  ],
  procurement: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Office Requests', icon: 'track' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'manage-accounts.html', label: 'Account Management', icon: 'accounts' },
  ],
  accounting: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Office Requests', icon: 'track' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'upload.html', label: 'Upload Documents', icon: 'upload' },
  ],
  vc_admin_finance: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Signatures to Complete', icon: 'track' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
  ],
  chancellor: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Signatures to Complete', icon: 'track' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
  ],
  academic_affairs: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Signatures to Complete', icon: 'track' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
  ],
  pso: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Office Requests', icon: 'track' },
    { href: 'analytics.html', label: 'Analytics', icon: 'analytics' },
    { href: 'track.html', label: 'Track Request', icon: 'track' },
    { href: 'upload.html', label: 'Upload Documents', icon: 'upload' },
  ],
  cashier: [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'status.html', label: 'Office Requests', icon: 'track' },
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
          <span class="sidebar-office-label">Signed in as</span>
          <strong class="sidebar-user-name" id="userBadge">—</strong>
          <span class="sidebar-office-label sidebar-office-label-secondary">Office</span>
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

  renderHeader(session.role_label, chipDisplayName(session));
  buildNav(session);
  initTopNavbar(session);
  window.__session = session;
  applyOfficePreferences(session);
}

const PAGE_TITLES = {
  'dashboard.html': 'Dashboard',
  'requesting-dashboard.html': 'My Requests',
  'status.html': 'Requests Dashboard',
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
    const username = chipDisplayName(session);
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
          placeholder="Search tracking ID or title…"
          autocomplete="off"
          aria-label="Search tracking ID or title"
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
            <div class="notif-filter-row">
              <label for="notifFilter">Show</label>
              <select id="notifFilter" aria-label="Filter notifications">
                <option value="all">All updates</option>
                <option value="new">New requests</option>
              </select>
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
              <span class="user-chip-name"><small>Username:</small> ${username}</span>
              <span class="user-chip-office"><small>Office:</small> ${session?.role_label || ''}</span>
            </span>
          </button>
          <div class="user-menu hidden" id="userMenu">
            <a href="#" data-account-action="profile">Edit Profile</a>
            <a href="#" data-account-action="settings">Settings</a>
            <div class="user-menu-divider"></div>
            <a href="#" data-logout="1">Logout</a>
          </div>
        </div>
      </div>
    `;
    mainWrap.insertBefore(navbar, mainWrap.firstChild);
    bindUserMenu(session);
    bindNotifMenu(session);
  } else {
    bindUserMenu(session);
    bindNotifMenu(session);
  }

  bindGlobalSearch();
  setTopNavbarTitle();
}

function chipDisplayName(session) {
  const named = String(session?.display_name || '').trim();
  return named || displayUsername(session?.username);
}

function getUserPreferences() {
  return window.__session?.preferences || {};
}

function applyOfficePreferences(session) {
  const prefs = session?.preferences || {};
  const filter = document.getElementById('notifFilter');
  if (filter && (prefs.notify_filter === 'all' || prefs.notify_filter === 'new')) {
    filter.value = prefs.notify_filter;
  }

  const title = document.getElementById('title');
  const description = document.getElementById('description');
  if (session?.role === 'requesting' && title && !title.value && prefs.default_title) {
    title.value = prefs.default_title;
  }
  if (session?.role === 'requesting' && description && !description.value && prefs.default_description) {
    description.value = prefs.default_description;
  }
}

function applyProfileToSession(profile) {
  if (!profile || !window.__session) return;
  window.__session = {
    ...window.__session,
    username: profile.username,
    display_name: profile.display_name || '',
    email: profile.email || '',
    preferences: profile.preferences || {},
    role: profile.office || window.__session.role,
    role_label: profile.office_label || window.__session.role_label,
  };
  updateUserChip(window.__session);
  applyOfficePreferences(window.__session);
}

function updateUserChip(session) {
  const name = chipDisplayName(session);
  const initial = (name || 'U').slice(0, 1).toUpperCase();
  const nameEl = document.querySelector('.user-chip-name');
  const officeEl = document.querySelector('.user-chip-office');
  const avatar = document.querySelector('.user-avatar');
  if (nameEl) nameEl.innerHTML = `<small>Username:</small> ${name}`;
  if (officeEl) officeEl.innerHTML = `<small>Office:</small> ${session?.role_label || ''}`;
  if (avatar) avatar.textContent = initial;
  renderHeader(session?.role_label, name);
}

function openAccountModal(id) {
  const el = document.getElementById(id);
  if (!el || el.open) return;
  if (typeof el.showModal === 'function') el.showModal();
  document.body.classList.add('modal-open');
}

function closeAccountModal(id) {
  const el = document.getElementById(id);
  if (el && typeof el.close === 'function' && el.open) el.close();
  if (!document.querySelector('.popup-dialog[open]')) {
    document.body.classList.remove('modal-open');
  }
}

function ensureAccountModals() {
  if (document.getElementById('editProfileModal')) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <dialog class="popup-dialog" id="editProfileModal">
      <div class="card popup-window">
        <div class="panel-header">
          <h2>Edit Profile</h2>
          <button type="button" class="popup-close" data-close-account="editProfileModal" aria-label="Close">&times;</button>
        </div>
        <div id="profileAlert" class="hidden"></div>
        <form id="editProfileForm">
          <div class="form-group">
            <label for="profileUsername">Username</label>
            <input type="text" id="profileUsername" required pattern="[a-zA-Z0-9_]{3,50}" maxlength="50">
          </div>
          <div class="form-group">
            <label for="profileDisplayName">Display Name</label>
            <input type="text" id="profileDisplayName" maxlength="100" placeholder="Name shown in the system">
          </div>
          <div class="form-group">
            <label for="profileEmail">Email</label>
            <input type="email" id="profileEmail" maxlength="150" placeholder="optional">
          </div>
          <div class="form-group">
            <label for="profilePassword">New Password <small class="text-muted">(leave blank to keep current)</small></label>
            <input type="password" id="profilePassword" minlength="6" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label for="profileConfirmPassword">Confirm Password</label>
            <input type="password" id="profileConfirmPassword" minlength="6" autocomplete="new-password">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-close-account="editProfileModal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Profile</button>
          </div>
        </form>
      </div>
    </dialog>
    <dialog class="popup-dialog" id="accountSettingsModal">
      <div class="card popup-window">
        <div class="panel-header">
          <h2>Settings</h2>
          <button type="button" class="popup-close" data-close-account="accountSettingsModal" aria-label="Close">&times;</button>
        </div>
        <div id="settingsAlert" class="hidden"></div>
        <form id="accountSettingsForm">
          <p class="text-muted" id="settingsOfficeHint"></p>
          <div class="form-group">
            <label for="settingsNotifyFilter">Default notification view</label>
            <select id="settingsNotifyFilter">
              <option value="all">All updates</option>
              <option value="new">New requests</option>
            </select>
          </div>
          <div id="settingsRequestingFields" class="hidden">
            <div class="form-group">
              <label for="settingsDefaultTitle">Default request title</label>
              <input type="text" id="settingsDefaultTitle" maxlength="255" placeholder="Used on New Track">
            </div>
            <div class="form-group">
              <label for="settingsDefaultDescription">Default request description</label>
              <textarea id="settingsDefaultDescription" rows="3" maxlength="1000" placeholder="Used on New Track"></textarea>
            </div>
          </div>
          <div id="settingsSignatoryFields" class="hidden">
            <h3>Request signatories</h3>
            <p class="text-muted" id="settingsSignatoryHint">Only the permanent signatory assigned to your office can be changed here. Existing requests keep their saved signatory names.</p>
            <div id="settingsSignatoryInputs"></div>
          </div>
          <div id="settingsBudgetFields" class="hidden">
            <div class="form-group">
              <label for="settingsDefaultBudgetType">Default budget type</label>
              <input type="text" id="settingsDefaultBudgetType" maxlength="100" placeholder="e.g. MOOE">
            </div>
          </div>
          <div id="settingsNotesFields" class="hidden">
            <div class="form-group">
              <label for="settingsDefaultNotes">Default status notes</label>
              <textarea id="settingsDefaultNotes" rows="3" maxlength="500" placeholder="Filled in when updating a request"></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-close-account="accountSettingsModal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </dialog>
  `;
  document.body.append(...wrap.children);
}

function renderOfficeSignatorySettings(templates, office) {
  const container = document.getElementById('settingsSignatoryInputs');
  if (!container) return;
  container.replaceChildren();
  const templateKeyByOffice = {
    accounting: 'head_accounting',
    vc_admin_finance: 'vice_chancellor_admin_finance',
    chancellor: 'chancellor',
    academic_affairs: 'vice_chancellor_academic_affairs',
    requesting: 'vice_chancellor_academic_affairs_2',
  };
  const templateKey = templateKeyByOffice[office];
  const officeTemplates = templates.filter((template) => template.template_key === templateKey);
  officeTemplates.forEach((template) => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    const input = document.createElement('input');
    const department = document.createElement('small');
    input.type = 'text';
    input.maxLength = 150;
    input.required = true;
    input.value = template.signatory_name || '';
    input.dataset.signatoryTemplate = template.template_key;
    label.textContent = `${template.designation}${Number(template.is_required) === 1 ? ' (Required)' : ' (Optional)'}`;
    input.id = `settingsSignatory-${template.template_key}`;
    label.htmlFor = input.id;
    department.className = 'text-muted';
    department.textContent = `Office: ${template.department}`;
    group.append(label, input, department);
    container.append(group);
  });
}

async function openEditProfileModal() {
  clearAlert(document.getElementById('profileAlert'));
  const data = await Api.profile();
  if (!data.success) {
    showAlert(document.getElementById('profileAlert'), data.message || 'Unable to load profile.');
    openAccountModal('editProfileModal');
    return;
  }
  const p = data.profile;
  document.getElementById('profileUsername').value = p.username || '';
  document.getElementById('profileDisplayName').value = p.display_name || '';
  document.getElementById('profileEmail').value = p.email || '';
  document.getElementById('profilePassword').value = '';
  document.getElementById('profileConfirmPassword').value = '';
  openAccountModal('editProfileModal');
}

async function openAccountSettingsModal() {
  clearAlert(document.getElementById('settingsAlert'));
  const session = window.__session || {};
  const data = await Api.profile();
  if (!data.success) {
    showAlert(document.getElementById('settingsAlert'), data.message || 'Unable to load settings.');
    openAccountModal('accountSettingsModal');
    return;
  }
  const prefs = data.profile.preferences || {};
  const office = session.role || '';
  const hint = document.getElementById('settingsOfficeHint');
  if (hint) hint.textContent = `Customization for ${session.role_label || 'your office'}.`;

  document.getElementById('settingsNotifyFilter').value = prefs.notify_filter === 'new' ? 'new' : 'all';
  document.getElementById('settingsRequestingFields').classList.toggle('hidden', office !== 'requesting');
  const canEditSignatoryName = ['requesting', 'accounting', 'vc_admin_finance', 'chancellor', 'academic_affairs'].includes(office);
  document.getElementById('settingsSignatoryFields').classList.toggle('hidden', !canEditSignatoryName);
  document.querySelector('#settingsSignatoryFields h3').textContent =
    office === 'requesting' ? 'Optional Academic Affairs signatory' : 'Permanent signatory name';
  document.getElementById('settingsSignatoryHint').textContent =
    office === 'requesting'
      ? 'Requesting Office can update only the optional second Academic Affairs signatory. Existing requests keep their saved signatory names.'
      : 'Your office can update only its assigned permanent signatory name. Existing requests keep their saved signatory names.';
  document.getElementById('settingsBudgetFields').classList.toggle('hidden', office !== 'budget');
  document.getElementById('settingsNotesFields').classList.toggle('hidden', office === 'requesting' || !office);
  document.getElementById('settingsDefaultTitle').value = prefs.default_title || '';
  document.getElementById('settingsDefaultDescription').value = prefs.default_description || '';
  document.getElementById('settingsDefaultBudgetType').value = prefs.default_budget_type || '';
  document.getElementById('settingsDefaultNotes').value = prefs.default_notes || '';
  if (canEditSignatoryName) renderOfficeSignatorySettings(data.profile.signatory_templates || [], office);
  openAccountModal('accountSettingsModal');
}

function bindUserMenu(session) {
  const btn = document.getElementById('userMenuBtn');
  const menu = document.getElementById('userMenu');
  if (!btn || !menu) return;

  ensureAccountModals();

  if (btn.dataset.bound === '1') return;
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

  menu.addEventListener('click', (e) => e.stopPropagation());

  menu.querySelector('[data-account-action="profile"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
    openEditProfileModal();
  });

  menu.querySelector('[data-account-action="settings"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
    openAccountSettingsModal();
  });

  menu.querySelector('[data-logout]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await Api.logout();
    window.location.href = 'login.html';
  });

  document.querySelectorAll('[data-close-account]').forEach((el) => {
    el.addEventListener('click', () => closeAccountModal(el.dataset.closeAccount));
  });

  document.getElementById('editProfileModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'editProfileModal') closeAccountModal('editProfileModal');
  });
  document.getElementById('accountSettingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'accountSettingsModal') closeAccountModal('accountSettingsModal');
  });

  document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('profileAlert');
    clearAlert(alertBox);
    const result = await Api.updateProfile({
      username: document.getElementById('profileUsername').value.trim(),
      display_name: document.getElementById('profileDisplayName').value.trim(),
      email: document.getElementById('profileEmail').value.trim(),
      password: document.getElementById('profilePassword').value,
      confirm_password: document.getElementById('profileConfirmPassword').value,
    });
    if (!result.success) {
      showAlert(alertBox, result.message);
      return;
    }
    applyProfileToSession(result.profile);
    closeAccountModal('editProfileModal');
  });

  document.getElementById('accountSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('settingsAlert');
    clearAlert(alertBox);
    const settings = {
      notify_filter: document.getElementById('settingsNotifyFilter').value,
      default_title: document.getElementById('settingsDefaultTitle').value.trim(),
      default_description: document.getElementById('settingsDefaultDescription').value.trim(),
      default_budget_type: document.getElementById('settingsDefaultBudgetType').value.trim(),
      default_notes: document.getElementById('settingsDefaultNotes').value.trim(),
    };
    if (document.getElementById('settingsSignatoryFields')?.classList.contains('hidden') === false) {
      settings.signatory_names = Object.fromEntries(
        [...document.querySelectorAll('[data-signatory-template]')]
          .filter((input) => input instanceof HTMLInputElement)
          .map((input) => [input.dataset.signatoryTemplate, input.value.trim()])
      );
    }
    const result = await Api.updateSettings(settings);
    if (!result.success) {
      showAlert(alertBox, result.message);
      return;
    }
    applyProfileToSession(result.profile);
    closeAccountModal('accountSettingsModal');
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

function notificationKey(notification) {
  const timestamp = Date.parse(String(notification.created_at || '').replace(' ', 'T'));
  return (Number.isFinite(timestamp) ? timestamp * 1000 : 0) + (Number(notification.id) || 0);
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
    const filter = document.getElementById('notifFilter');
    const selectedFilter = filter?.value || 'all';
    if (filter) {
      const statuses = [...new Set(allItems.map((n) => n.status).filter(Boolean))];
      const existingStatusOptions = [...filter.options]
        .filter((option) => option.dataset.status)
        .map((option) => option.value);
      statuses.forEach((status) => {
        if (!existingStatusOptions.includes(status)) {
          const option = document.createElement('option');
          option.value = status;
          option.dataset.status = '1';
          option.textContent = status;
          filter.appendChild(option);
        }
      });
      filter.value = selectedFilter;
      if (filter.value !== selectedFilter) filter.value = 'all';
    }

    const clearedId = getClearedNotifId();
    const items = allItems.filter((n) => notificationKey(n) > clearedId);
    const filteredItems = items.filter((n) => {
      if (selectedFilter === 'new') return n.status === 'Registered';
      return selectedFilter === 'all' || n.status === selectedFilter;
    });
    const seenId = Math.max(getSeenNotifId(), clearedId);
    const unread = items.filter((n) => notificationKey(n) > seenId).length;
    renderNotifBadge(unread);

    const latestSource = allItems.length ? allItems : items;
    if (menu && latestSource.length) {
      menu.dataset.latestId = String(Math.max(...latestSource.map(notificationKey)));
    }

    const clearBtn = document.getElementById('clearNotifBtn');
    if (clearBtn) clearBtn.disabled = items.length === 0;

    if (!filteredItems.length) {
      list.innerHTML = `<li class="text-muted">${items.length ? 'No matching notifications.' : 'No notifications.'}</li>`;
      return filteredItems;
    }

    list.innerHTML = filteredItems
      .map((n) => {
        const unreadClass = notificationKey(n) > seenId ? ' unread' : '';
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

  document.getElementById('notifFilter')?.addEventListener('change', loadNavbarNotifications);

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

// Use the browser's PDF printer so exports work without a third-party service.
function exportRequestsPdf({ title, requests }) {
  const report = window.open('', '_blank');
  if (!report) {
    showAlert(document.getElementById('alertBox'), 'Allow pop-ups for this site, then click Export PDF again.');
    return;
  }
  report.opener = null;
  const doc = report.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Office requests report</title>
    <style>
      @page { size: A4 landscape; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 24px; font: 11px/1.45 Arial, sans-serif; color: #1f2937; }
      h1 { font-size: 22px; margin: 0 0 6px; color: #8a1728; }
      p { margin: 5px 0; overflow-wrap: anywhere; }
      .report-controls { padding: 12px; background: #f3f4f6; margin-bottom: 20px; }
      button { padding: 8px 16px; cursor: pointer; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 18px; }
      th, td { text-align: left; vertical-align: top; border: 1px solid #d1d5db; padding: 8px; overflow-wrap: anywhere; }
      th { background: #f3f4f6; font-size: 10px; }
      th:nth-child(1) { width: 13%; } th:nth-child(2) { width: 29%; }
      th:nth-child(3) { width: 15%; } th:nth-child(4) { width: 15%; }
      th:nth-child(5), th:nth-child(6) { width: 14%; }
      td:nth-child(4), th:nth-child(4) { text-align: right; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      @media print { body { margin: 0; } .report-controls { display: none; } }
    </style></head><body></body></html>`);
  doc.close();
  doc.title = `${title} - ${new Date().toISOString().slice(0, 10)}`;
  function add(tag, text, parent = doc.body) {
    const element = doc.createElement(tag);
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }
  const controls = add('div', '');
  controls.className = 'report-controls';
  add('p', 'Choose Save as PDF in the print destination to download this report.', controls);
  const printButton = add('button', 'Print / Save as PDF', controls);
  printButton.type = 'button';
  printButton.addEventListener('click', () => report.print());
  add('h1', title);
  add('p', 'Procurement Monitoring System');
  add('p', `Generated: ${new Date().toLocaleString()} | ${requests.length} request${requests.length === 1 ? '' : 's'}`);
  const table = doc.createElement('table');
  doc.body.appendChild(table);
  const header = table.createTHead().insertRow();
  ['Tracking ID', 'Title', 'Status', 'Amount (PHP)', 'Created', 'Updated'].forEach((label) => {
    const cell = add('th', label, header);
    cell.scope = 'col';
  });
  const body = table.createTBody();
  requests.forEach((request) => {
    const row = body.insertRow();
    const amount = Number(request.request_amount) || 0;
    [request.tracking_number || '-', request.title || '-', request.status || '-',
      amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      formatDate(request.created_at), formatDate(request.updated_at),
    ].forEach((value) => { row.insertCell().textContent = value; });
  });
  if (!requests.length) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = 6;
    cell.textContent = 'No requests match the selected filters.';
  }
  report.focus();
  report.setTimeout(() => { if (!report.closed) report.print(); }, 300);
}

// Load visible requests once so each keystroke can filter immediately.
let liveSearchData = null;
let liveSearchLoading = null;
function loadLiveSearchData() {
  if (!liveSearchLoading) {
    liveSearchLoading = Api.officeRequests().then((data) => {
      if (data.success) liveSearchData = data;
      return data;
    }).finally(() => { liveSearchLoading = null; });
  }
  return liveSearchLoading;
}

function bindLiveRequestSearch(input, form, render) {
  let version = 0;
  function showMatches(query, data) {
    render(query, data.success ? {
      success: true,
      requests: (data.requests || []).filter((request) =>
        `${request.tracking_number || ''} ${request.title || ''}`.toLowerCase().includes(query.toLowerCase())
      ),
    } : data);
  }
  async function run() {
    const current = ++version;
    const query = input.value.trim();
    if (!query) { render('', null); return; }
    if (liveSearchData) { showMatches(query, liveSearchData); return; }
    render(query, null);
    try {
      const data = await loadLiveSearchData();
      if (current === version) showMatches(query, data);
    } catch (error) {
      if (current === version) {
        render(query, { success: false, message: 'Unable to load search results. Please try again.' });
      }
    }
  }
  input.addEventListener('input', run);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    liveSearchData = null;
    run();
  });
  loadLiveSearchData().catch(() => {});
}

function bindGlobalSearch() {
  const form = document.getElementById('globalSearchForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const input = document.getElementById('globalSearchInput');
  const results = document.createElement('div');
  results.className = 'global-search-results hidden';
  results.id = 'globalSearchResults';
  results.setAttribute('aria-live', 'polite');
  input.setAttribute('aria-controls', results.id);
  form.appendChild(results);
  function pageSearchInput() {
    return document.getElementById('searchInput')
      || document.getElementById('officeRequestSearch')
      || document.getElementById('requestSearch');
  }
  function updatePageSearch() {
    const pageInput = pageSearchInput();
    if (pageInput) {
      pageInput.value = input.value;
      pageInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  input.addEventListener('input', updatePageSearch);
  form.addEventListener('submit', updatePageSearch);
  bindLiveRequestSearch(input, form, (query, data) => {
    results.replaceChildren();
    if (pageSearchInput()) {
      results.classList.add('hidden');
      return;
    }
    results.classList.toggle('hidden', !query);
    if (!query) return;
    if (!data || !data.success || !data.requests.length) {
      const message = document.createElement('p');
      message.textContent = !data ? 'Searching...' : !data.success
        ? data.message : 'No matching requests.';
      results.appendChild(message);
      return;
    }
    data.requests.forEach((request) => {
      const link = document.createElement('a');
      link.href = `details.html?tracking=${encodeURIComponent(request.tracking_number)}`;
      link.textContent = `${request.tracking_number} — ${request.title || 'Untitled'} (${request.status})`;
      results.appendChild(link);
    });
  });
  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) results.classList.add('hidden');
  });
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') results.classList.add('hidden');
  });
  input.addEventListener('focus', () => {
    if (input.value.trim() && results.hasChildNodes()) results.classList.remove('hidden');
  });

  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('tracking') || params.get('search');
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
    'office of the vice chancellor for administration and finance': 'vc_admin_finance',
    'office of the chancellor, batstateu lipa': 'chancellor',
    'office of the vice chancellor for academic affairs, batstateu lipa': 'academic_affairs',
  };
  return aliases[r] || r;
}

function getNavLinksForRole(role) {
  const office = normalizeRole(role);
  const links = NAV_BY_ROLE[office] || NAV_BY_ROLE.budget;
  return [
    ...links.filter((link) => office === 'budget' || link.href !== 'fund-allocation.html'),
  ];
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
