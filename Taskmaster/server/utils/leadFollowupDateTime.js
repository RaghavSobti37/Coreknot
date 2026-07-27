const { parse } = require('date-fns');

function parseLeadFollowupDateTime(lead) {
  const dateStr = String(lead?.nextFollowupDate || '').trim();
  if (!dateStr) return null;

  const timeStr = String(lead?.nextFollowupTime || '').trim();
  const dateFormats = ['yyyy-MM-dd', 'dd/MM/yyyy'];

  if (timeStr) {
    for (const dateFormat of dateFormats) {
      const with24h = parse(`${dateStr} ${timeStr}`, `${dateFormat} HH:mm`, new Date());
      if (!Number.isNaN(with24h.getTime())) return with24h;
      const with12h = parse(`${dateStr} ${timeStr}`, `${dateFormat} h:mm a`, new Date());
      if (!Number.isNaN(with12h.getTime())) return with12h;
    }
  }

  for (const dateFormat of dateFormats) {
    const dateOnly = parse(dateStr, dateFormat, new Date());
    if (!Number.isNaN(dateOnly.getTime())) return dateOnly;
  }
  return null;
}

function formatFollowupScheduleLabel(lead) {
  const dateStr = String(lead?.nextFollowupDate || '').trim();
  const timeStr = String(lead?.nextFollowupTime || '').trim();
  if (!dateStr) return 'scheduled time';
  return timeStr ? `${dateStr} at ${timeStr}` : dateStr;
}

module.exports = {
  parseLeadFollowupDateTime,
  formatFollowupScheduleLabel,
};
