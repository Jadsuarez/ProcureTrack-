function escapeSignatoryText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function renderSignatoryWorkflow(data, session, tracking) {
  const officeLabels = {
    requesting: 'Requesting Office',
    budget: 'Budget Office',
    accounting: 'Accounting Office',
    vc_admin_finance: 'Vice Chancellor for Administration and Finance Office',
    chancellor: 'Chancellor Office',
    academic_affairs: 'Vice Chancellor for Academic Affairs Office',
    procurement: 'Procurement Office',
    pso: 'Property and Supply Office',
    cashier: 'Cashier',
  };
  const rows = data.signatories || [];
  const summary = data.signatory_summary || {};
  const list = document.getElementById('signatoryList');
  const summaryEl = document.getElementById('signatorySummary');
  const gateMessage = document.getElementById('signatoryGateMessage');
  const overallEl = document.getElementById('signatoryOverallStatus');
  const form = document.getElementById('signatoryForm');
  const accessMessage = document.getElementById('signatoryAccessMessage');
  const canManage = ['requesting', 'procurement'].includes(session.role);
  const canConfigureSignatories = ['requesting', 'budget', 'accounting', 'procurement', 'pso', 'cashier'].includes(session.role);
  const currentOffice = summary.current_office;
  const currentOfficeSummary = (summary.by_office || []).find((item) => item.office === currentOffice);
  const signaturesReady = Boolean(summary.ready_for_status_update);

  overallEl.textContent = summary.overall_status || 'No Signatories Configured';
  overallEl.className = `status-badge ${summary.overall_status === 'Signatures Complete' ? 'completed' : ''}`;
  summaryEl.innerHTML = `
    <div><span class="label">Current signatory</span><strong>${summary.current ? `${escapeSignatoryText(summary.current.signatory_name)}${summary.current.designation ? ` (${escapeSignatoryText(summary.current.designation)})` : ''}` : 'None'}</strong></div>
    <div><span class="label">Completed</span><strong>${summary.completed || 0}</strong></div>
    <div><span class="label">Remaining</span><strong>${summary.remaining || 0}</strong></div>
    <div><span class="label">Request status</span><strong>${escapeSignatoryText(data.request.status)}</strong></div>
  `;
  if (gateMessage) {
    gateMessage.textContent = signaturesReady
      ? 'All signatories for the current office are resolved. Status updates are available.'
      : `Status updates are locked until ${officeLabels[currentOffice] || 'the current office'} signatories are all Signed or Skipped.`;
    gateMessage.classList.toggle('ready', signaturesReady);
  }

  const requiredGroups = Object.entries(rows
    .filter((row) => row.template_key)
    .reduce((groups, row) => {
      const office = row.assigned_office || 'unassigned';
      (groups[office] ||= []).push(row);
      return groups;
    }, {}))
    .map(([office, officeRows]) => [
      office,
      officeRows.sort((a, b) => Number(a.approval_order) - Number(b.approval_order) || Number(a.id) - Number(b.id)),
    ])
    .sort(([, rowsA], [, rowsB]) => Number(rowsA[0].approval_order) - Number(rowsB[0].approval_order));
  const customRowsInOrder = rows
    .filter((row) => !row.template_key)
    .sort((a, b) => Number(a.approval_order) - Number(b.approval_order) || Number(a.id) - Number(b.id));
  const orderedGroups = [
    ...requiredGroups,
    ...(customRowsInOrder.length ? [['additional', customRowsInOrder]] : []),
  ];
  const customPositions = new Map(customRowsInOrder.map((row, index) => [String(row.id), index]));
  const sequencePositions = new Map(
    orderedGroups.flatMap(([, officeRows]) => officeRows)
      .map((row, index) => [String(row.id), index + 1])
  );
  list.innerHTML = rows.length ? orderedGroups.map(([office, officeRows]) => {
    const customRows = officeRows.filter((row) => !row.template_key);
    const isAdditionalGroup = office === 'additional';
    return `
    <li class="signatory-office-group">
      <h3>${isAdditionalGroup ? 'Additional Signatories' : officeLabels[office] || 'Unassigned Office'}</h3>
      ${canManage && isAdditionalGroup && customRows.length === 1 ? '<p class="text-muted">Add another custom signatory to enable reordering.</p>' : ''}
      <ol>${officeRows.map((row) => {
        const customIndex = customPositions.get(String(row.id));
        return `
        <li class="signatory-row" data-signatory-row-id="${Number(row.id)}">
          <span class="signatory-order" aria-label="Signing sequence ${sequencePositions.get(String(row.id))}">${sequencePositions.get(String(row.id))}</span>
          <span class="hidden" data-signatory-template="${escapeSignatoryText(row.template_key || '')}"></span>
          <div class="signatory-info">
            <strong>${escapeSignatoryText(row.signatory_name)}</strong>
            <span>${escapeSignatoryText(row.designation || 'Signatory')}</span>
            ${row.department ? `<span>Office: ${escapeSignatoryText(row.department)}</span>` : !row.template_key ? `<span>Assigned office: ${escapeSignatoryText(officeLabels[row.assigned_office] || row.assigned_office || 'Unassigned')}</span>` : ''}
            ${row.document_location ? `<span>Document: ${escapeSignatoryText(row.document_location)}</span>` : ''}
            <span>${row.status === 'Signed' && row.signed_at ? `Signed: ${formatDate(row.signed_at)}` : `Last changed: ${formatDate(row.updated_at || row.signed_at)}`}</span>
          </div>
          <span class="status-badge ${row.status === 'Signed' ? 'completed' : ''}">${escapeSignatoryText(row.status)}</span>
          ${canManage || row.assigned_office === session.role ? `<div class="signatory-actions">
            ${row.status === 'Pending Signature' && row.assigned_office === currentOffice && (row.template_key ? session.role === row.assigned_office : (canManage || row.assigned_office === session.role)) ? `<button type="button" class="btn btn-sm btn-primary" data-signatory-action="Signed" data-signatory-id="${Number(row.id)}">Mark Signed</button>` : ''}
            ${canManage && !row.template_key ? `<button type="button" class="btn btn-sm btn-secondary" data-signatory-move="up" data-signatory-id="${row.id}" title="${customRows.length === 1 ? 'Add another custom signatory to enable reordering.' : customIndex === 0 ? 'This signatory is already first.' : 'Move signatory up'}" ${customRows.length === 1 || customIndex === 0 ? 'disabled' : ''}>Up</button>
            <button type="button" class="btn btn-sm btn-secondary" data-signatory-move="down" data-signatory-id="${row.id}" title="${customRows.length === 1 ? 'Add another custom signatory to enable reordering.' : customIndex === customRows.length - 1 ? 'This signatory is already last.' : 'Move signatory down'}" ${customRows.length === 1 || customIndex === customRows.length - 1 ? 'disabled' : ''}>Down</button>
            <button type="button" class="btn btn-sm btn-secondary" data-signatory-delete="${row.id}">Remove</button>` : ''}
          </div>` : ''}
        </li>
      `; }).join('')}</ol>
    </li>
  `;
  }).join('') : '<li class="text-muted">No signatories configured.</li>';

  const history = data.signatory_history || [];
  const historyEl = document.getElementById('signatoryHistory');
  if (historyEl) {
    historyEl.innerHTML = history.length
      ? history.map((item) => `<li><strong>${item.action}</strong> ${item.status ? `to ${item.status}` : ''} by ${item.updated_by || 'System'} <span class="meta">${formatDate(item.created_at)}</span></li>`).join('')
      : '<li class="text-muted">No signatory changes recorded.</li>';
  }

  form.classList.toggle('hidden', !canConfigureSignatories);
  accessMessage.classList.toggle('hidden', canConfigureSignatories || rows.length > 0);
  const officeSelect = document.getElementById('signatoryOffice');
  if (officeSelect) {
    officeSelect.disabled = false;
  }
  form.dataset.tracking = tracking;
}

