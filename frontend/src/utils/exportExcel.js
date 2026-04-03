import * as XLSX from 'xlsx';
import { formatDueDate, formatWorkflowStatusLabel, formatApprovalStatusLabel } from './taskDisplay';

function sanitizeFilename(name) {
  const s = String(name || 'export')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '-')
    .trim();
  return s.slice(0, 120) || 'export';
}

function safeSheetName(name) {
  const s = String(name || 'Sheet1').replace(/[:\\/?*[\]]/g, '').slice(0, 31);
  return s || 'Sheet1';
}

function taskRowIsOverdue(task) {
  if (task.isOverdue !== undefined) return !!task.isOverdue;
  return !!(
    task.deadline &&
    new Date(task.deadline).getTime() < Date.now() &&
    task.status !== 'COMPLETED'
  );
}

/**
 * Build a 2D array (header row + data) for task lists — suitable for Excel.
 */
export function tasksToAoA(tasks) {
  const headers = [
    'Task ID',
    'Title',
    'CAP ID',
    'Description',
    'Assigned to',
    'Assigned by',
    'Deadline (ISO)',
    'Due summary',
    'Workflow status',
    'Approval status',
    'CAPEX type',
    'Amount',
    'Overdue'
  ];
  const rows = (tasks || []).map((task) => [
    task.id,
    task.title || '',
    task.capId || '',
    task.description || '',
    task.assignedTo?.email || '',
    task.assignedBy?.email || '',
    task.deadline ? new Date(task.deadline).toISOString() : '',
    task.deadline ? formatDueDate(task.deadline) : '',
    formatWorkflowStatusLabel(task.status),
    formatApprovalStatusLabel(task.approvalStatus),
    task.capexType && task.capexType !== 'NONE' ? task.capexType : '',
    task.capexAmount != null ? task.capexAmount : '',
    taskRowIsOverdue(task) ? 'Yes' : 'No'
  ]);
  return [headers, ...rows];
}

export function usersToAoA(users) {
  return [
    ['Email', 'Role', 'Created at (ISO)'],
    ...(users || []).map((u) => [
      u.email || '',
      u.role || '',
      u.createdAt ? new Date(u.createdAt).toISOString() : ''
    ])
  ];
}

export function taskUpdatesToAoA(updates) {
  return [
    ['Posted at (ISO)', 'Author email', 'Role', 'Message'],
    ...(updates || []).map((u) => [
      u.createdAt ? new Date(u.createdAt).toISOString() : '',
      u.user?.email || '',
      u.user?.role || '',
      (u.message || '').replace(/\r?\n/g, ' ')
    ])
  ];
}

export function taskEventsToAoA(events) {
  return [
    ['Date (ISO)', 'Actor email', 'Role', 'Action'],
    ...(events || []).map((e) => [
      e.createdAt ? new Date(e.createdAt).toISOString() : '',
      e.user?.email || '',
      e.user?.role || '',
      e.action || ''
    ])
  ];
}

export function downloadAoAAsExcel(aoa, filename, sheetName = 'Sheet1') {
  if (!aoa || !aoa.length) {
    const ws = XLSX.utils.aoa_to_sheet([['No data']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
    XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`);
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`);
}

export function downloadTasksExcel(tasks, filename, sheetName = 'Tasks') {
  downloadAoAAsExcel(tasksToAoA(tasks), filename, sheetName);
}

export function downloadUsersExcel(users, filename = 'users', sheetName = 'Users') {
  downloadAoAAsExcel(usersToAoA(users), filename, sheetName);
}

export function attachmentsToAoA(attachments) {
  return [
    ['Filename', 'URL', 'Uploaded (ISO)'],
    ...(attachments || []).map((a) => [
      a.filename || '',
      a.url || '',
      a.createdAt ? new Date(a.createdAt).toISOString() : ''
    ])
  ];
}
