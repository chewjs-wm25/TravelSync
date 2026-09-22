export interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  full_name: string;
  phone: string | null;
  ic_hash: string | null;
  profile_picture: string | null;
  is_verified: number;
  is_active: number;
  is_locked: number;
  failed_attempts: number;
  lock_until: string | null;
  last_login: string | null;
  created_at: string;
  role?: string;
  has_password?: number;
}

export interface UserSettingsRecord {
  user_id: string;
  notifications_enabled: number;
  language: string;
  theme: string;
  privacy_level: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

export interface D1Result<T> {
  results: T[];
}
