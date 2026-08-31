document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  const alertBox = document.getElementById('alertBox');

  function landingPage() {
    // The current UI uses one role-aware dashboard for every office.
    return 'dashboard.html';
  }

  const session = await Api.session();
  if (session.logged_in) {
    window.location.href = landingPage();
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
      window.location.href = landingPage();
    } else {
      showAlert(alertBox, result.message || 'Login failed.');
    }
  });
});
