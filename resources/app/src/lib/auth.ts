const AUTH_URL = 'http://localhost:4000/api/auth';
const ADMIN_URL = 'http://localhost:4000/api/admin';

class AuthService {
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('erp_token');
    }
    return null;
  }

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_token', token);
      document.cookie = `erp_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    }
  }

  removeToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      document.cookie = 'erp_token=; path=/; max-age=0; SameSite=Lax';
    }
  }

  getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async login(email: string, password: string) {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    this.setToken(data.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_user', JSON.stringify(data.user));
    }
    return data;
  }

  async getMe() {
    const res = await fetch(`${AUTH_URL}/me`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      this.removeToken();
      throw new Error('Session expired');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_user', JSON.stringify(data.user));
    }
    return data;
  }

  logout() {
    this.removeToken();
  }
}

class AdminService {
  private auth = new AuthService();

  private async fetchAPI(path: string, options: RequestInit = {}) {
    const res = await fetch(`${ADMIN_URL}${path}`, {
      ...options,
      headers: {
        ...this.auth.getHeaders(),
        ...options.headers
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API request failed');
    return data;
  }

  getStats() { return this.fetchAPI('/stats'); }
  getUsers() { return this.fetchAPI('/users'); }
  createUser(data: any) { return this.fetchAPI('/users', { method: 'POST', body: JSON.stringify(data) }); }
  updateUser(id: string, data: any) { return this.fetchAPI(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  setPassword(id: string, password: string) { return this.fetchAPI(`/users/${id}/set-password`, { method: 'POST', body: JSON.stringify({ password }) }); }
  banUser(id: string, payload: any) { return this.fetchAPI(`/users/${id}/ban`, { method: 'POST', body: JSON.stringify(payload) }); }
  unbanUser(id: string) { return this.fetchAPI(`/users/${id}/unban`, { method: 'POST' }); }
  deleteUser(id: string) { return this.fetchAPI(`/users/${id}`, { method: 'DELETE' }); }
}

export const authService = new AuthService();
export const adminService = new AdminService();
