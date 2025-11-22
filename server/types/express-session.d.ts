import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      _id?: string;
      email: string;
      name: string;
      picture: string;
      role?: string;
    };
  }
}
