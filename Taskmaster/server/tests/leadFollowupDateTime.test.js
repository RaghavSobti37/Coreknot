const { parseLeadFollowupDateTime, formatFollowupScheduleLabel } = require('../utils/leadFollowupDateTime');

describe('leadFollowupDateTime', () => {
  test('parseLeadFollowupDateTime handles 24h time', () => {
    const dt = parseLeadFollowupDateTime({
      nextFollowupDate: '18/06/2026',
      nextFollowupTime: '14:30',
    });
    expect(dt).toBeInstanceOf(Date);
    expect(Number.isNaN(dt.getTime())).toBe(false);
  });

  test('parseLeadFollowupDateTime handles date-only followups', () => {
    const dt = parseLeadFollowupDateTime({ nextFollowupDate: '18/06/2026', nextFollowupTime: '' });
    expect(dt).toBeInstanceOf(Date);
    expect(Number.isNaN(dt.getTime())).toBe(false);
  });

  test('parseLeadFollowupDateTime handles CRM date input format', () => {
    const dt = parseLeadFollowupDateTime({
      nextFollowupDate: '2026-06-18',
      nextFollowupTime: '14:30',
    });
    expect(dt).toBeInstanceOf(Date);
    expect(dt.getFullYear()).toBe(2026);
    expect(dt.getMonth()).toBe(5);
    expect(dt.getDate()).toBe(18);
    expect(dt.getHours()).toBe(14);
    expect(dt.getMinutes()).toBe(30);
  });

  test('formatFollowupScheduleLabel includes date and time', () => {
    expect(formatFollowupScheduleLabel({
      nextFollowupDate: '18/06/2026',
      nextFollowupTime: '10:00',
    })).toBe('18/06/2026 at 10:00');
  });
});
