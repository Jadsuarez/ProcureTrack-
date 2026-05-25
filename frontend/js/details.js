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

  renderFlowDiagram(req.status, 'flowDiagram');

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

  const canUpdate = ['budget', 'procurement', 'accounting', 'cashier'].includes(session.role);
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
