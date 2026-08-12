const mongoose = require('mongoose');
const { CRM_TYPES } = require('../../shared/artistCrmTaxonomy');
const { isAdminUser, getDepartmentSlug, SALES_SLUG, ARTIST_SLUG } = require('./departmentPermissions');

const AKASH_PATTERNS = [/akash/i];

/**
 * Akash (artist-management) is the single owner of the whole CRM pipeline —
 * he sees and manages every lead (artist + academy/sales).
 */
function isAkashUser(user) {
  if (!user) return false;
  if (getDepartmentSlug(user) !== ARTIST_SLUG) return false;
  return AKASH_PATTERNS.some((p) => p.test(user?.name || '') || p.test(user?.email || ''));
}

/** Legacy sales leads may predate the crmType field (schema default is not backfilled on read). */
function applySalesCrmTypeFilter(query) {
  query.$and = query.$and || [];
  query.$and.push({
    $or: [
      { crmType: CRM_TYPES.SALES },
      { crmType: { $exists: false } },
      { crmType: null },
      { crmType: '' },
    ],
  });
}

/**
 * Resolve CRM segment filter for the current user.
 * Artist-management: shared team pipeline (see all artist leads).
 * Sales / Academy: own leads only.
 * @returns {{ crmType: string|null, restrictToOwn: boolean }}
 */
function resolveCrmScope(user, queryCrmType) {
  if (isAdminUser(user)) {
    const crmType = queryCrmType === CRM_TYPES.ARTIST || queryCrmType === CRM_TYPES.SALES
      ? queryCrmType
      : null;
    return { crmType, restrictToOwn: false };
  }

  // ponytail: Akash owns the full CRM — sees artist + academy leads, no rep filter.
  if (isAkashUser(user)) {
    return { crmType: null, restrictToOwn: false };
  }

  const slug = getDepartmentSlug(user);
  if (slug === ARTIST_SLUG) {
    // ponytail: artist team shares the full artist CRM list
    return { crmType: CRM_TYPES.ARTIST, restrictToOwn: false };
  }
  if (slug === SALES_SLUG) {
    return { crmType: CRM_TYPES.SALES, restrictToOwn: true };
  }

  // Custom page permissions: infer from explicit query if CRM access granted
  const requested = queryCrmType === CRM_TYPES.ARTIST || queryCrmType === CRM_TYPES.SALES
    ? queryCrmType
    : CRM_TYPES.SALES;
  return { crmType: requested, restrictToOwn: true };
}

/**
 * Academy/sales may only mutate own leads. Artist-management may mutate any artist lead.
 */
function shouldRestrictCrmMutationsToOwn(user) {
  if (isAdminUser(user)) return false;
  const slug = getDepartmentSlug(user);
  if (slug === ARTIST_SLUG) return false;
  if (slug === SALES_SLUG) return true;
  return true;
}

/** Apply crmType + optional rep scoping to a Mongo query object. */
function applyCrmScopeToQuery(query, user, reqQuery = {}, options = {}) {
  const { crmType, restrictToOwn } = resolveCrmScope(user, reqQuery.crmType);
  const restrictToOwnLeads = options.restrictToOwnLeads ?? restrictToOwn;
  // Unrestricted users (admin, Akash) ignore any crmType the client may send —
  // stale mobile bundles may still pass crmType=artist.
  const unrestricted = isAdminUser(user) || isAkashUser(user);

  if (crmType === CRM_TYPES.SALES) {
    applySalesCrmTypeFilter(query);
  } else if (crmType) {
    query.crmType = crmType;
  } else if (!unrestricted && reqQuery.crmType === CRM_TYPES.SALES) {
    applySalesCrmTypeFilter(query);
  } else if (!unrestricted && reqQuery.crmType === CRM_TYPES.ARTIST) {
    query.crmType = reqQuery.crmType;
  }

  if (restrictToOwnLeads && user?._id) {
    query.assignedRepId = mongoose.Types.ObjectId.isValid(user._id)
      ? new mongoose.Types.ObjectId(user._id)
      : user._id;
  }

  return query;
}

module.exports = {
  resolveCrmScope,
  applyCrmScopeToQuery,
  shouldRestrictCrmMutationsToOwn,
  isAkashUser,
};
