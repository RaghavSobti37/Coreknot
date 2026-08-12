const { CRM_TYPES, LEAD_TYPE_TAGS } = require('../../shared/artistCrmTaxonomy');
const {
  crmTypeTag,
  resolveLeadTypeTag,
  ensureLeadTypeTag,
} = require('../utils/leadTypeTag');

describe('leadTypeTag', () => {
  it('maps crmType to the canonical tag', () => {
    expect(crmTypeTag(CRM_TYPES.ARTIST)).toBe(LEAD_TYPE_TAGS.ARTIST);
    expect(crmTypeTag(CRM_TYPES.SALES)).toBe(LEAD_TYPE_TAGS.ACADEMY);
    expect(crmTypeTag(undefined)).toBe(LEAD_TYPE_TAGS.ACADEMY);
    expect(crmTypeTag('')).toBe(LEAD_TYPE_TAGS.ACADEMY);
  });

  it('prefers crmType over assignee inference', () => {
    expect(resolveLeadTypeTag({ crmType: CRM_TYPES.ARTIST, assigneeName: 'Satyam Mishra' }))
      .toBe(LEAD_TYPE_TAGS.ARTIST);
    expect(resolveLeadTypeTag({ crmType: CRM_TYPES.SALES, assigneeName: 'Akash Kumar' }))
      .toBe(LEAD_TYPE_TAGS.ACADEMY);
  });

  it('infers legacy leads from the assignee name (Satyam → academy, Akash/Harshika → artist)', () => {
    expect(resolveLeadTypeTag({ assigneeName: 'Satyam Mishra' })).toBe(LEAD_TYPE_TAGS.ACADEMY);
    expect(resolveLeadTypeTag({ assigneeName: 'Akash Kumar' })).toBe(LEAD_TYPE_TAGS.ARTIST);
    expect(resolveLeadTypeTag({ assigneeName: 'Harshika Kasliwal' })).toBe(LEAD_TYPE_TAGS.ARTIST);
  });

  it('infers from the assignee department for unknown names', () => {
    expect(resolveLeadTypeTag({ assigneeDeptSlug: 'sales' })).toBe(LEAD_TYPE_TAGS.ACADEMY);
    expect(resolveLeadTypeTag({ assigneeDeptSlug: 'artist-management' })).toBe(LEAD_TYPE_TAGS.ARTIST);
  });

  it('defaults unclassified legacy leads to academy', () => {
    expect(resolveLeadTypeTag({ assigneeName: 'Unrelated Person' })).toBe(LEAD_TYPE_TAGS.ACADEMY);
    expect(resolveLeadTypeTag({})).toBe(LEAD_TYPE_TAGS.ACADEMY);
  });

  it('stamps the type tag on a doc, keeping existing tags, without duplicates', () => {
    const doc = { crmType: CRM_TYPES.ARTIST, tags: ['event-db', 'artist-lead'] };
    ensureLeadTypeTag(doc);
    expect(doc.tags).toEqual(['event-db', 'artist-lead']);

    const doc2 = { crmType: CRM_TYPES.SALES, tags: ['media-list'] };
    ensureLeadTypeTag(doc2);
    ensureLeadTypeTag(doc2); // idempotent
    expect(doc2.tags).toEqual(['media-list', LEAD_TYPE_TAGS.ACADEMY]);

    const doc3 = { tags: [] };
    ensureLeadTypeTag(doc3);
    expect(doc3.tags).toEqual([LEAD_TYPE_TAGS.ACADEMY]);
  });

  it('handles missing doc and non-array tags', () => {
    expect(() => ensureLeadTypeTag(null)).not.toThrow();
    const doc = { crmType: CRM_TYPES.ARTIST };
    ensureLeadTypeTag(doc);
    expect(doc.tags).toEqual([LEAD_TYPE_TAGS.ARTIST]);
  });
});
