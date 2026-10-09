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
    const res = await fetch(`${API_BASE}/allocations.php`, {
      credentials: 'include',
      cache: 'no-store',
    });
    return res.json();
  },

  async fundAvailability() {
    const res = await fetch(`${API_BASE}/allocations.php`, {
      credentials: 'include',
      cache: 'no-store',
    });
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

  async statusRequests(status) {
    const res = await fetch(
      `${API_BASE}/fetch.php?action=status_requests&status=${encodeURIComponent(status)}`,
      { credentials: 'include' }
    );
    return res.json();
  },

  async requestingRequests() {
    const res = await fetch(`${API_BASE}/fetch.php?action=requesting_requests`, {
      credentials: 'include',
    });
    return res.json();
  },

  async officeRequests() {
    const res = await fetch(`${API_BASE}/fetch.php?action=office_requests`, {
      credentials: 'include',
      cache: 'no-store',
    });
    return res.json();
  },

  async detail(tracking) {
    const res = await fetch(
      `${API_BASE}/fetch.php?action=detail&tracking=${encodeURIComponent(tracking)}`,
      { credentials: 'include' }
    );
    return res.json();
  },

  async updateSignatories(data) {
    const res = await fetch(`${API_BASE}/signatories.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async statusOptions(currentStatus) {
    const res = await fetch(`${API_BASE}/fetch.php?action=status_options&current_status=${encodeURIComponent(currentStatus)}`, {
      credentials: 'include',
    });
    return res.json();
  },

  async notifications() {
    const res = await fetch(`${API_BASE}/fetch.php?action=notifications`, {
      credentials: 'include',
      cache: 'no-store',
    });
    return res.json();
  },

  async profile() {
    const res = await fetch(`${API_BASE}/profile.php`, {
      credentials: 'include',
      cache: 'no-store',
    });
    return res.json();
  },

  async updateProfile(data) {
    const res = await fetch(`${API_BASE}/profile.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'profile', ...data }),
    });
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch(`${API_BASE}/profile.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'settings', ...data }),
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

  async deleteDocument(id) {
    const res = await fetch(`${API_BASE}/submit.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'delete_document', id }),
    });
    return res.json();
  },

  async closeRequest(data) {
    const res = await fetch(`${API_BASE}/close_request.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
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
  if (['Returned', 'Cancelled'].includes(status)) return 'closed';
  if (['Under Budget Review', 'Reviewed'].includes(status)) return 'budget';
  if (['Canvass', 'PO'].includes(status)) return 'procurement';
  if (['Delivered', 'For Inspection', 'Accepted'].includes(status)) return 'pso';
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
  'PO',
  'DV Processing',
  'For Payment',
  'Paid',
  'Completed',
];

const OFFICE_STEPS = [
  { label: 'Office', statuses: ['Registered'] },
  { label: 'Budget', statuses: ['Under Budget Review', 'Reviewed'] },
  { label: 'Accounting', statuses: ['DV Processing', 'For Payment'] },
  { label: 'Procurement', statuses: ['Canvass', 'PO'] },
  { label: 'PSO', statuses: ['Delivered', 'For Inspection', 'Accepted'] },
  { label: 'Cashier', statuses: ['Paid', 'Completed'] },
];

function officeIndexForStatus(status) {
  return OFFICE_STEPS.findIndex((s) => s.statuses.includes(status));
}

function renderOfficeStepper(currentStatus, containerId, signatories = [], currentSignatoryOffice = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const idx = officeIndexForStatus(currentStatus);
  const officeByStep = ['requesting', 'budget', 'accounting', 'procurement', 'pso', 'cashier'];
  const officeLabels = [
    'Requesting Office',
    'Budget Office',
    'Accounting Office',
    'Procurement Office',
    'Property and Supply Office',
    'Cashier',
  ];
  const signatoryOfficeLabels = {
    accounting: 'Accounting Office',
    vc_admin_finance: 'Vice Chancellor for Administration and Finance Office',
    chancellor: 'Chancellor Office',
    academic_affairs: 'Vice Chancellor for Academic Affairs Office',
  };
  const hasRequiredSignatories = currentStatus === 'Registered'
    && signatories.some((signatory) => Boolean(signatory.template_key));
  container.classList.add('multi-step-progress', 'office-stepper');
  container.innerHTML = OFFICE_STEPS.map((step, i) => {
    let state = '';
    if (idx >= 0 && i < idx) state = 'completed';
    else if (i === idx) state = 'active';
    const icon = state === 'completed' ? '✓' : String(i + 1);
    const officeSignatories = signatories.filter((signatory) => signatory.assigned_office === officeByStep[i]);
    const resolvedSignatories = officeSignatories.filter(
      (signatory) => ['Signed', 'Skipped'].includes(signatory.status)
    ).length;
    const signatureProgress = officeSignatories.length
      ? `<span class="progress-step-signatures">${resolvedSignatories}/${officeSignatories.length} complete</span>`
      : '';
    return `<div class="progress-step ${state}">
      <div class="progress-step-icon">${icon}</div>
      <div class="progress-step-label">${step.label}</div>
      ${signatureProgress}
    </div>`;
  }).join('');

  const signatoryStepper = document.getElementById('signatoryStepper');
  if (signatoryStepper) {
    const activeSignatoryOffice = hasRequiredSignatories
      ? currentSignatoryOffice
      : (idx >= 0 ? officeByStep[idx] : null);
    const activeOfficeSignatories = activeSignatoryOffice
      ? signatories.filter((signatory) => signatory.assigned_office === activeSignatoryOffice
        && (!hasRequiredSignatories || Boolean(signatory.template_key)))
      : [];
    signatoryStepper.classList.toggle('hidden', activeOfficeSignatories.length === 0);
    if (activeOfficeSignatories.length) {
      signatoryStepper.innerHTML = `
        <h3>${hasRequiredSignatories ? `Required signatures before Budget review — ${signatoryOfficeLabels[activeSignatoryOffice] || activeSignatoryOffice}` : `Signatures at ${officeLabels[idx]}`}</h3>
        <ol>
          ${activeOfficeSignatories.map((signatory, position) => {
            const state = signatory.status === 'Signed' || signatory.status === 'Skipped'
              ? 'completed'
              : 'active';
            const icon = state === 'completed' ? '✓' : String(position + 1);
            const title = signatory.designation || 'Signatory';
            const status = signatory.status === 'Skipped' ? 'N/A' : signatory.status;
            return `<li class="signatory-progress-step ${state}">
              <span class="signatory-progress-icon">${icon}</span>
              <strong>${escapeProgressText(title)}</strong>
              <span>${escapeProgressText(signatory.signatory_name)}</span>
              <small>${escapeProgressText(status)}</small>
            </li>`;
          }).join('')}
        </ol>`;
    } else {
      signatoryStepper.replaceChildren();
    }
  }

  const location = document.getElementById(`${containerId}Location`);
  if (!location) return;
  if (hasRequiredSignatories) {
    const pendingNames = signatories
      .filter((signatory) => signatory.template_key && signatory.assigned_office === currentSignatoryOffice && signatory.status === 'Pending Signature')
      .map((signatory) => signatory.signatory_name);
    location.textContent = currentSignatoryOffice === 'budget'
      ? 'All required signatures are complete. The Budget Office can now begin review.'
      : `Request is waiting for the ${signatoryOfficeLabels[currentSignatoryOffice] || currentSignatoryOffice} account to sign${pendingNames.length ? `: ${pendingNames.join(', ')}` : ''}. Budget review is locked until then.`;
    return;
  }
  const currentOffice = idx >= 0 ? officeByStep[idx] : null;
  const officeLabel = idx >= 0 ? officeLabels[idx] : null;
  const pendingNames = currentOffice
    ? signatories
      .filter((signatory) => signatory.assigned_office === currentOffice && signatory.status === 'Pending Signature')
      .map((signatory) => signatory.signatory_name)
    : [];
  if (officeLabel && pendingNames.length) {
    location.textContent = `Document is at ${officeLabel} for signature: ${pendingNames.join(', ')}.`;
  } else if (officeLabel) {
    const hasOfficeSignatories = signatories.some((signatory) => signatory.assigned_office === currentOffice);
    location.textContent = hasOfficeSignatories
      ? `Signatures at ${officeLabel} are complete; awaiting the office status update.`
      : `Document is currently at ${officeLabel}.`;
  } else if (['Cancelled', 'Returned'].includes(currentStatus)) {
    location.textContent = `Document returned to Requesting Office (${currentStatus}).`;
  } else {
    location.textContent = 'Document workflow is complete.';
  }
}

function escapeProgressText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
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
