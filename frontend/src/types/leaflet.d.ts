// src/types/leaflet.d.ts
// Leaflet type augmentations for custom marker icons

import 'leaflet';

declare module 'leaflet' {
    interface IconOptions {
        shadowUrl?: string;
    }
}