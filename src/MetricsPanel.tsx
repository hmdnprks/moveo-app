import React from 'react';
import { interpolate } from 'remotion';
import type { RunData, RunPoint, MetricKey, VideoConfig } from './types';

const FONT = 'system-ui, -apple-system, sans-serif';
const CHART_W = 560;
const CHART_H = 88;

// ── Formatters ────────────────────────────────────────────────────────────

const formatPace = (s: number) => {
	const m = Math.floor(s / 60);
	const sec = Math.round(s % 60);
	return `${m}:${sec.toString().padStart(2, '0')}`;
};
const formatTime = (s: number) => {
	const m = Math.floor(s / 60);
	const sec = Math.round(s % 60);
	return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ── Metric resolver ───────────────────────────────────────────────────────

interface MetricDisplay { label: string; value: string; unit: string }

function resolveMetric(
	key: MetricKey,
	point: RunPoint,
	summary: RunData['summary'],
	routeProgress: number,
): MetricDisplay {
	switch (key) {
		case 'distance':
			return { label: 'Distance', value: point.dist_km.toFixed(2), unit: 'km' };
		case 'pace': {
			const raw = point.pace_s_per_km != null
				? interpolate(routeProgress, [0, 0.05], [summary.avg_pace_s_per_km, point.pace_s_per_km], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
				: summary.avg_pace_s_per_km;
			return { label: 'Pace', value: formatPace(raw), unit: '/km' };
		}
		case 'time':
			return { label: 'Time', value: formatTime(point.elapsed_s), unit: '' };
		case 'hr':
			return { label: 'Heart Rate', value: point.hr > 0 ? String(point.hr) : '--', unit: 'bpm' };
		case 'cadence':
			return { label: 'Cadence', value: point.cad > 0 ? String(point.cad) : '--', unit: 'spm' };
	}
}

// ── MetricCol (top-row, compact when 4 metrics) ───────────────────────────

interface MetricColProps extends MetricDisplay {
	accentColor: string;
	compact?: boolean;
}
const MetricCol: React.FC<MetricColProps> = ({ label, value, unit, accentColor, compact }) => (
	<div style={{
		flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
		padding: compact ? '22px 0 16px' : '36px 0 28px',
	}}>
		<div style={{ fontSize: compact ? 20 : 24, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT, marginBottom: compact ? 10 : 14 }}>
			{label}
		</div>
		<div style={{ fontSize: compact ? 66 : 80, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, fontFamily: FONT, fontVariantNumeric: 'tabular-nums', letterSpacing: -1, opacity: value === '--' ? 0.3 : 1 }}>
			{value}
		</div>
		<div style={{ fontSize: compact ? 22 : 26, fontWeight: 400, color: accentColor, marginTop: compact ? 8 : 10, fontFamily: FONT, letterSpacing: 1, opacity: 0.7 }}>
			{unit}
		</div>
	</div>
);

// ── FeaturedMetricRow (4th metric, full-width, bigger) ────────────────────

interface FeaturedRowProps extends MetricDisplay { accentColor: string }
const FeaturedMetricRow: React.FC<FeaturedRowProps> = ({ label, value, unit, accentColor }) => (
	<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0 26px' }}>
		<div style={{ fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT, marginBottom: 14 }}>
			{label}
		</div>
		<div style={{ fontSize: 108, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, fontFamily: FONT, fontVariantNumeric: 'tabular-nums', letterSpacing: -2, opacity: value === '--' ? 0.3 : 1 }}>
			{value}
		</div>
		<div style={{ fontSize: 34, fontWeight: 400, color: accentColor, marginTop: 12, fontFamily: FONT, letterSpacing: 1, opacity: 0.7 }}>
			{unit}
		</div>
	</div>
);

// ── Elevation chart ───────────────────────────────────────────────────────

const buildEleChart = (points: RunData['points']) => {
	const eles = points.map((p) => p.ele);
	const minEle = Math.min(...eles);
	const maxEle = Math.max(...eles);
	const range = Math.max(maxEle - minEle, 1);
	const ptStrings = eles.map((e, i) => {
		const x = (i / (eles.length - 1)) * CHART_W;
		const y = CHART_H - ((e - minEle) / range) * CHART_H;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});
	return {
		areaPath: `M0,${CHART_H} L${ptStrings.join(' L')} L${CHART_W},${CHART_H} Z`,
		linePath: `M${ptStrings.join(' L')}`,
	};
};

interface ElevationChartProps {
	runData: RunData;
	routeProgress: number;
	currentEle: number;
	accentColor: string;
}
const ElevationChart: React.FC<ElevationChartProps> = ({ runData, routeProgress, currentEle, accentColor }) => {
	const { areaPath, linePath } = buildEleChart(runData.points);
	const clipX = routeProgress * CHART_W;
	return (
		<div style={{ padding: '0 50px 44px', display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 28 }}>
			<div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT, flexShrink: 0, marginBottom: 6 }}>
				Elevation
			</div>
			<svg width={CHART_W} height={CHART_H} style={{ flex: 1, overflow: 'visible' }} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
				<defs>
					<clipPath id="progress-clip"><rect x={0} y={0} width={clipX} height={CHART_H + 2} /></clipPath>
					<linearGradient id="ele-grad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={accentColor} stopOpacity={0.7} />
						<stop offset="100%" stopColor={accentColor} stopOpacity={0.05} />
					</linearGradient>
				</defs>
				<path d={areaPath} fill={accentColor} fillOpacity={0.06} />
				<path d={linePath} fill="none" stroke={accentColor} strokeWidth={1.5} strokeOpacity={0.2} />
				<path d={areaPath} fill="url(#ele-grad)" clipPath="url(#progress-clip)" />
				<path d={linePath} fill="none" stroke={accentColor} strokeWidth={2.5} clipPath="url(#progress-clip)" />
			</svg>
			<div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: 4 }}>
				<div style={{ fontSize: 52, fontWeight: 700, color: '#FFFFFF', lineHeight: 1, fontFamily: FONT, fontVariantNumeric: 'tabular-nums' }}>{Math.round(currentEle)}</div>
				<div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', fontFamily: FONT, letterSpacing: 1, marginTop: 4 }}>m</div>
			</div>
		</div>
	);
};

