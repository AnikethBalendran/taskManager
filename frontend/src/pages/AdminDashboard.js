import React, { useState, useEffect } from 'react';
import { createUser, getUsers, updateUser, getUserTasks, createTask } from '../services/api';
import './Dashboard.css';

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

  const getStatusBadge = (status) => {
    const statusClass = `status-${status.toLowerCase()}`;
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  // Filter users for task assignment (SUPERVISOR and USER only)
  const assignableUsers = users.filter(u => u.role === 'SUPERVISOR' || u.role === 'USER');

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="header-actions">
          <span>Welcome, {user.email}</span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        {/* Global error/success messages */}
        {error && !showCreateForm && !showCreateTaskForm && !editingUser && (
          <div className="card" style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb' }}>
            <div className="error">{error}</div>
          </div>
        )}
        {success && !showCreateForm && !showCreateTaskForm && !editingUser && (
          <div className="card" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb' }}>
            <div className="success">{success}</div>
          </div>
        )}

        {/* Users Section */}
        <div className="card">
          <div className="card-header">
            <h2>Users</h2>
            <div>
              <button
                onClick={() => {
                  setShowCreateTaskForm(false);
                  setShowCreateForm(!showCreateForm);
                }}
                className="btn btn-primary"
                style={{ marginRight: '10px' }}
              >
                {showCreateForm ? 'Cancel' : 'Create User'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setShowCreateTaskForm(!showCreateTaskForm);
                }}
                className="btn btn-primary"
              >
                {showCreateTaskForm ? 'Cancel' : 'Create Task'}
              </button>
            </div>
          </div>

          {/* Create User Form */}
          {showCreateForm && (
            <form onSubmit={handleUserSubmit} className="create-form">
              <h3>Create New User</h3>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="USER">User</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </form>
          )}

          {/* Create Task Form */}
          {showCreateTaskForm && (
            <form onSubmit={handleCreateTask} className="create-form">
              <h3>Create New Task</h3>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select
                  value={taskFormData.assignedToId}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, assignedToId: e.target.value })
                  }
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
              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="datetime-local"
                  value={taskFormData.deadline}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, deadline: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                {/* Fix: Use checkbox-label class to override form-group label block display */}
                {/* This keeps checkbox and label together on the left, not stretched */}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={taskFormData.requiresProof}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, requiresProof: e.target.checked })
                    }
                    style={{ margin: 0, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span>Requires Proof Image</span>
                </label>
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          )}

          {/* Users Table */}
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {editingUser?.id === u.id ? (
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) =>
                          setEditingUser({ ...editingUser, email: e.target.value })
                        }
                        style={{ width: '100%', padding: '5px' }}
                      />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td>
                    {editingUser?.id === u.id ? (
                      <select
                        value={editingUser.role}
                        onChange={(e) =>
                          setEditingUser({ ...editingUser, role: e.target.value })
                        }
                        style={{ padding: '5px' }}
                      >
                        <option value="USER">USER</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleString()}</td>
                  <td>
                    {editingUser?.id === u.id ? (
                      <>
                        <button
                          onClick={handleUpdateUser}
                          className="btn btn-success"
                          style={{ fontSize: '12px', padding: '5px 10px', marginRight: '5px' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(null);
                            setError('');
                            setSuccess('');
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditUser({ ...u })}
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '5px 10px', marginRight: '5px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewUserTasks(u.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          View Tasks
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User Tasks Section */}
        {selectedUserId && (
          <div className="card">
            <div className="card-header">
              <h2>
                Active Tasks for {users.find(u => u.id === selectedUserId)?.email}
              </h2>
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setUserTasks([]);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
            {error && <div className="error">{error}</div>}
            {userTasks.length === 0 ? (
              <p>No active tasks found for this user.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Requires Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {userTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{task.description}</td>
                      <td>{new Date(task.deadline).toLocaleString()}</td>
                      <td>{getStatusBadge(task.status)}</td>
                      <td>{task.requiresProof ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
