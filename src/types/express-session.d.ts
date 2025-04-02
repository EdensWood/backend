import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// filepath: src/types/custom.d.ts
declare module 'jsonwebtoken';
declare module 'connect-pg-simple';
declare module 'pg';