// ── Video config ───────────────────────────────────────────────────────────

export type MetricKey = 'distance' | 'pace' | 'time' | 'hr' | 'cadence';
export type MapStyleKey = 'dark' | 'light' | 'satellite';

export type VideoConfig = {
  accentColor: string;
  bgColor: string;
  metrics: MetricKey[];         // 3 items (normal) or 4 items (featured layout)
  showElevation: boolean;
  mapStyle: MapStyleKey;
  durationSeconds: number;
  showTitle: boolean;
  showDate: boolean;
  titleOverride?: string;       // if set, replaces the GPX activity name
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  accentColor: '#FF6B35',
  bgColor: '#161618',
  metrics: ['distance', 'pace', 'time'],
  showElevation: true,
  mapStyle: 'dark',
  durationSeconds: 30,
  showTitle: true,
  showDate: true,
};

// ── Run data ───────────────────────────────────────────────────────────────

export type RunPoint = {
  lat: number;
  lon: number;
  ele: number;
  hr: number;
  cad: number;
  elapsed_s: number;
  dist_km: number;
  pace_s_per_km: number | null;
};

export type RunData = {
  summary: {
    date: string;
    name: string;
    total_dist_km: number;
    total_elapsed_s: number;
    moving_time_s?: number;
    avg_hr: number;
    max_hr: number;
    avg_pace_s_per_km: number;
  };
  map: {
    center: [number, number];
    zoom: number;
  };
  points: RunPoint[];
};
