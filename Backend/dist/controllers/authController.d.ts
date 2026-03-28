import { Request, Response } from 'express';
export declare const login: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const logout: (_req: Request, res: Response) => void;
export declare const getMe: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authController.d.ts.map