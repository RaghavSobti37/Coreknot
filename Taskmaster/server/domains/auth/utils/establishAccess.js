/** Open for any org by default. Set OPEN_MULTI_TENANT=false to restore closed domain gate. */
const isOpenMultiTenant = () =>
  String(process.env.OPEN_MULTI_TENANT || 'true').trim().toLowerCase() !== 'false';

const isRegistrationAllowed = (emailLower) => {
  if (process.env.REGISTRATION_DISABLED === 'true' && process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Registration is disabled. Contact an administrator.' };
  }
  if (isOpenMultiTenant()) return { ok: true };

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const allowedDomain = (process.env.ALLOWED_DOMAIN || '').trim().toLowerCase();
  const domain = emailLower.split('@')[1] || '';
  if (allowedDomain && domain !== allowedDomain && emailLower !== adminEmail) {
    return { ok: false, error: 'Registration restricted to authorized email domain' };
  }
  return { ok: true };
};

/**
 * Domain-only establish gate (not org membership).
 * @param {{ email: string }} profile
 */
const assertEstablishAllowed = (profile) => {
  const emailLower = profile?.email?.toLowerCase?.().trim();
  if (!emailLower) {
    const err = new Error('Clerk account has no email');
    err.status = 400;
    throw err;
  }
  const allowed = isRegistrationAllowed(emailLower);
  if (!allowed.ok) {
    const err = new Error(allowed.error || 'Registration not allowed');
    err.status = 403;
    throw err;
  }
};

module.exports = {
  isOpenMultiTenant,
  isRegistrationAllowed,
  assertEstablishAllowed,
};
