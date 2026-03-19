'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehiclePosition {
    plate:      string;
    lat:        number;
    lng:        number;
    heading:    number;   // degrees 0–360
    speed:      number;   // km/h
    status:     'moving' | 'slow' | 'stopped';
    entryTime:  Date;
    routeIndex: number;   // which waypoint the vehicle is currently heading toward
    route:      [number, number][];  // [lat, lng] waypoints
    type:       'car' | 'bus' | 'matatu' | 'truck';
    color:      string;
}

export interface FlaggedVehicle {
    plate:     string;
    entryTime: Date;
    duration:  number;   // minutes
    lat:       number;
    lng:       number;
    type:      VehiclePosition['type'];
}

export interface CongestedRoad {
    id:          string;
    name:        string;
    from:        [number, number];
    to:          [number, number];
    level:       number;  // 0–100
    speed:       number;  // avg km/h
    direction:   number;  // arrow heading degrees
}

export interface MapStats {
    totalVehicles:    number;
    avgSpeed:         number;
    congestedSegments: number;
    cbdVehicles:      number;
    flaggedCount:     number;
}

// ─── Nairobi CBD bounding box ─────────────────────────────────────────────────
// Centred on City Square / Kenyatta Ave area
const CBD_BOUNDS = {
    minLat: -1.295,
    maxLat: -1.278,
    minLng: 36.814,
    maxLng: 36.832,
};

function inCBD(lat: number, lng: number): boolean {
    return (
        lat >= CBD_BOUNDS.minLat && lat <= CBD_BOUNDS.maxLat &&
        lng >= CBD_BOUNDS.minLng && lng <= CBD_BOUNDS.maxLng
    );
}

// ─── Mock vehicle routes through Nairobi CBD ─────────────────────────────────

const ROUTES: Record<string, [number, number][]> = {
    // Uhuru Highway → Kenyatta Ave → Moi Ave
    uhuru_east: [
        [-1.300, 36.808], [-1.295, 36.814], [-1.290, 36.820],
        [-1.285, 36.826], [-1.283, 36.832], [-1.280, 36.838],
    ],
    // Haile Selassie → Tom Mboya → Pumwani
    pumwani_north: [
        [-1.295, 36.832], [-1.290, 36.828], [-1.285, 36.824],
        [-1.280, 36.820], [-1.275, 36.816], [-1.272, 36.812],
    ],
    // Ngong Rd → Upperhill → CBD
    upperhill_loop: [
        [-1.302, 36.812], [-1.298, 36.815], [-1.293, 36.818],
        [-1.289, 36.821], [-1.285, 36.824], [-1.281, 36.827],
    ],
    // Eastlands → Jogoo Rd → CBD
    jogoo_west: [
        [-1.285, 36.845], [-1.285, 36.838], [-1.285, 36.831],
        [-1.285, 36.824], [-1.285, 36.817], [-1.285, 36.810],
    ],
    // Ring road circuit (matatu loop)
    ring_circuit: [
        [-1.282, 36.820], [-1.278, 36.825], [-1.280, 36.832],
        [-1.286, 36.835], [-1.290, 36.830], [-1.288, 36.822],
    ],
    // Waiyaki Way → Westlands → CBD
    waiyaki_east: [
        [-1.270, 36.798], [-1.272, 36.806], [-1.275, 36.812],
        [-1.279, 36.818], [-1.283, 36.823], [-1.287, 36.828],
    ],
};

const ROUTE_KEYS = Object.keys(ROUTES) as (keyof typeof ROUTES)[];

// ─── Initial vehicle fleet ────────────────────────────────────────────────────

const VEHICLE_TYPES: VehiclePosition['type'][] = ['car', 'matatu', 'matatu', 'car', 'bus', 'car', 'truck', 'car'];
const VEHICLE_COLORS = {
    car:    '#3b9eff',
    bus:    '#f5c518',
    matatu: '#ff8800',
    truck:  '#a78bfa',
};

