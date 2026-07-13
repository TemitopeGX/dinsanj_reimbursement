// NOTE: Ensure VITE_API_URL is set in your .env file
export const API_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbweqX9ZDKuDLb8mhnzIeS4G2EQWa47tiWSW2qqdi7Q6zvNNPkr-7Je_MVZTvSjRWIYGjA/exec";

async function apiCall(action, payload = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action, payload, token }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  });
  
  const result = await response.json();
  if (!result.success) {
    if (result.message && result.message.includes("expired")) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    throw new Error(result.message || result.error || "API call failed");
  }
  return result.data;
}

export const authApi = {
  login: (email, password) => apiCall('login', { email, password }),
};

export const dashboardApi = {
  getStats: () => apiCall('getDashboardData'),
};

export const recordsApi = {
  getClients: () => apiCall('getClients'),
  getJobs: () => apiCall('getJobs'),
  getReimbursements: () => apiCall('getReimbursements'),
  createClient: (data) => apiCall('createClient', data),
  createJob: (data) => apiCall('createJob', data),
  updateJob: (data) => apiCall('updateJob', data),
  createReimbursement: (data) => apiCall('createReimbursement', data),
  addPayment: (payload) => apiCall('addPayment', payload),
  updateClient: (payload) => apiCall('updateClient', payload),
  updateReimbursement: (payload) => apiCall('updateReimbursement', payload),
  getUsers: () => apiCall('getUsers'),
  createUser: (payload) => apiCall('createUser', payload),
  sendReminder: (reimbursementId) => apiCall('sendReminder', { reimbursementId }),
};
