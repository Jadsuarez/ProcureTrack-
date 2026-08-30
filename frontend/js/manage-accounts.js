let allUsers = [];
let allOffices = [];
let currentSession = null;

function officeBadgeClass(office) {
  const map = {
    budget: 'budget',
    procurement: 'procurement',
    accounting: 'accounting',
    cashier: 'cashier',
  };
  return map[office] || '';
}

function slugFromLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 30);
}

function officeSelectHtml(selected = '') {
  return (
    '<option value="">— Select office —</option>' +
    allOffices
      .map(
        (o) =>
          `<option value="${o.slug}"${o.slug === selected ? ' selected' : ''}>${o.label}</option>`
      )
      .join('')
  );
}

function fillOfficeSelects(selectedCreate = '', selectedEdit = '') {
  const createEl = document.getElementById('createOffice');
  const editEl = document.getElementById('editOffice');
  if (createEl) createEl.innerHTML = officeSelectHtml(selectedCreate);
  if (editEl) editEl.innerHTML = officeSelectHtml(selectedEdit);
}

function ensurePopupsOnBody() {
  document.querySelectorAll('.popup-dialog').forEach((dialog) => {
    if (dialog.parentElement !== document.body) {
      document.body.appendChild(dialog);
    }
  });
}

function openModal(id) {
  ensurePopupsOnBody();
  const el = document.getElementById(id);
  if (!el || el.open) return;

  if (typeof el.showModal === 'function') {
    el.showModal();
  }

  document.body.classList.add('modal-open');

  const firstInput = el.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 50);
  }
}

function closeModal(id, formId) {
  const el = document.getElementById(id);
  if (!el) return;

  if (typeof el.close === 'function' && el.open) {
    el.close();
  }

  if (formId) {
    document.getElementById(formId)?.reset();
  }

  if (!document.querySelector('.popup-dialog[open]')) {
    document.body.classList.remove('modal-open');
  }
}

function bindModalDismiss(modalId, cancelBtnId, formId) {
  const dialog = document.getElementById(modalId);
  if (!dialog) return;

  document.getElementById(cancelBtnId)?.addEventListener('click', () => {
    closeModal(modalId, formId);
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeModal(modalId, formId);
    }
  });

  dialog.addEventListener('close', () => {
    if (formId) {
      document.getElementById(formId)?.reset();
    }
    if (!document.querySelector('.popup-dialog[open]')) {
      document.body.classList.remove('modal-open');
    }
  });
}

function bindPopupCloseButtons() {
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal, btn.dataset.resetForm || '');
    });
  });
}

function updateStats() {
  document.getElementById('statTotalUsers').textContent = allUsers.length;
  document.getElementById('statOffices').textContent = allOffices.length;
}

function renderAccountRow(user, session) {
  const isSelf = Number(user.id) === Number(session.user_id);
  const selfNote = isSelf ? ' <small class="text-muted">(you)</small>' : '';
  return `
    <tr>
      <td><strong>${user.username}</strong>${selfNote}</td>
      <td><span class="status-badge ${officeBadgeClass(user.office)}">${user.office_label}</span></td>
      <td>${user.created_by || '—'}</td>
      <td>${formatDate(user.created_at)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-secondary" data-edit="${user.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-danger" data-delete="${user.id}" data-username="${user.username}"${isSelf ? ' disabled title="Cannot delete your own account"' : ''}>Delete</button>
      </td>
    </tr>
  `;
}

function bindAccountActions(container, users, session) {
  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(Number(btn.dataset.edit), users));
  });

  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteAccount(Number(btn.dataset.delete), btn.dataset.username));
  });
}

function renderAccountsTable(users, session, tbodyId = 'accountsTableBody') {
  const body = document.getElementById(tbodyId);
  if (!users.length) {
    body.innerHTML = '<tr><td colspan="5" class="text-muted">No accounts found.</td></tr>';
    return;
  }

  body.innerHTML = users.map((user) => renderAccountRow(user, session)).join('');
  bindAccountActions(body, users, session);
}

