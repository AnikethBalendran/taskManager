import React from 'react';

export const formatDueDate = (deadline) => {
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (diff < 0) return `Overdue by ${Math.abs(diff)} day(s)`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
};

export const dueDateColor = (deadline, isOverdue) => {
  if (isOverdue) return 'text-red-600';
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (diff <= 3) return 'text-amber-600';
  return 'text-slate-600';
};

export const getStatusBadge = (status) => {
  const statusClass = `status-${status.toLowerCase()}`;
  return <span className={`status-badge ${statusClass}`}>{status}</span>;
};
