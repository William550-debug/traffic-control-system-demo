import { Request, Response } from 'express';
export declare const getAlerts: (req: Request, res: Response) => void;
export declare const getAlertById: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const createAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const updateAlertStatus: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const acknowledgeAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const ignoreAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const escalateAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const claimAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const releaseAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const dispatchAlert: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=alertController.d.ts.map