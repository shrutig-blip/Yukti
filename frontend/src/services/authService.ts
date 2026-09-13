import { apiPost } from './apiClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'BIDDER' | 'PROCUREMENT_OFFICER';
}

interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'yukti_token';
const USER_KEY = 'yukti_user';

class AuthService {
  public async login(email: string, password: string): Promise<AuthUser> {
    const res = await apiPost<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  public async register(name: string, email: string, password: string): Promise<AuthUser> {
    return apiPost<AuthUser>('/auth/register', { name, email, password });
  }

  public logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  public isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  public getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

export const authService = new AuthService();