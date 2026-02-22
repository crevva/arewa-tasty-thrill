export type AppSession = {
  userId: string;
  email: string;
  name: string | null;
  emailVerified?: boolean;
};

export interface AuthAdapter {
  getSession(request?: Request): Promise<AppSession | null>;
  requireSession(request?: Request): Promise<AppSession>;
  signInUrl(returnTo?: string): string;
  signOutUrl(returnTo?: string): string;
}
