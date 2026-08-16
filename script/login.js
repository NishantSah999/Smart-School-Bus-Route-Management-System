// SmartBus login page — sign-in + demo credential chips.
(() => {
  const form = document.getElementById('login-form');
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const btn = document.getElementById('submit-btn');
  const errBox = document.getElementById('login-error');

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  async function doLogin(email, password) {
    errBox.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const user = await api.login(email, password);
      toast.success(`Welcome, ${user.name}`);
      const target = user.role === 'DRIVER' ? '/pages/driver.html' : user.role === 'PARENT' ? '/pages/parent.html' : '/pages/dashboard.html';
      setTimeout(() => { window.location.href = target; }, 400);
    } catch (e) {
      showError(e.message || 'Unable to sign in. Please check your credentials.');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!emailEl.value || !passEl.value) { showError('Please enter your email and password.'); return; }
    doLogin(emailEl.value.trim(), passEl.value);
  });

  document.querySelectorAll('.demo-chip').forEach((chip) => {
    chip.addEventListener('click', () => doLogin(chip.dataset.email, chip.dataset.pass));
  });
})();