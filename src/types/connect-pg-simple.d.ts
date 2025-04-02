declare module 'connect-pg-simple' {
    import { Store } from 'express-session';
  
    interface PGStoreOptions {
      conString?: string;
      conObject?: object;
      pool?: object;
      tableName?: string;
      schemaName?: string;
      pruneSessionInterval?: number;
      errorLog?: (err: Error) => void;
      createTableIfMissing?: boolean;
    }
  
    function connectPgSimple(session: typeof import('express-session')): {
      new (options?: PGStoreOptions): Store;
    };
  
    export = connectPgSimple;
  }