/**
 * تعريفات أنواع sql.js — الحزمة 1.17 لا تشحن ملفات .d.ts.
 * تغطي فقط ما يستخدمه محول قاعدة البيانات الأوفلاين.
 */
declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(params?: unknown[]): Record<string, unknown>;
    get(params?: unknown[]): unknown[];
    run(params?: unknown[]): void;
    free(): boolean;
    reset(): boolean;
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    prepare(sql: string, params?: unknown[]): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayBuffer;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;

  export type { Database as SqlJsDatabase };
}
