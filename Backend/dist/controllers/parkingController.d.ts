import { Request, Response } from 'express';
export declare const getZones: (_req: Request, res: Response) => void;
export declare const getZoneById: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const updateZone: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const getRecommendations: (_req: Request, res: Response) => void;
export declare const approveRecommendation: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const rejectRecommendation: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const getAuditLogs: (_req: Request, res: Response) => void;
//# sourceMappingURL=parkingController.d.ts.map