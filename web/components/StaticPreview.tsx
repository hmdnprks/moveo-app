'use client';

import type { RunData, VideoConfig, MetricKey } from '@/lib/types';

const VIDEO_W = 1080;
const VIDEO_H = 1920;
const MAP_H   = 1260;

const fmt2    = (n: number) => n.toString().padStart(2, '0');
const fmtPace = (s: number) => `${Math.floor(s / 60)}:${fmt2(Math.round(s % 60))}`;
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${fmt2(Math.round(s % 60))}`;

function getMetric(key: MetricKey, pt: RunData['points'][0], summary: RunData['summary']): { label: string; value: string; unit: string } {
  switch (key) {
    case 'distance': return { label: 'Distance', value: pt.dist_km.toFixed(2), unit: 'km' };
    case 'pace':     return { label: 'Pace',     value: fmtPace(pt.pace_s_per_km ?? summary.avg_pace_s_per_km), unit: '/km' };
    case 'time':     return { label: 'Time',     value: fmtTime(pt.elapsed_s), unit: '' };
    case 'hr':       return { label: 'Heart Rate', value: pt.hr > 0 ? String(pt.hr) : '--', unit: 'bpm' };
    case 'cadence':  return { label: 'Cadence',  value: pt.cad > 0 ? String(pt.cad) : '--', unit: 'spm' };
  }
}

const MAP_BG: Record<VideoConfig['mapStyle'], string> = {
  dark:      'linear-gradient(160deg,#1b1e24 0%,#111418 60%,#0d1014 100%)',
  light:     'linear-gradient(160deg,#ddd9cc 0%,#e6e2d6 60%,#d8d4c6 100%)',
  satellite: 'linear-gradient(160deg,#182016 0%,#0f180d 60%,#0b1209 100%)',
};
const MAP_TEXT_OPACITY: Record<VideoConfig['mapStyle'], number> = { dark: 0.7, light: 0.85, satellite: 0.7 };

function projectRoute(points: RunData['points']) {
  const lats = points.map((p) => p.lat);
  const lons  = points.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon  = Math.min(...lons),  maxLon  = Math.max(...lons);
  const avgLat  = (minLat + maxLat) / 2;
  const lonScale = Math.cos((avgLat * Math.PI) / 180);
  const latSpan  = maxLat - minLat || 0.001;
  const lonSpan  = (maxLon - minLon) * lonScale || 0.001;
  const PAD_X = 100, PAD_Y = 130;
  const areaW = VIDEO_W - 2 * PAD_X;
  const areaH = MAP_H   - 2 * PAD_Y;
  const routeScale = Math.min(areaW / lonSpan, areaH / latSpan);
  const routeW = lonSpan * routeScale;
  const routeH = latSpan * routeScale;
  const offX = PAD_X + (areaW - routeW) / 2;
  const offY = PAD_Y + (areaH - routeH) / 2;
  return {
    toX: (lon: number) => offX + (lon - minLon) * lonScale * routeScale,
    toY: (lat: number) => offY + (maxLat - lat) * routeScale,
  };
}

function ElevationChart({ points, progress, accentColor }: { points: RunData['points']; progress: number; accentColor: string }) {
  const W = 520, H = 80;
  const eles  = points.map((p) => p.ele);
  const minE  = Math.min(...eles), maxE = Math.max(...eles);
  const range = Math.max(maxE - minE, 1);
  const pts   = eles.map((e, i) => `${((i / (eles.length - 1)) * W).toFixed(1)},${(H - ((e - minE) / range) * H).toFixed(1)}`);
  const area  = `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  const line  = `M${pts.join(' L')}`;
  const clipX = progress * W;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ flex: 1, overflow: 'visible' }}>
      <defs>
        <clipPath id="sp-clip"><rect x={0} y={0} width={clipX} height={H + 2} /></clipPath>
        <linearGradient id="sp-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accentColor} stopOpacity={0.65} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <path d={area} fill={accentColor} fillOpacity={0.06} />
      <path d={line} fill="none" stroke={accentColor} strokeWidth={1.5} strokeOpacity={0.18} />
      <path d={area} fill="url(#sp-grad)" clipPath="url(#sp-clip)" />
      <path d={line} fill="none" stroke={accentColor} strokeWidth={2.5} clipPath="url(#sp-clip)" />
    </svg>
  );
}

interface StaticPreviewProps {
  runData: RunData;
  config: VideoConfig;
  displayWidth?: number;
}