function renderFundDashboard(data, requestedAmount = 0) {
  const list = document.getElementById('fundDashboard');
  const status = document.getElementById('fundDashboardStatus');
  const summary = document.getElementById('fundDashboardSummary');
  if (!list) return;
  if (!data?.success) {
    list.innerHTML = `<p class="text-danger">${data?.message || 'Unable to load fund balances.'}</p>`;
    status.textContent = 'Unavailable';
    status.className = 'status-badge status-danger';
    return;
  }

  const amount = Number(requestedAmount) || 0;
  const remainingBudget = (Number(data.budget_allocation) || 0) - amount;
  const usedBudget = Number(data.total_used) || 0;
  const budgetBasis = Math.max(remainingBudget + usedBudget, 0);
  const usedPercent = budgetBasis > 0
    ? Math.min(Math.max(((usedBudget + amount) / budgetBasis) * 100, 0), 100)
    : 0;
  summary.innerHTML = `
    <div class="fund-dashboard-remaining"><span>Remaining budget</span><strong class="${remainingBudget < 0 ? 'text-danger' : ''}">${formatPeso(remainingBudget)}</strong></div>
    <div class="fund-progress-track"><div class="fund-progress-fill ${remainingBudget < 0 ? 'over' : ''}" style="width: ${usedPercent}%"></div></div>
    <small class="fund-progress-label">${usedPercent.toFixed(1)}% used</small>`;
  list.innerHTML = (data.offices || []).map((office) => {
    const remaining = Number(office.remaining_funds) || 0;
    const projected = remaining - amount;
    const negative = projected < 0;
    return `<div class="fund-dashboard-row">
      <span><strong>${office.label}</strong><small>${office.request_count || 0} active request${Number(office.request_count) === 1 ? '' : 's'}</small></span>
      <strong class="${negative ? 'text-danger' : ''}">${formatPeso(projected)}</strong>
    </div>`;
  }).join('') || '<p class="text-muted">No office balances available.</p>';
  const budget = Number(data.budget_allocation) || 0;
  const negative = budget - amount < 0;
  status.textContent = negative ? 'Over budget' : 'Available';
  status.className = `status-badge ${negative ? 'status-danger' : 'completed'}`;
}

