import { Request, Response } from 'express';
import { User } from "../models";

export interface Context {
  req: Request;
  res: Response;
  // Add any additional context properties you need
}
// Simplified request type that contains just what we need
export interface CustomRequest {
  session: {
    userId?: number;
    destroy: (callback: (err: any) => void) => void;
    [key: string]: any;
  };
  headers: Record<string, string>;
  [key: string]: any;
}

// Simplified response type
export interface CustomResponse {
  cookie: (name: string, value: string, options?: any) => void;
  clearCookie: (name: string) => void;
  [key: string]: any;
}

export interface MyContext {
  req: CustomRequest;
  res: CustomResponse;
  userId?: number;
  user?: User | null;
}