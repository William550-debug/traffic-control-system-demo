import type { Request, Response, NextFunction } from 'express';
import type { AuditEntry } from '../types/backend-index.js';
export declare const corsOptions: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
};
export declare const limiter: import("express-rate-limit").RateLimitRequestHandler;
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function getOperator(req: Request): string;
export declare function addAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry;
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=index.d.ts.map