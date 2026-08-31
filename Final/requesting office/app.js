(() => {
  const showToast = (message, tone = 'info') => {
    let toast = document.querySelector('.app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'app-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  };

  const bindGlobalSearch = () => {
    const search = document.querySelector('#global-search');
    const rows = [...document.querySelectorAll('.data-table tbody tr')];
    if (!search || rows.length === 0) return;

    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      rows.forEach((row) => {
        const matches = !query || row.textContent.toLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      showToast(query ? `${visible} matching record${visible === 1 ? '' : 's'}` : 'Showing all records');
    });
  };

  const bindNotifications = () => {
    document.querySelectorAll('[aria-label="Notifications"]').forEach((button) => {
      button.addEventListener('click', () => showToast('No new notifications'));
    });
  };

  const bindCommonActions = () => {
    document.querySelectorAll('a[href="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showToast(`${link.textContent.trim() || 'This link'} is not available yet.`);
      });
    });

    document.querySelectorAll('a[href="../login.html"]').forEach((link) => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          await fetch('../../backend/login.php?action=logout', { credentials: 'include' });
        } finally {
          window.location.href = '../login.html';
        }
      });
    });

    document.querySelectorAll('button').forEach((button) => {
      if (!button.textContent.toLowerCase().includes('view detail')) return;
      button.addEventListener('click', () => {
        const tracking = button.closest('tr')?.textContent.match(/(?:PR|CAA)-[0-9]{3,}/i)?.[0];
        if (tracking) window.location.href = `../../frontend/details.html?tracking=${encodeURIComponent(tracking)}`;
        else showToast('Request details are unavailable.');
      });
    });
  };

  const bindReportActions = () => {
    document.querySelectorAll('button').forEach((button) => {
      const label = button.textContent.trim().toLowerCase();
      if (!label.includes('download') && !label.includes('export / print')) return;
      button.addEventListener('click', () => window.print());
    });
  };

  const bindRequestForm = () => {
    const form = document.querySelector('form');
    if (!form || !document.querySelector('.data-table')) return;

      const rows = () => [...form.querySelectorAll('.data-table tbody tr')];
    const refreshNumbers = () => rows().forEach((row, index) => {
      const number = row.querySelector('.item-number');
      if (number) number.textContent = String(index + 1).padStart(2, '0');
    });

    form.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('[aria-label^="Delete item"]');
      if (deleteButton) {
        const row = deleteButton.closest('tr');
        if (rows().length > 1) {
          row.remove();
          refreshNumbers();
        } else {
          showToast('At least one item is required', 'warning');
        }
        return;
      }

      const addButton = event.target.closest('button');
      if (addButton && addButton.textContent.toLowerCase().includes('add row')) {
        const firstRow = form.querySelector('.data-table tbody tr');
        const clone = firstRow.cloneNode(true);
        clone.querySelectorAll('input').forEach((input) => {
          if (input.type === 'number') input.value = '1';
          else input.value = '';
        });
        clone.querySelectorAll('[aria-label^="Delete item"]').forEach((button) => {
          button.setAttribute('aria-label', 'Delete item');
        });
        firstRow.parentElement.appendChild(clone);
        refreshNumbers();
        showToast('Item row added');
      }
    });

    const draftButton = [...form.querySelectorAll('button')].find((button) => button.textContent.toLowerCase().includes('save as draft'));
    draftButton?.addEventListener('click', () => {
      localStorage.setItem('procurement-request-draft', new FormData(form).get('description') || '');
      showToast('Draft saved on this device');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const titleField = form.querySelector('[name="project_title"]');
      const payload = {
        title: titleField?.selectedOptions[0]?.textContent.trim() || '',
        description: form.querySelector('[name="description"]')?.value.trim() || ''
      };

      try {
        const response = await fetch('../../backend/create_request.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Request could not be submitted.');
        showToast(`Request ${result.request.tracking_number} created`, 'success');
        form.reset();
      } catch (error) {
        showToast(error.message || 'Unable to connect to the server', 'warning');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindGlobalSearch();
    bindNotifications();
    bindCommonActions();
    bindReportActions();
    bindRequestForm();
  });
})();
