/**
 * API helpers — paths relative to frontend pages
 */
const API_BASE = '../backend';

const Api = {
  async login(role) {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
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

  async analytics() {
    const res = await fetch(`${API_BASE}/analytics.php`, {
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

function renderHeader(roleLabel) {
  const el = document.getElementById('roleBadge');
  if (el) el.textContent = roleLabel;
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

function renderFlowDiagram(currentStatus, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const idx = FLOW_STEPS.indexOf(currentStatus);
  container.innerHTML = FLOW_STEPS.map((step, i) => {
    const active = i <= idx && idx >= 0 ? 'active' : '';
    const arrow = i < FLOW_STEPS.length - 1 ? '<span class="flow-arrow">→</span>' : '';
    return `<span class="flow-step ${active}">${step}</span>${arrow}`;
  }).join('');
}
