const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { GUEST_EMAIL, GUEST_SLUG } = require('../services/guestSandboxService');

describe('POST /api/auth/guest', () => {
  const originalDisabled = process.env.GUEST_LOGIN_DISABLED;

  afterEach(() => {
    process.env.GUEST_LOGIN_DISABLED = originalDisabled;
  });

  it('creates guest sandbox session with demo projects and tasks', async () => {
    delete process.env.GUEST_LOGIN_DISABLED;

    const agent = request.agent(app);
    const res = await agent.post('/api/auth/guest').send({});

    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('coreknot_token_v3=')]),
    );
    expect(res.body.email).toBe(GUEST_EMAIL);
    expect(res.body.isGuest).toBe(true);
    expect(res.body.activeTenantSlug).toBe(GUEST_SLUG);
    expect(res.body.needsOrgCreate).toBe(false);

    const tenant = await Tenant.findOne({ slug: GUEST_SLUG }).setOptions({ bypassTenant: true });
    expect(tenant).toBeTruthy();

    const projects = await Project.find({ tenantId: tenant._id }).setOptions({ bypassTenant: true });
    expect(projects.length).toBeGreaterThanOrEqual(2);

    const tasks = await Task.find({ tenantId: tenant._id }).setOptions({ bypassTenant: true });
    expect(tasks.length).toBeGreaterThanOrEqual(5);
    expect(tasks.every((t) => String(t.title).startsWith('[GUEST]'))).toBe(true);

    const me = await agent.get('/api/auth/me');
    expect(me.statusCode).toBe(200);
    expect(me.body.email).toBe(GUEST_EMAIL);
  });

  it('is idempotent on repeat guest login', async () => {
    delete process.env.GUEST_LOGIN_DISABLED;
    const first = await request(app).post('/api/auth/guest').send({});
    const second = await request(app).post('/api/auth/guest').send({});
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(String(first.body._id)).toBe(String(second.body._id));

    const users = await User.find({ email: GUEST_EMAIL }).setOptions({ bypassTenant: true });
    expect(users).toHaveLength(1);
  });

  it('respects GUEST_LOGIN_DISABLED', async () => {
    process.env.GUEST_LOGIN_DISABLED = 'true';
    const res = await request(app).post('/api/auth/guest').send({});
    expect(res.statusCode).toBe(403);
  });
});
