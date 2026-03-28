import { Request, Response } from 'express';
export declare const getIncidents: (_req: Request, res: Response) => void;
export declare const getIncidentById: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const updateIncidentStatus: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const confirmIncident: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const escalateIncident: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const resolveIncident: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const approveRecommendation: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const rejectRecommendation: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const rerouteTraffic: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const adjustSignals: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const dispatchResponder: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const updateResponderRoute: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=incidentController.d.ts.map