const mongoose = require('mongoose');
const { CRM_TYPES } = require('../../shared/artistCrmTaxonomy');
const { isAdminUser, getDepartmentSlug, SALES_SLUG, ARTIST_SLUG } = require('./departmentPermissions');

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
 * @returns {{ crmType: string|null, restrictToOwn: boolean }}
 */
function resolveCrmScope(user, queryCrmType) {
  if (isAdminUser(user)) {
    const crmType = queryCrmType === CRM_TYPES.ARTIST || queryCrmType === CRM_TYPES.SALES
      ? queryCrmType
      : null;
    return { crmType, restrictToOwn: false };
  }

  const slug = getDepartmentSlug(user);
  if (slug === ARTIST_SLUG) {
    return { crmType: CRM_TYPES.ARTIST, restrictToOwn: true };
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
 * CRM users may only mutate leads assigned to them unless they are admins.
 */
function shouldRestrictCrmMutationsToOwn(user) {
  if (isAdminUser(user)) return false;
  const slug = getDepartmentSlug(user);
  if (slug === ARTIST_SLUG) return true;
  if (slug === SALES_SLUG) return true;
  return true;
}

/** Apply crmType + optional rep scoping to a Mongo query object. */
function applyCrmScopeToQuery(query, user, reqQuery = {}, options = {}) {
  const { crmType, restrictToOwn } = resolveCrmScope(user, reqQuery.crmType);
  const restrictToOwnLeads = options.restrictToOwnLeads ?? restrictToOwn;

  if (crmType === CRM_TYPES.SALES) {
    applySalesCrmTypeFilter(query);
  } else if (crmType) {
    query.crmType = crmType;
  } else if (reqQuery.crmType === CRM_TYPES.SALES) {
    applySalesCrmTypeFilter(query);
  } else if (reqQuery.crmType === CRM_TYPES.ARTIST) {
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
};
