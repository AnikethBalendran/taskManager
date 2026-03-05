import React, { useState, useEffect } from 'react';
import { getTasks, submitTask } from '../services/api';

const UserDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    const statusClass = `status-${status.toLowerCase()}`;
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const isDeadlineNear = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    return diff > 0 && diff < 24 * 60 * 60 * 1000; // Within 24 hours
  };

  const btnPrimary = 'px-4 py-2 rounded-lg font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition-colors';
  const btnSecondary = 'px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors';
  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-800">User Dashboard</h1>
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
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">My Tasks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Requires Proof</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 ${isDeadlineNear(task.deadline) && task.status !== 'APPROVED' ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-6 py-3 text-sm">
                      <strong className="text-slate-800">{task.title}</strong>
                      {isDeadlineNear(task.deadline) && task.status !== 'APPROVED' && (
                        <span className="ml-2 text-red-600 text-sm">⚠ Deadline approaching!</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{task.description}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{new Date(task.deadline).toLocaleString()}</td>
                    <td className="px-6 py-3">{getStatusBadge(task.status)}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{task.requiresProof ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-3 text-sm">
                      {task.status === 'OPEN' && (
                        <button type="button" onClick={() => setSelectedTask(task)} className={btnPrimary}>
                          Submit
                        </button>
                      )}
                      {task.status === 'SUBMITTED' && (
                        <span className="text-sky-600">
                          Submitted on {new Date(task.submission?.submittedAt).toLocaleString()}
                        </span>
                      )}
                      {task.status === 'APPROVED' && (
                        <span className="text-emerald-600">✓ Approved</span>
                      )}
                      {task.status === 'REJECTED' && (
                        <span className="text-red-600">✗ Rejected</span>
                      )}
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
              <h2 className="text-lg font-semibold text-slate-800">Submit Task: {selectedTask.title}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
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
                  {loading ? 'Submitting...' : 'Submit Task'}
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