// ── MetricsPanel ──────────────────────────────────────────────────────────

interface MetricsPanelProps {
	runData: RunData;
	currentPoint: RunPoint;
	routeProgress: number;
	config: VideoConfig;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ runData, currentPoint, routeProgress, config }) => {
	const { accentColor, bgColor, metrics, showElevation } = config;
	const isFour = metrics.length >= 4;

	// Panel height accounts for the extra featured row when 4 metrics are used.
	// Values overlap slightly into the map gradient area — that's intentional.
	const panelHeight = isFour
		? (showElevation ? 800 : 600)
		: (showElevation ? 660 : 420);

	const topMetrics = isFour ? metrics.slice(0, 3) : metrics;
	const featuredKey = isFour ? metrics[3] : null;
	const featured = featuredKey ? resolveMetric(featuredKey, currentPoint, runData.summary, routeProgress) : null;

	const Divider = () => <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />;
	const HSep   = () => <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 50px' }} />;

	return (
		<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: panelHeight, backgroundColor: bgColor, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

			{/* Top accent line */}
			<div style={{ height: 3, background: `linear-gradient(to right, transparent 5%, ${accentColor} 40%, ${accentColor} 60%, transparent 95%)` }} />

			{/* Top 3 metric columns */}
			<div style={{ display: 'flex', flexDirection: 'row' }}>
				{topMetrics.map((key, i) => {
					const m = resolveMetric(key, currentPoint, runData.summary, routeProgress);
					return (
						<React.Fragment key={key + i}>
							{i > 0 && <Divider />}
							<MetricCol {...m} accentColor={accentColor} compact={isFour} />
						</React.Fragment>
					);
				})}
			</div>

			{/* 4th metric — featured full-width row */}
			{featured && (
				<>
					<HSep />
					<FeaturedMetricRow {...featured} accentColor={accentColor} />
				</>
			)}

			{/* Elevation chart */}
			{showElevation && (
				<>
					<HSep />
					<ElevationChart runData={runData} routeProgress={routeProgress} currentEle={currentPoint.ele} accentColor={accentColor} />
				</>
			)}
		</div>
	);
};
