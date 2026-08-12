/**
 * One-time migration: assign EVERY CRM lead to Akash and stamp the canonical
 * pipeline tag (artist-lead vs academy-lead) based on the lead.
 *
 * Tag rule (mirrors server/utils/leadTypeTag.js):
 *   - crmType === 'artist'                     → artist-lead
 *   - otherwise, from who the lead was with:   Akash / Harshika (or artist dept) → artist-lead
 *                                              Satyam (or sales dept)             → academy-lead
 *                                              default                            → academy-lead
 *
 * Run: node server/scripts/reassignAllLeadsToAkashWithTypeTags.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Lead = require('../models/Lead');
const { resolveAkashAssigneeId } = require('../utils/crmAssignment');
const { resolveLeadTypeTag } = require('../utils/leadTypeTag');
const { LEAD_TYPE_TAGS } = require('../../shared/artistCrmTaxonomy');
const { ARTIST_SLUG, SALES_SLUG } = require('../utils/departmentPermissions');

const BYPASS = { bypassTenant: true };
const WRITE_CHUNK = 500;

async function buildAssigneeInfoMap() {
  const [artistDept, salesDept] = await Promise.all([
    Department.findOne({ slug: ARTIST_SLUG }).setOptions(BYPASS).lean(),
    Department.findOne({ slug: SALES_SLUG }).setOptions(BYPASS).lean(),
  ]);
  const artistDeptId = String(artistDept?._id || '');
  const salesDeptId = String(salesDept?._id || '');

  const users = await User.find({}).select('_id name email departmentId').setOptions(BYPASS).lean();
  const map = new Map();
  for (const u of users) {
    const deptId = String(u.departmentId || '');
    map.set(String(u._id), {
      name: u.name || '',
      email: u.email || '',
      deptSlug: deptId === artistDeptId ? ARTIST_SLUG
        : deptId === salesDeptId ? SALES_SLUG
        : null,
    });
  }
  return { map, artistDeptId };
}

/** Resolve Akash fail-safe: exactly one /akash/i user in artist-management, else abort. */
async function resolveAkashForMigration() {
  const { artistDeptId } = await buildAssigneeInfoMap();

  const artistMatches = artistDeptId
    ? await User.find({
        departmentId: artistDeptId,
        $or: [{ name: /akash/i }, { email: /akash/i }],
      }).select('_id name email').setOptions(BYPASS).lean()
    : [];

  if (artistMatches.length === 1) {
    return { akash: artistMatches[0], source: 'artist-management' };
  }
  if (artistMatches.length > 1) {
    console.error('Multiple artist-management users match /akash/i — ambiguous target. Aborting:');
    for (const u of artistMatches) console.error(`  ${u.name} <${u.email}> (${u._id})`);
    throw new Error('Ambiguous Akash — use reassignLeadsBetweenReps.js with an explicit user id instead.');
  }

  const fallbackId = await resolveAkashAssigneeId();
  if (fallbackId) {
    const fallback = await User.findById(fallbackId).select('name email').setOptions(BYPASS).lean();
    console.warn(`No artist-management /akash/i match — falling back to: ${fallback?.name || '?'} <${fallback?.email || '?'}> (${fallbackId})`);
    return { akash: fallback, source: 'fallback' };
  }
  throw new Error('Could not resolve Akash (artist-management). Aborting — check user/seed data.');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tenantArg = process.argv.find((a) => a.startsWith('--tenant='));
  const tenantFilter = tenantArg ? tenantArg.split('=')[1] : null;
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const { akash, source } = await resolveAkashForMigration();
  const akashId = akash._id;
  console.log(`Akash: ${akash?.name || '?'} <${akash?.email || '?'}> (${akashId}) [resolved via ${source}]`);
  if (tenantFilter) console.log(`Tenant filter: ${tenantFilter}`);

  const { map: assigneeInfo } = await buildAssigneeInfoMap();

  const leadFilter = tenantFilter && mongoose.Types.ObjectId.isValid(tenantFilter)
    ? { tenantId: new mongoose.Types.ObjectId(tenantFilter) }
    : {};
  const cursor = Lead.find(leadFilter).select('_id name crmType tags assignedRepId tenantId').setOptions(BYPASS).lean().cursor();
  const ops = [];
  const byOldAssignee = new Map();
  const byTenant = new Map();
  let total = 0;
  let artistLeads = 0;
  let academyLeads = 0;
  let needReassign = 0;
  let needTag = 0;
  let unchanged = 0;

  for await (const lead of cursor) {
    total++;
    const tenantKey = String(lead.tenantId || 'no-tenant');
    byTenant.set(tenantKey, (byTenant.get(tenantKey) || 0) + 1);
    const oldRep = assigneeInfo.get(String(lead.assignedRepId || ''));

    const tag = resolveLeadTypeTag({
      crmType: lead.crmType,
      assigneeName: oldRep?.name,
      assigneeDeptSlug: oldRep?.deptSlug,
    });
    if (tag === LEAD_TYPE_TAGS.ARTIST) artistLeads++;
    else academyLeads++;

    const oldKey = oldRep?.name || (lead.assignedRepId ? String(lead.assignedRepId) : 'UNASSIGNED');
    byOldAssignee.set(oldKey, (byOldAssignee.get(oldKey) || 0) + 1);

    const tags = Array.isArray(lead.tags) ? lead.tags : [];
    const reassign = String(lead.assignedRepId || '') !== String(akashId);
    const needsTag = !tags.includes(tag);

    if (!reassign && !needsTag) {
      unchanged++;
      continue;
    }

    const update = {};
    if (reassign) update.$set = { assignedRepId: akashId };
    if (needsTag) update.$addToSet = { tags: tag };
    if (reassign) needReassign++;
    if (needsTag) needTag++;

    ops.push({ updateOne: { filter: { _id: lead._id }, update } });

    if (ops.length >= WRITE_CHUNK) {
      await Lead.bulkWrite(ops, BYPASS);
      ops.length = 0;
    }
  }

  if (ops.length) await Lead.bulkWrite(ops, BYPASS);

  console.log('\n=== Summary ===');
  console.log(`Total leads:            ${total}`);
  console.log(`Artist-lead (tag):      ${artistLeads}`);
  console.log(`Academy-lead (tag):     ${academyLeads}`);
  console.log(`Needs reassign → Akash: ${needReassign}`);
  console.log(`Needs type tag:         ${needTag}`);
  console.log(`Already done:           ${unchanged}`);
  console.log('\nLeads by previous assignee:');
  for (const [name, count] of [...byOldAssignee.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name}: ${count}`);
  }
  if (byTenant.size > 1 || !tenantFilter) {
    console.log('\nLeads by tenant:');
    for (const [tenantKey, count] of [...byTenant.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tenantKey}: ${count}`);
    }
  }

  if (dryRun) {
    console.log('\nDRY RUN — no changes written.');
  } else if (total > 0) {
    console.log(`\nDone. Every lead is now assigned to ${akash?.name || 'Akash'} with a type tag.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
