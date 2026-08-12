jest.mock('../domains/crm/models/Lead', () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
}));

const Lead = require('../domains/crm/models/Lead');
const { buildLeadListQuery, fetchLeadsPaginated } = require('../domains/crm/services/leadQueryService');

describe('leadQueryService list limits', () => {
  it('clamps excessive lead list limits', async () => {
    await fetchLeadsPaginated({ role: 'admin' }, { limit: '10000', page: '1' });
    const pipeline = Lead.aggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({ $limit: 100 });
  });

  it('lets any CRM user filter the shared pipeline by assignedRepId', () => {
    const user = {
      _id: '507f1f77bcf86cd799439012',
      departmentId: { slug: 'sales' },
    };
    const otherRep = '507f1f77bcf86cd799439099';
    const query = buildLeadListQuery(user, { assignedRepId: otherRep });

    expect(query.crmType).toBeUndefined();
    expect(String(query.assignedRepId)).toBe(otherRep);
  });

  it('lets artist-management filter shared pipeline by assignedRepId without crmType', () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      departmentId: { slug: 'artist-management' },
    };
    const otherRep = '507f1f77bcf86cd799439099';
    const query = buildLeadListQuery(user, { assignedRepId: otherRep });

    expect(query.crmType).toBeUndefined();
    expect(String(query.assignedRepId)).toBe(otherRep);
  });
});
