document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth(['requesting']);
  if (!session) return;

  initAppLayout(session);
  const body = document.getElementById('requestTableBody');
  const total = document.getElementById('requestTotal');
  const sortSelect = document.getElementById('requestSort');
  let requests = [];

  function renderRequests() {
    const [field, direction] = sortSelect.value.split('_');
    const sorted = [...requests].sort((a, b) => {
      const aValue = field === 'tracking' || field === 'title' || field === 'status'
        ? String(a[field === 'tracking' ? 'tracking_number' : field] || '').toLowerCase()
        : new Date(a[field === 'created' ? 'created_at' : 'updated_at']).getTime();
      const bValue = field === 'tracking' || field === 'title' || field === 'status'
        ? String(b[field === 'tracking' ? 'tracking_number' : field] || '').toLowerCase()
        : new Date(b[field === 'created' ? 'created_at' : 'updated_at']).getTime();
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    body.innerHTML = sorted.length
      ? sorted.map((request) => `
          <tr>
            <td><strong>${request.tracking_number}</strong></td>
            <td>${request.title || '-'}</td>
            <td>${formatPeso(request.request_amount)}</td>
            <td><span class="status-badge ${statusBadgeClass(request.status)}">${request.status}</span></td>
            <td>${formatDate(request.created_at)}</td>
            <td>${formatDate(request.updated_at)}</td>
            <td><a href="details.html?tracking=${encodeURIComponent(request.tracking_number)}" class="btn btn-sm btn-secondary">View</a></td>
          </tr>
        `).join('')
      : '<tr><td colspan="7" class="text-muted">No requests found.</td></tr>';
  }

  try {
    const data = await Api.requestingRequests();
    if (!data.success) {
      showAlert(document.getElementById('alertBox'), data.message);
      body.innerHTML = '<tr><td colspan="7" class="text-muted">Unable to load requests.</td></tr>';
      return;
    }
    requests = data.requests || [];
    total.textContent = `${requests.length} request${requests.length === 1 ? '' : 's'}`;
    renderRequests();
    sortSelect.addEventListener('change', renderRequests);
  } catch (error) {
    showAlert(document.getElementById('alertBox'), 'Requests could not be loaded. Please try again.');
    body.innerHTML = '<tr><td colspan="7" class="text-muted">Unable to load requests.</td></tr>';
  }
});
