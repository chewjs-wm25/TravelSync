import { AuditRepository } from "../../data_access_layer/01_User_&_Account_Management/AuditRepository";
import { SessionRepository } from "../../data_access_layer/01_User_&_Account_Management/SessionRepository";
import { UserRepository } from "../../data_access_layer/01_User_&_Account_Management/UserRepository";
import { PasswordResetRepository } from "../../data_access_layer/01_User_&_Account_Management/PasswordResetRepository";
import type { UserRecord } from "../../data_access_layer/01_User_&_Account_Management/types";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../api_layer/01_User_&_Account_Management/EmailVerificationApi";
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

export interface LoginInput { identifier: string; password: string; rememberMe: boolean; ipAddress?: string | null }
export interface RegisterInput { username: string; fullName: string; email?: string; phone: string; icNumber: string; password: string; acceptTerms: boolean }
export interface SettingsInput { notificationsEnabled: boolean; language: string; theme: "light" | "dark"; privacyLevel: "private" | "contacts" | "public" }

function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
function validEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validPassword(password: string): boolean { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password); }
function publicUser(user: UserRecord): PublicUser { return { id: user.id, username: user.username, email: user.email?.endsWith("@local.invalid") ? null : user.email, fullName: user.full_name, phone: user.phone, profilePicture: user.profile_picture, createdAt: user.created_at, isVerified: Boolean(user.is_verified) }; }
function randomToken(): string { return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""); }
function base64Url(value: string): string { return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const secret = process.env.JWT_SECRET || "travelsync-local-development-secret";
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return `${header}.${body}.${base64Url(binary)}`;
}

async function derivePassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  let binary = "";
  for (const byte of new Uint8Array(bits)) binary += String.fromCharCode(byte);
  return `${salt}.${base64Url(binary)}`;
}

async function hashPassword(password: string): Promise<string> { return derivePassword(password, randomToken().slice(0, 32)); }
async function verifyPassword(password: string, stored: string): Promise<boolean> { const [salt, expected] = stored.split("."); if (!salt || !expected) return false; return (await derivePassword(password, salt)).split(".")[1] === expected; }

export class AuthService {
  private readonly users: UserRepository;
  private readonly sessions: SessionRepository;
  private readonly audit: AuditRepository;
  private readonly resetTokens: PasswordResetRepository;

  constructor(db: D1Database) { this.users = new UserRepository(db); this.sessions = new SessionRepository(db); this.audit = new AuditRepository(db); this.resetTokens = new PasswordResetRepository(db); }

  async register(input: RegisterInput): Promise<{ user: PublicUser; verificationToken: string; verificationRequired: boolean }> {
    const username = input.username.trim().toLowerCase();
    const email = input.email?.trim() ? normalizeEmail(input.email) : null;
    if (!/^[a-z0-9_]{3,24}$/.test(username) || !input.fullName.trim() || (!email && !input.phone.trim()) || (email && !validEmail(email)) || !input.icNumber.trim() || !validPassword(input.password)) throw new Error("Invalid registration details");
    if (!input.acceptTerms) throw new Error("Terms must be accepted");
    if (await this.users.findByUsername(username) || (email && await this.users.findByIdentifier(email)) || (input.phone.trim() && await this.users.findByIdentifier(input.phone.trim()))) throw new Error("Username, email, or phone is already registered");
    const user: UserRecord = { id: crypto.randomUUID(), username, email, password_hash: await hashPassword(input.password), full_name: input.fullName.trim(), phone: input.phone.trim() || null, ic_hash: await hashPassword(input.icNumber.trim()), profile_picture: null, is_verified: 1, is_active: 1, is_locked: 0, failed_attempts: 0, lock_until: null, last_login: null, created_at: new Date().toISOString() };
    await this.users.create(user);
    const verificationToken = randomToken();
    saveVerificationToken(verificationToken, user.id);
    return { user: publicUser(user), verificationToken, verificationRequired: false };
  }

