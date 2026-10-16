(() => {
  'use strict';

  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.textContent = reveal ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(reveal));
    });
  });

  const form = document.querySelector('form[data-validate]');
  if (form) {
    const feedback = form.querySelector('[data-form-feedback]');
    const password = form.querySelector('#password');
    const confirm = form.querySelector('[data-confirm-password]');
    const confirmHint = form.querySelector('[data-confirm-hint]');

    const clearInvalid = (input) => {
      if (!input) return;
      input.removeAttribute('aria-invalid');
    };

    form.querySelectorAll('input[required]').forEach((input) => {
      input.addEventListener('input', () => clearInvalid(input));
    });

    const checkPasswords = () => {
      if (!password || !confirm || !confirm.value) {
        if (confirm) clearInvalid(confirm);
        if (confirmHint) confirmHint.textContent = 'Enter the same password in both fields.';
        return true;
      }
      const matches = password.value === confirm.value;
      confirm.setAttribute('aria-invalid', String(!matches));
      if (confirmHint) confirmHint.textContent = matches ? 'Passwords match.' : 'These passwords do not match yet.';
      return matches;
    };
    if (password && confirm) {
      password.addEventListener('input', checkPasswords);
      confirm.addEventListener('input', checkPasswords);
    }

    form.addEventListener('submit', (event) => {
      if (feedback) feedback.textContent = '';
      const invalid = Array.from(form.querySelectorAll('input[required]')).find((input) => !input.checkValidity());
      if (invalid) {
        event.preventDefault();
        invalid.setAttribute('aria-invalid', 'true');
        if (feedback) feedback.textContent = invalid.validationMessage || 'Please check this field.';
        invalid.focus();
        return;
      }
      if (password && password.value.length < 8) {
        event.preventDefault();
        password.setAttribute('aria-invalid', 'true');
        if (feedback) feedback.textContent = 'Use at least 8 characters for your password.';
        password.focus();
        return;
      }
      if (password && confirm && !checkPasswords()) {
        event.preventDefault();
        if (feedback) feedback.textContent = 'Make sure both password fields match.';
        confirm.focus();
      }
    });
  }

  const fileInput = document.querySelector('#profileImage');
  const preview = document.querySelector('[data-image-preview]');
  if (fileInput && preview) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      const existingImage = preview.querySelector('img');
      if (existingImage) existingImage.remove();
      preview.innerHTML = '<span class="preview-initial">+</span>';
      fileInput.setCustomValidity('');
      if (!file) return;
      if (!allowed.includes(file.type)) {
        fileInput.setCustomValidity('Choose a JPG, PNG, or WebP image.');
        fileInput.reportValidity();
        fileInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        fileInput.setCustomValidity('Choose an image that is 2 MB or smaller.');
        fileInput.reportValidity();
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result !== 'string') return;
        const image = document.createElement('img');
        image.src = reader.result;
        image.alt = '';
        preview.replaceChildren(image);
      });
      reader.readAsDataURL(file);
    });
  }
})();
