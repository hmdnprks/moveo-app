import { XMLParser } from 'fast-xml-parser';
import type { RunData, RunPoint } from './types';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Minimum speed in m/s to count a segment as "moving".
// The speed histogram for running data shows a natural gap: ≥1.5 m/s = running,
// <1.5 m/s = walking/paused/GPS drift. 1.5 m/s ≈ 5.4 km/h matches Strava's
// moving-time calculation very closely (within ~40 m and 30 s on a 10 km run).
const MOVING_THRESHOLD_MS = 1.5;
// Look-back window (in sampled points) for the rolling pace calculation.
const PACE_WINDOW = 10;

export async function parseGpx(file: File): Promise<RunData> {
  const text = await file.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    parseAttributeValue: true,
    isArray: (name) => name === 'trkpt' || name === 'trkseg',
  });

  const parsed = parser.parse(text);
  const trk = parsed.gpx?.trk;
  if (!trk) throw new Error('No <trk> element found in GPX file.');

  const name: string = trk.name || 'Run';
  const segments: unknown[] = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];
  const allPoints = segments.flatMap((seg: unknown) => {
    const s = seg as { trkpt?: unknown };
    if (!s?.trkpt) return [];
    return Array.isArray(s.trkpt) ? s.trkpt : [s.trkpt];
  });

  if (allPoints.length === 0) throw new Error('No track points found.');

  type RawPt = { lat: number; lon: number; ele: number; time: string; hr: number; cad: number };
  const points: RawPt[] = (allPoints as Record<string, unknown>[]).map((pt) => ({
    lat: Number(pt['lat']),
    lon: Number(pt['lon']),
    ele: Number((pt['ele'] as number | undefined) ?? 0),
    time: String((pt['time'] as string | undefined) ?? ''),
    hr: Number(((pt['extensions'] as Record<string, unknown>)?.['TrackPointExtension'] as Record<string, unknown>)?.['hr'] ?? 0),
    cad: Number(((pt['extensions'] as Record<string, unknown>)?.['TrackPointExtension'] as Record<string, unknown>)?.['cad'] ?? 0),
  }));

  // ── Pass 1: annotate every raw point with moving-distance and moving-time ──
  type Annotated = RawPt & {
    timeMs: number;
    elapsedS: number;         // real clock seconds from start
    cumMovingDistM: number;   // cumulative distance in moving segments only
    cumMovingTimeS: number;   // cumulative time in moving segments only
  };

  const startMs = new Date(points[0].time).getTime();
  let cumMovingDistM = 0;
  let cumMovingTimeS = 0;

  const annotated: Annotated[] = points.map((p, i) => {
    const timeMs = new Date(p.time).getTime();
    const elapsedS = (timeMs - startMs) / 1000;

    if (i > 0) {
      const prev = points[i - 1];
      const segDistM = haversine(prev.lat, prev.lon, p.lat, p.lon);
      const segTimeS = (timeMs - new Date(prev.time).getTime()) / 1000;
      const speedMs = segTimeS > 0 ? segDistM / segTimeS : 0;

      if (speedMs > MOVING_THRESHOLD_MS) {
        cumMovingDistM += segDistM;
        cumMovingTimeS += segTimeS;
      }
    }

    return { ...p, timeMs, elapsedS, cumMovingDistM, cumMovingTimeS };
  });

  // ── Pass 2: sample every 5th annotated point ──
  const sampled = annotated.filter((_, i) => i % 5 === 0);
  if (sampled[sampled.length - 1] !== annotated[annotated.length - 1]) {
    sampled.push(annotated[annotated.length - 1]);
  }

  // ── Pass 3: build RunPoint[] using moving-corrected distance ──
  const enriched: RunPoint[] = sampled.map((p, i) => {
    const distKm = p.cumMovingDistM / 1000;

    let paceSecPerKm: number | null = null;
    if (distKm > 0.1) {
      const lb = Math.max(0, i - PACE_WINDOW);
      const dDiff = p.cumMovingDistM - sampled[lb].cumMovingDistM;
      const tDiff = p.cumMovingTimeS - sampled[lb].cumMovingTimeS;
      // Only emit pace if there was real movement in the window
      if (dDiff > 5 && tDiff > 0) {
        paceSecPerKm = Math.round((tDiff / dDiff) * 1000);
      }
    }

    return {
      lat: p.lat, lon: p.lon,
      ele: Math.round(p.ele * 10) / 10,
      hr: p.hr, cad: p.cad,
      elapsed_s: Math.round(p.elapsedS),
      dist_km: Math.round(distKm * 1000) / 1000,
      pace_s_per_km: paceSecPerKm,
    };
  });

  // ── Summary ──
  const last = annotated[annotated.length - 1];
  const totalMovingDistKm = last.cumMovingDistM / 1000;
  const totalElapsedS = Math.round(last.elapsedS);
  const movingTimeS = Math.round(last.cumMovingTimeS);

  const hrsWithData = points.filter((p) => p.hr > 0);
  const avgHr = hrsWithData.length > 0
    ? Math.round(hrsWithData.reduce((s, p) => s + p.hr, 0) / hrsWithData.length)
    : 0;
  const maxHr = hrsWithData.length > 0 ? Math.max(...hrsWithData.map((p) => p.hr)) : 0;

  // Map bounds from all GPS points (not filtered — we want the full route box)
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const lonZoom = Math.log2((360 * 1080 * 0.65) / (256 * lonSpan));
  const latZoom = Math.log2((360 * 1080 * 0.65) / (256 * latSpan));
  const mapZoom = Math.round((Math.min(lonZoom, latZoom) - 0.3) * 10) / 10;

  return {
    summary: {
      date: new Date(points[0].time).toISOString().split('T')[0],
      name,
      total_dist_km: Math.round(totalMovingDistKm * 100) / 100,
      total_elapsed_s: totalElapsedS,
      moving_time_s: movingTimeS,
      avg_hr: avgHr,
      max_hr: maxHr,
      // Pace = moving time / moving distance (matches Strava)
      avg_pace_s_per_km: totalMovingDistKm > 0 ? Math.round(movingTimeS / totalMovingDistKm) : 0,
    },
    map: { center: [centerLon, centerLat], zoom: mapZoom },
    points: enriched,
  };
}
