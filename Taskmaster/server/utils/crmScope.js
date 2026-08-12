const mongoose = require('mongoose');
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

/**
 * Shared CRM list — no department crmType / own-rep filter.
 * Everyone with CRM access sees every lead in the tenant.
 * @returns {{ crmType: string|null, restrictToOwn: boolean }}
 */
function resolveCrmScope(_user, _queryCrmType) {
  return { crmType: null, restrictToOwn: false };
}

/**
 * Academy/sales may only mutate own leads. Artist-management may mutate any lead.
 */
function shouldRestrictCrmMutationsToOwn(user) {
  if (isAdminUser(user)) return false;
  const slug = getDepartmentSlug(user);
  if (slug === ARTIST_SLUG) return false;
  if (slug === SALES_SLUG) return true;
  return true;
}

/** Apply optional rep scoping. crmType is never implied from the viewer's department. */
function applyCrmScopeToQuery(query, user, reqQuery = {}, options = {}) {
  const { restrictToOwn } = resolveCrmScope(user, reqQuery.crmType);
  const restrictToOwnLeads = options.restrictToOwnLeads ?? restrictToOwn;

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
