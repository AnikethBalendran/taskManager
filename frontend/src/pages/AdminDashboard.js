import React, { useState, useEffect } from 'react';
import { createUser, getUsers, updateUser, getUserTasks, createTask, approveTask, rejectTask } from '../services/api';

const AdminDashboard = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'USER'
  });
  const [taskFormData, setTaskFormData] = useState({
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
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await createUser(formData.email, formData.password, formData.role);
      setSuccess('User created successfully');
      setFormData({ email: '', password: '', role: 'USER' });
      setShowCreateForm(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userToEdit) => {
    setEditingUser(userToEdit);
    setError('');
    setSuccess('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateUser(editingUser.id, editingUser.email, editingUser.role);
      setSuccess('User updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserTasks = async (userId) => {
    try {
      const response = await getUserTasks(userId);
      setUserTasks(response.tasks);
      setSelectedUserId(userId);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user tasks');
      setUserTasks([]);
      setSelectedUserId(null);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await createTask(taskFormData);
      setSuccess('Task created successfully');
      setTaskFormData({
        title: '',
        description: '',
        assignedToId: '',
        deadline: '',
        requiresProof: false
      });
      setShowCreateTaskForm(false);
      // Reload user tasks if viewing a user's tasks
      if (selectedUserId) {
        handleViewUserTasks(selectedUserId);
      }
    } catch (err) {
      // Fix: Show detailed error message from backend for debugging
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
      if (selectedUserId) {
        await handleViewUserTasks(selectedUserId);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve task');
    }
  };

  const handleRejectTask = async (taskId) => {
    try {
      setError('');
      setSuccess('');
      await rejectTask(taskId);
      setSuccess('Task rejected successfully');
      if (selectedUserId) {
        await handleViewUserTasks(selectedUserId);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject task');
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = `status-${status.toLowerCase()}`;
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  // Filter users for task assignment (SUPERVISOR and USER only)
  const assignableUsers = users.filter(u => u.role === 'SUPERVISOR' || u.role === 'USER');

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
            <h1 className="text-xl font-semibold text-slate-800">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Welcome, {user.email}</span>
              <button onClick={onLogout} className={btnSecondary}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && !showCreateForm && !showCreateTaskForm && !editingUser && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && !showCreateForm && !showCreateTaskForm && !editingUser && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Users</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowCreateTaskForm(false);
                  setShowCreateForm(!showCreateForm);
                }}
                className={btnPrimary}
              >
                {showCreateForm ? 'Cancel' : 'Create User'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setShowCreateTaskForm(!showCreateTaskForm);
                }}
                className={btnPrimary}
              >
                {showCreateTaskForm ? 'Cancel' : 'Create Task'}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <form onSubmit={handleUserSubmit} className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Create New User</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="create-user-email" className={labelClass}>Email</label>
                  <input
                    id="create-user-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="create-user-password" className={labelClass}>Password</label>
                  <input
                    id="create-user-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="create-user-role" className={labelClass}>Role</label>
                  <select
                    id="create-user-role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={inputClass}
                  >
                    <option value="USER">User</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}
                <button type="submit" className={btnPrimary} disabled={loading}>
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          )}

          {showCreateTaskForm && (
            <form onSubmit={handleCreateTask} className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Create New Task</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="task-title" className={labelClass}>Title</label>
                  <input
                    id="task-title"
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="task-description" className={labelClass}>Description</label>
                  <textarea
                    id="task-description"
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    className={`${inputClass} min-h-[100px] resize-y`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="task-assign" className={labelClass}>Assign To</label>
                  <select
                    id="task-assign"
                    value={taskFormData.assignedToId}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assignedToId: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="">Select a user or supervisor</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="task-deadline" className={labelClass}>Deadline</label>
                  <input
                    id="task-deadline"
                    type="datetime-local"
                    value={taskFormData.deadline}
                    onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taskFormData.requiresProof}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, requiresProof: e.target.checked })
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
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-800">
                      {editingUser?.id === u.id ? (
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-800">
                      {editingUser?.id === u.id ? (
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                          className="px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="USER">USER</option>
                          <option value="SUPERVISOR">SUPERVISOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      {editingUser?.id === u.id ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={handleUpdateUser} className={btnSuccess}>
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingUser(null); setError(''); setSuccess(''); }}
                            className={btnSecondary}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditUser({ ...u })} className={btnPrimary}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleViewUserTasks(u.id)} className={btnSecondary}>
                            View Tasks
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

        {selectedUserId && (
          <div className="mt-6 bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Active Tasks for {users.find(u => u.id === selectedUserId)?.email}
              </h2>
              <button
                type="button"
                onClick={() => { setSelectedUserId(null); setUserTasks([]); }}
                className={btnSecondary}
              >
                Close
              </button>
            </div>
            <div className="p-6">
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              {userTasks.length === 0 ? (
                <p className="text-slate-600">No active tasks found for this user.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Requires Proof</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Proof</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTasks.map((task) => (
                        <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-6 py-3 text-sm text-slate-800">{task.title}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{task.description}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{new Date(task.deadline).toLocaleString()}</td>
                          <td className="px-6 py-3">{getStatusBadge(task.status)}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{task.requiresProof ? 'Yes' : 'No'}</td>
                          <td className="px-6 py-3 text-sm">
                            {task.submission?.proofImagePath ? (
                              <a
                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/${task.submission.proofImagePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-500 hover:underline"
                              >
                                View Proof
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {task.status === 'SUBMITTED' && (
                              <div className="flex gap-2">
                                <button type="button" className={btnSuccess} onClick={() => handleApproveTask(task.id)}>
                                  Approve
                                </button>
                                <button type="button" className={btnDanger} onClick={() => handleRejectTask(task.id)}>
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
