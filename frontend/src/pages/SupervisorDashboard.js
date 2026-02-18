import React, { useState, useEffect } from 'react';
import { createTask, getTasks, approveTask, rejectTask, getUsers } from '../services/api';
import './Dashboard.css';

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Supervisor Dashboard</h1>
        <div className="header-actions">
          <span>Welcome, {user.email}</span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <div className="card-header">
            <h2>Tasks</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary"
            >
              {showCreateForm ? 'Cancel' : 'Create Task'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleSubmit} className="create-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedToId: e.target.value })
                  }
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
              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.requiresProof}
                    onChange={(e) =>
                      setFormData({ ...formData, requiresProof: e.target.checked })
                    }
                  />
                  Requires Proof Image
                </label>
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          )}

          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Assigned To</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Requires Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <br />
                    <small>{task.description}</small>
                  </td>
                  <td>{task.assignedTo.email}</td>
                  <td>{new Date(task.deadline).toLocaleString()}</td>
                  <td>{getStatusBadge(task.status)}</td>
                  <td>{task.requiresProof ? 'Yes' : 'No'}</td>
                  <td>
                    {task.status === 'SUBMITTED' && (
                      <>
                        {task.submission?.proofImagePath && (
                          <a
                            href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/${task.submission.proofImagePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ marginRight: '5px', fontSize: '12px', padding: '5px 10px' }}
                          >
                            View Proof
                          </a>
                        )}
                        <button
                          onClick={() => handleApprove(task.id)}
                          className="btn btn-success"
                          style={{ marginRight: '5px', fontSize: '12px', padding: '5px 10px' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(task.id)}
                          className="btn btn-danger"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;

