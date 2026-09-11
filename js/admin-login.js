(function () {
  'use strict';

  var form = document.getElementById('login-form');
  var errorBox = document.getElementById('login-error');
  var submitBtn = document.getElementById('login-submit');

  function fail(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    var email = form.elements.email.value.trim();
    var password = form.elements.password.value;
    if (!email || !password) {
      fail('Informe e-mail e senha.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando…';

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          return { status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (res.status === 200 && res.data.ok) {
          window.location.replace('/admin');
          return;
        }
        fail(res.data.message || 'Não foi possível entrar. Tente novamente.');
      })
      .catch(function () {
        fail('Erro de conexão. Tente novamente.');
      });
  });
})();
