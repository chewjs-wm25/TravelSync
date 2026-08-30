import { AuditRepository } from "../../data_access_layer/01_User_&_Account_Management/AuditRepository";
import { SessionRepository } from "../../data_access_layer/01_User_&_Account_Management/SessionRepository";
import { UserRepository } from "../../data_access_layer/01_User_&_Account_Management/UserRepository";
import { PasswordResetRepository } from "../../data_access_layer/01_User_&_Account_Management/PasswordResetRepository";
import type { UserRecord } from "../../data_access_layer/01_User_&_Account_Management/types";
import { sendPasswordResetEmail } from "../../api_layer/01_User_&_Account_Management/EmailVerificationApi";
import { consumeVerificationToken, saveVerificationToken } from "./VerificationTokenStore";

const SESSION_TTL = 30 * 60 * 1000;
const REMEMBERED_SESSION_TTL = 31 * 24 * 60 * 60 * 1000;
const LOCK_TTL = 15 * 60 * 1000;
const RATE_WINDOW = 60 * 1000;
const MAX_REQUESTS = 10;
const requestLog = new Map<string, number[]>();

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  profilePicture: string | null;
  createdAt: string;
  isVerified: boolean;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe: boolean;
  ipAddress?: string | null;
}

export interface RegisterInput {
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  icNumber?: string;
  password: string;
  acceptTerms?: boolean;
}

export interface SettingsInput {
  notificationsEnabled: boolean;
  language: string;
  theme: "light" | "dark";
  privacyLevel: "private" | "contacts" | "public";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function publicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email?.endsWith("@local.invalid") ? null : user.email,
    fullName: user.full_name,
    phone: user.phone,
    profilePicture: user.profile_picture,
    createdAt: user.created_at,
    isVerified: Boolean(user.is_verified),
  };
}

