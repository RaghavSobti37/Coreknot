import React from 'react';
import { StatusBadge } from '../ui';
import { getLeadTypeTag, formatLeadTypeTag, LEAD_TYPE_TAGS } from '../../utils/crmUtils';

/** Visible Artist Lead / Academy Lead chip — theme-safe StatusBadge (not washed indigo-300). */
export default function LeadTypeTagBadge({ lead, className = '' }) {
  const tag = getLeadTypeTag(lead);
  const isArtist = tag === LEAD_TYPE_TAGS.ARTIST;
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      title={isArtist ? 'Artist pipeline' : 'Academy / sales pipeline'}
    >
      <StatusBadge
        status={isArtist ? 'active' : 'advisory'}
        className="!text-[10px] !font-black uppercase tracking-tight"
      >
        {formatLeadTypeTag(tag)}
      </StatusBadge>
    </span>
  );
}