function mkPlate(n: number): string {
    const letters = ['KAA', 'KBB', 'KCC', 'KDA', 'KDB', 'KDC', 'KXX', 'KYA'];
    return `${letters[n % letters.length]} ${(100 + n * 37) % 900 + 100}${String.fromCharCode(65 + (n % 26))}`;
}

function buildInitialVehicles(): VehiclePosition[] {
    return ROUTE_KEYS.flatMap((routeKey, ri) => {
        const route = ROUTES[routeKey];
        return [0, 1, 2].map((j) => {
            const startIdx = (j * 2) % (route.length - 1);
            const type = VEHICLE_TYPES[(ri * 3 + j) % VEHICLE_TYPES.length];
            const entryOffset = j === 0 ? 0 : j === 1 ? -(60 + ri * 20) : -(200 + ri * 15); // minutes ago
            const entryTime = new Date(Date.now() + entryOffset * 60 * 1000);
            return {
                plate:      mkPlate(ri * 3 + j),
                lat:        route[startIdx][0],
                lng:        route[startIdx][1],
                heading:    bearing(route[startIdx], route[Math.min(startIdx + 1, route.length - 1)]),
                speed:      20 + Math.random() * 40,
                status:     'moving' as const,
                entryTime,
                routeIndex: startIdx,
                route,
                type,
                color:      VEHICLE_COLORS[type],
            };
        });
    });
}

// ─── Bearing calculation ──────────────────────────────────────────────────────

