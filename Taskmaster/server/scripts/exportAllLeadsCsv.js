/**
 * Full CRM lead dump — every lead, every field → server/reports/leads_all_YYYYMMDD.csv
 *
 *   node scripts/exportAllLeadsCsv.js                 # local (MONGO_URI / MONGODB_URI / localhost fallback)
 *   node scripts/exportAllLeadsCsv.js --prod          # production (MONGODB_URI_PROD)
 *   node scripts/exportAllLeadsCsv.js --out=path.csv  # custom output path
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Lead = require('../domains/crm/models/Lead');
require('../models/User'); // register User so populate('assignedRepId') resolves
const { bypassOptions } = require('../infrastructure/database/bypassTenantPolicy');
const { leadCsvHeader, leadToCsvLine } = require('../domains/crm/services/leadCsvExport');

function readArg(name, fallback = '') {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!match) return fallback;
  return match.slice(name.length + 1);
}

async function main() {
  const useProd = process.argv.includes('--prod');
  const uri = useProd
    ? (process.env.MONGODB_URI_PROD || process.env.MONGO_URI_PROD)
    : (process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmaster_local');
  if (!uri) {
    console.error(useProd ? 'MONGODB_URI_PROD not set' : 'MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri.trim(), {
    serverSelectionTimeoutMS: 120000,
    connectTimeoutMS: 120000,
  });
  const dbName = mongoose.connection.db.databaseName;

  const cursor = Lead.find({})
    .setOptions(bypassOptions('crm_full_export'))
    .populate('assignedRepId', 'name email')
    .lean()
    .cursor();

  const rows = [];
  await new Promise((resolve, reject) => {
    cursor.on('data', (doc) => rows.push(doc));
    cursor.on('end', resolve);
    cursor.on('error', reject);
  });

  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outPath = readArg('--out', '') || path.join(__dirname, '../reports', `leads_all_${datePart}.csv`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const body = rows.map(leadToCsvLine).join('\n');
  fs.writeFileSync(outPath, `${leadCsvHeader()}\n${body}\n`, 'utf8');

  console.log('[exportAllLeadsCsv] complete');
  console.log(JSON.stringify({ database: dbName, leads: rows.length, target: outPath }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[exportAllLeadsCsv] Failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
