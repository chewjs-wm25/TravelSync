export interface VerificationMessage {
  email: string;
  token: string;
}

export async function sendVerificationEmail(message: VerificationMessage): Promise<void> {
  // Integrate the configured mail provider here; never expose the token to the client.
  void message;
}

export async function sendPasswordResetEmail(message: VerificationMessage): Promise<void> {
  void message;
}