export function StaticPreview({ runData, config, displayWidth = 320 }: StaticPreviewProps) {
  const { accentColor, bgColor, metrics, showElevation, mapStyle, showTitle, showDate, titleOverride } = config;
  const { points, summary } = runData;

  const scale        = displayWidth / VIDEO_W;
  const displayHeight = displayWidth * (VIDEO_H / VIDEO_W);

  const midIdx   = Math.floor(points.length / 2);
  const midPt    = points[midIdx];
  const progress = midIdx / (points.length - 1);

  const { toX, toY } = projectRoute(points);
  const allPtStr  = points.map((p) => `${toX(p.lon).toFixed(1)},${toY(p.lat).toFixed(1)}`);
  const ghostPts  = allPtStr.join(' ');
  const tracePts  = allPtStr.slice(0, midIdx + 1).join(' ');
  const startX    = toX(points[0].lon), startY = toY(points[0].lat);
  const midX      = toX(midPt.lon),     midY   = toY(midPt.lat);

  const displayTitle = (titleOverride?.trim() || summary.name).toUpperCase();
  const dateStr = new Date(summary.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const FONT      = 'system-ui, -apple-system, sans-serif';
  const isFour    = metrics.length >= 4;
  const topMetrics = isFour ? metrics.slice(0, 3) : metrics;
  const featuredKey = isFour ? metrics[3] : null;
  const featured  = featuredKey ? getMetric(featuredKey, midPt, summary) : null;
  const panelH    = isFour ? (showElevation ? 800 : 600) : (showElevation ? 660 : 420);
  const showHeader = showTitle || showDate;
  const textOpacity = MAP_TEXT_OPACITY[mapStyle];

  // Shared styles
  const labelStyle = (compact: boolean) => ({
    fontSize: compact ? 20 : 24, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
    letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: compact ? 10 : 14, fontFamily: FONT,
  });
  const valueStyle = (size: number) => ({
    fontSize: size, fontWeight: 800, color: '#fff', lineHeight: 1,
    fontVariantNumeric: 'tabular-nums' as const, letterSpacing: -1, fontFamily: FONT,
  });
  const unitStyle = (compact: boolean) => ({
    fontSize: compact ? 22 : 26, fontWeight: 400, color: accentColor,
    marginTop: compact ? 8 : 10, letterSpacing: 1, opacity: 0.8, fontFamily: FONT,
  });

  return (
    <div style={{ width: displayWidth, height: displayHeight, overflow: 'hidden', borderRadius: 12, flexShrink: 0, position: 'relative' }}>
      <div style={{ width: VIDEO_W, height: VIDEO_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative', backgroundColor: bgColor, fontFamily: FONT }}>

        {/* Map area */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: VIDEO_W, height: MAP_H, background: MAP_BG[mapStyle] }}>
          <svg width={VIDEO_W} height={MAP_H} viewBox={`0 0 ${VIDEO_W} ${MAP_H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
            <polyline points={ghostPts} fill="none" stroke={accentColor} strokeWidth={6} strokeOpacity={0.18} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={tracePts} fill="none" stroke={accentColor} strokeWidth={9} strokeOpacity={1}    strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={startX} cy={startY} r={14} fill="#4CAF50" stroke="#fff" strokeWidth={4} />
            <circle cx={midX}   cy={midY}   r={22} fill="none"    stroke={accentColor} strokeWidth={4} />
            <circle cx={midX}   cy={midY}   r={10} fill="#fff"    stroke={accentColor} strokeWidth={3} />
          </svg>
        </div>

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', top: MAP_H - 200, left: 0, right: 0, height: 200, background: `linear-gradient(to bottom, transparent, ${bgColor})`, pointerEvents: 'none' }} />
        {showHeader && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, background: `linear-gradient(to bottom, ${bgColor}e0, transparent)`, pointerEvents: 'none' }} />}

        {/* Header */}
        {showHeader && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
            {showTitle && (
              <div style={{ fontSize: 68, fontWeight: 900, color: '#fff', letterSpacing: 8, textTransform: 'uppercase', textShadow: '0 2px 24px rgba(0,0,0,0.7)', opacity: textOpacity }}>
                {displayTitle}
              </div>
            )}
            {showDate && (
              <div style={{ fontSize: 36, color: `rgba(255,255,255,${textOpacity * 0.85})`, marginTop: showTitle ? 12 : 0, fontWeight: 500, textShadow: '0 2px 12px rgba(0,0,0,0.6)', letterSpacing: 1 }}>
                {dateStr}
              </div>
            )}
          </div>
        )}

        {/* Metrics panel */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: panelH, backgroundColor: bgColor, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top accent line */}
          <div style={{ height: 3, background: `linear-gradient(to right, transparent 5%, ${accentColor} 40%, ${accentColor} 60%, transparent 95%)` }} />

          {/* Top metric columns */}
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            {topMetrics.map((key, i) => {
              const m = getMetric(key, midPt, summary);
              return (
                <div key={key + i} style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
                  {i > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0', flexShrink: 0 }} />}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isFour ? '22px 0 16px' : '36px 0 28px' }}>
                    <div style={labelStyle(isFour)}>{m.label}</div>
                    <div style={{ ...valueStyle(isFour ? 66 : 80), opacity: m.value === '--' ? 0.3 : 1 }}>{m.value}</div>
                    <div style={unitStyle(isFour)}>{m.unit}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Featured 4th metric */}
          {featured && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 50px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0 26px' }}>
                <div style={labelStyle(false)}>{featured.label}</div>
                <div style={{ ...valueStyle(108), letterSpacing: -2, opacity: featured.value === '--' ? 0.3 : 1 }}>{featured.value}</div>
                <div style={{ fontSize: 34, color: accentColor, marginTop: 12, letterSpacing: 1, opacity: 0.8, fontFamily: FONT }}>{featured.unit}</div>
              </div>
            </>
          )}

          {/* Elevation chart */}
          {showElevation && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 50px' }} />
              <div style={{ padding: '0 50px 44px', display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 28 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 3, textTransform: 'uppercase', flexShrink: 0, marginBottom: 6, fontFamily: FONT }}>Elevation</div>
                <ElevationChart points={points} progress={progress} accentColor={accentColor} />
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: 4 }}>
                  <div style={{ fontSize: 52, fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: FONT }}>{Math.round(midPt.ele)}</div>
                  <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4, fontFamily: FONT }}>m</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
