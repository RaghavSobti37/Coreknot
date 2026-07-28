/**
 * Artist/events assignment prefers Akash; sales manual create no longer silent-round-robins.
 */
jest.mock('../utils/primaryCallAssignee', () => ({
  findUserByPatterns: jest.fn(),
  resolvePrimaryCallAssigneeId: jest.fn(),
}));
jest.mock('../utils/bookedCallRepAssignment', () => ({
  assignNextBookedCallRep: jest.fn().mockResolvedValue(null),
}));
jest.mock('../models/Lead', () => ({
  countDocuments: jest.fn(() => ({ session: jest.fn().mockResolvedValue(0) })),
}));
jest.mock('../models/User', () => ({
  find: jest.fn(() => ({ session: jest.fn().mockResolvedValue([]) })),
}));
jest.mock('../models/Department', () => ({
  findOne: jest.fn(() => ({ session: jest.fn().mockResolvedValue(null) })),
}));

const { findUserByPatterns, resolvePrimaryCallAssigneeId } = require('../utils/primaryCallAssignee');
const {
  assignLeadToArtistRep,
  isArtistOrEventsLead,
  resolveAkashAssigneeId,
} = require('../utils/crmAssignment');
const { CRM_TYPES, CONTACT_CATEGORIES } = require('../../shared/artistCrmTaxonomy');

describe('crmAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flags artist + event contact categories', () => {
    expect(isArtistOrEventsLead({ crmType: CRM_TYPES.ARTIST })).toBe(true);
    expect(isArtistOrEventsLead({ contactCategory: CONTACT_CATEGORIES.EVENT_ORGANIZER })).toBe(true);
    expect(isArtistOrEventsLead({ contactCategory: CONTACT_CATEGORIES.EVENT_DATABASE })).toBe(true);
    expect(isArtistOrEventsLead({ contactCategory: CONTACT_CATEGORIES.BOOKING_ENQUIRY })).toBe(true);
    expect(isArtistOrEventsLead({ crmType: CRM_TYPES.SALES })).toBe(false);
  });

  it('resolveAkashAssigneeId returns Akash user id', async () => {
    findUserByPatterns.mockResolvedValueOnce({ _id: 'akash-1', name: 'Akash Kumar' });
    await expect(resolveAkashAssigneeId()).resolves.toBe('akash-1');
  });

  it('assignLeadToArtistRep prefers Akash over primary settings', async () => {
    findUserByPatterns
      .mockResolvedValueOnce({ _id: 'akash-1', name: 'Akash' })
      .mockResolvedValue(null);
    resolvePrimaryCallAssigneeId.mockResolvedValue('someone-else');

    await expect(assignLeadToArtistRep()).resolves.toBe('akash-1');
    expect(resolvePrimaryCallAssigneeId).not.toHaveBeenCalled();
  });
});
