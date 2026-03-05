import React, { useState, useEffect } from 'react';
import { createTask, getTasks, approveTask, rejectTask, getUsers } from '../services/api';

const SupervisorDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedToId: '',
    deadline: '',
    requiresProof: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await createTask(formData);
      setSuccess('Task created successfully');
      setFormData({
        title: '',
        description: '',
        assignedToId: '',
        deadline: '',
        requiresProof: false
      });
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
      await rejectTask(taskId);
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject task');
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = `status-${status.toLowerCase()}`;
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

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
              <button type="button" onClick={onLogout} className={btnSecondary}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

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
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
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
                      onChange={(e) =>
                        setFormData({ ...formData, requiresProof: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700">Requires Proof Image</span>
                  </label>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}
                <button type="submit" className={btnPrimary} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Requires Proof</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm">
                      <strong className="text-slate-800">{task.title}</strong>
                      <br />
                      <span className="text-slate-600 text-sm">{task.description}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{task.assignedTo.email}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{new Date(task.deadline).toLocaleString()}</td>
                    <td className="px-6 py-3">{getStatusBadge(task.status)}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{task.requiresProof ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-3">
                      {task.status === 'SUBMITTED' && (
                        <div className="flex flex-wrap gap-2">
                          {task.submission?.proofImagePath && (
                            <a
                              href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/${task.submission.proofImagePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={btnSecondary}
                            >
                              View Proof
                            </a>
                          )}
                          <button type="button" onClick={() => handleApprove(task.id)} className={btnSuccess}>
                            Approve
                          </button>
                          <button type="button" onClick={() => handleReject(task.id)} className={btnDanger}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;

