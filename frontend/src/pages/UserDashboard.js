import React, { useState, useEffect } from 'react';
import { formatInr } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import { getTasks, submitTask, getProfile, updateProfile } from '../services/api';

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

const UserDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Profile modal
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', profilePicture: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await getTasks();
      setTasks(response.tasks);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await submitTask(selectedTask.id, proofImage);
      setSelectedTask(null);
      setProofImage(null);
      loadTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit task');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const statusClass = `status-${status.toLowerCase()}`;
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const getApprovalBadge = (approvalStatus) => {
    if (!approvalStatus || approvalStatus === 'NONE') return null;
    const normalized = approvalStatus.toLowerCase();
    return (
      <span className={`badge-approval badge-approval-${normalized}`}>
        {approvalStatus.replace('_', ' ')}
      </span>
    );
  };

  const canSubmitForApproval = (task) => {
    if (!task) return false;
    if (task.approvalStatus === 'PENDING' || task.approvalStatus === 'APPROVED') return false;
    if (task.approvalStatus === 'REJECTED') return task.status === 'IN_PROGRESS';
    return true;
  };

  const filteredTasks = statusFilter === 'ALL' ? tasks : tasks.filter(t => t.status === statusFilter);

  const btnPrimary = 'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary = 'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-800">User Dashboard</h1>
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
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">My Tasks</h2>
          </div>

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
                {s === 'ALL' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">CAPEX/REVEX</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 ${task.isOverdue && task.approvalStatus !== 'APPROVED' ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-6 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-800">{task.title}</strong>
                        {task.capId && (
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">{task.capId}</span>
                        )}
                      </div>
                      <div className="text-slate-600 text-xs mt-0.5">{task.description}</div>
                    </td>
                    <td className={`px-6 py-3 text-sm ${dueDateColor(task.deadline, task.isOverdue)}`}>
                      {formatDueDate(task.deadline)}
                    </td>
                    <td className="px-6 py-3 space-y-1">
                      {getStatusBadge(task.status)}
                      <div>{getApprovalBadge(task.approvalStatus)}</div>
                      {task.approvalStatus === 'REJECTED' && (
                        <div className="text-xs font-medium text-red-600">Rejected – Needs Fix</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {task.capexType !== 'NONE' ? (
                        <span>{task.capexType}{task.capexAmount != null ? ` ${formatInr(task.capexAmount)}` : ''}</span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className={btnSecondary}
                        >
                          View
                        </button>
                        {canSubmitForApproval(task) && (
                          <button
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className={btnPrimary}
                          >
                            {task.approvalStatus === 'REJECTED' ? 'Fix & Resubmit' : 'Submit'}
                          </button>
                        )}
                        {task.approvalStatus === 'PENDING' && (
                          <span className="text-sky-600 text-xs self-center">Awaiting approval</span>
                        )}
                        {task.approvalStatus === 'APPROVED' && (
                          <span className="text-emerald-600 text-xs self-center">✓ Approved</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTask && (
          <div className="mt-6 bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedTask.approvalStatus === 'REJECTED' ? 'Fix & Resubmit' : 'Submit Task'}:{' '}
                {selectedTask.title}
              </h2>
            </div>
            <div className="px-6 pt-4">
              {selectedTask.approvalStatus === 'REJECTED' && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  ⚠ This task was rejected by the supervisor.
                  <br />
                  Please review the feedback and resubmit.
                </div>
              )}
              {selectedTask.approvalStatus === 'REJECTED' && selectedTask.approvalNotes && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Supervisor Feedback</h3>
                  <p className="text-sm text-red-700 whitespace-pre-line">{selectedTask.approvalNotes}</p>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="p-6 pt-2">
              {selectedTask.requiresProof && (
                <div className="mb-4">
                  <label htmlFor="proof-image" className="block text-sm font-medium text-slate-700 mb-1">
                    Proof Image (Required)
                  </label>
                  <input
                    id="proof-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofImage(e.target.files[0])}
                    className={inputClass}
                    required
                  />
                  {proofImage && (
                    <div className="mt-3">
                      <img
                        src={URL.createObjectURL(proofImage)}
                        alt="Preview"
                        className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              )}
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" className={btnPrimary} disabled={loading}>
                  {loading ? 'Submitting...' : selectedTask.approvalStatus === 'REJECTED' ? 'Resubmit Task' : 'Submit Task'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedTask(null); setProofImage(null); setError(''); }}
                  className={btnSecondary}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
