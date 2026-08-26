export interface VerificationMessage {
  email: string;
  token: string;
}

export async function sendVerificationEmail(message: VerificationMessage): Promise<void> {
  const base = process.env.VERIFICATION_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
  const verificationUrl = `${base}/01_User_&_Account_Management/account-actions?action=verify-email&token=${encodeURIComponent(message.token)}`;
  // Basic delivery: log the email for dev and servers without a mail provider configured.
  // If a mail provider is configured via environment variables, integrate it here.
  console.log(`Send verification email to ${message.email}: ${verificationUrl}`);
}

export async function sendPasswordResetEmail(message: VerificationMessage): Promise<void> {
  const base = process.env.VERIFICATION_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${base}/01_User_&_Account_Management/reset-password?token=${encodeURIComponent(message.token)}`;
  console.log(`Send password reset email to ${message.email}: ${resetUrl}`);
}
