import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import {
  getUsers,
  createTask,
  approveTask,
  rejectTask,
  getTasks,
  deleteTask,
  getProfile,
  updateProfile,
  uploadTaskAttachment
} from '../services/api';
import AdminManageHeader from '../components/AdminManageHeader';
import AdminProfileModal from '../components/AdminProfileModal';
import { formatDueDate, dueDateColor, getStatusBadge } from '../utils/taskDisplay';

const AdminTasksPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
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

  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', profilePicture: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    loadUsers();
    loadAllTasks();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadAllTasks = async () => {
    try {
      const response = await getTasks();
      setAllTasks(response.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await createTask(taskFormData);
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
      setTaskFormData({ title: '', description: '', assignedToId: '', deadline: '', requiresProof: false });
      setTaskFiles([]);
      setShowCreateTaskForm(false);
      loadAllTasks();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create task';
      const errorDetails = err.response?.data?.details || '';
      setError(errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg);
      console.error('Create task error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      setError('');
      setSuccess('');
      await approveTask(taskId);
      setSuccess('Task approved successfully');
      loadAllTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve task');
    }
  };

  const handleRejectTask = async (taskId) => {
    try {
      setError('');
      setSuccess('');
      const feedback = window.prompt('Enter rejection feedback for the user (optional):', '');
      await rejectTask(taskId, feedback || undefined);
      setSuccess('Task rejected successfully');
      loadAllTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task permanently? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await deleteTask(taskId);
      setSuccess('Task deleted');
      loadAllTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const assignableUsers = users.filter(
    (u) =>
      (u.role === 'ADMIN' || u.role === 'SUPERVISOR' || u.role === 'USER') &&
      u.id !== user.id
  );
  const filteredAllTasks = taskStatusFilter === 'ALL' ? allTasks : allTasks.filter(t => t.status === taskStatusFilter);

  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const btnPrimary = 'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary = 'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const btnSuccess = 'px-4 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors';
  const btnDanger = 'px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors';

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminManageHeader user={user} onLogout={onLogout} onOpenProfile={openProfile} activeSection="tasks" />

      {showProfile && (
        <AdminProfileModal
          onClose={() => setShowProfile(false)}
          profile={profile}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileError={profileError}
          profileSaving={profileSaving}
          onSubmit={handleProfileSave}
          inputClass={inputClass}
          labelClass={labelClass}
          btnPrimary={btnPrimary}
          btnSecondary={btnSecondary}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && !showCreateTaskForm && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && !showCreateTaskForm && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{success}</div>
        )}

        <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Create Task</h2>
            <button
              type="button"
              onClick={() => { setShowCreateTaskForm(!showCreateTaskForm); }}
              className={btnPrimary}
            >
              {showCreateTaskForm ? 'Cancel' : 'New Task'}
            </button>
          </div>

          {showCreateTaskForm && (
            <form onSubmit={handleCreateTask} className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Create New Task</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="task-title" className={labelClass}>Title</label>
                  <input id="task-title" type="text" value={taskFormData.title} onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="task-description" className={labelClass}>Description</label>
                  <textarea id="task-description" value={taskFormData.description} onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })} className={`${inputClass} min-h-[100px] resize-y`} required />
                </div>
                <div>
                  <label htmlFor="task-assign" className={labelClass}>Assign To</label>
                  <select id="task-assign" value={taskFormData.assignedToId} onChange={(e) => setTaskFormData({ ...taskFormData, assignedToId: e.target.value })} className={inputClass} required>
                    <option value="">Select assignee</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="task-deadline" className={labelClass}>Deadline</label>
                  <input id="task-deadline" type="datetime-local" value={taskFormData.deadline} onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })} className={inputClass} required />
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={taskFormData.requiresProof} onChange={(e) => setTaskFormData({ ...taskFormData, requiresProof: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer" />
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
                <button type="submit" className={btnPrimary} disabled={loading}>{loading ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">All Tasks</h2>
          </div>

          <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setTaskStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  taskStatusFilter === s
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">CAPEX/REVEX</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllTasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-800">{task.title}</strong>
                        {task.capId && (
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">{task.capId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {task.assignedTo?.email || task.assignedBy?.email || '—'}
                    </td>
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
                        <button type="button" onClick={() => navigate(`/tasks/${task.id}`)} className={btnSecondary}>View</button>
                        <button type="button" onClick={() => handleDeleteTask(task.id)} className={btnDanger}>Delete</button>
                        {task.approvalStatus === 'PENDING' && (
                          <>
                            <button type="button" onClick={() => handleApproveTask(task.id)} className={btnSuccess}>Approve</button>
                            <button type="button" onClick={() => handleRejectTask(task.id)} className={btnDanger}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAllTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-slate-500 text-center">No tasks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTasksPage;