  async login(input: LoginInput): Promise<{ user: PublicUser; token: string; expiresAt: string }> {
    const identifier = input.identifier.trim().toLowerCase();
    const ip = input.ipAddress ?? "unknown";
    const now = Date.now();
    const recent = (requestLog.get(ip) ?? []).filter((timestamp) => timestamp > now - RATE_WINDOW);
    if (recent.length >= MAX_REQUESTS) throw new Error("Too many login attempts");
    recent.push(now); requestLog.set(ip, recent);
    const user = await this.users.findByIdentifier(identifier);
    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      if (user) { const attempts = user.failed_attempts + 1; const lockUntil = attempts >= 5 ? new Date(now + LOCK_TTL).toISOString() : null; await this.users.updateLoginFailure(user.id, attempts, lockUntil); }
      throw new Error("Invalid email or password");
    }
    if (!user.is_active) throw new Error("Account is inactive");
    if (user.lock_until && new Date(user.lock_until).getTime() > now) throw new Error("Account is temporarily locked");
    const expiresAt = new Date(now + (input.rememberMe ? REMEMBERED_SESSION_TTL : SESSION_TTL));
    const token = await signJwt({ sub: user.id, role: user.role ?? "user", exp: Math.floor(expiresAt.getTime() / 1000), jti: randomToken() });
    await this.sessions.create({ id: crypto.randomUUID(), user_id: user.id, token, expires_at: expiresAt.toISOString() });
    await this.users.markLoginSuccess(user.id); await this.audit.write(user.id, "login", ip, "Successful login");
    return { user: publicUser(user), token, expiresAt: expiresAt.toISOString() };
  }

  async logout(token: string): Promise<void> { await this.sessions.delete(token); }
  async currentUser(token: string): Promise<PublicUser> { const session = await this.sessions.findValid(token); if (!session) throw new Error("Unauthorized"); const user = await this.users.findById(session.user_id); if (!user) throw new Error("Unauthorized"); return publicUser(user); }
  async updateProfile(token: string, fullName: string, phone: string | null, profilePicture: string | null): Promise<PublicUser> { const user = await this.authorize(token); await this.users.updateProfile(user.id, fullName.trim(), phone, profilePicture); return publicUser((await this.users.findById(user.id))!); }
  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> { const user = await this.authorize(token); if (!(await verifyPassword(currentPassword, user.password_hash)) || !validPassword(newPassword)) throw new Error("Password change rejected"); await this.users.updatePassword(user.id, await hashPassword(newPassword)); }
  async updateSettings(token: string, settings: SettingsInput): Promise<void> { const user = await this.authorize(token); await this.users.updateSettings(user.id, { notifications_enabled: settings.notificationsEnabled ? 1 : 0, language: settings.language, theme: settings.theme, privacy_level: settings.privacyLevel }); }
  async deleteAccount(token: string, password: string): Promise<void> { const user = await this.authorize(token); if (!(await verifyPassword(password, user.password_hash))) throw new Error("Password confirmation failed"); await this.users.delete(user.id); await this.audit.write(user.id, "delete_account", null, "Account deleted"); }
  async deleteTestAccount(identifier: string, password: string): Promise<void> { if (process.env.NODE_ENV === "production") throw new Error("Test account deletion is disabled in production"); const user = await this.users.findByIdentifier(identifier); if (!user || !(await verifyPassword(password, user.password_hash))) throw new Error("Test account credentials are incorrect"); await this.users.delete(user.id); }
  async adminUsers(token: string): Promise<PublicUser[]> { const user = await this.authorize(token); if ((user.role ?? "user") !== "admin") throw new Error("Forbidden"); return (await this.users.list()).map(publicUser); }
  async adminSetActive(token: string, userId: string, active: boolean): Promise<void> { const user = await this.authorize(token); if ((user.role ?? "user") !== "admin") throw new Error("Forbidden"); await this.users.setActive(userId, active); }
  async adminDelete(token: string, userId: string): Promise<void> { const user = await this.authorize(token); if ((user.role ?? "user") !== "admin") throw new Error("Forbidden"); await this.users.delete(userId); }
  async forgotPassword(emailInput: string): Promise<void> { const user = await this.users.findByEmail(normalizeEmail(emailInput)); if (!user || !user.email) return; const token = randomToken(); await this.resetTokens.create({ id: crypto.randomUUID(), user_id: user.id, token, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() }); await sendPasswordResetEmail({ email: user.email, token }); }
  async resetPassword(token: string, newPassword: string): Promise<void> { if (!validPassword(newPassword)) throw new Error("Password does not meet strength requirements"); const reset = await this.resetTokens.consume(token); if (!reset) throw new Error("Reset token is invalid or expired"); await this.users.updatePassword(reset.user_id, await hashPassword(newPassword)); }
  async verifyEmail(token: string): Promise<void> { const userId = consumeVerificationToken(token); if (!userId) throw new Error("Verification token is invalid or expired"); const user = await this.users.findById(userId); if (!user) throw new Error("User not found"); await this.users.verify(userId); }

  async authorize(token: string): Promise<UserRecord> { const session = await this.sessions.findValid(token); if (!session) throw new Error("Unauthorized"); const user = await this.users.findById(session.user_id); if (!user || !user.is_active) throw new Error("Unauthorized"); return user; }
}
