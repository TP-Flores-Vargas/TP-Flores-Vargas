(function () {
  const TOKEN_KEY = 'ids:authToken';
  const unauthorizedEventName = 'ids:unauthorized';
  const fallbackDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const baseUrl = (() => {
    const raw = window.__API_BASE_URL__ || 'http://localhost:4000/api';
    return String(raw).replace(/\/$/, '');
  })();

  let authToken = null;
  try {
    authToken = window.localStorage?.getItem?.(TOKEN_KEY) || null;
  } catch (error) {
    authToken = null;
  }

  const listeners = new Set();

  const notifyUnauthorized = () => {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error en listener de sesión', error);
      }
    });
    try {
      const event = new CustomEvent(unauthorizedEventName);
      window.dispatchEvent(event);
    } catch (error) {
      // Ignorar entornos sin soporte para CustomEvent
    }
  };

  const setToken = (token) => {
    authToken = token || null;
    try {
      if (token) window.localStorage?.setItem?.(TOKEN_KEY, token);
      else window.localStorage?.removeItem?.(TOKEN_KEY);
    } catch (error) {
      console.warn('No se pudo almacenar el token', error);
    }
  };

  const getToken = () => authToken;

  const clearToken = () => setToken(null);

  const buildUrl = (path, query) => {
    const url = new URL(`${baseUrl}${path}`);
    if (query && typeof query === 'object') {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((item) => url.searchParams.append(key, item));
        } else {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  };

  const request = async (path, options = {}) => {
    const {
      method = 'GET',
      query,
      body,
      headers = {},
      signal,
      skipAuth = false,
    } = options;

    const url = buildUrl(path, query);
    const config = {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      signal,
    };

    if (body !== undefined) {
      config.body = JSON.stringify(body);
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    if (!skipAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (error) {
      const networkError = new Error('No se pudo conectar con el backend.');
      networkError.cause = error;
      throw networkError;
    }

    const contentType = response.headers.get('content-type') || '';
    let payload = null;
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }
    } else {
      const text = await response.text();
      payload = text ? { raw: text } : null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
        notifyUnauthorized();
      }
      const error = new Error((payload && (payload.error || payload.message)) || 'Error en la solicitud');
      error.status = response.status;
      error.data = payload;
      throw error;
    }

    return payload;
  };

  const api = {
    getToken,
    setToken,
    clearToken,
    onUnauthorized(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async login(email, password) {
      const response = await request('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });
      if (response?.token) {
        setToken(response.token);
      }
      return response;
    },
    async logout() {
      try {
        if (!authToken) return;
        await request('/auth/logout', { method: 'POST' });
      } catch (error) {
        if (error.status !== 401) {
          throw error;
        }
      } finally {
        clearToken();
      }
    },
    async getCurrentUser() {
      return request('/auth/me');
    },
    async fetchSessions() {
      return request('/auth/sessions');
    },
    async changePassword(currentPassword, newPassword) {
      return request('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
    },
    async updateNotificationEmail(email) {
      return request('/auth/notification-email', {
        method: 'POST',
        body: { email },
      });
    },
    async fetchAlerts(params) {
      return request('/alerts', { query: params });
    },
    async fetchAlertById(id) {
      return request(`/alerts/${id}`);
    },
    async fetchAlertSummary() {
      return request('/alerts/summary');
    },
    async fetchDashboardOverview() {
      return request('/alerts/dashboard');
    },
    async createAlertAction(id, payload) {
      return request(`/alerts/${id}/actions`, { method: 'POST', body: payload });
    },
    async fetchHelpContent() {
      return request('/help');
    },
    async getReportSummary(days) {
      return request('/reports/summary', { query: { days } });
    },
    async generateBasicReport(days) {
      return request('/reports/basic', { method: 'POST', body: { days } });
    },
    async getMockAlerts() {
      await fallbackDelay(120);
      return window.mockAlerts || [];
    },
    async getMockHelp() {
      await fallbackDelay(80);
      return window.helpContent || { glossary: {}, faqItems: [] };
    },
  };

  window.Services = window.Services || {};
  window.Services.api = api;
})();
