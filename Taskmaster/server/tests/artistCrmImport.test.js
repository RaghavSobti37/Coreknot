const {
  parseContactField,
  extractEmails,
  resolveEmailStatus,
} = require('../utils/artistContactFieldParser');
const { detectSheetTemplate } = require('../../shared/artistCrmSheetMappings');

describe('artistContactFieldParser', () => {
  test('parses combined phone and email', () => {
    const r = parseContactField('9814089914, yugmarg@example.com');
    expect(r.phone).toMatch(/^\+91/);
    expect(r.email).toBe('yugmarg@example.com');
  });

  test('extracts first valid email from multi-email cell', () => {
    const emails = extractEmails('amrita.prasad@timesgroup.com / amrita.prasad27@timesgroup.com');
    expect(emails.length).toBeGreaterThanOrEqual(1);
    expect(emails[0]).toContain('@');
  });

  test('resolveEmailStatus flags invalid', () => {
    expect(resolveEmailStatus('not-an-email')).toBe('Invalid');
    expect(resolveEmailStatus('valid@example.com')).toBe('Pending');
  });
});

describe('artistCrmImport identity', () => {
  const {
    coerceArtistImportIdentity,
    mapRowToLead,
  } = require('../services/artistCrmImportService');
  const { detectSheetTemplate } = require('../../shared/artistCrmSheetMappings');

  test('imports row with no email and no phone using synthetic phone', () => {
    const template = detectSheetTemplate('harshaDuhita Collective __ TSC Talent Mastersheet - Wavrkari sanstha and maharaj contact.csv');
    const mapped = mapRowToLead(
      { Name: 'Warkari Org', contact: 'Pune address only', City: 'Pune' },
      template,
      5
    );
    const coerced = coerceArtistImportIdentity(mapped);
    expect(coerced.name).toBe('Warkari Org');
    expect(coerced.email).toBeUndefined();
    expect(coerced.phone).toMatch(/^\+91/);
    expect(coerced.metadata.importSyntheticPhone).toBe(true);
  });

  test('derives name from publication when contact name missing', () => {
    const template = detectSheetTemplate('YUGM __ TSC Artist Mastersheet - Media List.csv');
    const mapped = mapRowToLead(
      {
        'Publication Name': 'Lokmat Times',
        'Contact Information': '9822012345',
        'City / Region': 'Pune',
      },
      template,
      10
    );
    const coerced = coerceArtistImportIdentity(mapped);
    expect(coerced.name).toBe('Lokmat Times');
    expect(coerced.phone).toMatch(/^\+91/);
  });
});

describe('artistCrmImport bulk helpers', () => {
  const {
    resolveImportDocUniqueness,
    coerceArtistImportIdentity,
  } = require('../services/artistCrmImportService');

  test('resolveImportDocUniqueness assigns synthetic phone on duplicate', () => {
    const registry = {
      phones: new Set(['+919999999999']),
      emails: new Set(),
      phoneOwner: new Map([['+919999999999', 'other-key']]),
      emailOwner: new Map(),
    };
    const doc = coerceArtistImportIdentity({
      name: 'Dup Test',
      phone: '+919999999999',
      metadata: { importRowKey: 'sheet:5' },
      crmType: 'artist',
    });
    const { doc: resolved } = resolveImportDocUniqueness(doc, registry);
    expect(resolved.phone).not.toBe('+919999999999');
    expect(resolved.metadata.importSyntheticPhone).toBe(true);
  });
});

describe('artistCrmMappedImport file parsing', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const xlsx = require('xlsx');
  const {
    mapRowWithColumnMapping,
    readImportRows,
  } = require('../domains/crm/services/artistCrmMappedImportService');

  test('reads xlsx files with the same row shape as csv imports', async () => {
    const filePath = path.join(os.tmpdir(), `artist-import-${Date.now()}.xlsx`);
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet([
      {
        Name: 'singersaddalive',
        Location: 'delhi',
        Status: 'call done required then call',
        'Contact Info': '9024602555 / singersaddainsta@gmail.com',
      },
    ]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, filePath);

    try {
      const parsed = await readImportRows(filePath, 'evet sheet new  (1).xlsx');
      expect(parsed.headers).toEqual(['Name', 'Location', 'Status', 'Contact Info']);
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0]['Contact Info']).toContain('9024602555');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('keeps artist rows with name only so synthetic identity can be applied', () => {
    const mapped = mapRowWithColumnMapping(
      { Name: 'No Contact Event', Status: 'call later' },
      { name: 'Name', remarks: 'Status' },
      2,
      'events.xlsx'
    );

    expect(mapped).toMatchObject({
      name: 'No Contact Event',
      remarks: 'call later',
      crmType: 'artist',
    });
  });

  test('parses phone and email from a single contact info column', () => {
    const mapped = mapRowWithColumnMapping(
      {
        Name: 'singersaddalive',
        'Contact Info': '9024602555 / singersaddainsta@gmail.com',
      },
      { name: 'Name', phone: 'Contact Info' },
      2,
      'events.xlsx'
    );

    expect(mapped.phone).toMatch(/^\+91/);
    expect(mapped.email).toBe('singersaddainsta@gmail.com');
  });

  test('derives a fallback name from contact info when name cell is blank', () => {
    const mapped = mapRowWithColumnMapping(
      {
        Name: '',
        Status: 'call not receive',
        'Contact Info': 'delhi 9643661345',
      },
      { name: 'Name', phone: 'Contact Info', remarks: 'Status' },
      2,
      'events.xlsx'
    );

    expect(mapped.name).toBe('delhi 9643661345');
    expect(mapped.phone).toMatch(/^\+91/);
  });
});

describe('artistCrmSheetMappings', () => {
  test('detects YUGM media template', () => {
    const t = detectSheetTemplate('YUGM __ TSC Artist Mastersheet - Media List.csv');
    expect(t?.type).toBe('yugm_media');
    expect(t?.artistProject).toBe('YUGM');
  });

  test('detects event database template', () => {
    const t = detectSheetTemplate('TSC Artist Event Database - Master Database.csv');
    expect(t?.contactCategory).toBe('event_database');
    expect(t?.artistProject).toBeNull();
  });
});
