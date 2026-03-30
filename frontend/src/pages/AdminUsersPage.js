import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getUserTasks,
  approveTask,
  rejectTask,
  getProfile,
  updateProfile
} from '../services/api';
import AdminManageHeader from '../components/AdminManageHeader';
import AdminProfileModal from '../components/AdminProfileModal';
import { formatDueDate, dueDateColor, getStatusBadge } from '../utils/taskDisplay';

const AdminUsersPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [userTaskFilter, setUserTaskFilter] = useState('ALL');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'USER' });
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
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users);
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

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) return;
    const ok = window.confirm(
      `Delete user ${targetUser.email}? This cannot be undone.`
    );
    if (!ok) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await deleteUser(targetUser.id);
      setSuccess('User deleted successfully');
      if (selectedUserId === targetUser.id) {
        setSelectedUserId(null);
        setUserTasks([]);
      }
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
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
      if (selectedUserId) await handleViewUserTasks(selectedUserId);
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
      if (selectedUserId) await handleViewUserTasks(selectedUserId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject task');
    }
  };

  const filteredUserTasks = userTaskFilter === 'ALL' ? userTasks : userTasks.filter(t => t.status === userTaskFilter);

  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const btnPrimary = 'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary = 'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const btnSuccess = 'px-4 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors';
  const btnDanger = 'px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors';

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminManageHeader user={user} onLogout={onLogout} onOpenProfile={openProfile} activeSection="users" />

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
        {error && !showCreateForm && !editingUser && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && !showCreateForm && !editingUser && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{success}</div>
        )}

        <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Users</h2>
            <button
              onClick={() => { setShowCreateForm(!showCreateForm); }}
              className={btnPrimary}
            >
              {showCreateForm ? 'Cancel' : 'Create User'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleUserSubmit} className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Create New User</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="create-user-email" className={labelClass}>Email</label>
                  <input id="create-user-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="create-user-password" className={labelClass}>Password</label>
                  <input id="create-user-password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="create-user-role" className={labelClass}>Role</label>
                  <select id="create-user-role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className={inputClass}>
                    <option value="USER">User</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}
                <button type="submit" className={btnPrimary} disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
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
                        <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                      ) : u.email}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-800">
                      {editingUser?.id === u.id ? (
                        <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className="px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                          <option value="USER">USER</option>
                          <option value="SUPERVISOR">SUPERVISOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : u.role}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      {editingUser?.id === u.id ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={handleUpdateUser} className={btnSuccess}>Save</button>
                          <button type="button" onClick={() => { setEditingUser(null); setError(''); setSuccess(''); }} className={btnSecondary}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleEditUser({ ...u })} className={btnPrimary}>Edit</button>
                          <button type="button" onClick={() => handleViewUserTasks(u.id)} className={btnSecondary}>View Tasks</button>
                          {u.id !== user.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className={btnDanger}
                              disabled={loading}
                            >
                              Delete
                            </button>
                          )}
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
          <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Active Tasks for {users.find(u => u.id === selectedUserId)?.email}
              </h2>
              <button type="button" onClick={() => { setSelectedUserId(null); setUserTasks([]); }} className={btnSecondary}>Close</button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
              {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setUserTaskFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    userTaskFilter === s
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="p-6">
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              {filteredUserTasks.length === 0 ? (
                <p className="text-slate-600">No tasks found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">CAPEX/REVEX</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Proof</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUserTasks.map((task) => (
                        <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-6 py-3 text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-slate-800 font-medium">{task.title}</span>
                              {task.capId && (
                                <span className="font-mono text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">{task.capId}</span>
                              )}
                            </div>
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
                          <td className="px-6 py-3 text-sm">
                            {task.submission?.proofImagePath ? (
                              <a href={task.submission.proofImagePath} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">View Proof</a>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <button type="button" onClick={() => navigate(`/tasks/${task.id}`)} className={btnSecondary}>View</button>
                              {task.approvalStatus === 'PENDING' && (
                                <>
                                  <button type="button" className={btnSuccess} onClick={() => handleApproveTask(task.id)}>Approve</button>
                                  <button type="button" className={btnDanger} onClick={() => handleRejectTask(task.id)}>Reject</button>
                                </>
                              )}
                            </div>
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

export default AdminUsersPage;