async function refreshSignatoryWorkflow(tracking, session) {
  const data = await Api.detail(tracking);
  if (data.success) renderSignatoryWorkflow(data, session, tracking);
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  initAppLayout(session);

  const params = new URLSearchParams(window.location.search);
  const tracking = params.get('tracking');
  if (!tracking) {
    showAlert(document.getElementById('alertBox'), 'No tracking number specified.');
    document.getElementById('loadingCard').classList.add('hidden');
    return;
  }

  const data = await Api.detail(tracking);
  document.getElementById('loadingCard').classList.add('hidden');

  if (!data.success) {
    showAlert(document.getElementById('alertBox'), data.message);
    return;
  }

  let fundData;
  try {
    fundData = await Api.fundAvailability();
  } catch (error) {
    fundData = { success: false, message: 'Unable to load fund balances.' };
  }
  renderFundDashboard(fundData);

  const req = data.request;
  document.getElementById('detailsContent').classList.remove('hidden');
  document.getElementById('detailTitle').textContent =
    `${req.tracking_number}${req.title ? ' — ' + req.title : ''}`;

  renderOfficeStepper(req.status, 'officeStepper', data.signatories || [], data.signatory_summary?.current_office);

  document.getElementById('detailGrid').innerHTML = `
    <div class="detail-item"><div class="label">Tracking ID</div><div class="value">${req.tracking_number}</div></div>
    <div class="detail-item"><div class="label">Current Status</div><div class="value"><span class="status-badge ${statusBadgeClass(req.status)}">${req.status}</span></div></div>
    <div class="detail-item"><div class="label">Amount</div><div class="value">${formatPeso(req.request_amount)}</div></div>
    <div class="detail-item"><div class="label">Description</div><div class="value">${req.description || '—'}</div></div>
    <div class="detail-item"><div class="label">Last Updated By</div><div class="value">${req.updated_by || '—'}</div></div>
    <div class="detail-item"><div class="label">Last Updated</div><div class="value">${formatDate(req.updated_at)}</div></div>
  `;

  if (req.bur || req.ors || req.budget_type) {
    document.getElementById('budgetInfoCard').classList.remove('hidden');
    document.getElementById('budgetGrid').innerHTML = `
      <div class="detail-item"><div class="label">BUR</div><div class="value">${req.bur || '—'}</div></div>
      <div class="detail-item"><div class="label">ORS</div><div class="value">${req.ors || '—'}</div></div>
      <div class="detail-item"><div class="label">Budget Type</div><div class="value">${req.budget_type || '—'}</div></div>
    `;
  }

  const timeline = document.getElementById('timeline');
  timeline.innerHTML = data.timeline.length
    ? data.timeline
        .map(
          (item) => `
        <div class="timeline-item">
          <div class="status">${item.status}</div>
          <div class="meta">${item.updated_by || 'System'} · ${formatDate(item.created_at)}</div>
          ${item.notes ? `<div class="note">${item.notes}</div>` : ''}
        </div>
      `
        )
        .join('')
    : '<p class="text-muted">No status history yet.</p>';

  const canRemoveDocs = ['requesting', 'procurement'].includes(session.role);
  const docList = document.getElementById('docList');
  if (data.documents.length) {
    docList.innerHTML = data.documents
      .map(
        (d) => `
      <li>
        <span>${d.file_name} <small class="text-muted">(${d.uploaded_by || '—'}, ${formatDate(d.uploaded_at)})</small></span>
        <span>
          <a href="../${d.file_path}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">Open</a>
          ${canRemoveDocs ? `<button type="button" class="btn btn-sm btn-danger print-hide" data-delete-doc="${d.id}">Remove</button>` : ''}
        </span>
      </li>
    `
      )
      .join('');
  }

  document.getElementById('uploadLink').href =
    `upload.html?tracking=${encodeURIComponent(req.tracking_number)}`;

  const closed = ['Returned', 'Cancelled', 'Completed'].includes(req.status);
  document.getElementById('printDetailsBtn')?.addEventListener('click', () => window.print());
  const cancelBtn = document.getElementById('cancelRequestBtn');
  const returnBtn = document.getElementById('returnRequestBtn');
  if (cancelBtn && session.role === 'requesting' && !closed && req.status !== 'Paid') {
    cancelBtn.classList.remove('hidden');
    cancelBtn.addEventListener('click', async () => {
      if (!confirm('Cancel this request and restore funds?')) return;
      const notes = prompt('Reason (optional):') || '';
      const result = await Api.closeRequest({ tracking_number: req.tracking_number, action: 'cancel', notes });
      if (result.success) window.location.reload();
      else showAlert(document.getElementById('alertBox'), result.message);
    });
  }
  if (returnBtn && session.role === 'budget' && ['Registered', 'Under Budget Review', 'Reviewed'].includes(req.status)) {
    returnBtn.classList.remove('hidden');
    returnBtn.addEventListener('click', async () => {
      if (!confirm('Return this request to Requesting Office and restore funds?')) return;
      const notes = prompt('Reason (optional):') || '';
      const result = await Api.closeRequest({ tracking_number: req.tracking_number, action: 'return', notes });
      if (result.success) window.location.reload();
      else showAlert(document.getElementById('alertBox'), result.message);
    });
  }

  docList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-doc]');
    if (!btn) return;
    if (!confirm('Remove this document?')) return;
    const result = await Api.deleteDocument(Number(btn.dataset.deleteDoc));
    if (result.success) window.location.reload();
    else showAlert(document.getElementById('alertBox'), result.message);
  });

  renderSignatoryWorkflow(data, session, tracking);
  const signatoryForm = document.getElementById('signatoryForm');
  signatoryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await Api.updateSignatories({
      action: 'add',
      tracking_number: tracking,
      signatory_name: document.getElementById('signatoryName').value,
      designation: document.getElementById('signatoryDesignation').value,
      document_location: document.getElementById('signatoryDocumentLocation').value,
      assigned_office: document.getElementById('signatoryOffice').value,
    });
    if (result.success) {
      signatoryForm.reset();
      await refreshSignatoryWorkflow(tracking, session);
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });

  document.getElementById('signatoryList')?.addEventListener('click', async (e) => {
    const button = e.target instanceof Element ? e.target.closest('button') : null;
    if (!button || button.disabled) return;
    let payload = null;
    const id = Number(button.dataset.signatoryId || button.dataset.signatoryDelete);
    if (button.dataset.signatoryAction) {
      if (!Number.isSafeInteger(id) || id <= 0) {
        showAlert(document.getElementById('alertBox'), 'Could not identify the signatory to update. Reload the request and try again.');
        return;
      }
      payload = { action: 'set_status', id, status: button.dataset.signatoryAction };
    } else if (button.dataset.signatoryDelete) {
      payload = { action: 'delete', id };
    } else if (button.dataset.signatoryMove) {
      const currentRow = button.closest('.signatory-row');
      const current = [...document.querySelectorAll('.signatory-row')]
        .filter((row) => row.hasAttribute('data-signatory-row-id')
          && !row.querySelector('[data-signatory-template]')?.dataset.signatoryTemplate)
        .map((row) => Number(row.dataset.signatoryRowId));
      const position = current.indexOf(id);
      const swapWith = button.dataset.signatoryMove === 'up' ? position - 1 : position + 1;
      if (!currentRow || !Number.isSafeInteger(id) || id <= 0
        || position < 0 || swapWith < 0 || swapWith >= current.length) return;
      [current[position], current[swapWith]] = [current[swapWith], current[position]];
      payload = { action: 'reorder', order: current };
    }
    if (!payload) return;
    button.disabled = true;
    clearAlert(document.getElementById('alertBox'));
    try {
      const result = await Api.updateSignatories({ ...payload, tracking_number: tracking });
      if (result.success) {
        if (payload.action === 'set_status') {
          const currentRow = button.closest('.signatory-row');
          const isRequiredSigner = Boolean(
            currentRow?.querySelector('[data-signatory-template]')?.dataset.signatoryTemplate
          );
          const nextSigner = (result.signatories || [])
            .filter((signatory) => signatory.template_key && signatory.status === 'Pending Signature')
            .sort((a, b) => Number(a.approval_order) - Number(b.approval_order))[0];
          const nextOffice = nextSigner?.assigned_office || 'budget';
          if (isRequiredSigner && nextOffice !== session.role) {
            const nextOfficeLabel = nextSigner?.department || 'Budget Office';
            showAlert(
              document.getElementById('successBox'),
              `Signature recorded. The request is now with ${escapeSignatoryText(nextOfficeLabel)}. Returning to your office queue…`,
              'success'
            );
            setTimeout(() => {
              window.location.href = 'status.html';
            }, 1200);
          } else {
            window.location.reload();
          }
        } else {
          await refreshSignatoryWorkflow(tracking, session);
        }
      } else {
        showAlert(document.getElementById('alertBox'), result.message || 'Unable to update signatory workflow.');
        button.disabled = false;
      }
    } catch (error) {
      showAlert(document.getElementById('alertBox'), 'Unable to reach the server. Check your connection and try again.');
      button.disabled = false;
    }
  });

  const canUpdate = ['budget', 'procurement', 'pso', 'accounting', 'cashier'].includes(session.role);
  const closedRequest = ['Returned', 'Cancelled', 'Completed'].includes(req.status);
  const currentSignaturesReady = Boolean(data.signatory_summary?.ready_for_status_update);
  if (canUpdate && !(session.role === 'accounting' && req.status === 'Registered') && currentSignaturesReady && !closedRequest) {
    const opts = await Api.statusOptions(req.status);
    if (opts.success && opts.options.length) {
      const updateCard = document.getElementById('updateCard');
      updateCard.classList.remove('hidden');
      document.getElementById('updateTracking').value = req.tracking_number;
      const select = document.getElementById('newStatus');
      select.innerHTML =
        '<option value="">— Select status —</option>' +
        opts.options.map((o) => `<option value="${o}">${o}</option>`).join('');

      const hint = updateCard.querySelector('.text-muted');
      if (session.role === 'accounting') {
        if (hint) {
          hint.textContent =
            'Update financial monitoring status before Procurement (DV Processing → For Payment). Upload supporting documents separately — no payment processing.';
        }
      } else if (session.role === 'cashier') {
        if (hint) {
          hint.textContent =
            'Mark payment monitoring status (Paid → Completed). Monitoring only — no actual payment execution.';
        }
      } else if (session.role === 'procurement') {
        if (hint) {
          hint.textContent =
            'Update procurement monitoring status (Canvass → PO).';
        }
      } else if (session.role === 'pso') {
        if (hint) {
          hint.textContent =
            'Update property and supply monitoring status (Delivered → For Inspection → Accepted).';
        }
      }

      if (session.role === 'budget') {
        document.getElementById('budgetFields').classList.remove('hidden');
        document.getElementById('bur').value = req.bur || '';
        document.getElementById('ors').value = req.ors || '';
        document.getElementById('budget_type').value = req.budget_type || '';
      }

      const prefs = typeof getUserPreferences === 'function' ? getUserPreferences() : {};
      const notesEl = document.getElementById('notes');
      if (notesEl && !notesEl.value && prefs.default_notes) {
        notesEl.value = prefs.default_notes;
      }
      if (session.role === 'budget') {
        const budgetTypeEl = document.getElementById('budget_type');
        if (budgetTypeEl && !req.budget_type && prefs.default_budget_type) {
          budgetTypeEl.value = prefs.default_budget_type;
        }
      }
    }
  }

  document.getElementById('updateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(document.getElementById('alertBox'));
    clearAlert(document.getElementById('successBox'));

    const payload = {
      tracking_number: document.getElementById('updateTracking').value,
      status: document.getElementById('newStatus').value,
      notes: document.getElementById('notes').value,
    };

    if (session.role === 'budget') {
      payload.bur = document.getElementById('bur').value;
      payload.ors = document.getElementById('ors').value;
      payload.budget_type = document.getElementById('budget_type').value;
    }

    const result = await Api.updateStatus(payload);
    if (result.success) {
      showAlert(document.getElementById('successBox'), result.message, 'success');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });
});
