document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;

  initAppLayout(session);
  const status = new URLSearchParams(window.location.search).get('status') || '';
  const heading = document.getElementById('statusHeading');
  const subtitle = document.getElementById('statusSubtitle');
  const total = document.getElementById('statusTotal');
  const body = document.getElementById('statusRequestsBody');

  if (!status) {
    showAlert(document.getElementById('alertBox'), 'No status was specified.');
    return;
  }

  heading.textContent = status;
  subtitle.textContent = `Requests currently in ${status}.`;
  const data = await Api.statusRequests(status);
  if (!data.success) {
    showAlert(document.getElementById('alertBox'), data.message);
    body.innerHTML = '<tr><td colspan="5" class="text-muted">Unable to load requests.</td></tr>';
    return;
  }

  total.textContent = data.total;
  body.innerHTML = data.requests.length
    ? data.requests.map((request) => `
        <tr>
          <td><strong>${request.tracking_number}</strong></td>
          <td>${request.title || '-'}</td>
          <td><span class="status-badge ${statusBadgeClass(request.status)}">${request.status}</span></td>
          <td>${formatDate(request.updated_at)}</td>
          <td><a href="details.html?tracking=${encodeURIComponent(request.tracking_number)}" class="btn btn-sm btn-secondary">View</a></td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" class="text-muted">No requests in this status.</td></tr>';
});
