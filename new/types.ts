export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'internal_staff';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
}

export enum AuthStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface JwtPayload {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'internal_staff';
  exp: number;
}
