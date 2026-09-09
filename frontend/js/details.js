function renderSignatoryWorkflow(data, session, tracking) {
  const officeLabels = {
    requesting: 'Requesting Office',
    budget: 'Budget Office',
    accounting: 'Accounting Office',
    procurement: 'Procurement Office',
    pso: 'Property and Supply Office',
    cashier: 'Cashier',
  };
  const rows = data.signatories || [];
  const summary = data.signatory_summary || {};
  const list = document.getElementById('signatoryList');
  const summaryEl = document.getElementById('signatorySummary');
  const overallEl = document.getElementById('signatoryOverallStatus');
  const form = document.getElementById('signatoryForm');
  const accessMessage = document.getElementById('signatoryAccessMessage');
  const canManage = ['requesting', 'procurement'].includes(session.role);

  overallEl.textContent = summary.overall_status || 'No Signatories Configured';
  overallEl.className = `status-badge ${summary.overall_status === 'Signatures Complete' ? 'completed' : ''}`;
  summaryEl.innerHTML = `
    <div><span class="label">Current signatory</span><strong>${summary.current ? `${summary.current.signatory_name}${summary.current.designation ? ` (${summary.current.designation})` : ''}` : 'None'}</strong></div>
    <div><span class="label">Completed</span><strong>${summary.completed || 0}</strong></div>
    <div><span class="label">Remaining</span><strong>${summary.remaining || 0}</strong></div>
    <div><span class="label">Request status</span><strong>${data.request.status}</strong></div>
  `;

  const groupedRows = rows.reduce((groups, row) => {
    const office = row.assigned_office || 'unassigned';
    (groups[office] ||= []).push(row);
    return groups;
  }, {});
  list.innerHTML = rows.length ? Object.entries(groupedRows).map(([office, officeRows]) => `
    <li class="signatory-office-group">
      <h3>${officeLabels[office] || 'Unassigned Office'}</h3>
      <ol>${officeRows.map((row, index) => `
        <li class="signatory-row">
          <span class="signatory-order">${index + 1}</span>
          <div class="signatory-info">
            <strong>${row.signatory_name}</strong>
            <span>${row.designation || 'Signatory'}</span>
            <span>Document: ${row.document_location || 'Not specified'}</span>
          </div>
          <span class="status-badge ${row.status === 'Signed' ? 'completed' : ''}">${row.status}</span>
          ${canManage || row.assigned_office === session.role ? `<div class="signatory-actions">
            ${row.status === 'Pending Signature' && summary.current && Number(summary.current.id) === Number(row.id) ? '<button type="button" class="btn btn-sm btn-primary" data-signatory-action="Signed">Mark Signed</button><button type="button" class="btn btn-sm btn-secondary" data-signatory-action="Skipped">Skip</button>' : ''}
            ${canManage ? `<button type="button" class="btn btn-sm btn-secondary" data-signatory-move="up" data-signatory-id="${row.id}" ${index === 0 ? 'disabled' : ''}>Up</button>
            <button type="button" class="btn btn-sm btn-secondary" data-signatory-move="down" data-signatory-id="${row.id}" ${index === officeRows.length - 1 ? 'disabled' : ''}>Down</button>
            <button type="button" class="btn btn-sm btn-secondary" data-signatory-delete="${row.id}">Remove</button>` : ''}
          </div>` : ''}
        </li>
      `).join('')}</ol>
    </li>
  `).join('') : '<li class="text-muted">No signatories configured.</li>';

  form.classList.toggle('hidden', !canManage);
  accessMessage.classList.toggle('hidden', canManage || rows.length > 0);
  form.dataset.tracking = tracking;
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

  const req = data.request;
  document.getElementById('detailsContent').classList.remove('hidden');
  document.getElementById('detailTitle').textContent =
    `${req.tracking_number}${req.title ? ' — ' + req.title : ''}`;

  renderOfficeStepper(req.status, 'officeStepper');

  document.getElementById('detailGrid').innerHTML = `
    <div class="detail-item"><div class="label">Tracking ID</div><div class="value">${req.tracking_number}</div></div>
    <div class="detail-item"><div class="label">Current Status</div><div class="value"><span class="status-badge ${statusBadgeClass(req.status)}">${req.status}</span></div></div>
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

  const docList = document.getElementById('docList');
  if (data.documents.length) {
    docList.innerHTML = data.documents
      .map(
        (d) => `
      <li>
        <span>${d.file_name} <small class="text-muted">(${d.uploaded_by || '—'}, ${formatDate(d.uploaded_at)})</small></span>
        <a href="../${d.file_path}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">Open</a>
      </li>
    `
      )
      .join('');
  }

  document.getElementById('uploadLink').href =
    `upload.html?tracking=${encodeURIComponent(req.tracking_number)}`;

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
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    let payload = null;
    const id = Number(button.dataset.signatoryId || button.dataset.signatoryDelete);
    if (button.dataset.signatoryAction) {
      payload = { action: 'set_status', id, status: button.dataset.signatoryAction };
    } else if (button.dataset.signatoryDelete) {
      payload = { action: 'delete', id };
    } else if (button.dataset.signatoryMove) {
      const current = [...button.closest('.signatory-office-group').querySelectorAll('.signatory-row')]
        .map((row) => Number(row.querySelector('[data-signatory-id]')?.dataset.signatoryId));
      const position = current.indexOf(id);
      const swapWith = button.dataset.signatoryMove === 'up' ? position - 1 : position + 1;
      if (position < 0 || swapWith < 0 || swapWith >= current.length) return;
      [current[position], current[swapWith]] = [current[swapWith], current[position]];
      payload = { action: 'reorder', order: current };
    }
    if (!payload) return;
    const result = await Api.updateSignatories({ ...payload, tracking_number: tracking });
    if (result.success) {
      await refreshSignatoryWorkflow(tracking, session);
    } else {
      showAlert(document.getElementById('alertBox'), result.message);
    }
  });

  const canUpdate = ['budget', 'procurement', 'pso', 'accounting', 'cashier'].includes(session.role);
  if (canUpdate) {
    const opts = await Api.statusOptions();
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
            'Update financial monitoring status (DV Processing → For Payment). Upload supporting documents separately — no payment processing.';
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
