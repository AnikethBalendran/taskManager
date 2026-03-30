import React, { useState, useEffect, useRef } from 'react';
import { formatInr } from '../utils/currency';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTask, updateTask, deleteTask, approveTask, rejectTask, submitTask,
  uploadTaskAttachment, deleteAttachment, createTaskUpdate
} from '../services/api';

const TaskDetailPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  useEffect(() => {
    loadTask();
    // eslint-disable-next-line
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const res = await getTask(id);
      setTask(res.task);
      initEditForm(res.task);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const initEditForm = (t) => {
    setEditForm({
      title: t.title,
      description: t.description,
      assignedToId: t.assignedToId,
      deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : '',
      requiresProof: t.requiresProof,
      correctiveAction: t.correctiveAction || '',
      remarks: t.remarks || '',
      expectedClosureDate: t.expectedClosureDate ? new Date(t.expectedClosureDate).toISOString().slice(0, 16) : '',
      capexType: t.capexType || 'NONE',
      capexAmount: t.capexAmount != null ? t.capexAmount : '',
      teamMembers: (t.teamMembers || []).join(', '),
      completionDetails: t.completionDetails || '',
      status: t.status
    });
  };

  const canEdit = () => {
    if (!task) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'SUPERVISOR' && task.assignedById === user.id) return true;
    if (user.role === 'USER' && task.assignedToId === user.id) return true;
    if (user.role === 'SUPERVISOR' && task.assignedToId === user.id) return true;
    return false;
  };

  const canApproveReject = () => {
    if (!task || task.approvalStatus !== 'PENDING') return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'SUPERVISOR' && task.assignedById === user.id) return true;
    return false;
  };

  const canSubmit = () => {
    if (!task || task.assignedToId !== user.id) return false;
    if (user.role !== 'USER' && user.role !== 'SUPERVISOR') return false;
    if (task.approvalStatus === 'PENDING' || task.approvalStatus === 'APPROVED') return false;
    if (task.approvalStatus === 'REJECTED') return task.status === 'IN_PROGRESS';
    return true;
  };

  /** Admin or supervisor who created this task (full edit). Assignee supervisors use assignee-only fields. */
  const isManagerEditor = () => {
    if (!task) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'SUPERVISOR' && task.assignedById === user.id) return true;
    return false;
  };

  const canDeleteTask = () => {
    if (!task) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'SUPERVISOR' && task.assignedById === user.id) return true;
    return false;
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    setError('');
    try {
      await deleteTask(id);
      if (user.role === 'ADMIN') navigate('/admin/tasks');
      else if (user.role === 'SUPERVISOR') navigate('/supervisor');
      else navigate(-1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fields = { ...editForm };
      fields.teamMembers = fields.teamMembers.split(',').map(s => s.trim()).filter(Boolean);
      fields.capexAmount = fields.capexAmount !== '' ? Number(fields.capexAmount) : null;
      const res = await updateTask(id, fields);
      setTask(res.task);
      initEditForm(res.task);
      setEditMode(false);
      setSuccess('Task updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    initEditForm(task);
    setEditMode(false);
    setError('');
  };

  const handleApprove = async () => {
    setError('');
    try {
      const res = await approveTask(id);
      setTask(res.task);
      setSuccess('Task approved');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve task');
    }
  };

  const handleReject = async () => {
    const notes = window.prompt('Enter rejection feedback (optional):', '');
    setError('');
    try {
      const res = await rejectTask(id, notes || undefined);
      setTask(res.task);
      setSuccess('Task rejected');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject task');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await submitTask(id, proofImage);
      setTask(res.task);
      setShowSubmitForm(false);
      setProofImage(null);
      setSuccess('Task submitted for approval');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadTaskAttachment(id, file);
      setTask(prev => ({ ...prev, attachments: [res.attachment, ...(prev.attachments || [])] }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    setError('');
    try {
      await deleteAttachment(attachmentId);
      setTask(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId) }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete attachment');
    }
  };

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    setPostingUpdate(true);
    setError('');
    setSuccess('');
    try {
      const res = await createTaskUpdate(id, updateMessage);
      setTask(prev => ({
        ...prev,
        updates: [...(prev.updates || []), res.update]
      }));
      setUpdateMessage('');
      setSuccess('Status update sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send status update');
    } finally {
      setPostingUpdate(false);
    }
  };

  const formatDueDate = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    if (diff < 0) return `Overdue by ${Math.abs(diff)} day(s)`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `Due in ${diff} days`;
  };

  const dueDateColor = (deadline, isOverdue) => {
    if (isOverdue) return 'text-red-600';
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    if (diff <= 3) return 'text-amber-600';
    return 'text-slate-800';
  };

  const formatHistoryLabel = (event) => {
    const dateLabel = new Date(event.createdAt).toLocaleDateString();
    const actorRole = event.user?.role || 'USER';
    const actorLabel = actorRole === 'ADMIN' ? 'Admin' : actorRole === 'SUPERVISOR' ? 'Supervisor' : 'User';
    switch (event.action) {
      case 'TASK_CREATED': return `${dateLabel} — Task created`;
      case 'TASK_ASSIGNED': return `${dateLabel} — Task assigned`;
      case 'TASK_STARTED': return `${dateLabel} — User started task`;
      case 'TASK_COMPLETED': return `${dateLabel} — User marked task as completed`;
      case 'TASK_SUBMITTED': return `${dateLabel} — User submitted task for approval`;
      case 'STATUS_UPDATE': return `${dateLabel} — ${actorLabel} posted a status update`;
      case 'TASK_APPROVED': return `${dateLabel} — ${actorLabel} approved task`;
      case 'TASK_REJECTED': return `${dateLabel} — ${actorLabel} rejected task`;
      case 'TASK_REOPENED': return `${dateLabel} — Task reopened for corrections`;
      case 'FILE_UPLOADED': return `${dateLabel} — File uploaded`;
      default: return `${dateLabel} — ${event.action}`;
    }
  };

  const isImageFile = (url) => /\.(jpg|jpeg|png|gif)(\?|$)/i.test(url);

  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const btnPrimary = 'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary = 'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const btnSuccess = 'px-4 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors';
  const btnDanger = 'px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-medium">Loading...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Task not found'}</p>
          <button onClick={() => navigate(-1)} className={btnSecondary}>Go Back</button>
        </div>
      </div>
    );
  }

  const attachments = task.attachments || [];
  const history = task.events || [];
  const updates = task.updates || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate(-1)} className={btnSecondary}>
              ← Back
            </button>
            {task.capId && (
              <span className="font-mono text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-700">
                {task.capId}
              </span>
            )}
            <h1 className="text-lg font-semibold text-slate-800 flex-1 min-w-0 truncate">
              {task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`status-badge status-${task.status.toLowerCase()}`}>{task.status}</span>
              {task.approvalStatus !== 'NONE' && (
                <span className={`badge-approval badge-approval-${task.approvalStatus.toLowerCase()}`}>
                  {task.approvalStatus}
                </span>
              )}
              {task.isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">OVERDUE</span>
              )}
              {canEdit() && !editMode && (
                <button onClick={() => setEditMode(true)} className={btnPrimary}>Edit</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{success}</div>
        )}

        {/* Core Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Core Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Title</label>
              {editMode && isManagerEditor() ? (
                <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className={inputClass} />
              ) : (
                <p className="text-sm text-slate-800">{task.title}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Assigned To</label>
              <p className="text-sm text-slate-800">{task.assignedTo?.email}</p>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              {editMode && isManagerEditor() ? (
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={`${inputClass} min-h-[80px] resize-y`} />
              ) : (
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{task.description}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Deadline</label>
              {editMode && isManagerEditor() ? (
                <input type="datetime-local" value={editForm.deadline} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} className={inputClass} />
              ) : (
                <p className={`text-sm ${dueDateColor(task.deadline, task.isOverdue)}`}>{formatDueDate(task.deadline)}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Requires Proof</label>
              {editMode && isManagerEditor() ? (
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={editForm.requiresProof} onChange={e => setEditForm({ ...editForm, requiresProof: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500" />
                  <span className="text-sm text-slate-700">Yes</span>
                </label>
              ) : (
                <p className="text-sm text-slate-800">{task.requiresProof ? 'Yes' : 'No'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Corrective Action</label>
              {editMode && isManagerEditor() ? (
                <textarea value={editForm.correctiveAction} onChange={e => setEditForm({ ...editForm, correctiveAction: e.target.value })} className={`${inputClass} min-h-[80px] resize-y`} />
              ) : (
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{task.correctiveAction || '—'}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Expected Closure Date</label>
              {editMode && isManagerEditor() ? (
                <input type="datetime-local" value={editForm.expectedClosureDate} onChange={e => setEditForm({ ...editForm, expectedClosureDate: e.target.value })} className={inputClass} />
              ) : (
                <p className="text-sm text-slate-800">{task.expectedClosureDate ? new Date(task.expectedClosureDate).toLocaleDateString() : '—'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Team Members</label>
              {editMode && isManagerEditor() ? (
                <input type="text" value={editForm.teamMembers} onChange={e => setEditForm({ ...editForm, teamMembers: e.target.value })} placeholder="Comma-separated names" className={inputClass} />
              ) : (
                <p className="text-sm text-slate-800">{task.teamMembers?.length ? task.teamMembers.join(', ') : '—'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Remarks</label>
              {editMode ? (
                <textarea value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} className={`${inputClass} min-h-[60px] resize-y`} />
              ) : (
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{task.remarks || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Financial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>CAPEX/REVEX Type</label>
              {editMode && (isManagerEditor() || task.assignedToId === user.id) ? (
                <select
                  value={editForm.capexType}
                  onChange={e => setEditForm({ ...editForm, capexType: e.target.value })}
                  className={inputClass}
                >
                  <option value="NONE">None</option>
                  <option value="CAPEX">CAPEX</option>
                  <option value="REVEX">REVEX</option>
                </select>
              ) : (
                <p className="text-sm text-slate-800">{task.capexType}</p>
              )}
            </div>
            {(task.capexType !== 'NONE' || (editMode && editForm.capexType !== 'NONE')) && (
              <div>
                <label className={labelClass}>Expenditure</label>
                {editMode && (isManagerEditor() || task.assignedToId === user.id) ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.capexAmount}
                    onChange={e => setEditForm({ ...editForm, capexAmount: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-sm text-slate-800">
                    {task.capexAmount != null ? formatInr(task.capexAmount) : '—'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion */}
        {(true) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Completion</h2>
            <div>
              <label className={labelClass}>Completion Details</label>
              {editMode ? (
                <textarea value={editForm.completionDetails} onChange={e => setEditForm({ ...editForm, completionDetails: e.target.value })} className={`${inputClass} min-h-[80px] resize-y`} />
              ) : (
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{task.completionDetails || '—'}</p>
              )}
            </div>
          </div>
        )}

        {/* Approval */}
        {task.approvalStatus !== 'NONE' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Approval</h2>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Status</label>
                <span className={`badge-approval badge-approval-${task.approvalStatus.toLowerCase()}`}>{task.approvalStatus}</span>
              </div>
              {task.approvalNotes && (
                <div>
                  <label className={labelClass}>Feedback</label>
                  <p className="text-sm text-red-700 whitespace-pre-wrap bg-red-50 rounded-lg p-3 border border-red-200">{task.approvalNotes}</p>
                </div>
              )}
              {task.submittedForApprovalAt && (
                <div>
                  <label className={labelClass}>Submitted At</label>
                  <p className="text-sm text-slate-600">{new Date(task.submittedForApprovalAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Attachments</h2>
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className={btnPrimary}>
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments yet.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {attachments.map(att => (
                <div key={att.id} className="relative flex-shrink-0 w-32 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  {isImageFile(att.url) ? (
                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                      <img src={att.url} alt={att.filename} className="w-32 h-24 object-cover" />
                    </a>
                  ) : (
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-24 text-slate-600 hover:text-primary-500">
                      <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs text-center truncate w-28 px-1">{att.filename}</span>
                    </a>
                  )}
                  {(user.role === 'ADMIN' || (user.role === 'SUPERVISOR' && task.assignedById === user.id)) && (
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-red-600 hover:bg-red-50 border border-slate-200 text-xs font-bold leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Updates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Status Updates</h2>
          {updates.length === 0 ? (
            <p className="text-sm text-slate-500">No updates yet.</p>
          ) : (
            <ul className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="text-sm font-medium text-slate-800">
                      {u.user?.email || 'Unknown'}
                      {u.user?.role ? <span className="text-xs text-slate-500"> ({u.user.role})</span> : null}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(u.createdAt).toLocaleString()}</div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{u.message}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handlePostUpdate} className="mt-4 pt-4 border-t border-slate-200">
            <label className={labelClass}>Send an update</label>
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              className={`${inputClass} min-h-[90px] resize-y`}
              placeholder="Share a quick status update…"
              maxLength={2000}
              required
            />
            <div className="mt-3 flex gap-3">
              <button type="submit" disabled={postingUpdate} className={btnPrimary}>
                {postingUpdate ? 'Sending...' : 'Send update'}
              </button>
              <button
                type="button"
                onClick={() => setUpdateMessage('')}
                className={btnSecondary}
                disabled={postingUpdate || !updateMessage}
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Activity History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Activity History</h2>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-1 text-xs text-slate-700">
              {history.map(event => (
                <li key={event.id}>{formatHistoryLabel(event)}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <div className="flex flex-wrap gap-3">
            {editMode ? (
              <>
                <button onClick={handleSave} disabled={saving} className={btnSuccess}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleCancel} className={btnSecondary}>Cancel</button>
              </>
            ) : (
              <>
                {canSubmit() && !showSubmitForm && (
                  <button onClick={() => setShowSubmitForm(true)} className={btnPrimary}>
                    {task.approvalStatus === 'REJECTED' ? 'Fix & Resubmit' : 'Submit for Approval'}
                  </button>
                )}
                {canApproveReject() && (
                  <>
                    <button onClick={handleApprove} className={btnSuccess}>Approve</button>
                    <button onClick={handleReject} className={btnDanger}>Reject</button>
                  </>
                )}
                {canDeleteTask() && (
                  <button type="button" onClick={handleDeleteTask} className={btnDanger}>
                    Delete task
                  </button>
                )}
              </>
            )}
          </div>

          {showSubmitForm && canSubmit() && (
            <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-200">
              {task.approvalStatus === 'REJECTED' && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This task was rejected. Please review the feedback and resubmit.
                </div>
              )}
              {task.approvalStatus === 'REJECTED' && task.approvalNotes && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Feedback</h3>
                  <p className="text-sm text-red-700 whitespace-pre-line">{task.approvalNotes}</p>
                </div>
              )}
              {task.requiresProof && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proof Image (Required)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setProofImage(e.target.files[0])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  {proofImage && (
                    <img src={URL.createObjectURL(proofImage)} alt="Preview" className="mt-3 max-w-[200px] max-h-[200px] rounded-lg border border-slate-200" />
                  )}
                </div>
              )}
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className={btnPrimary}>
                  {submitting ? 'Submitting...' : task.approvalStatus === 'REJECTED' ? 'Resubmit Task' : 'Submit Task'}
                </button>
                <button type="button" onClick={() => { setShowSubmitForm(false); setProofImage(null); }} className={btnSecondary}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
