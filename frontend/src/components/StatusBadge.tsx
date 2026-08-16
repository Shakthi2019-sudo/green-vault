import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Lock, Archive, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const norm = (status || '').toUpperCase();

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  // Document / Case / Security status mappings
  if (norm === 'ACTIVE' || norm === 'VERIFIED' || norm === 'CONFIRMED' || norm === 'APPROVED' || norm === 'GREEN') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses[size]}`}>
        {showIcon && <CheckCircle2 className={`${iconSizes[size]} text-emerald-600`} />}
        <span>{norm === 'ACTIVE' ? 'Verified ✓' : norm === 'GREEN' ? 'Normal ✓' : norm}</span>
      </span>
    );
  }

  if (norm === 'PENDING' || norm === 'UNDER_REVIEW' || norm === 'YELLOW' || norm === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses[size]}`}>
        {showIcon && <Clock className={`${iconSizes[size]} text-amber-600`} />}
        <span>{norm === 'YELLOW' ? 'Unusual Activity' : norm === 'UNDER_REVIEW' ? 'Under Review' : norm}</span>
      </span>
    );
  }

  if (norm === 'RESTRICTED' || norm === 'TAMPERED' || norm === 'FLAGGED' || norm === 'REJECTED' || norm === 'RED' || norm === 'HIGH' || norm === 'CRITICAL') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 ${sizeClasses[size]}`}>
        {showIcon && <AlertTriangle className={`${iconSizes[size]} text-rose-600`} />}
        <span>{norm === 'RESTRICTED' ? 'Restricted ⚠️' : norm === 'RED' ? 'Immediate Attention' : norm}</span>
      </span>
    );
  }

  if (norm === 'ARCHIVED') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses[size]}`}>
        {showIcon && <Archive className={`${iconSizes[size]} text-slate-500`} />}
        <span>Archived</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses[size]}`}>
      <span>{status}</span>
    </span>
  );
};
