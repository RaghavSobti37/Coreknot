import { describe, expect, it } from 'vitest';
import { buildInAttendancePayload, buildOutAttendancePayload } from './attendanceApprovalPayload';

describe('attendance approval payloads', () => {
  it('builds approved check-in payload without an existing attendance row', () => {
    expect(buildInAttendancePayload({
      userRow: { _id: 'user-1', name: 'Atharva' },
      date: '2026-07-28',
      entry: null,
      form: { inTime: '10:30', inMode: 'office' },
      approved: true,
    })).toEqual({
      userId: 'user-1',
      username: 'Atharva',
      date: '2026-07-28',
      onLeave: false,
      isHalfDay: false,
      inTimeRecord: {
        manualTimestamp: '10:30',
        workMode: 'office',
        verificationMethod: 'MANUAL',
        isApproved: true,
      },
      outTimeRecord: undefined,
    });
  });

  it('preserves approved opposite-side record while approving check-out', () => {
    expect(buildOutAttendancePayload({
      userRow: { _id: 'user-1', name: 'Atharva' },
      date: '2026-07-28',
      entry: {
        inTimeRecord: {
          manualTimestamp: '10:30',
          workMode: 'office',
          verificationMethod: 'MANUAL',
          isApproved: true,
          approvedBy: 'ops-1',
        },
      },
      form: { outTime: '18:30', outMode: 'wfh' },
      approved: true,
    }).inTimeRecord).toEqual({
      manualTimestamp: '10:30',
      workMode: 'office',
      verificationMethod: 'MANUAL',
      isApproved: true,
      approvedBy: 'ops-1',
    });
  });
});
