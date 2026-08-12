export const SALES_REPS = {
  'sr01': 'Rohit Sobti',
  'sr02': 'Deepank Soni',
  'sr03': 'Rinki Roy',
  'sr04': 'Redacted User',
  'sr05': 'Sonesh Jain',
  'sr06': 'Satyam Mishra',
  'sr07': 'Shivam Sahijwani',
  'sr08': 'Harshika Kasliwal',
  'sr09': 'Aryaman',
  'akash': 'Akash'
};

const getRepName = (rep) => {
  if (!rep) return 'UNASSIGNED';
  if (typeof rep === 'object' && rep.name) return rep.name;
  return SALES_REPS[rep] || rep;
};

/** Canonical pipeline tags — mirror shared/artistCrmTaxonomy.js LEAD_TYPE_TAGS. */
export const LEAD_TYPE_TAGS = {
  ARTIST: 'artist-lead',
  ACADEMY: 'academy-lead',
};

export const LEAD_TYPE_TAG_LABELS = {
  [LEAD_TYPE_TAGS.ARTIST]: 'Artist Lead',
  [LEAD_TYPE_TAGS.ACADEMY]: 'Academy Lead',
};

/** Derive a lead's pipeline tag from its tags array or crmType. */
export function getLeadTypeTag(lead) {
  const tags = lead?.tags || [];
  if (Array.isArray(tags) && tags.includes(LEAD_TYPE_TAGS.ARTIST)) return LEAD_TYPE_TAGS.ARTIST;
  if (Array.isArray(tags) && tags.includes(LEAD_TYPE_TAGS.ACADEMY)) return LEAD_TYPE_TAGS.ACADEMY;
  return lead?.crmType === 'artist' ? LEAD_TYPE_TAGS.ARTIST : LEAD_TYPE_TAGS.ACADEMY;
}

export function formatLeadTypeTag(tag) {
  return LEAD_TYPE_TAG_LABELS[tag] || 'Lead';
}

export const MEANINGFUL_CONNECT_DEFAULT = 'PENDING';

/** Manual rep flag — not derived from call status or funnel stage. */
export const MEANINGFUL_CONNECT_OPTIONS = [
  { value: 'PENDING', label: 'Pending — not assessed yet' },
  { value: 'YES', label: 'Yes — had a meaningful conversation' },
  { value: 'NO', label: 'No — no meaningful connect' },
];

export function formatMeaningfulConnect(value) {
  const key = String(value || MEANINGFUL_CONNECT_DEFAULT).toUpperCase();
  if (key === 'YES') return 'Yes';
  if (key === 'NO') return 'No';
  return 'Pending';
}

export function meaningfulConnectBadgeVariant(value) {
  const key = String(value || MEANINGFUL_CONNECT_DEFAULT).toUpperCase();
  if (key === 'YES') return 'mint';
  if (key === 'NO') return 'slate';
  return 'warning';
}

export const formatExlyTag = (title) => {
  if (!title) return null;
  const lower = title.toLowerCase();
  if (lower.includes('hindustani classical masterclass')) return 'Classical Masterclass';
  if (lower.includes('production')) return 'Music Production';
  if (lower.includes('vocal')) return 'Vocal Training';
  if (lower.includes('guitar')) return 'Guitar Masterclass';
  // Fallback to max 3 words
  const words = title.split(' ');
  return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
};
