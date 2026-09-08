jest.mock('@clerk/clerk-sdk-node', () => ({
  verifyToken: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}));

const { verifyToken, clerkClient } = require('@clerk/clerk-sdk-node');
const {
  isClerkConfigured,
  verifyClerkSessionToken,
  clerkTokenInstanceMismatchMessage,
  primaryClerkEmail,
} = require('../utils/clerkAuth');

describe('clerkAuth', () => {
  const originalSecret = process.env.CLERK_SECRET_KEY;

  afterEach(() => {
    process.env.CLERK_SECRET_KEY = originalSecret;
    jest.clearAllMocks();
  });

  it('isClerkConfigured is false without secret', () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(isClerkConfigured()).toBe(false);
  });

  it('isClerkConfigured is false for mock secret', () => {
    process.env.CLERK_SECRET_KEY = 'mock_clerk_secret';
    expect(isClerkConfigured()).toBe(false);
  });

  it('verifyClerkSessionToken returns profile on valid token', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_real';
    verifyToken.mockResolvedValue({ sub: 'user_abc' });
    clerkClient.users.getUser.mockResolvedValue({
      id: 'user_abc',
      firstName: 'Ada',
      lastName: 'Lovelace',
      primaryEmailAddressId: 'em_1',
      emailAddresses: [{ id: 'em_1', emailAddress: 'Ada@Example.com' }],
    });

    const profile = await verifyClerkSessionToken('session_jwt');
    expect(profile).toEqual({
      clerkUserId: 'user_abc',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      clerkOrganizationId: null,
    });
  });

  it('verifyClerkSessionToken returns null on verify failure', async () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_real';
    verifyToken.mockRejectedValue(new Error('invalid'));

    await expect(verifyClerkSessionToken('bad')).resolves.toBeNull();
  });

  it('clerkTokenInstanceMismatchMessage detects dev JWT on live secret', () => {
    process.env.CLERK_SECRET_KEY = 'sk_live_abc';
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'https://glad-monkey-58.clerk.accounts.dev',
      sub: 'user_1',
    })).toString('base64url');
    const token = `${header}.${payload}.sig`;
    expect(clerkTokenInstanceMismatchMessage(token)).toMatch(/pk_live_/);
  });

  it('primaryClerkEmail picks primary address', () => {
    const email = primaryClerkEmail({
      primaryEmailAddressId: 'em_2',
      emailAddresses: [
        { id: 'em_1', emailAddress: 'old@example.com' },
        { id: 'em_2', emailAddress: 'Primary@Example.com' },
      ],
    });
    expect(email).toBe('primary@example.com');
  });
});

describe('resolveUserFromClerkProfile', () => {
  const originalSecret = process.env.CLERK_SECRET_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const { resolveUserFromClerkProfile } = require('../utils/clerkAuth');
  const Tenant = require('../models/Tenant');
  const User = require('../models/User');

  afterEach(async () => {
    process.env.CLERK_SECRET_KEY = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.DEFAULT_TENANT_ID;
    const { resetDefaultTenantCache } = require('../utils/defaultTenant');
    resetDefaultTenantCache();
    await User.deleteMany({ email: 'clerk-new@example.com' });
    await Tenant.deleteMany({ name: 'Default Tenant' });
    await Tenant.deleteMany({ name: 'Clerk Auth Tenant' });
    jest.clearAllMocks();
  });

  it('creates a user without tenant when Clerk org is not mapped (open multi-tenant)', async () => {
    process.env.NODE_ENV = 'production';
    const tenant = await Tenant.create({
      name: 'Clerk Auth Tenant',
      contactEmail: 'clerk-auth@test.com',
      status: 'active',
    });
    process.env.DEFAULT_TENANT_ID = String(tenant._id);

    const profile = {
      clerkUserId: 'user_clerk_new',
      email: 'clerk-new@example.com',
      name: 'Clerk New',
    };

    const dbUser = await resolveUserFromClerkProfile(profile);
    expect(dbUser).toBeTruthy();
    expect(dbUser.tenantId).toBeFalsy();
    expect(dbUser.clerkId).toBe('user_clerk_new');
  });

  it('attaches tenant only when guards.tenantId is provided', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_TENANT_ID;
    delete process.env.DEFAULT_TENANT_ID;
    const tenant = await Tenant.create({
      name: 'Clerk Auth Tenant',
      contactEmail: 'clerk-auth@test.com',
      status: 'active',
    });

    const profile = {
      clerkUserId: 'user_clerk_mapped',
      email: 'clerk-new@example.com',
      name: 'Clerk Mapped',
    };

    const dbUser = await resolveUserFromClerkProfile(profile, { tenantId: tenant._id });
    expect(dbUser).toBeTruthy();
    expect(String(dbUser.tenantId)).toBe(String(tenant._id));
    expect(dbUser.clerkId).toBe('user_clerk_mapped');
  });
});
