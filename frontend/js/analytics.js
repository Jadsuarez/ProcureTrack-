/**
 * Office analytics — descriptive, diagnostic, predictive
 */

function renderAnalyticsKpis(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items
    .map(
      (k) => `
    <div class="stat-box">
      <div class="number">${k.value}</div>
      <div class="label">${k.label}</div>
      ${k.hint ? `<div class="stat-hint">${k.hint}</div>` : ''}
    </div>`
    )
    .join('');
}

function destroyChart(chart) {
  if (chart) chart.destroy();
}

function buildStatusChart(canvasId, byStatus) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !byStatus.length) return null;

  const colors = {
    Registered: '#64748b',
    'Under Budget Review': '#d97706',
    Reviewed: '#ca8a04',
    Canvass: '#7c3aed',
    'Abstract of Canvass': '#6d28d9',
    PO: '#4f46e5',
    'For Bidding': '#9333ea',
    'Bidding Award': '#7e22ce',
    Delivered: '#1d4ed8',
    'For Inspection': '#2563eb',
    Accepted: '#1e40af',
    'DV Processing': '#0891b2',
    'For Payment': '#0d9488',
    Paid: '#db2777',
    Completed: '#059669',
  };

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: byStatus.map((s) => s.status),
      datasets: [
        {
          data: byStatus.map((s) => s.count),
          backgroundColor: byStatus.map((s) => colors[s.status] || '#94a3b8'),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function buildTrendChart(canvasId, monthlyTrend) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyTrend.map((m) => m.month),
      datasets: [
        {
          label: 'Updated in month',
          data: monthlyTrend.map((m) => m.active_updates),
          backgroundColor: 'rgba(45, 90, 135, 0.7)',
        },
        {
          label: 'Completed in month',
          data: monthlyTrend.map((m) => m.completed),
          backgroundColor: 'rgba(13, 148, 136, 0.8)',
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

function buildStageDurationChart(canvasId, avgDays) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !avgDays.length) return null;

  const labels = avgDays.map((s) => s.stage);
  const values = avgDays.map((s) => s.avg_days);

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Avg. days',
          data: values,
          backgroundColor: 'rgba(217, 119, 6, 0.75)',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });
}

function buildForecastChart(canvasId, forecasts) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !forecasts.length) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: forecasts.map((f) => f.tracking_number),
      datasets: [
        {
          label: 'Est. days to complete',
          data: forecasts.map((f) => f.eta_days),
          backgroundColor: forecasts.map((f) =>
            f.at_risk ? 'rgba(220, 38, 38, 0.75)' : 'rgba(13, 148, 136, 0.75)'
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderStalledTable(tbodyId, rows) {
  const body = document.getElementById(tbodyId);
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="4" class="text-muted">No active requests in scope.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td><strong>${r.tracking_number}</strong></td>
      <td>${r.title || '—'}</td>
      <td><span class="status-badge ${statusBadgeClass(r.status)}">${r.status}</span></td>
      <td>${r.days_in_stage} days</td>
    </tr>`
    )
    .join('');
}

function renderForecastTable(tbodyId, rows) {
  const body = document.getElementById(tbodyId);
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="text-muted">No active requests to forecast.</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (f) => `
    <tr class="${f.at_risk ? 'row-at-risk' : ''}">
      <td><strong>${f.tracking_number}</strong></td>
      <td>${f.title || '—'}</td>
      <td><span class="status-badge ${statusBadgeClass(f.status)}">${f.status}</span></td>
      <td>~${f.eta_days} days</td>
      <td>${f.projected_completion}${f.at_risk ? ' <span class="risk-tag">At risk</span>' : ''}</td>
    </tr>`
    )
    .join('');
}

function renderMissingDocsList(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<p class="text-muted">All active requests have at least one document.</p>';
    return;
  }
  el.innerHTML = `<ul class="analytics-list">${items
    .map(
      (r) =>
        `<li><strong>${r.tracking_number}</strong> — ${r.title || 'Untitled'} (${r.status})</li>`
    )
    .join('')}</ul>`;
}

function setInsightText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setBottleneckText(id, bottleneck) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!bottleneck) {
    el.textContent = 'Not enough status history yet to identify a bottleneck.';
    return;
  }
  el.innerHTML = `Slowest stage: <strong>${bottleneck.stage}</strong> (avg. ${bottleneck.avg_days} days, n=${bottleneck.samples}).`;
}

async function loadAnalytics() {
  const data = await Api.analytics();
  if (!data.success) {
    showAlert(document.getElementById('alertBox'), data.message || 'Failed to load analytics.');
    return null;
  }
  return data;
}
