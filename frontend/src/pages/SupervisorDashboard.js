import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency';
import { getStatusBadge } from '../utils/taskDisplay';
import { useNavigate } from 'react-router-dom';
import { createTask, getTasks, deleteTask, approveTask, rejectTask, getUsers, getTaskHistory, getProfile, updateProfile, uploadTaskAttachment } from '../services/api';

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
  return 'text-slate-600';
};

const SupervisorDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: '',
    deadline: '',
    requiresProof: false
  });
  const [taskFiles, setTaskFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Profile modal
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', profilePicture: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await getTasks();
      setTasks(response.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users.filter(u => u.role === 'USER'));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const openProfile = async () => {
    setProfileError('');
    setShowProfile(true);
    try {
      const res = await getProfile();
      setProfile(res.user);
      setProfileForm({
        firstName: res.user.firstName || '',
        lastName: res.user.lastName || '',
        phone: res.user.phone || '',
        profilePicture: res.user.profilePicture || ''
      });
    } catch (err) {
      setProfileError('Failed to load profile');
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    try {
      await updateProfile(profileForm);
      setShowProfile(false);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await createTask(formData);
      const createdTask = result.task || result;

      if (createdTask?.id && taskFiles.length > 0) {
        try {
          await Promise.all(
            taskFiles.map(file => uploadTaskAttachment(createdTask.id, file))
          );
        } catch (uploadErr) {
          console.error('Attachment upload error:', uploadErr);
          setError(prev => (prev ? `${prev} Task created but some attachments failed to upload.` : 'Task created but some attachments failed to upload.'));
        }
      }

      setSuccess('Task created successfully');
      setFormData({ title: '', description: '', assignedToId: '', deadline: '', requiresProof: false });
      setTaskFiles([]);
      setShowCreateForm(false);
      loadTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    try {
      await approveTask(taskId);
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve task');
    }
  };

  const handleReject = async (taskId) => {
    try {
      const feedback = window.prompt('Enter rejection feedback for the user (optional):', '');
      await rejectTask(taskId, feedback || undefined);
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    try {
      await deleteTask(taskId);
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const loadTaskHistory = async (task) => {
    setSelectedTaskForHistory(task);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await getTaskHistory(task.id);
      setHistory(response.events || []);
    } catch (err) {
      console.error('Failed to load task history:', err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatHistoryLabel = (event) => {
    const dateLabel = new Date(event.createdAt).toLocaleDateString();
    const actorRole = event.user?.role || 'USER';
    const actorLabel =
      actorRole === 'ADMIN' ? 'Admin' : actorRole === 'SUPERVISOR' ? 'Supervisor' : 'User';
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

  const filteredTasks = statusFilter === 'ALL' ? tasks : tasks.filter(t => t.status === statusFilter);

  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const btnPrimary = 'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary = 'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const btnSuccess = 'px-4 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors';
  const btnDanger = 'px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-800">Supervisor Dashboard</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Welcome, {user.email}</span>
              <button type="button" onClick={openProfile} className={btnSecondary}>My Profile</button>
              <button type="button" onClick={onLogout} className={btnSecondary}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">My Profile</h2>
            {profileError && <p className="text-sm text-red-600 mb-3">{profileError}</p>}
            {!profile ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-3">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input type="text" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input type="text" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Profile Picture URL</label>
                  <input type="text" value={profileForm.profilePicture} onChange={e => setProfileForm({ ...profileForm, profilePicture: e.target.value })} className={inputClass} placeholder="https://..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={profileSaving} className={btnPrimary}>{profileSaving ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={() => setShowProfile(false)} className={btnSecondary}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Tasks</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={btnPrimary}
            >
              {showCreateForm ? 'Cancel' : 'Create Task'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleSubmit} className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Create New Task</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="task-title" className={labelClass}>Title</label>
                  <input
                    id="task-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="task-desc" className={labelClass}>Description</label>
                  <textarea
                    id="task-desc"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`${inputClass} min-h-[100px] resize-y`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="task-assign" className={labelClass}>Assign To</label>
                  <select
                    id="task-assign"
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="">Select a user</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                  {users.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No user accounts available. Supervisors can only assign tasks to users with the USER role. Ask an admin to create USER accounts.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="task-deadline" className={labelClass}>Deadline</label>
                  <input
                    id="task-deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresProof}
                      onChange={(e) => setFormData({ ...formData, requiresProof: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700">Requires Proof Image</span>
                  </label>
                </div>
                <div>
                  <label className={labelClass}>Attachments (optional)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setTaskFiles(Array.from(e.target.files || []))}
                    className={inputClass}
                  />
                  {taskFiles.length > 0 && (
                    <ul className="mt-2 text-xs text-slate-600 list-disc list-inside space-y-0.5">
                      {taskFiles.map((file) => (
                        <li key={file.name}>{file.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}
                <button type="submit" className={btnPrimary} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          )}

          {/* Status filter chips */}
          <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Not started' : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Your role</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">CAPEX/REVEX</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-800">{task.title}</strong>
                        {task.capId && (
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">{task.capId}</span>
                        )}
                      </div>
                      <span className="text-slate-600 text-sm">{task.description}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {task.assignedById === user.id ? (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Creator</span>
                      ) : (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-100">Assignee</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{task.assignedTo.email}</td>
                    <td className={`px-6 py-3 text-sm ${dueDateColor(task.deadline, task.isOverdue)}`}>
                      {formatDueDate(task.deadline)}
                    </td>
                    <td className="px-6 py-3">{getStatusBadge(task.status)}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {task.capexType !== 'NONE' ? (
                        <span>{task.capexType}{task.capexAmount != null ? ` ${formatInr(task.capexAmount)}` : ''}</span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className={btnSecondary}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => loadTaskHistory(task)}
                          className={btnSecondary}
                        >
                          History
                        </button>
                        {task.assignedById === user.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className={btnDanger}
                          >
                            Delete
                          </button>
                        )}
                        {task.approvalStatus === 'PENDING' && task.assignedById === user.id && (
                          <>
                            {task.submission?.proofImagePath && (
                              <a
                                href={task.submission.proofImagePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={btnSecondary}
                              >
                                View Proof
                              </a>
                            )}
                            <button type="button" onClick={() => handleApprove(task.id)} className={btnSuccess}>Approve</button>
                            <button type="button" onClick={() => handleReject(task.id)} className={btnDanger}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTaskForHistory && (
          <div className="mt-6 bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Activity History: {selectedTaskForHistory.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Assigned to {selectedTaskForHistory.assignedTo.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedTaskForHistory(null); setHistory([]); }}
                className={btnSecondary}
              >
                Close
              </button>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <p className="text-sm text-slate-500">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-500">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {history.map((event) => (
                    <li key={event.id}>{formatHistoryLabel(event)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
