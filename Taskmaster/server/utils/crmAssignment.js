const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Department = require('../models/Department');
const { CRM_TYPES, CONTACT_CATEGORIES } = require('../../shared/artistCrmTaxonomy');
const { assignNextBookedCallRep } = require('./bookedCallRepAssignment');
const { findUserByPatterns, resolvePrimaryCallAssigneeId } = require('./primaryCallAssignee');

const SALES_SLUG = 'sales';
const ARTIST_SLUG = 'artist-management';
const AKASH_PATTERNS = [/akash/i];

const EVENT_CONTACT_CATEGORIES = new Set([
  CONTACT_CATEGORIES.EVENT_ORGANIZER,
  CONTACT_CATEGORIES.EVENT_DATABASE,
  CONTACT_CATEGORIES.BOOKING_ENQUIRY,
]);

/** Artist CRM + event/booking contacts → always route to Akash. */
const isArtistOrEventsLead = (leadData = {}) => {
  if (leadData.crmType === CRM_TYPES.ARTIST) return true;
  return EVENT_CONTACT_CATEGORIES.has(leadData.contactCategory);
};

const getSalesRepUsers = async (session = null) => {
  const salesDept = await Department.findOne({ slug: SALES_SLUG }).session(session);
  if (!salesDept) return [];
  return User.find({ departmentId: salesDept._id }).session(session);
};

const getArtistRepUsers = async (session = null) => {
  const artistDept = await Department.findOne({ slug: ARTIST_SLUG }).session(session);
  if (!artistDept) return [];
  return User.find({ departmentId: artistDept._id }).session(session);
};

/** Prefer Akash for all artist / events lead assignment. */
const resolveAkashAssigneeId = async () => {
  const akash = await findUserByPatterns(AKASH_PATTERNS, ARTIST_SLUG)
    || await findUserByPatterns(AKASH_PATTERNS);
  return akash?._id || null;
};

const assignLeadToRep = async (session = null) => {
  const roundRobinId = await assignNextBookedCallRep();
  if (roundRobinId) return roundRobinId;

  const reps = await getSalesRepUsers(session);
  if (reps.length === 0) return null;

  const leadCounts = await Promise.all(reps.map(async (rep) => {
    const count = await Lead.countDocuments({
      assignedRepId: rep._id,
      crmType: CRM_TYPES.SALES,
      leadStatus: { $ne: 'Converted' },
    }).session(session);
    return { repId: rep._id, count };
  }));

  leadCounts.sort((a, b) => a.count - b.count);
  return leadCounts[0].repId;
};

const assignLeadToArtistRep = async (session = null) => {
  // ponytail: events + artist leads always go to Akash
  const akashId = await resolveAkashAssigneeId();
  if (akashId) return akashId;

  const primaryId = await resolvePrimaryCallAssigneeId();
  if (primaryId) return primaryId;

  const reps = await getArtistRepUsers(session);
  if (reps.length === 0) return null;

  const leadCounts = await Promise.all(reps.map(async (rep) => {
    const count = await Lead.countDocuments({
      assignedRepId: rep._id,
      crmType: CRM_TYPES.ARTIST,
      leadStatus: { $ne: 'Converted' },
    }).session(session);
    return { repId: rep._id, count };
  }));

  leadCounts.sort((a, b) => a.count - b.count);
  return leadCounts[0].repId;
};

module.exports = {
  getSalesRepUsers,
  getArtistRepUsers,
  assignLeadToRep,
  assignLeadToArtistRep,
  resolveAkashAssigneeId,
  isArtistOrEventsLead,
};
