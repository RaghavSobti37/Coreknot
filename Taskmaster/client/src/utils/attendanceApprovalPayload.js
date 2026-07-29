export const preserveTimeRecord = (record) => {
  if (!record?.manualTimestamp) return undefined;
  return {
    manualTimestamp: record.manualTimestamp,
    workMode: record.workMode || 'office',
    verificationMethod: record.verificationMethod || 'MANUAL',
    isApproved: !!record.isApproved,
    ...(record.systemTimestamp ? { systemTimestamp: record.systemTimestamp } : {}),
    ...(record.approvedBy ? { approvedBy: record.approvedBy } : {}),
  };
};

export const buildInAttendancePayload = ({ userRow, date, entry, form, approved = false }) => ({
  userId: userRow._id,
  username: userRow.name,
  date,
  onLeave: !!entry?.onLeave,
  isHalfDay: !!entry?.isHalfDay,
  inTimeRecord: form.inTime
    ? {
        manualTimestamp: form.inTime,
        workMode: form.inMode,
        verificationMethod: 'MANUAL',
        ...(approved ? { isApproved: true } : {}),
      }
    : undefined,
  outTimeRecord: preserveTimeRecord(entry?.outTimeRecord),
});

export const buildOutAttendancePayload = ({ userRow, date, entry, form, approved = false }) => ({
  userId: userRow._id,
  username: userRow.name,
  date,
  onLeave: !!entry?.onLeave,
  isHalfDay: !!entry?.isHalfDay,
  inTimeRecord: preserveTimeRecord(entry?.inTimeRecord),
  outTimeRecord: form.outTime
    ? {
        manualTimestamp: form.outTime,
        workMode: form.outMode,
        verificationMethod: 'MANUAL',
        ...(approved ? { isApproved: true } : {}),
      }
    : undefined,
});
