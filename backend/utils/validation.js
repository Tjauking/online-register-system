const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

// Shared by self-registration and admin-created agents
const validateNewAccount = (body) => {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || !email || !phone || !password) return { error: 'All fields are required' };
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address' };
  if (password.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters` };

  return { name, email, phone, password };
};

module.exports = { validateNewAccount, MIN_PASSWORD };