function renderOfficesTable() {
  const body = document.getElementById('officesTableBody');
  if (!allOffices.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-muted">No offices registered.</td></tr>';
    return;
  }

  body.innerHTML = allOffices
    .map((office) => {
      const systemNote = Number(office.is_system) === 1 ? ' <small class="text-muted">(built-in)</small>' : '';
      const canDelete = Number(office.is_system) !== 1 && Number(office.user_count) === 0;
      return `
        <tr>
          <td><strong>${office.label}</strong>${systemNote}</td>
          <td><code>${office.slug}</code></td>
          <td>${formatPeso(office.fund_allocation)}</td>
          <td>${office.user_count ?? 0}</td>
          <td>${formatDate(office.created_at)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-secondary" data-edit-office="${office.id}">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" data-delete-office="${office.id}" data-label="${office.label}"${canDelete ? '' : ' disabled title="Built-in offices or offices with users cannot be deleted"'}>Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');

  body.querySelectorAll('[data-edit-office]').forEach((btn) => {
    btn.addEventListener('click', () => openEditOfficeModal(Number(btn.dataset.editOffice)));
  });

  body.querySelectorAll('[data-delete-office]').forEach((btn) => {
    btn.addEventListener('click', () => deleteOffice(Number(btn.dataset.deleteOffice), btn.dataset.label));
  });
}

async function loadOffices() {
  if (typeof Api.listOffices !== 'function') {
    throw new Error('Office API not loaded. Hard refresh the page (Ctrl+F5).');
  }

  const data = await Api.listOffices();
  if (!data.success) {
    document.getElementById('officesTableBody').innerHTML =
      `<tr><td colspan="6">${data.message || 'Failed to load offices.'}</td></tr>`;
    return false;
  }

  allOffices = data.offices;
  renderOfficesTable();
  fillOfficeSelects();
  updateStats();
  return true;
}

async function loadAccounts(session) {
  currentSession = session;
  const body = document.getElementById('accountsTableBody');
  const data = await Api.listUsers();

  if (!data.success) {
    body.innerHTML = `<tr><td colspan="5">${data.message || 'Failed to load accounts.'}</td></tr>`;
    return;
  }

  allUsers = data.users;
  updateStats();

  if (!allUsers.length) {
    body.innerHTML =
      '<tr><td colspan="5" class="text-muted">No accounts yet. Click Create Account to add one.</td></tr>';
    return;
  }

  renderAccountsTable(allUsers, session);
}

function openCreateAccountModal() {
  fillOfficeSelects();
  document.getElementById('createAccountForm')?.reset();
  openModal('createAccountModal');
}

function openAddOfficeModal() {
  document.getElementById('addOfficeForm')?.reset();
  const slugEl = document.getElementById('officeSlug');
  if (slugEl) slugEl.dataset.manual = '';
  openModal('addOfficeModal');
}

function openEditModal(userId, users) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUsername').value = user.username;
  fillOfficeSelects('', user.office);
  document.getElementById('editPassword').value = '';
  openModal('editModal');
}

function openEditOfficeModal(officeId) {
  const office = allOffices.find((o) => o.id === officeId);
  if (!office) return;

  document.getElementById('editOfficeId').value = office.id;
  document.getElementById('editOfficeLabel').value = office.label;
  document.getElementById('editOfficeSlugDisplay').value = office.slug;
  document.getElementById('editOfficeAllocation').value = Number(office.fund_allocation) || 0;
  openModal('editOfficeModal');
}

async function deleteAccount(id, username) {
  if (!confirm(`Delete account "${username}"? This cannot be undone.`)) return;

  clearAlert(document.getElementById('alertBox'));

  const result = await Api.deleteUser(id);
  if (result.success) {
    showAlert(document.getElementById('alertBox'), result.message, 'success');
    document.getElementById('searchResultsCard').classList.add('hidden');
    await loadAccounts(currentSession);
    await loadOffices();
  } else {
    showAlert(document.getElementById('alertBox'), result.message);
  }
}

async function deleteOffice(id, label) {
  if (!confirm(`Delete office "${label}"? This cannot be undone.`)) return;

  clearAlert(document.getElementById('alertBox'));

  const result = await Api.deleteOffice(id);
  if (result.success) {
    showAlert(document.getElementById('alertBox'), result.message, 'success');
    await loadOffices();
    await loadAccounts(currentSession);
  } else {
    showAlert(document.getElementById('alertBox'), result.message);
  }
}

function setupAccountManagementUI(session) {
  currentSession = session;
  ensurePopupsOnBody();

  document.getElementById('openAddOfficeBtn')?.addEventListener('click', openAddOfficeModal);
  document.getElementById('openCreateAccountBtn')?.addEventListener('click', openCreateAccountModal);

  bindPopupCloseButtons();

  bindModalDismiss('addOfficeModal', 'cancelAddOfficeBtn', 'addOfficeForm');
  bindModalDismiss('createAccountModal', 'cancelCreateAccountBtn', 'createAccountForm');
  bindModalDismiss('editOfficeModal', 'cancelEditOfficeBtn', 'editOfficeForm');
  bindModalDismiss('editModal', 'cancelEditBtn', 'editAccountForm');

  document.getElementById('officeLabel')?.addEventListener('input', (e) => {
    const slugEl = document.getElementById('officeSlug');
    if (slugEl && !slugEl.dataset.manual) {
      slugEl.value = slugFromLabel(e.target.value);
    }
  });

  document.getElementById('officeSlug')?.addEventListener('input', (e) => {
    e.target.dataset.manual = e.target.value ? '1' : '';
  });

  document.getElementById('searchAccountsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));

    const q = document.getElementById('searchAccountsInput').value.trim().toLowerCase();
    const card = document.getElementById('searchResultsCard');
    const body = document.getElementById('searchResultsBody');

    if (!q) {
      card.classList.add('hidden');
      return;
    }

    const matches = allUsers.filter((u) => u.username.toLowerCase().includes(q));
    card.classList.remove('hidden');

    if (!matches.length) {
      body.innerHTML = '<tr><td colspan="5">No matching accounts.</td></tr>';
      return;
    }

    renderAccountsTable(matches, session, 'searchResultsBody');
  });

  document.getElementById('addOfficeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));

    const label = document.getElementById('officeLabel').value.trim();
    const slug = document.getElementById('officeSlug').value.trim().toLowerCase();

    const result = await Api.createOffice({
      label,
      slug,
      fund_allocation: document.getElementById('officeAllocation').value || 0,
    });
    if (result.success) {
      showAlert(document.getElementById('alertBox'), result.message, 'success');
      closeModal('addOfficeModal', 'addOfficeForm');
      document.getElementById('officeSlug').dataset.manual = '';
      await loadOffices();
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });

  document.getElementById('editOfficeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));

    const result = await Api.updateOffice({
      id: Number(document.getElementById('editOfficeId').value),
      label: document.getElementById('editOfficeLabel').value.trim(),
      fund_allocation: document.getElementById('editOfficeAllocation').value || 0,
    });

    if (result.success) {
      showAlert(document.getElementById('alertBox'), result.message, 'success');
      closeModal('editOfficeModal', 'editOfficeForm');
      await loadOffices();
      await loadAccounts(session);
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });

  document.getElementById('createAccountForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));

    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const office = document.getElementById('createOffice').value;

    if (password !== confirmPassword) {
      showAlert(document.getElementById('alertBox'), 'Passwords do not match.');
      return;
    }

    const result = await Api.createAccount({ username, password, office });
    if (result.success) {
      showAlert(document.getElementById('alertBox'), result.message, 'success');
      closeModal('createAccountModal', 'createAccountForm');
      fillOfficeSelects();
      document.getElementById('searchResultsCard').classList.add('hidden');
      document.getElementById('searchAccountsInput').value = '';
      await loadAccounts(session);
      await loadOffices();
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });

  document.getElementById('editAccountForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));

    const payload = {
      id: Number(document.getElementById('editUserId').value),
      username: document.getElementById('editUsername').value.trim(),
      office: document.getElementById('editOffice').value,
      password: document.getElementById('editPassword').value,
    };

    const result = await Api.updateUser(payload);
    if (result.success) {
      showAlert(document.getElementById('alertBox'), result.message, 'success');
      closeModal('editModal', 'editAccountForm');
      document.getElementById('searchResultsCard').classList.add('hidden');
      await loadAccounts(session);
      await loadOffices();
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth(['procurement']);
  if (!session) return;

  initAppLayout(session);
  setupAccountManagementUI(session);

  try {
    await loadOffices();
    await loadAccounts(session);
  } catch (err) {
    showAlert(
      document.getElementById('alertBox'),
      err.message || 'Failed to load account management data.'
    );
  }
});
