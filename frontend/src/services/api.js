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

/**
 * Tasks API
 */
export const createTask = async (taskData) => {
  const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);
  return response.data;
};

export const getTasks = async () => {
  const response = await axios.get(`${API_BASE_URL}/tasks`);
  return response.data;
};

export const submitTask = async (taskId, proofImage) => {
  const formData = new FormData();
  if (proofImage) {
    formData.append('proofImage', proofImage);
  }

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

export const rejectTask = async (taskId) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/reject`);
  return response.data;
};

