import { resolvePostAuthPath } from './postAuthPath';

describe('resolvePostAuthPath', () => {
  it('routes users without memberships to org create', () => {
    expect(resolvePostAuthPath({ memberships: [], needsOrgCreate: true })).toBe('/org/create');
    expect(resolvePostAuthPath({ memberships: [] })).toBe('/org/create');
  });

  it('routes needsTenantSelection to org pick', () => {
    expect(resolvePostAuthPath({
      memberships: [{ id: '1' }, { id: '2' }],
      needsTenantSelection: true,
    })).toBe('/org/pick');
  });

  it('falls back to login return path', () => {
    expect(resolvePostAuthPath(
      { memberships: [{ id: '1' }], activeTenantId: 't1' },
      { search: '?redirect=/todo' },
    )).toBe('/todo');
  });
});
