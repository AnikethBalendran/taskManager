import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Configure axios to include credentials (cookies)
axios.defaults.withCredentials = true;

/**
 * Auth API
 */
export const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password
  });
  return response.data;
};

export const logout = async () => {
  await axios.post(`${API_BASE_URL}/auth/logout`);
};

export const getCurrentUser = async () => {
  const response = await axios.get(`${API_BASE_URL}/auth/me`);
  return response.data.user;
};

/**
 * Users API (Admin only)
 */
export const createUser = async (email, password, role) => {
  const response = await axios.post(`${API_BASE_URL}/users`, {
    email,
    password,
    role
  });
  return response.data;
};

export const getUsers = async () => {
  const response = await axios.get(`${API_BASE_URL}/users`);
  return response.data;
};

export const updateUser = async (userId, email, role) => {
  const response = await axios.put(`${API_BASE_URL}/users/${userId}`, {
    email,
    role
  });
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await axios.delete(`${API_BASE_URL}/users/${userId}`);
  return response.data;
};

export const getUserTasks = async (userId) => {
  const response = await axios.get(`${API_BASE_URL}/users/${userId}/tasks`);
  return response.data;
};

/**
 * Tasks API
 */
export const createTask = async (taskData) => {
  // Fix: Explicitly include credentials to ensure cookies (JWT) are sent
  // This is critical for authentication - cookies contain the JWT token
  const response = await axios.post(`${API_BASE_URL}/tasks`, taskData, {
    withCredentials: true // Explicitly send cookies
  });
  return response.data;
};

export const getTasks = async () => {
  const response = await axios.get(`${API_BASE_URL}/tasks`);
  return response.data;
};

export const getAdminSummary = async ({ from, to }) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const response = await axios.get(`${API_BASE_URL}/tasks/summary?${params.toString()}`);
  return response.data;
};

export const submitTask = async (taskId, proofImage, { completionDetails, remarks } = {}) => {
  const formData = new FormData();
  if (proofImage) {
    formData.append('proofImage', proofImage);
  }
  formData.append('completionDetails', completionDetails ?? '');
  formData.append('remarks', remarks ?? '');

  const response = await axios.post(
    `${API_BASE_URL}/tasks/${taskId}/submit`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

export const approveTask = async (taskId) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/approve`);
  return response.data;
};

export const rejectTask = async (taskId, approvalNotes) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/reject`, {
    approvalNotes
  });
  return response.data;
};

/**
 * Task history API
 */
export const getTaskHistory = async (taskId) => {
  const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/history`);
  return response.data;
};

export const getTask = async (taskId) => {
  const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}`);
  return response.data;
};

export const updateTask = async (taskId, fields) => {
  const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}`, fields);
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
  return response.data;
};

export const createTaskUpdate = async (taskId, message) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/updates`, { message });
  return response.data;
};

export const getProfile = async () => {
  const response = await axios.get(`${API_BASE_URL}/users/me`);
  return response.data;
};

export const updateProfile = async (fields) => {
  const response = await axios.put(`${API_BASE_URL}/users/me`, fields);
  return response.data;
};

export const getTaskAttachments = async (taskId) => {
  const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/attachments`);
  return response.data;
};

export const uploadTaskAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteAttachment = async (attachmentId) => {
  const response = await axios.delete(`${API_BASE_URL}/attachments/${attachmentId}`);
  return response.data;
};

