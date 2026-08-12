const { CRM_TYPES, LEAD_TYPE_TAGS } = require('../../shared/artistCrmTaxonomy');
const { ARTIST_SLUG, SALES_SLUG } = require('./departmentPermissions');

/** Canonical type tag for a crmType. Sales/missing crmType → academy. */
const crmTypeTag = (crmType) => (
  crmType === CRM_TYPES.ARTIST ? LEAD_TYPE_TAGS.ARTIST : LEAD_TYPE_TAGS.ACADEMY
);

/** Legacy leads predate crmType — infer from who the lead was with. */
const isArtistAssignee = ({ assigneeName = '', assigneeDeptSlug = '' } = {}) =>
  /akash|harshika/i.test(String(assigneeName || ''))
  || assigneeDeptSlug === ARTIST_SLUG;

const isAcademyAssignee = ({ assigneeName = '', assigneeDeptSlug = '' } = {}) =>
  /satyam/i.test(String(assigneeName || ''))
  || assigneeDeptSlug === SALES_SLUG;

/**
 * Resolve the canonical type tag for a lead.
 * crmType is authoritative; fall back to the assignee (name/department) for
 * legacy rows that predate the crmType field. Defaults to academy/sales.
 */
function resolveLeadTypeTag({ crmType, assigneeName, assigneeDeptSlug } = {}) {
  if (crmType) return crmTypeTag(crmType);
  if (isArtistAssignee({ assigneeName, assigneeDeptSlug })) return LEAD_TYPE_TAGS.ARTIST;
  if (isAcademyAssignee({ assigneeName, assigneeDeptSlug })) return LEAD_TYPE_TAGS.ACADEMY;
  return LEAD_TYPE_TAGS.ACADEMY;
}

/** Ensure a lead document carries its canonical type tag (idempotent). */
function ensureLeadTypeTag(doc) {
  if (!doc) return;
  const tag = crmTypeTag(doc.crmType);
  const tags = Array.isArray(doc.tags)
    ? doc.tags.filter((t) => typeof t === 'string' && t.trim())
    : [];
  if (!tags.includes(tag)) tags.push(tag);
  doc.tags = tags;
}

module.exports = {
  crmTypeTag,
  resolveLeadTypeTag,
  ensureLeadTypeTag,
  isArtistAssignee,
  isAcademyAssignee,
};
