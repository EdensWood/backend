declare module 'cors' {
  import { RequestHandler } from 'express';

  export interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  export type CorsRequest = {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    url?: string;
  };

  export type CorsOptionsDelegate<T extends CorsRequest = CorsRequest> = (
    req: T,
    callback: (err: Error | null, options?: CorsOptions) => void
  ) => void;

  declare function cors<T extends CorsRequest = CorsRequest>(
    options?: CorsOptions | CorsOptionsDelegate<T>
  ): RequestHandler;

  export default cors;
}
