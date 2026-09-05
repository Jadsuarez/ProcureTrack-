let allocationState = {
  canEdit: false,
  offices: [],
};

function renderAllocationSummary(data) {
  document.getElementById('statTotalAllocated').textContent = formatPeso(data.total_allocated);
  document.getElementById('statOfficesWithFunds').textContent = data.offices_with_funds;
  document.getElementById('statOfficeCount').textContent = data.office_count;
}

function renderAllocationTable(data) {
  const body = document.getElementById('allocationTableBody');
  const offices = data.offices || [];

  if (!offices.length) {
    body.innerHTML = '<tr><td colspan="5" class="text-muted">No offices registered.</td></tr>';
    return;
  }

  body.innerHTML = offices
    .map((office) => {
      const amount = Number(office.fund_allocation) || 0;
      const share = Number(office.share_pct) || 0;
      const actions = data.can_edit
        ? `<button type="button" class="btn btn-sm btn-secondary" data-alloc-id="${office.id}">Set amount</button>`
        : '<span class="text-muted">—</span>';
      return `
        <tr>
          <td><strong>${office.label}</strong></td>
          <td><code>${office.slug}</code></td>
          <td>
            <div class="alloc-amount">${formatPeso(amount)}</div>
            ${amount === 0 ? '<small class="text-muted">No available funds</small>' : ''}
          </td>
          <td>
            <div class="alloc-share-meta">${share}%</div>
            <div class="alloc-bar" aria-hidden="true">
              <div class="alloc-bar-fill" style="width: ${Math.min(share, 100)}%"></div>
            </div>
          </td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join('');

  body.querySelectorAll('[data-alloc-id]').forEach((btn) => {
    btn.addEventListener('click', () => openAllocationModal(Number(btn.dataset.allocId)));
  });
}

function applyAllocationData(data) {
  allocationState.canEdit = Boolean(data.can_edit);
  allocationState.offices = data.offices || [];
  renderAllocationSummary(data);
  renderAllocationTable(data);
}

function openAllocationModal(officeId) {
  const office = allocationState.offices.find((o) => Number(o.id) === officeId);
  if (!office) return;

  document.getElementById('allocOfficeId').value = office.id;
  document.getElementById('allocOfficeName').value = office.label;
  document.getElementById('allocAmount').value = Number(office.fund_allocation) || 0;
  document.getElementById('editAllocationTitle').textContent = `Allocate funds — ${office.label}`;

  const dialog = document.getElementById('editAllocationModal');
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('allocAmount')?.focus(), 50);
  }
}

function closeAllocationModal() {
  const dialog = document.getElementById('editAllocationModal');
  if (dialog && typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
  }
  document.getElementById('editAllocationForm')?.reset();
  if (!document.querySelector('.popup-dialog[open]')) {
    document.body.classList.remove('modal-open');
  }
}

async function loadAllocations() {
  const data = await Api.listAllocations();
  if (!data.success) {
    showAlert(document.getElementById('alertBox'), data.message || 'Failed to load allocations.');
    document.getElementById('allocationTableBody').innerHTML =
      `<tr><td colspan="5">${data.message || 'Failed to load allocations.'}</td></tr>`;
    return;
  }

  applyAllocationData(data);
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  initAppLayout(session);

  const dialog = document.getElementById('editAllocationModal');
  if (dialog && dialog.parentElement !== document.body) {
    document.body.appendChild(dialog);
  }

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', closeAllocationModal);
  });
  document.getElementById('cancelAllocBtn')?.addEventListener('click', closeAllocationModal);
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) closeAllocationModal();
  });
  dialog?.addEventListener('close', () => {
    if (!document.querySelector('.popup-dialog[open]')) {
      document.body.classList.remove('modal-open');
    }
  });

  document.getElementById('editAllocationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));

    const id = Number(document.getElementById('allocOfficeId').value);
    const amount = document.getElementById('allocAmount').value;
    const result = await Api.updateAllocation(id, amount);

    if (!result.success) {
      showAlert(document.getElementById('alertBox'), result.message);
      return;
    }

    closeAllocationModal();
    showAlert(document.getElementById('alertBox'), result.message, 'success');
    applyAllocationData(result);
  });

  await loadAllocations();
  window.addEventListener('focus', loadAllocations);

  const hint = document.getElementById('allocationHint');
  const subtitle = document.getElementById('allocationSubtitle');
  if (allocationState.canEdit) {
    subtitle.textContent = 'Manage available office funds after request deductions.';
    hint.textContent = 'Set amount replaces the current available balance. New requests automatically deduct their amount. Amounts are in Philippine pesos.';
  } else {
    subtitle.textContent = 'View available office funds after request deductions.';
    hint.textContent = 'Only Budget Office can change allocations.';
  }
});
