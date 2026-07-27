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

  it('does not let non-admin users override own-lead scope with assignedRepId', () => {
    const user = {
      _id: '507f1f77bcf86cd799439012',
      departmentId: { slug: 'sales' },
    };
    const query = buildLeadListQuery(user, {
      assignedRepId: '507f1f77bcf86cd799439099',
    });

    expect(String(query.assignedRepId)).toBe(user._id);
  });
});
