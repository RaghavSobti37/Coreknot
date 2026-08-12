const { resolveCrmScope, applyCrmScopeToQuery, shouldRestrictCrmMutationsToOwn, isAkashUser } = require('../utils/crmScope');
const { CRM_TYPES } = require('../../shared/artistCrmTaxonomy');

describe('crmScope', () => {
  const artistUser = {
    _id: '507f1f77bcf86cd799439011',
    departmentId: { slug: 'artist-management' },
  };

  const akashUser = {
    _id: '507f1f77bcf86cd799439014',
    name: 'Akash Kumar',
    email: 'akash@example.com',
    departmentId: { slug: 'artist-management' },
  };

  const otherArtistUser = {
    _id: '507f1f77bcf86cd799439015',
    name: 'Harshika Kasliwal',
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

  it('everyone with CRM access sees every lead — no crmType or own-rep filter', () => {
    for (const user of [artistUser, salesUser, adminUser, akashUser, otherArtistUser]) {
      expect(resolveCrmScope(user)).toEqual({
        crmType: null,
        restrictToOwn: false,
      });
      const query = {};
      applyCrmScopeToQuery(query, user, { crmType: CRM_TYPES.ARTIST });
      expect(query).toEqual({});
      expect(query.assignedRepId).toBeUndefined();
    }
  });

  it('artist-management may mutate any lead; sales/academy may not', () => {
    expect(shouldRestrictCrmMutationsToOwn(artistUser)).toBe(false);
    expect(shouldRestrictCrmMutationsToOwn(salesUser)).toBe(true);
    expect(shouldRestrictCrmMutationsToOwn(adminUser)).toBe(false);
  });

  it('Akash is still recognized as the all-CRM owner', () => {
    expect(isAkashUser(akashUser)).toBe(true);
    expect(isAkashUser(otherArtistUser)).toBe(false);
    expect(shouldRestrictCrmMutationsToOwn(akashUser)).toBe(false);
  });
});
