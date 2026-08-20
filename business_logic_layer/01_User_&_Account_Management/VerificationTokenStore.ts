const tokens = new Map<string, { userId: string; expiresAt: number }>();

export function saveVerificationToken(token: string, userId: string): void { tokens.set(token, { userId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }); }
export function consumeVerificationToken(token: string): string | null { const record = tokens.get(token); tokens.delete(token); return record && record.expiresAt > Date.now() ? record.userId : null; }
