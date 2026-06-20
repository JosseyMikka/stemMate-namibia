export interface User {
  id: number;
  email: string;
  full_name: string;
  grade: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  grade: string;
}

export interface LoginData {
  email: string;
  password: string;
}
