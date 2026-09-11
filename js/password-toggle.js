// Botão de "olho" em todo campo de senha do painel: mostra/oculta o que está sendo digitado.
(function () {
  'use strict';

  var EYE =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 5C6.6 5 2.9 9 1.6 12c1.3 3 5 7 10.4 7s9.1-4 10.4-7C21.1 9 17.4 5 12 5zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>';
  var EYE_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3.3 2.3 2 3.6l3.1 3.1C3.4 8.1 2.2 10 1.6 12c1.3 3 5 7 10.4 7 1.9 0 3.6-.5 5.1-1.3l3.3 3.3 1.3-1.3L3.3 2.3zM12 16.5A4.5 4.5 0 0 1 7.5 12c0-.8.2-1.5.5-2.1l1.9 1.9a2 2 0 0 0 2.3 2.3l1.9 1.9c-.6.3-1.3.5-2.1.5zM12 5c-1.4 0-2.8.3-4 .8l2 2c.6-.2 1.3-.3 2-.3a4.5 4.5 0 0 1 4.5 4.5c0 .7-.1 1.4-.3 2l2.8 2.8c1.6-1.3 2.8-3 3.4-4.8C21.1 9 17.4 5 12 5z"/></svg>';

  document.querySelectorAll('input[type="password"]').forEach(function (input) {
    var wrap = document.createElement('div');
    wrap.className = 'password-field';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'password-toggle';
    if (input.id) button.setAttribute('aria-controls', input.id);

    function render(visible) {
      button.innerHTML = visible ? EYE_OFF : EYE;
      button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      button.setAttribute('aria-pressed', String(visible));
      button.title = visible ? 'Ocultar senha' : 'Mostrar senha';
    }

    button.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      render(show);
      input.focus();
    });

    // Ao enviar o formulário, volta a ocultar para a senha não ficar exposta na tela.
    if (input.form) {
      input.form.addEventListener('submit', function () {
        input.type = 'password';
        render(false);
      });
    }

    render(false);
    wrap.appendChild(button);
  });
})();
