export interface VerificationMessage {
  email: string;
  token: string;
}

export async function sendPasswordResetEmail(message: VerificationMessage): Promise<void> {
  const resetUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/01_User_&_Account_Management/reset-password?token=${message.token}`;
  console.log(`[Password Reset] Email: ${message.email}`);
  console.log(`[Password Reset] URL: ${resetUrl}`);
  console.log(`[Password Reset] Token: ${message.token}`);
}