function randomToken(): string {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

function base64Url(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const secret = process.env.JWT_SECRET || "travelsync-local-development-secret";
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${body}`)
  );
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return `${header}.${body}.${base64Url(binary)}`;
}

async function derivePassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120000, hash: "SHA-256" },
    key,
    256
  );
  let binary = "";
  for (const byte of new Uint8Array(bits)) binary += String.fromCharCode(byte);
  return `${salt}.${base64Url(binary)}`;
}

async function hashPassword(password: string): Promise<string> {
  return derivePassword(password, randomToken().slice(0, 32));
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(".");
  if (!salt || !expected) return false;
  return (await derivePassword(password, salt)).split(".")[1] === expected;
}

export class AuthService {
  private readonly users: UserRepository;
  private readonly sessions: SessionRepository;
  private readonly audit: AuditRepository;
  private readonly resetTokens: PasswordResetRepository;

  constructor(db: D1Database) {
    this.users = new UserRepository(db);
    this.sessions = new SessionRepository(db);
    this.audit = new AuditRepository(db);
    this.resetTokens = new PasswordResetRepository(db);
  }

  async register(
    input: RegisterInput
  ): Promise<{ user: PublicUser; verificationToken: string; verificationRequired: boolean; sessionToken?: string; expiresAt?: string }> {
    const username = (input.username || "").trim().toLowerCase();
    const fullName = (input.fullName || "").trim();
    const email = input.email?.trim() ? normalizeEmail(input.email) : null;
    const phone = input.phone?.trim() || null;
    const icNumber = input.icNumber?.trim() || null;
    const password = input.password || "";

    if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
      throw new Error("Username must be 3-24 characters (lowercase letters, numbers, and underscores).");
    }
    if (!fullName) {
      throw new Error("Full name is required.");
    }
    if (!email && !phone) {
      throw new Error("Either email or phone number is required.");
    }
    if (email && !validEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }
    if (!validPassword(password)) {
      throw new Error("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
    }
    if (input.acceptTerms === false) {
      throw new Error("Terms and privacy policy must be accepted.");
    }

    if (await this.users.findByUsername(username)) {
      throw new Error("Username is already taken.");
    }
    if (email && (await this.users.findByEmail(email))) {
      throw new Error("An account with this email already exists.");
    }
    if (phone && (await this.users.findByIdentifier(phone))) {
      throw new Error("An account with this phone number already exists.");
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const icHash = icNumber ? await hashPassword(icNumber) : null;

    const user: UserRecord = {
      id: userId,
      username,
      email,
      password_hash: passwordHash,
      full_name: fullName,
      phone,
      ic_hash: icHash,
      profile_picture: null,
      is_verified: 1,
      is_active: 1,
      is_locked: 0,
      failed_attempts: 0,
      lock_until: null,
      last_login: now,
      created_at: now,
      role: "user",
    };

    await this.users.create(user);

    // Create session for instant auto-login
    const expiresAt = new Date(Date.now() + SESSION_TTL);
    const sessionToken = await signJwt({
      sub: user.id,
      role: user.role ?? "user",
      exp: Math.floor(expiresAt.getTime() / 1000),
      jti: randomToken(),
    });
    await this.sessions.create({
      id: crypto.randomUUID(),
      user_id: user.id,
      token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    const verificationToken = randomToken();
    saveVerificationToken(verificationToken, user.id);

    return {
      user: publicUser(user),
      verificationToken,
      verificationRequired: false,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async login(
    input: LoginInput
  ): Promise<{ user: PublicUser; token: string; expiresAt: string }> {
    const identifier = (input.identifier || "").trim().toLowerCase();
    const ip = input.ipAddress ?? "unknown";
    const now = Date.now();
    const recent = (requestLog.get(ip) ?? []).filter((timestamp) => timestamp > now - RATE_WINDOW);
    if (recent.length >= MAX_REQUESTS) {
      throw new Error("Too many login attempts. Please wait a moment.");
    }
    recent.push(now);
    requestLog.set(ip, recent);

    if (!identifier || !input.password) {
      throw new Error("Please enter your username/email and password.");
    }

    const user = await this.users.findByIdentifier(identifier);
    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      if (user) {
        const attempts = user.failed_attempts + 1;
        const lockUntil = attempts >= 5 ? new Date(now + LOCK_TTL).toISOString() : null;
        await this.users.updateLoginFailure(user.id, attempts, lockUntil);
      }
      throw new Error("Invalid username/email or password.");
    }
    if (!user.is_active) {
      throw new Error("Account is deactivated. Please contact support.");
    }
    if (user.lock_until && new Date(user.lock_until).getTime() > now) {
      throw new Error("Account is temporarily locked due to failed attempts. Please try again later.");
    }

    const expiresAt = new Date(now + (input.rememberMe ? REMEMBERED_SESSION_TTL : SESSION_TTL));
    const token = await signJwt({
      sub: user.id,
      role: user.role ?? "user",
      exp: Math.floor(expiresAt.getTime() / 1000),
      jti: randomToken(),
    });
    await this.sessions.create({
      id: crypto.randomUUID(),
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });
    await this.users.markLoginSuccess(user.id);
    await this.audit.write(user.id, "login", ip, "Successful login");
    return { user: publicUser(user), token, expiresAt: expiresAt.toISOString() };
  }

  async logout(token: string): Promise<void> {
    if (token) await this.sessions.delete(token);
  }

  async currentUser(token: string): Promise<PublicUser> {
    const session = await this.sessions.findValid(token);
    if (!session) throw new Error("Unauthorized");
    const user = await this.users.findById(session.user_id);
    if (!user) throw new Error("Unauthorized");
    return publicUser(user);
  }

  async updateProfile(
    token: string,
    fullName: string,
    phone: string | null,
    profilePicture: string | null
  ): Promise<PublicUser> {
    const user = await this.authorize(token);
    if (!fullName || !fullName.trim()) throw new Error("Full name cannot be empty.");
    await this.users.updateProfile(user.id, fullName.trim(), phone, profilePicture);
    const updated = await this.users.findById(user.id);
    return publicUser(updated!);
  }

  async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.authorize(token);
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      throw new Error("Current password is incorrect.");
    }
    if (!validPassword(newPassword)) {
      throw new Error("New password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
    }
    await this.users.updatePassword(user.id, await hashPassword(newPassword));
  }

  async updateSettings(token: string, settings: SettingsInput): Promise<void> {
    const user = await this.authorize(token);
    await this.users.updateSettings(user.id, {
      notifications_enabled: settings.notificationsEnabled ? 1 : 0,
      language: settings.language || "en",
      theme: settings.theme || "light",
      privacy_level: settings.privacyLevel || "private",
    });
  }

  async getSettings(token: string) {
    const user = await this.authorize(token);
    const s = await this.users.settings(user.id);
    return {
      notificationsEnabled: s ? Boolean(s.notifications_enabled) : true,
      language: s?.language || "en",
      theme: (s?.theme as "light" | "dark") || "light",
      privacyLevel: (s?.privacy_level as "private" | "contacts" | "public") || "private",
    };
  }

  async deleteAccount(token: string, password: string): Promise<void> {
    const user = await this.authorize(token);
    if (!(await verifyPassword(password, user.password_hash))) {
      throw new Error("Password confirmation failed.");
    }
    await this.users.delete(user.id);
    await this.audit.write(user.id, "delete_account", null, "Account deleted");
  }

  async deleteTestAccount(identifier: string, password: string): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Test account deletion is disabled in production.");
    }
    const user = await this.users.findByIdentifier(identifier);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new Error("Test account credentials are incorrect.");
    }
    await this.users.delete(user.id);
  }

  async adminUsers(token: string): Promise<PublicUser[]> {
    const user = await this.authorize(token);
    if ((user.role ?? "user") !== "admin") throw new Error("Forbidden");
    return (await this.users.list()).map(publicUser);
  }

  async adminSetActive(token: string, userId: string, active: boolean): Promise<void> {
    const user = await this.authorize(token);
    if ((user.role ?? "user") !== "admin") throw new Error("Forbidden");
    await this.users.setActive(userId, active);
  }

  async adminDelete(token: string, userId: string): Promise<void> {
    const user = await this.authorize(token);
    if ((user.role ?? "user") !== "admin") throw new Error("Forbidden");
    await this.users.delete(userId);
  }

  async forgotPassword(emailInput: string): Promise<void> {
    const user = await this.users.findByEmail(normalizeEmail(emailInput));
    if (!user || !user.email) return;
    const token = randomToken();
    await this.resetTokens.create({
      id: crypto.randomUUID(),
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    await sendPasswordResetEmail({ email: user.email, token });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!validPassword(newPassword)) {
      throw new Error("Password does not meet strength requirements.");
    }
    const reset = await this.resetTokens.consume(token);
    if (!reset) throw new Error("Reset token is invalid or expired.");
    await this.users.updatePassword(reset.user_id, await hashPassword(newPassword));
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = consumeVerificationToken(token);
    if (!userId) throw new Error("Verification token is invalid or expired.");
    const user = await this.users.findById(userId);
    if (!user) throw new Error("User not found.");
    await this.users.verify(userId);
  }

  async authorize(token: string): Promise<UserRecord> {
    const session = await this.sessions.findValid(token);
    if (!session) throw new Error("Unauthorized");
    const user = await this.users.findById(session.user_id);
    if (!user || !user.is_active) throw new Error("Unauthorized");
    return user;
  }
}
