import { createClient } from '@supabase/supabase-js';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const form = document.querySelector('#reset-form');
const submitButton = document.querySelector('#submit-button');
const statusBox = document.querySelector('#status');
const newPasswordInput = document.querySelector('#new-password');
const confirmPasswordInput = document.querySelector('#confirm-password');
const errors = {
  newPassword: document.querySelector('#new-password-error'),
  confirmPassword: document.querySelector('#confirm-password-error'),
};

const icons = {
  eye: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.1 12s3.7-6.5 9.9-6.5S21.9 12 21.9 12s-3.7 6.5-9.9 6.5S2.1 12 2.1 12z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  `,
  eyeOff: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.7 5.7c.4-.1.8-.1 1.3-.1 6.2 0 9.9 6.4 9.9 6.4a17.5 17.5 0 0 1-2.8 3.4" />
      <path d="M6.6 6.9A17 17 0 0 0 2.1 12s3.7 6.5 9.9 6.5c1.6 0 3-.4 4.2-1" />
      <path d="M9.9 9.9a2.9 2.9 0 0 0 4 4" />
    </svg>
  `,
};

let supabase = null;
let hasRecoverySession = false;
let isLoading = false;

if (window.location.pathname === '/') {
  window.history.replaceState({}, '', '/reset-password' + window.location.search + window.location.hash);
}

document.querySelectorAll('[data-toggle-password]').forEach((button) => {
  button.innerHTML = icons.eye;
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const shouldShow = input.type === 'password';
    input.type = shouldShow ? 'text' : 'password';
    button.innerHTML = shouldShow ? icons.eyeOff : icons.eye;
    button.setAttribute(
      'aria-label',
      `${shouldShow ? 'Hide' : 'Show'} ${input.id === 'new-password' ? 'new' : 'confirm'} password`,
    );
  });
});

function setLoading(nextLoading) {
  isLoading = nextLoading;
  submitButton.disabled = nextLoading || !hasRecoverySession;
  submitButton.textContent = nextLoading ? 'Updating...' : 'Update password';
}

function showStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
  statusBox.hidden = false;
}

function clearStatus() {
  statusBox.hidden = true;
  statusBox.textContent = '';
}

function setFormEnabled(isEnabled) {
  newPasswordInput.disabled = !isEnabled;
  confirmPasswordInput.disabled = !isEnabled;
  submitButton.disabled = !isEnabled || isLoading;
}

function validateForm() {
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  let isValid = true;

  errors.newPassword.textContent = '';
  errors.confirmPassword.textContent = '';

  if (!newPassword) {
    errors.newPassword.textContent = 'Password is required.';
    isValid = false;
  } else if (newPassword.length < 6) {
    errors.newPassword.textContent = 'Password must be at least 6 characters.';
    isValid = false;
  }

  if (!confirmPassword) {
    errors.confirmPassword.textContent = 'Confirm password is required.';
    isValid = false;
  } else if (newPassword && newPassword !== confirmPassword) {
    errors.confirmPassword.textContent = 'Passwords must match.';
    isValid = false;
  }

  return { isValid, newPassword };
}

function getRecoveryUrlState() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return {
    code: query.get('code'),
    accessToken: hash.get('access_token') || query.get('access_token'),
    refreshToken: hash.get('refresh_token') || query.get('refresh_token'),
    type: hash.get('type') || query.get('type'),
    error: hash.get('error_description') || query.get('error_description'),
  };
}

async function bootstrapRecoverySession() {
  if (!supabaseUrl || !supabaseAnonKey) {
    showStatus('Supabase environment variables are missing. Please configure the app before deploying.', 'error');
    setFormEnabled(false);
    return;
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && !hasRecoverySession) {
      hasRecoverySession = true;
      clearStatus();
      setFormEnabled(true);
    }
  });

  const recovery = getRecoveryUrlState();

  if (recovery.error) {
    showStatus('Reset link is invalid or expired. Please request a new password reset link from the game.', 'error');
    setFormEnabled(false);
    return;
  }

  try {
    if (recovery.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(recovery.code);
      if (error) throw error;
      hasRecoverySession = true;
    } else if (recovery.accessToken && recovery.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: recovery.accessToken,
        refresh_token: recovery.refreshToken,
      });
      if (error) throw error;
      hasRecoverySession = true;
    } else {
      const { data } = await supabase.auth.getSession();
      hasRecoverySession = Boolean(data.session);
    }

    if (!hasRecoverySession) {
      showStatus('Reset link is invalid or expired. Please request a new password reset link from the game.', 'error');
      setFormEnabled(false);
      return;
    }

    window.history.replaceState({}, '', '/reset-password');
    clearStatus();
    setFormEnabled(true);
  } catch {
    showStatus('Reset link is invalid or expired. Please request a new password reset link from the game.', 'error');
    setFormEnabled(false);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();

  const { isValid, newPassword } = validateForm();
  if (!isValid || !supabase || !hasRecoverySession) return;

  setLoading(true);

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  setLoading(false);

  if (error) {
    showStatus(error.message || 'Unable to update password. Please try again.', 'error');
    return;
  }

  await supabase.auth.signOut();
  form.reset();
  setFormEnabled(false);
  showStatus('Password updated. Please return to Calm Realm and sign in again.', 'success');
});

newPasswordInput.addEventListener('input', validateForm);
confirmPasswordInput.addEventListener('input', validateForm);

// Clear fields aggressively on load to prevent stubborn autofills
setTimeout(() => {
  newPasswordInput.value = '';
  confirmPasswordInput.value = '';
}, 50);

setFormEnabled(false);
showStatus('Checking reset link...', 'info');
bootstrapRecoverySession();
