// declare module 'pg' {
//     import { EventEmitter } from 'events';
  
//     interface ClientConfig {
//       user?: string;
//       database?: string;
//       password?: string;
//       port?: number;
//       host?: string;
//       ssl?: boolean | object;
//       connectionString?: string;
//       statement_timeout?: number;
//     }
  
//     class Client extends EventEmitter {
//       constructor(config?: ClientConfig);
//       connect(callback?: (err: Error) => void): void;
//       query(queryText: string, values?: any[], callback?: (err: Error, result: QueryResult) => void): void;
//       end(callback?: (err: Error) => void): void;
//     }
  
//     interface QueryResult {
//       command: string;
//       rowCount: number;
//       oid: number;
//       rows: any[];
//       fields: any[];
//     }
  
//     export { Client, ClientConfig, QueryResult };
//   }