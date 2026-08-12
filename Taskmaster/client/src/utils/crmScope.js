import { getDepartmentSlug, isAdminUser, isArtistManagerUser, ARTIST_SLUG } from './departmentPermissions';

export const CRM_TYPES = {
  SALES: 'sales',
  ARTIST: 'artist',
};

const AKASH_PATTERNS = [/akash/i];

/**
 * Akash (artist-management) owns the full CRM — sees artist + academy leads.
 * Mirrors server/utils/crmScope.js isAkashUser.
 */
export function isAllCrmScopeUser(user) {
  if (!user || isAdminUser(user)) return false;
  if (getDepartmentSlug(user) !== ARTIST_SLUG) return false;
  return AKASH_PATTERNS.some((p) => p.test(user?.name || '') || p.test(user?.email || ''));
}

/** Artist CRM filters, import UI, and manager list (artist dept, artists-page access, admin). */
export function isArtistCrmView(user) {
  if (!user) return false;
  if (isArtistOnlyCrmUser(user)) return true;
  return isArtistManagerUser(user);
}

/** Artist-management dept users (not sales/admin) see artist CRM segment. */
export function isArtistOnlyCrmUser(user) {
  if (!user || isAdminUser(user)) return false;
  if (isAllCrmScopeUser(user)) return false; // Akash sees the full pipeline, not just artist.
  const slug = getDepartmentSlug(user);
  return slug === ARTIST_SLUG;
}

/** Artist CRM rep dropdown + labels (list mode or open lead). */
export function isArtistCrmContext(user, lead = null) {
  if (isArtistOnlyCrmUser(user)) return true;
  return lead?.crmType === CRM_TYPES.ARTIST;
}

export function resolveClientCrmType(user) {
  if (isArtistOnlyCrmUser(user)) return CRM_TYPES.ARTIST;
  return CRM_TYPES.SALES;
}

/** CRM list/follow-up pages share team pipelines; filters narrow results. */
export function crmRestrictsToOwnLeads() {
  return false;
}

export function crmQueryParamsForUser(user, extra = {}) {
  // Admin and Akash browse both CRM segments — no crmType filter from the client.
  if ((isAdminUser(user) || isAllCrmScopeUser(user)) && !extra.crmType) {
    return { ...extra };
  }
  const crmType = extra.crmType || resolveClientCrmType(user);
  return { ...extra, crmType };
}
