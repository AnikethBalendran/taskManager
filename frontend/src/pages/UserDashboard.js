import React, { useState, useEffect } from 'react';
import { getTasks, submitTask } from '../services/api';
import './Dashboard.css';

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>User Dashboard</h1>
        <div className="header-actions">
          <span>Welcome, {user.email}</span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <h2>My Tasks</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Requires Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  style={
                    isDeadlineNear(task.deadline) && task.status !== 'APPROVED'
                      ? { backgroundColor: '#fff3cd' }
                      : {}
                  }
                >
                  <td>
                    <strong>{task.title}</strong>
                    {isDeadlineNear(task.deadline) && task.status !== 'APPROVED' && (
                      <span style={{ color: '#dc3545', marginLeft: '10px' }}>
                        ⚠ Deadline approaching!
                      </span>
                    )}
                  </td>
                  <td>{task.description}</td>
                  <td>{new Date(task.deadline).toLocaleString()}</td>
                  <td>{getStatusBadge(task.status)}</td>
                  <td>{task.requiresProof ? 'Yes' : 'No'}</td>
                  <td>
                    {task.status === 'OPEN' && (
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        Submit
                      </button>
                    )}
                    {task.status === 'SUBMITTED' && (
                      <span style={{ color: '#17a2b8' }}>
                        Submitted on {new Date(task.submission?.submittedAt).toLocaleString()}
                      </span>
                    )}
                    {task.status === 'APPROVED' && (
                      <span style={{ color: '#28a745' }}>✓ Approved</span>
                    )}
                    {task.status === 'REJECTED' && (
                      <span style={{ color: '#dc3545' }}>✗ Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedTask && (
          <div className="card">
            <h2>Submit Task: {selectedTask.title}</h2>
            <form onSubmit={handleSubmit}>
              {selectedTask.requiresProof && (
                <div className="form-group">
                  <label>Proof Image (Required)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofImage(e.target.files[0])}
                    required
                  />
                  {proofImage && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={URL.createObjectURL(proofImage)}
                        alt="Preview"
                        style={{ maxWidth: '200px', maxHeight: '200px' }}
                      />
                    </div>
                  )}
                </div>
              )}
              {error && <div className="error">{error}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    setProofImage(null);
                    setError('');
                  }}
                  className="btn btn-secondary"
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

