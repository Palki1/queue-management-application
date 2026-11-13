const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('rugas_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    const errorMsg = data.error || (data.errors ? data.errors.join(', ') : 'Request failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  async login(identifier, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    return handleResponse(res);
  },

  async register(name, username, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, password })
    });
    return handleResponse(res);
  },

  async demoLogin() {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Queues (Requirements 1 & 2)
  async getQueues() {
    const res = await fetch(`${API_BASE}/queues`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getQueue(id) {
    const res = await fetch(`${API_BASE}/queues/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createQueue(name, prefix, description) {
    const res = await fetch(`${API_BASE}/queues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ name, prefix, description })
    });
    return handleResponse(res);
  },

  async updateQueue(id, data) {
    const res = await fetch(`${API_BASE}/queues/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteQueue(id) {
    const res = await fetch(`${API_BASE}/queues/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Tokens (Requirements 3, 4, 5, 6, 7)
  async getTokens(queueId, params = {}) {
    const search = new URLSearchParams(params).toString();
    const url = `${API_BASE}/queues/${queueId}/tokens${search ? `?${search}` : ''}`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async addToken(queueId, tokenData) {
    const res = await fetch(`${API_BASE}/queues/${queueId}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(tokenData)
    });
    return handleResponse(res);
  },

  async moveToken(queueId, tokenId, payload) {
    const body = typeof payload === 'object' ? payload : { direction: payload };
    const res = await fetch(`${API_BASE}/queues/${queueId}/tokens/${tokenId}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  async serveNextToken(queueId) {
    const res = await fetch(`${API_BASE}/queues/${queueId}/serve-next`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async serveSpecificToken(queueId, tokenId) {
    const res = await fetch(`${API_BASE}/queues/${queueId}/tokens/${tokenId}/serve`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async completeToken(queueId, tokenId) {
    const res = await fetch(`${API_BASE}/queues/${queueId}/tokens/${tokenId}/complete`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async cancelToken(queueId, tokenId, reason = '') {
    const res = await fetch(`${API_BASE}/queues/${queueId}/tokens/${tokenId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Analytics (Requirement 8)
  async getAnalyticsOverview(queueId = 'all') {
    const res = await fetch(`${API_BASE}/analytics/overview?queueId=${queueId}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getAnalyticsTrends(queueId = 'all') {
    const res = await fetch(`${API_BASE}/analytics/trends?queueId=${queueId}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getWaitDistribution(queueId = 'all') {
    const res = await fetch(`${API_BASE}/analytics/wait-distribution?queueId=${queueId}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getActivityLog(queueId = 'all', limit = 25) {
    const res = await fetch(`${API_BASE}/analytics/activity-log?queueId=${queueId}&limit=${limit}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  getExportUrl(queueId = 'all') {
    const token = localStorage.getItem('rugas_token');
    return `${API_BASE}/analytics/export?queueId=${queueId}&token=${token || ''}`;
  }
};
