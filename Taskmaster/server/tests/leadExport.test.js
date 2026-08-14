const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Department = require('../models/Department');
const Lead = require('../domains/crm/models/Lead');
const { DEV_DEFAULT_PASSWORD } = require('../../shared/defaultPassword');
const { mintSessionAgent } = require('./helpers/mintTestSession');
const { PRESET_PAGES } = require('../utils/pagePermissions');
const { LEAD_EXPORT_FIELDS, leadCsvHeader } = require('../domains/crm/services/leadCsvExport');

async function ensureSalesDept() {
  let dept = await Department.findOne({ slug: 'sales' });
  if (!dept) {
    dept = await Department.create({
      name: 'Sales',
      slug: 'sales',
      permissionPreset: 'sales',
      pagePermissions: PRESET_PAGES.sales,
    });
  }
  return dept;
}

describe('CRM lead CSV export', () => {
  let agent;
  let stamp;

  beforeEach(async () => {
    stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const salesDept = await ensureSalesDept();
    agent = request.agent(app);

    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Export Rep',
        email: `export-${stamp}@coreknot-test.local`,
        password: DEV_DEFAULT_PASSWORD,
        gender: 'male',
      });
    expect(reg.statusCode).toBe(201);
    await User.findByIdAndUpdate(reg.body._id, { departmentId: salesDept._id });
    await mintSessionAgent(agent, reg.body._id);
  });

  const createLead = async (overrides = {}) => {
    const lead = await Lead.create({
      name: `Export Lead ${stamp} ${overrides.leadStatus || 'New'}`,
      phone: `+9198${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      email: `${overrides.emailKey || 'lead'}-${stamp}-${Math.random().toString(36).slice(2, 8)}@coreknot-test.local`,
      leadStatus: 'New',
      crmType: 'sales',
      remarks: 'Line one\nLine two with "quotes"',
      notes: [{ text: 'First note', author: 'Export Rep' }],
      tags: ['webinar', 'warm'],
      metadata: { publication: 'TSC Weekly' },
      ...overrides,
    });
    return lead;
  };

  const parseCsvLines = (text) => text.trim().split('\n');

  it('exports all leads as CSV with every lead field', async () => {
    const lead = await createLead();

    const res = await agent.get('/api/crm/export?format=csv');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/leads_export\.csv/);

    const lines = parseCsvLines(res.text);
    const header = lines[0];
    LEAD_EXPORT_FIELDS.forEach((field) => expect(header).toContain(`"${field}"`));
    expect(header).toBe(leadCsvHeader());

    const body = res.text;
    expect(body).toContain(lead.name);
    expect(body).toContain(lead.email);
    // flattened nested data + safe CSV escaping
    expect(body).toContain('Export Rep: First note');
    expect(body).toContain('webinar; warm');
    expect(body).toContain('"Line one Line two with ""quotes"""');
  });

  it('respects active filters (exports only matching leads)', async () => {
    const converted = await createLead({ leadStatus: 'Converted' });
    const fresh = await createLead({ leadStatus: 'New' });

    const res = await agent.get('/api/crm/export?format=csv&leadStatus=Converted');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain(converted.name);
    expect(res.text).not.toContain(fresh.name);
  });

  it('exports only the checkbox-selected lead ids', async () => {
    const keep = await createLead({ name: 'Keep Selected Lead', leadStatus: 'Converted' });
    const skip = await createLead({ name: 'Skip This Lead', leadStatus: 'Converted' });

    const res = await agent.get(`/api/crm/export?format=csv&ids=${keep._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain(keep.name);
    expect(res.text).not.toContain(skip.name);

    // multiple selected ids
    const multi = await agent.get(`/api/crm/export?format=csv&ids=${keep._id},${skip._id}`);
    expect(multi.statusCode).toBe(200);
    expect(multi.text).toContain(keep.name);
    expect(multi.text).toContain(skip.name);

    // invalid ids → empty result set, not a full dump
    const bad = await agent.get('/api/crm/export?format=csv&ids=not-an-id');
    expect(bad.statusCode).toBe(200);
    expect(parseCsvLines(bad.text).length).toBe(1); // header only
  });

  it('rejects unauthenticated export', async () => {
    const res = await request(app).get('/api/crm/export?format=csv');
    expect(res.statusCode).toBe(401);
  });

  it('blocks users without CRM access', async () => {
    const outsider = request.agent(app);
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Export Outsider',
        email: `export-outsider-${stamp}@coreknot-test.local`,
        password: DEV_DEFAULT_PASSWORD,
        gender: 'male',
      });
    expect(reg.statusCode).toBe(201);
    const creativeDept = await Department.findOne({ slug: 'creative' })
      || await Department.create({
        name: 'Creative',
        slug: 'creative',
        permissionPreset: 'creative',
        pagePermissions: PRESET_PAGES.creative,
      });
    await User.findByIdAndUpdate(reg.body._id, { departmentId: creativeDept._id });
    await mintSessionAgent(outsider, reg.body._id);

    const res = await outsider.get('/api/crm/export?format=csv');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/CRM access required/i);
  });
});
