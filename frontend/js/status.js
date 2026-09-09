document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  initAppLayout(session);
  const heading = document.getElementById('statusHeading');
  const subtitle = document.getElementById('statusSubtitle');
  const total = document.getElementById('statusTotal');
  const body = document.getElementById('statusRequestsBody');
  const sortSelect = document.getElementById('officeRequestSort');
  const filterSelect = document.getElementById('officeRequestFilter');
  const searchInput = document.getElementById('officeRequestSearch');
  const minimumAmountInput = document.getElementById('minimumRequestAmount');
  const maximumAmountInput = document.getElementById('maximumRequestAmount');
  const previousButton = document.getElementById('previousRequestPage');
  const nextButton = document.getElementById('nextRequestPage');
  const pageInfo = document.getElementById('requestPageInfo');
  const pageSize = 15;
  let page = 1;
  let requests = [];

  const data = await Api.officeRequests();
  if (!data.success) {
    showAlert(document.getElementById('alertBox'), data.message);
    body.innerHTML = '<tr><td colspan="6" class="text-muted">Unable to load requests.</td></tr>';
    return;
  }

  const pageLabel = session.role === 'requesting' ? 'My Requests' : `${data.office_label} Requests`;
  heading.textContent = pageLabel;
  subtitle.textContent = session.role === 'requesting'
    ? 'All requests submitted by the Requesting Office.'
    : `All requests visible to ${data.office_label}.`;
  requests = data.requests || [];
  (data.statuses || []).forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    filterSelect.appendChild(option);
  });

  function renderRequests() {
    const [field, direction] = sortSelect.value.split('_');
    const selectedStatus = filterSelect.value;
    const searchTerm = searchInput.value.trim().toLowerCase();
    const minimumAmount = Number(minimumAmountInput.value);
    const maximumAmount = Number(maximumAmountInput.value);
    const filtered = requests.filter((request) => {
      const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
      const searchableText = `${request.tracking_number || ''} ${request.title || ''}`.toLowerCase();
      const amount = Number(request.request_amount) || 0;
      const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
      const matchesMinimum = !minimumAmountInput.value || amount >= minimumAmount;
      const matchesMaximum = !maximumAmountInput.value || amount <= maximumAmount;
      return matchesStatus && matchesSearch && matchesMinimum && matchesMaximum;
    });
    const sorted = [...filtered].sort((a, b) => {
      const key = field === 'tracking' ? 'tracking_number' : field;
      const aValue = ['tracking', 'title', 'status'].includes(field)
        ? String(a[key] || '').toLowerCase()
        : field === 'amount' ? Number(a.request_amount) || 0
        : new Date(a[field === 'created' ? 'created_at' : 'updated_at']).getTime();
      const bValue = ['tracking', 'title', 'status'].includes(field)
        ? String(b[key] || '').toLowerCase()
        : field === 'amount' ? Number(b.request_amount) || 0
        : new Date(b[field === 'created' ? 'created_at' : 'updated_at']).getTime();
      return aValue < bValue ? -1 * (direction === 'asc' ? 1 : -1)
        : aValue > bValue ? 1 * (direction === 'asc' ? 1 : -1) : 0;
    });
    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    page = Math.min(page, pageCount);
    const pageRequests = sorted.slice((page - 1) * pageSize, page * pageSize);
    pageInfo.textContent = `Page ${page} of ${pageCount}`;
    total.textContent = sorted.length;
    previousButton.disabled = page <= 1;
    nextButton.disabled = page >= pageCount;
    body.innerHTML = pageRequests.length
      ? pageRequests.map((request) => `
        <tr>
          <td><strong>${request.tracking_number}</strong></td>
          <td>${request.title || '-'}</td>
          <td><span class="status-badge ${statusBadgeClass(request.status)}">${request.status}</span></td>
          <td>${formatPeso(request.request_amount)}</td>
          <td>${formatDate(request.updated_at)}</td>
          <td><a href="details.html?tracking=${encodeURIComponent(request.tracking_number)}" class="btn btn-sm btn-secondary">View</a></td>
        </tr>
      `).join('')
      : '<tr><td colspan="6" class="text-muted">No requests found.</td></tr>';
  }

  renderRequests();
  sortSelect.addEventListener('change', () => {
    page = 1;
    renderRequests();
  });
  filterSelect.addEventListener('change', () => {
    page = 1;
    renderRequests();
  });
  [searchInput, minimumAmountInput, maximumAmountInput].forEach((input) => {
    input.addEventListener('input', () => {
      page = 1;
      renderRequests();
    });
  });
  previousButton.addEventListener('click', () => {
    if (page > 1) { page -= 1; renderRequests(); }
  });
  nextButton.addEventListener('click', () => {
    page += 1;
    renderRequests();
  });
});
