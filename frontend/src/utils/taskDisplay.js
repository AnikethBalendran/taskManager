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

/** Approval state — avoid the word "PENDING" alone (workflow also uses PENDING). */
export const formatApprovalStatusLabel = (approvalStatus) => {
  if (!approvalStatus || approvalStatus === 'NONE') return '';
  switch (approvalStatus) {
    case 'PENDING':
      return 'Awaiting approval';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return approvalStatus.replace(/_/g, ' ');
  }
};

/** Workflow status label — avoid "PENDING" which users confuse with approval pending. */
export const formatWorkflowStatusLabel = (status) => {
  if (!status) return '';
  if (status === 'PENDING') return 'Not started';
  if (status === 'IN_PROGRESS') return 'In progress';
  if (status === 'COMPLETED') return 'Completed';
  return status.replace(/_/g, ' ');
};

export const getStatusBadge = (status) => {
  if (!status) return null;
  const statusClass = `status-${status.toLowerCase()}`;
  return (
    <span className={`status-badge ${statusClass}`}>{formatWorkflowStatusLabel(status)}</span>
  );
};
