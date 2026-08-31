document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  const alertBox = document.getElementById('alertBox');

  function landingPage(role) {
    const map = {
      requesting: '../Final/requesting%20office/requestinghome.html',
      budget: '../Final/Budgetoffice/dashbudget.html',
      procurement: '../Final/procurement%20office/procurementdash.html',
      pso: '../Final/pSO%20office/psodash.html',
      accounting: '../Final/ACCOUNTING%20office/accountingdash.html',
      cashier: '../Final/Cashier%20office/cashdash.html',
    };

    return map[role] || '../Final/login.html';
  }

  const session = await Api.session();
  if (session.logged_in) {
    window.location.href = landingPage(session.role);
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertBox);

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showAlert(alertBox, 'Please enter your username and password.');
      return;
    }

    const result = await Api.login(username, password);
    if (result.success) {
      window.location.href = landingPage(result.role);
    } else {
      showAlert(alertBox, result.message || 'Login failed.');
    }
  });
});
