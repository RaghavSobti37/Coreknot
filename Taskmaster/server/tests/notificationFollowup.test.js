jest.mock('../services/notificationDispatcher', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: 'notif-1' }),
}));

jest.mock('../models/Lead', () => ({
  find: jest.fn(),
}));

const Lead = require('../models/Lead');
const { createNotification } = require('../services/notificationDispatcher');
const { notifyRepForFollowup } = require('../services/notificationService');

describe('followup rep notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('notifyRepForFollowup sends in-app notification and email', async () => {
    const rep = { _id: 'rep-1', email: 'rep@example.com', name: 'Rep' };
    const lead = { _id: 'lead-1', name: 'Asha' };

    await notifyRepForFollowup(lead, rep, {
      title: 'Follow-up due: Asha',
      message: 'Call Asha now.',
    });

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'rep-1',
      title: 'Follow-up due: Asha',
      message: 'Call Asha now.',
      category: 'crm',
      type: 'reminder',
      relatedLeadId: 'lead-1',
      actionUrl: '/followups?highlight=lead-1',
    }));
  });

  test('notifyRepForFollowup still notifies when rep email missing on populated doc', async () => {
    const rep = { _id: 'rep-1', name: 'Rep' };
    const lead = { _id: 'lead-1', name: 'Asha' };

    await notifyRepForFollowup(lead, rep, {
      title: 'Follow-up due: Asha',
      message: 'Call Asha now.',
    });

    expect(createNotification).toHaveBeenCalled();
  });
});

describe('checkFollowups query filters', () => {
  test('due followup scan excludes converted leads', async () => {
    Lead.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    const { checkFollowups } = require('../services/notificationService');
    await checkFollowups();

    expect(Lead.find).toHaveBeenCalledWith(expect.objectContaining({
      leadStatus: { $ne: 'Converted' },
      $or: expect.arrayContaining([
        { reminderSent: false },
        { reminderSent: { $exists: false } },
        { reminderSent: null },
      ]),
    }));
  });

  test('due followup scan sends reminders for CRM yyyy-mm-dd date values', async () => {
    const { checkFollowups } = require('../services/notificationService');
    const { getISTDate } = require('../utils/attendanceDate');
    const now = getISTDate();
    const dateKey = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const timeKey = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const lead = {
      _id: 'lead-1',
      name: 'Asha',
      nextFollowupDate: dateKey,
      nextFollowupTime: timeKey,
      assignedRepId: { _id: 'rep-1' },
      save: jest.fn().mockResolvedValue(undefined),
    };

    Lead.find
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([lead]) })
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });

    await checkFollowups();

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'rep-1',
      title: 'Follow-up due: Asha',
      relatedLeadId: 'lead-1',
    }));
    expect(lead.reminderSent).toBe(true);
    expect(lead.save).toHaveBeenCalled();
  });
});
