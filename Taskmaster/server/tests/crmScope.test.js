const { resolveCrmScope, applyCrmScopeToQuery, shouldRestrictCrmMutationsToOwn } = require('../utils/crmScope');
const { CRM_TYPES } = require('../../shared/artistCrmTaxonomy');

describe('crmScope', () => {
  const artistUser = {
    _id: '507f1f77bcf86cd799439011',
    departmentId: { slug: 'artist-management' },
  };

  const salesUser = {
    _id: '507f1f77bcf86cd799439012',
    departmentId: { slug: 'sales' },
  };

  const adminUser = {
    _id: '507f1f77bcf86cd799439013',
    departmentId: { slug: 'admin', permissionPreset: 'admin' },
  };

  it('artist-management sees all artist CRM leads (shared team)', () => {
    expect(resolveCrmScope(artistUser)).toEqual({
      crmType: CRM_TYPES.ARTIST,
      restrictToOwn: false,
    });

    const query = {};
    applyCrmScopeToQuery(query, artistUser);
    expect(query).toEqual({
      crmType: CRM_TYPES.ARTIST,
    });
    expect(query.assignedRepId).toBeUndefined();
  });

  it('artist-management may mutate any artist lead; sales/academy may not', () => {
    expect(shouldRestrictCrmMutationsToOwn(artistUser)).toBe(false);
    expect(shouldRestrictCrmMutationsToOwn(salesUser)).toBe(true);
    expect(shouldRestrictCrmMutationsToOwn(adminUser)).toBe(false);
  });

  it('sales/academy reps see only assigned sales pipeline leads', () => {
    expect(resolveCrmScope(salesUser)).toEqual({
      crmType: CRM_TYPES.SALES,
      restrictToOwn: true,
    });

    const query = {};
    applyCrmScopeToQuery(query, salesUser);
    expect(String(query.assignedRepId)).toBe(salesUser._id);
    expect(query.$and).toEqual([{
      $or: [
        { crmType: CRM_TYPES.SALES },
        { crmType: { $exists: false } },
        { crmType: null },
        { crmType: '' },
      ],
    }]);
  });

  it('admin can browse both CRM segments without rep filter', () => {
    expect(resolveCrmScope(adminUser, CRM_TYPES.ARTIST)).toEqual({
      crmType: CRM_TYPES.ARTIST,
      restrictToOwn: false,
    });

    const query = {};
    applyCrmScopeToQuery(query, adminUser, { crmType: CRM_TYPES.ARTIST });
    expect(query).toEqual({ crmType: CRM_TYPES.ARTIST });
  });
});
