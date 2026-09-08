const {
  isOpenMultiTenant,
  isRegistrationAllowed,
  assertEstablishAllowed,
} = require('../domains/auth/utils/establishAccess');

describe('establishAccess open multi-tenant', () => {
  const originalOpen = process.env.OPEN_MULTI_TENANT;
  const originalDomain = process.env.ALLOWED_DOMAIN;
  const originalAdmin = process.env.ADMIN_EMAIL;
  const originalEnv = process.env.NODE_ENV;
  const originalDisabled = process.env.REGISTRATION_DISABLED;

  afterEach(() => {
    process.env.OPEN_MULTI_TENANT = originalOpen;
    process.env.ALLOWED_DOMAIN = originalDomain;
    process.env.ADMIN_EMAIL = originalAdmin;
    process.env.NODE_ENV = originalEnv;
    process.env.REGISTRATION_DISABLED = originalDisabled;
  });

  it('allows any email when OPEN_MULTI_TENANT is default/true', () => {
    delete process.env.OPEN_MULTI_TENANT;
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_DOMAIN = 'theshakticollective.in';
    expect(isOpenMultiTenant()).toBe(true);
    expect(isRegistrationAllowed('anyone@gmail.com').ok).toBe(true);
  });

  it('enforces ALLOWED_DOMAIN when OPEN_MULTI_TENANT=false in production', () => {
    process.env.OPEN_MULTI_TENANT = 'false';
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_DOMAIN = 'theshakticollective.in';
    process.env.ADMIN_EMAIL = 'admin@theshakticollective.in';
    expect(isRegistrationAllowed('guest@gmail.com').ok).toBe(false);
    expect(isRegistrationAllowed('staff@theshakticollective.in').ok).toBe(true);
  });

  it('assertEstablishAllowed throws for closed domain outsiders', () => {
    process.env.OPEN_MULTI_TENANT = 'false';
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_DOMAIN = 'theshakticollective.in';
    expect(() => assertEstablishAllowed({ email: 'x@y.com' })).toThrow(/restricted/i);
  });
});
