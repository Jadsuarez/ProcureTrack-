document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  const alertBox = document.getElementById('alertBox');
  const roleOptions = document.querySelectorAll('.role-option');

  roleOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      roleOptions.forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });

  function landingPage(role) {
    return role === 'requesting' ? 'new-track.html' : 'dashboard.html';
  }

  const session = await Api.session();
  if (session.logged_in) {
    window.location.href = landingPage(session.role);
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertBox);

    const role = loginForm.querySelector('input[name="role"]:checked')?.value;
    if (!role) {
      showAlert(alertBox, 'Please select your office role.');
      return;
    }

    const result = await Api.login(role);
    if (result.success) {
      window.location.href = landingPage(role);
    } else {
      showAlert(alertBox, result.message || 'Login failed.');
    }
  });
});
