/**
 * Relabel academy leads that were hidden from Akash (crmType=sales) and
 * any lead that was previously assigned to / created by Satyam.
 *
 * Sets crmType=sales, stamps academy-lead, strips artist-lead.
 *
 * Run: node server/scripts/relabelAcademyLeadsFromSatyam.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const CRMAudit = require('../domains/crm/models/CRMAudit');
const { CRM_TYPES, LEAD_TYPE_TAGS } = require('../../shared/artistCrmTaxonomy');

const BYPASS = { bypassTenant: true };
const WRITE_CHUNK = 500;

function academyTags(existing) {
  const tags = Array.isArray(existing)
    ? existing.filter((t) => typeof t === 'string' && t.trim() && t !== LEAD_TYPE_TAGS.ARTIST)
    : [];
  if (!tags.includes(LEAD_TYPE_TAGS.ACADEMY)) tags.push(LEAD_TYPE_TAGS.ACADEMY);
  return tags;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri);

  const satyamUsers = await User.find({
    $or: [{ name: /satyam/i }, { email: /satyam/i }],
  }).select('_id name email').setOptions(BYPASS).lean();

  const satyamIds = satyamUsers.map((u) => u._id);
  const satyamIdStrs = satyamIds.map((id) => String(id));
  console.log(`Satyam users: ${satyamUsers.map((u) => `${u.name} <${u.email}> (${u._id})`).join('; ') || '(none)'}`);

  const salesLeads = await Lead.find({
    $or: [
      { crmType: CRM_TYPES.SALES },
      { tags: LEAD_TYPE_TAGS.ACADEMY },
    ],
  }).select('_id').setOptions(BYPASS).lean();

  const createdBySatyam = satyamIds.length
    ? await Lead.find({ createdBy: { $in: satyamIds } }).select('_id').setOptions(BYPASS).lean()
    : [];

  let auditLeadIds = [];
  if (satyamIdStrs.length) {
    const audits = await CRMAudit.find({
      fieldChanged: { $in: ['assignedRepId', 'assignedRep', 'assigned_rep'] },
      $or: [
        { oldValue: { $in: satyamIdStrs } },
        { newValue: { $in: satyamIdStrs } },
      ],
    }).select('leadId').setOptions(BYPASS).lean();
    auditLeadIds = audits.map((a) => a.leadId).filter(Boolean);
  }

  const idSet = new Set();
  for (const row of [...salesLeads, ...createdBySatyam]) idSet.add(String(row._id));
  for (const id of auditLeadIds) idSet.add(String(id));

  const ids = [...idSet].filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  console.log(`Candidates: sales/academy-tag=${salesLeads.length} createdBySatyam=${createdBySatyam.length} audit=${auditLeadIds.length} unique=${ids.length}`);

  const docs = await Lead.find({ _id: { $in: ids } })
    .select('_id name crmType tags')
    .setOptions(BYPASS).lean();

  if (dryRun) {
    console.log('Sample:', JSON.stringify(docs.slice(0, 8), null, 2));
    await mongoose.disconnect();
    return;
  }

  const ops = [];
  let updated = 0;
  for (const doc of docs) {
    const tags = academyTags(doc.tags);
    const sameType = doc.crmType === CRM_TYPES.SALES;
    const sameTags = JSON.stringify(tags) === JSON.stringify(doc.tags || []);
    if (sameType && sameTags) continue;
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { crmType: CRM_TYPES.SALES, tags } },
      },
    });
    updated += 1;
    if (ops.length >= WRITE_CHUNK) {
      await Lead.bulkWrite(ops, BYPASS);
      ops.length = 0;
    }
  }
  if (ops.length) await Lead.bulkWrite(ops, BYPASS);

  const [academy, artist, salesType] = await Promise.all([
    Lead.countDocuments({ tags: LEAD_TYPE_TAGS.ACADEMY }).setOptions(BYPASS),
    Lead.countDocuments({ tags: LEAD_TYPE_TAGS.ARTIST }).setOptions(BYPASS),
    Lead.countDocuments({ crmType: CRM_TYPES.SALES }).setOptions(BYPASS),
  ]);
  console.log(`Done. updated=${updated} academy-tag=${academy} artist-tag=${artist} crmType=sales=${salesType}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
