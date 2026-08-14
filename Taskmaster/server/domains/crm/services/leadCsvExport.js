/**
 * Shared flattening + CSV serialization for CRM lead exports.
 * Used by the HTTP export endpoint (filtered / selected-row export) and by
 * server/scripts/exportAllLeadsCsv.js (full dump to a project file).
 */

const escapeCsvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`;
};

const toIso = (value) => (value ? new Date(value).toISOString() : '');
const toId = (value) => (value ? String(value) : '');

const toJson = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value) && value.length === 0) return '';
  if (typeof value === 'object' && Object.keys(value).length === 0) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const toList = (value) => (Array.isArray(value) ? value.filter(Boolean).join('; ') : '');

/** Every column exported for a lead — mirrors the full Lead schema (incl. tenantId). */
const LEAD_EXPORT_FIELDS = [
  'id', 'tenantId', 'rowId', 'customerIdExly', 'transactionIdExly', 'exlyOfferingId', 'exlyOfferingTitle', 'exlyOfferings',
  'crmType', 'artistProject', 'contactCategory',
  'name', 'nameKey', 'email', 'phone', 'city',
  'webinarDates', 'attended', 'attendanceDurationMin', 'qnaAnswered',
  'artistType', 'fullTimeWillingness', 'primaryRole', 'learningGoal', 'learnedMusic', 'currentJourney',
  'meaningfulConnect', 'leadQuality', 'callStatus', 'leadStatus', 'remarks', 'notes', 'source', 'planOption',
  'nextFollowupDate', 'nextFollowupTime', 'setReminder',
  'assignedRepId', 'assignedRepName', 'assignedRepEmail',
  'createdBy', 'importId', 'metadata', 'tags', 'emailStatus', 'status', 'location', 'bounceCount',
  'unsubscribed', 'unsubscribeReason', 'unsubscribedFrom',
  'lockedBy', 'lockedAt', 'reminderSent', 'notifiedOverdue',
  'createdAt', 'updatedAt',
];

/** Flatten a lean Lead doc (with populated assignedRepId) into a flat CSV row. */
function leadToFlatRow(lead = {}) {
  const rep = lead.assignedRepId && typeof lead.assignedRepId === 'object'
    ? lead.assignedRepId
    : null;
  const notes = Array.isArray(lead.notes)
    ? lead.notes
      .map((n) => (n && n.author ? `${n.author}: ${n.text || ''}` : n?.text || ''))
      .filter(Boolean)
      .join(' | ')
    : '';
  return {
    id: toId(lead._id),
    tenantId: toId(lead.tenantId),
    rowId: lead.rowId || '',
    customerIdExly: lead.customerIdExly || '',
    transactionIdExly: lead.transactionIdExly || '',
    exlyOfferingId: lead.exlyOfferingId || '',
    exlyOfferingTitle: lead.exlyOfferingTitle || '',
    exlyOfferings: toJson(lead.exlyOfferings),
    crmType: lead.crmType || '',
    artistProject: lead.artistProject || '',
    contactCategory: lead.contactCategory || '',
    name: lead.name || '',
    nameKey: lead.nameKey || '',
    email: lead.email || '',
    phone: lead.phone || '',
    city: lead.city || '',
    webinarDates: lead.webinarDates || '',
    attended: lead.attended || '',
    attendanceDurationMin: lead.attendanceDurationMin || '',
    qnaAnswered: lead.qnaAnswered || '',
    artistType: lead.artistType || '',
    fullTimeWillingness: lead.fullTimeWillingness || '',
    primaryRole: lead.primaryRole || '',
    learningGoal: lead.learningGoal || '',
    learnedMusic: lead.learnedMusic || '',
    currentJourney: lead.currentJourney || '',
    meaningfulConnect: lead.meaningfulConnect || '',
    leadQuality: lead.leadQuality || '',
    callStatus: lead.callStatus || '',
    leadStatus: lead.leadStatus || '',
    remarks: lead.remarks || '',
    notes,
    source: lead.source || '',
    planOption: lead.planOption || '',
    nextFollowupDate: lead.nextFollowupDate || '',
    nextFollowupTime: lead.nextFollowupTime || '',
    setReminder: lead.setReminder ? 'true' : 'false',
    assignedRepId: rep ? toId(rep._id) : toId(lead.assignedRepId),
    assignedRepName: rep?.name || '',
    assignedRepEmail: rep?.email || '',
    createdBy: toId(lead.createdBy),
    importId: toId(lead.importId),
    metadata: toJson(lead.metadata),
    tags: toList(lead.tags),
    emailStatus: lead.emailStatus || '',
    status: lead.status || '',
    location: lead.location || '',
    bounceCount: lead.bounceCount ?? '',
    unsubscribed: lead.unsubscribed ? 'true' : 'false',
    unsubscribeReason: lead.unsubscribeReason || '',
    unsubscribedFrom: toJson(lead.unsubscribedFrom),
    lockedBy: toId(lead.lockedBy),
    lockedAt: toIso(lead.lockedAt),
    reminderSent: lead.reminderSent ? 'true' : 'false',
    notifiedOverdue: lead.notifiedOverdue ? 'true' : 'false',
    createdAt: toIso(lead.createdAt),
    updatedAt: toIso(lead.updatedAt),
  };
}

const leadCsvHeader = () => LEAD_EXPORT_FIELDS.map(escapeCsvCell).join(',');

const leadToCsvLine = (lead) => {
  const row = leadToFlatRow(lead);
  return LEAD_EXPORT_FIELDS.map((key) => escapeCsvCell(row[key])).join(',');
};

module.exports = {
  LEAD_EXPORT_FIELDS,
  leadToFlatRow,
  leadCsvHeader,
  leadToCsvLine,
  escapeCsvCell,
};
