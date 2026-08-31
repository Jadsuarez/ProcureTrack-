/**
 * API helpers — paths relative to frontend pages
 */
const API_BASE = '../backend';
const APP_ASSET_VERSION = '13';

const Api = {
  async login(username, password) {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async session() {
    const res = await fetch(`${API_BASE}/login.php?action=session`, {
      credentials: 'include',
    });
    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_BASE}/login.php?action=logout`, {
      credentials: 'include',
    });
    return res.json();
  },

  async createAccount(data) {
    const res = await fetch(`${API_BASE}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'create', ...data }),
    });
    return res.json();
  },

  async listUsers() {
    const res = await fetch(`${API_BASE}/users.php`, { credentials: 'include' });
    return res.json();
  },

  async updateUser(data) {
    const res = await fetch(`${API_BASE}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'update', ...data }),
    });
    return res.json();
  },

  async deleteUser(id) {
    const res = await fetch(`${API_BASE}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'delete', id }),
    });
    return res.json();
  },

  async listOffices() {
    const res = await fetch(`${API_BASE}/offices.php`, { credentials: 'include' });
    return res.json();
  },

  async createOffice(data) {
    const res = await fetch(`${API_BASE}/offices.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'create', ...data }),
    });
    return res.json();
  },

  async updateOffice(data) {
    const res = await fetch(`${API_BASE}/offices.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'update', ...data }),
    });
    return res.json();
  },

  async deleteOffice(id) {
    const res = await fetch(`${API_BASE}/offices.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'delete', id }),
    });
    return res.json();
  },

  async listAllocations() {
    const res = await fetch(`${API_BASE}/allocations.php`, { credentials: 'include' });
    return res.json();
  },

  async updateAllocation(id, fund_allocation) {
    const res = await fetch(`${API_BASE}/allocations.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, fund_allocation }),
    });
    return res.json();
  },

  async summary() {
    const res = await fetch(`${API_BASE}/fetch.php?action=summary`, {
      credentials: 'include',
    });
    return res.json();
  },

  async search(tracking) {
    const res = await fetch(
      `${API_BASE}/fetch.php?action=search&tracking=${encodeURIComponent(tracking)}`,
      { credentials: 'include' }
    );
    return res.json();
  },

  async detail(tracking) {
    const res = await fetch(
      `${API_BASE}/fetch.php?action=detail&tracking=${encodeURIComponent(tracking)}`,
      { credentials: 'include' }
    );
    return res.json();
  },

  async statusOptions() {
    const res = await fetch(`${API_BASE}/fetch.php?action=status_options`, {
      credentials: 'include',
    });
    return res.json();
  },

  async updateStatus(data) {
    const res = await fetch(`${API_BASE}/update_status.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async lookup(tracking) {
    const res = await fetch(
      `${API_BASE}/submit.php?action=lookup&tracking=${encodeURIComponent(tracking)}`,
      { credentials: 'include' }
    );
    return res.json();
  },

  async upload(formData) {
    const res = await fetch(`${API_BASE}/submit.php`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return res.json();
  },

  async nextTrackingId() {
    const res = await fetch(`${API_BASE}/create_request.php?action=next_id`, {
      credentials: 'include',
    });
    return res.json();
  },

  async createRequest(data) {
    const res = await fetch(`${API_BASE}/create_request.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async analytics(from = '', to = '') {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    const res = await fetch(`${API_BASE}/analytics.php${query ? `?${query}` : ''}`, {
      credentials: 'include',
    });
    return res.json();
  },
};

function statusBadgeClass(status) {
  if (status === 'Completed') return 'completed';
  if (['Under Budget Review', 'Reviewed'].includes(status)) return 'budget';
  if (['Canvass', 'Abstract of Canvass', 'PO'].includes(status)) return 'procurement';
  if (['DV Processing', 'For Payment'].includes(status)) return 'accounting';
  if (status === 'Paid') return 'cashier';
  return '';
}

function formatPeso(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₱0.00';
  return (
    '₱' +
    n.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  container.classList.remove('hidden');
}

function clearAlert(container) {
  if (container) {
    container.innerHTML = '';
    container.classList.add('hidden');
  }
}

async function requireAuth(allowedRoles = null) {
  const data = await Api.session();
  if (!data.logged_in) {
    window.location.href = 'login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(data.role)) {
    window.location.href = 'dashboard.html';
    return null;
  }
  return data;
}

function renderHeader(roleLabel, username) {
  const officeEl = document.getElementById('roleBadge');
  if (officeEl) officeEl.textContent = roleLabel;

  const userEl = document.getElementById('userBadge');
  if (userEl && username) userEl.textContent = username;
}

const FLOW_STEPS = [
  'Registered',
  'Under Budget Review',
  'Reviewed',
  'Canvass',
  'Abstract of Canvass',
  'PO',
  'DV Processing',
  'For Payment',
  'Paid',
  'Completed',
];

const OFFICE_STEPS = [
  { label: 'Office', statuses: ['Registered'] },
  { label: 'Budget', statuses: ['Under Budget Review', 'Reviewed'] },
  { label: 'Procurement', statuses: ['Canvass', 'Abstract of Canvass', 'PO'] },
  { label: 'Accounting', statuses: ['DV Processing', 'For Payment'] },
  { label: 'Cashier', statuses: ['Paid', 'Completed'] },
];

function officeIndexForStatus(status) {
  return OFFICE_STEPS.findIndex((s) => s.statuses.includes(status));
}

function renderOfficeStepper(currentStatus, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const idx = officeIndexForStatus(currentStatus);
  container.classList.add('multi-step-progress', 'office-stepper');
  container.innerHTML = OFFICE_STEPS.map((step, i) => {
    let state = '';
    if (idx >= 0 && i < idx) state = 'completed';
    else if (i === idx) state = 'active';
    const icon = state === 'completed' ? '✓' : String(i + 1);
    return `<div class="progress-step ${state}">
      <div class="progress-step-icon">${icon}</div>
      <div class="progress-step-label">${step.label}</div>
    </div>`;
  }).join('');
}

function renderFlowDiagram(currentStatus, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const idx = FLOW_STEPS.indexOf(currentStatus);
  container.classList.add('multi-step-progress');
  container.classList.remove('flow-steps');
  container.innerHTML = FLOW_STEPS.map((step, i) => {
    let state = '';
    if (idx >= 0 && i < idx) state = 'completed';
    else if (i === idx) state = 'active';
    const icon = state === 'completed' ? '✓' : String(i + 1);
    return `<div class="progress-step ${state}">
      <div class="progress-step-icon">${icon}</div>
      <div class="progress-step-label">${step}</div>
    </div>`;
  }).join('');
}
