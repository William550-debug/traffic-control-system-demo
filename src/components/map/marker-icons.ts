import type { Severity } from '@/types';

const SEVERITY_HEX: Record<Severity, string> = {
    critical: '#ff3b3b',
    high:     '#ff8800',
    medium:   '#f5c518',
    low:      '#3b9eff',
    info:     '#4ecdc4',
};

/**
 * Returns an SVG string for a severity-coded alert pin marker.
 * Used as a Leaflet DivIcon.
 */
export function alertMarkerSvg(severity: Severity, focused = false): string {
    const color = SEVERITY_HEX[severity];
    const size  = focused ? 32 : 24;
    const pulse = severity === 'critical' || severity === 'high';

    return `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${pulse ? `
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: ${color};
          opacity: 0.2;
          animation: pulse-ring 2s ease-out infinite;
        "></div>
      ` : ''}
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="12" cy="12" r="8"
          fill="${color}"
          fill-opacity="${focused ? 0.25 : 0.15}"
          stroke="${color}"
          stroke-width="${focused ? 2 : 1.5}"
        />
        <circle cx="12" cy="12" r="4" fill="${color}" />
        ${focused ? `<circle cx="12" cy="12" r="10" stroke="${color}" stroke-width="1" stroke-opacity="0.4" fill="none"/>` : ''}
      </svg>
    </div>
  `;
}

/**
 * Camera marker SVG
 */
export function cameraMarkerSvg(offline = false): string {
    const color = offline ? '#6b7280' : '#4ecdc4';
    return `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="5" width="9" height="7" rx="1.5"
        fill="${color}" fill-opacity="0.15"
        stroke="${color}" stroke-width="1.2"/>
      <path d="M11 7.5L14 6V11L11 9.5V7.5Z"
        fill="${color}" fill-opacity="0.6"/>
      ${offline ? `<line x1="2" y1="2" x2="14" y2="14" stroke="#ff3b3b" stroke-width="1.5"/>` : ''}
    </svg>
  `;
}

/**
 * Signal marker SVG
 */
export function signalMarkerSvg(status: 'green' | 'amber' | 'red' | 'offline'): string {
    const colors = {
        green:   '#22c55e',
        amber:   '#f5c518',
        red:     '#ff3b3b',
        offline: '#6b7280',
    };
    const color = colors[status];

    return `
    <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
      <rect x="3" y="0" width="8" height="18" rx="2"
        fill="rgba(12,17,23,0.9)"
        stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <circle cx="7" cy="4"  r="2" fill="${status === 'red'    ? color : 'rgba(255,255,255,0.1)'}"/>
      <circle cx="7" cy="9"  r="2" fill="${status === 'amber'  ? color : 'rgba(255,255,255,0.1)'}"/>
      <circle cx="7" cy="14" r="2" fill="${status === 'green'  ? color : 'rgba(255,255,255,0.1)'}"/>
      <rect x="6" y="18" width="2" height="2" fill="rgba(255,255,255,0.2)"/>
    </svg>
  `;
}