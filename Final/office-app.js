(() => {
  const folder = decodeURIComponent(location.pathname).toLowerCase();
  const roles = folder.includes('budgetoffice') ? ['budget']
    : folder.includes('procurement office') ? ['procurement']
      : folder.includes('pso office') ? ['pso']
        : folder.includes('accounting office') ? ['accounting']
          : folder.includes('cashier office') ? ['cashier'] : [];
  const api = '../../backend';
  const login = '../login.html';

  const toast = (message, tone = 'info') => {
    let box = document.querySelector('.office-toast');
    if (!box) {
      box = document.createElement('div');
      box.className = 'office-toast';
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.dataset.tone = tone;
    box.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => box.classList.remove('is-visible'), 3000);
  };

  const request = async (url, options = {}) => {
    const response = await fetch(`${api}/${url}`, { credentials: 'include', ...options });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed.');
    return data;
  };

  const openDetails = (tracking) => {
    if (!tracking) return toast('Select a request first.', 'warning');
    window.location.href = `../../frontend/details.html?tracking=${encodeURIComponent(tracking)}`;
  };

  const getTracking = (element) => {
    const text = element.closest('tr')?.textContent || element.closest('section')?.textContent || '';
    return text.match(/(?:PR|CAA)-[0-9]{3,}/i)?.[0] || '';
  };

  const bindAuth = async () => {
    try {
      const session = await request('login.php?action=session');
      if (!session.logged_in || (roles.length && !roles.includes(session.role))) {
        window.location.href = login;
        return false;
      }
      document.body.dataset.role = session.role;
      return true;
    } catch (error) {
      toast('Unable to connect to the server.', 'warning');
      return false;
    }
  };

  const bindLogout = () => {
    const sidebar = document.querySelector('.sidebar-bottom-links, .sidebar-footer-links, .bottom-links');
    if (!sidebar || sidebar.querySelector('[data-action="logout"]')) return;
    const link = document.createElement('a');
    link.href = login;
    link.dataset.action = 'logout';
    link.textContent = 'Log out';
    sidebar.appendChild(link);
  };

  const bindInteractions = () => {
    document.querySelectorAll('a[href="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        toast(`${link.textContent.trim() || 'This link'} is not available yet.`);
      });
    });

    document.querySelectorAll('[aria-label*="Notification"], .notification, .notification-btn, .top-icon, .bell-button, .proc-notification').forEach((button) => {
      button.addEventListener('click', () => toast('No new notifications'));
    });

    document.querySelectorAll('.sidebar-bottom-links a[data-action="logout"], .sidebar-footer-links a[data-action="logout"], .bottom-links a[data-action="logout"]').forEach((link) => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        try { await request('login.php?action=logout'); } finally { window.location.href = login; }
      });
    });

    document.querySelectorAll('.new-request-button, .sidebar-request-btn, .sidebar-new-request, .new-request-btn, .new-request-sidebar').forEach((button) => {
      button.addEventListener('click', () => toast('New requests are submitted by the Requesting Office.'));
    });

    document.querySelectorAll('.download-report, .download-link, .export-btn, .analytics-export-btn').forEach((button) => {
      button.addEventListener('click', () => window.print());
    });

    document.querySelectorAll('.view-status-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const input = button.closest('section, .track-search-card')?.querySelector('input');
        try {
          const value = input?.value.trim();
          if (!value) throw new Error('Enter a tracking number first.');
          const result = await request(`fetch.php?action=search&tracking=${encodeURIComponent(value)}`);
          if (!result.requests?.length) throw new Error('No visible request found.');
          openDetails(result.requests[0].tracking_number);
        } catch (error) { toast(error.message, 'warning'); }
      });
    });

    document.querySelectorAll('.search-box input, .search-area input, .proc-search input').forEach((input) => {
      input.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const value = input.value.trim();
        if (!value) return;
        try {
          const result = await request(`fetch.php?action=search&tracking=${encodeURIComponent(value)}`);
          if (result.requests?.length === 1) openDetails(result.requests[0].tracking_number);
          else toast(`${result.requests?.length || 0} matching request(s)`);
        } catch (error) { toast(error.message, 'warning'); }
      });
    });

    document.querySelectorAll('tr button[aria-label*="View"], tr button[aria-label*="options"], tr button[aria-label*="Actions"], tr .more-btn, tr .more-button, tr .row-action, tr .table-action, tr .view-btn').forEach((button) => {
      button.addEventListener('click', () => openDetails(getTracking(button)));
    });

    document.querySelectorAll('.pagination button, .page-arrow, .page, .active-page').forEach((button) => {
      button.addEventListener('click', () => toast(`Page ${button.textContent.trim() || 'selected'} selected`));
    });
  };

  document.addEventListener('DOMContentLoaded', async () => {
    if (await bindAuth()) {
      bindLogout();
      bindInteractions();
    }
  });
})();