function bearing([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const φ1   = lat1 * (Math.PI / 180);
    const φ2   = lat2 * (Math.PI / 180);
    const y    = Math.sin(dLng) * Math.cos(φ2);
    const x    = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// ─── Congested roads mock data ────────────────────────────────────────────────

export const CONGESTED_ROADS: CongestedRoad[] = [
    {
        id:        'uhuru_hwy',
        name:      'Uhuru Highway',
        from:      [-1.300, 36.808],
        to:        [-1.285, 36.826],
        level:     88,
        speed:     8,
        direction: 45,
    },
    {
        id:        'kenyatta_ave',
        name:      'Kenyatta Avenue',
        from:      [-1.284, 36.818],
        to:        [-1.284, 36.836],
        level:     72,
        speed:     14,
        direction: 90,
    },
    {
        id:        'moi_ave',
        name:      'Moi Avenue',
        from:      [-1.282, 36.826],
        to:        [-1.276, 36.826],
        level:     55,
        speed:     22,
        direction: 0,
    },
    {
        id:        'jogoo_rd',
        name:      'Jogoo Road',
        from:      [-1.285, 36.845],
        to:        [-1.285, 36.822],
        level:     91,
        speed:     6,
        direction: 270,
    },
    {
        id:        'tom_mboya',
        name:      'Tom Mboya St',
        from:      [-1.290, 36.828],
        to:        [-1.278, 36.820],
        level:     63,
        speed:     18,
        direction: 330,
    },
    {
        id:        'waiyaki_way',
        name:      'Waiyaki Way',
        from:      [-1.270, 36.798],
        to:        [-1.279, 36.818],
        level:     44,
        speed:     32,
        direction: 130,
    },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

const CBD_DWELL_THRESHOLD_MINS = 180; // 3 hours

export function useMapIntelligence() {
    const [vehicles,       setVehicles]       = useState<VehiclePosition[]>(() => buildInitialVehicles());
    const [flaggedVehicles, setFlaggedVehicles] = useState<FlaggedVehicle[]>([]);
    const [newFlag,        setNewFlag]         = useState<FlaggedVehicle | null>(null);
    const tickRef = useRef(0);

    // ── Vehicle movement simulation ──
    useEffect(() => {
        const MOVE_SPEED = 0.00008; // degrees per tick (simulated ~30km/h scaled)

        const interval = setInterval(() => {
            tickRef.current += 1;

            setVehicles(prev => prev.map(v => {
                const nextIdx = (v.routeIndex + 1) % v.route.length;
                const target  = v.route[nextIdx];
                const current: [number, number] = [v.lat, v.lng];

                const dLat  = target[0] - v.lat;
                const dLng  = target[1] - v.lng;
                const dist  = Math.sqrt(dLat * dLat + dLng * dLng);

                // Determine congestion-adjusted speed
                const roadCongestion = CONGESTED_ROADS.find(r => {
                    const rLat = (r.from[0] + r.to[0]) / 2;
                    const rLng = (r.from[1] + r.to[1]) / 2;
                    return Math.abs(v.lat - rLat) < 0.008 && Math.abs(v.lng - rLng) < 0.008;
                });
                const congestionFactor = roadCongestion
                    ? 1 - (roadCongestion.level / 100) * 0.85
                    : 1;
                const moveAmount = MOVE_SPEED * congestionFactor;
                const speed = Math.round(60 * congestionFactor + Math.random() * 10);

                let newLat: number, newLng: number, newRouteIndex: number;

                if (dist < moveAmount * 2) {
                    // Snap to waypoint and advance
                    newLat        = target[0];
                    newLng        = target[1];
                    newRouteIndex = nextIdx;
                } else {
                    // Interpolate toward target
                    const t = moveAmount / dist;
                    newLat        = lerp(v.lat, target[0], t);
                    newLng        = lerp(v.lng, target[1], t);
                    newRouteIndex = v.routeIndex;
                }

                const newHeading = dist > 0.0001
                    ? bearing(current, target)
                    : v.heading;

                const status: VehiclePosition['status'] =
                    speed < 10 ? 'stopped' :
                        speed < 25 ? 'slow' :
                            'moving';

                return {
                    ...v,
                    lat:        newLat,
                    lng:        newLng,
                    heading:    newHeading,
                    speed,
                    status,
                    routeIndex: newRouteIndex,
                };
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // ── CBD dwell tracking (runs every 30s) ──
    useEffect(() => {
        const checkDwell = () => {
            const now = Date.now();

            setVehicles(current => {
                const flags: FlaggedVehicle[] = [];

                current.forEach(v => {
                    if (!inCBD(v.lat, v.lng)) return;
                    const dwellMins = (now - v.entryTime.getTime()) / 60000;
                    if (dwellMins >= CBD_DWELL_THRESHOLD_MINS) {
                        flags.push({
                            plate:     v.plate,
                            entryTime: v.entryTime,
                            duration:  Math.floor(dwellMins),
                            lat:       v.lat,
                            lng:       v.lng,
                            type:      v.type,
                        });
                    }
                });

                setFlaggedVehicles(prev => {
                    // Merge — keep existing, add new
                    const existingPlates = new Set(prev.map(f => f.plate));
                    const incoming       = flags.filter(f => !existingPlates.has(f.plate));
                    if (incoming.length > 0) setNewFlag(incoming[0]);
                    return [
                        ...prev.map(f => {
                            const updated = flags.find(x => x.plate === f.plate);
                            return updated ?? f;
                        }),
                        ...incoming,
                    ];
                });

                return current;
            });
        };

        checkDwell();
        const interval = setInterval(checkDwell, 30_000);
        return () => clearInterval(interval);
    }, []);

    // ── Auto-clear new-flag notification after 4s ──
    useEffect(() => {
        if (!newFlag) return;
        const id = setTimeout(() => setNewFlag(null), 4000);
        return () => clearTimeout(id);
    }, [newFlag]);

    const dismissFlag = useCallback((plate: string) => {
        setFlaggedVehicles(prev => prev.filter(f => f.plate !== plate));
    }, []);

    // ── Stats ──
    const mapStats: MapStats = {
        totalVehicles:    vehicles.length,
        avgSpeed:         Math.round(vehicles.reduce((s, v) => s + v.speed, 0) / vehicles.length),
        congestedSegments: CONGESTED_ROADS.filter(r => r.level >= 70).length,
        cbdVehicles:       vehicles.filter(v => inCBD(v.lat, v.lng)).length,
        flaggedCount:      flaggedVehicles.length,
    };

    return {
        vehicles,
        flaggedVehicles,
        newFlag,
        dismissFlag,
        congestedRoads: CONGESTED_ROADS,
        mapStats,
    };
}