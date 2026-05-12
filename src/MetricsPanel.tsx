import { interpolate } from 'remotion';
import runData from './run_data.json';

type RunPoint = (typeof runData.points)[number];

const FONT = 'system-ui, -apple-system, sans-serif';
const PANEL_BG = '#161618';

const formatPace = (secPerKm: number) => {
	const m = Math.floor(secPerKm / 60);
	const s = Math.round(secPerKm % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatTime = (totalSec: number) => {
	const m = Math.floor(totalSec / 60);
	const s = Math.round(totalSec % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
};

// Pre-compute elevation SVG path (done once at module load)
const ELEVATIONS = runData.points.map((p) => p.ele);
const MIN_ELE = Math.min(...ELEVATIONS);
const MAX_ELE = Math.max(...ELEVATIONS);
const ELE_RANGE = Math.max(MAX_ELE - MIN_ELE, 1);
const CHART_W = 560;
const CHART_H = 88;

const buildElePoints = () =>
	ELEVATIONS.map((e, i) => {
		const x = (i / (ELEVATIONS.length - 1)) * CHART_W;
		const y = CHART_H - ((e - MIN_ELE) / ELE_RANGE) * CHART_H;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

const ELE_POINTS = buildElePoints();
const AREA_PATH = `M0,${CHART_H} L${ELE_POINTS.join(' L')} L${CHART_W},${CHART_H} Z`;
const LINE_PATH = `M${ELE_POINTS.join(' L')}`;

// ── Metric column ──────────────────────────────────────────────────────────────
interface MetricColProps {
	label: string;
	value: string;
	unit: string;
}

const MetricCol: React.FC<MetricColProps> = ({ label, value, unit }) => (
	<div
		style={{
			flex: 1,
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			padding: '36px 0 28px',
		}}
	>
		<div
			style={{
				fontSize: 24,
				fontWeight: 600,
				color: 'rgba(255,255,255,0.45)',
				letterSpacing: 3,
				textTransform: 'uppercase',
				fontFamily: FONT,
				marginBottom: 14,
			}}
		>
			{label}
		</div>
		<div
			style={{
				fontSize: 80,
				fontWeight: 800,
				color: '#FFFFFF',
				lineHeight: 1,
				fontFamily: FONT,
				fontVariantNumeric: 'tabular-nums',
				letterSpacing: -1,
			}}
		>
			{value}
		</div>
		<div
			style={{
				fontSize: 26,
				fontWeight: 400,
				color: 'rgba(255,255,255,0.4)',
				marginTop: 10,
				fontFamily: FONT,
				letterSpacing: 1,
			}}
		>
			{unit}
		</div>
	</div>
);

// ── Elevation chart ────────────────────────────────────────────────────────────
interface ElevationChartProps {
	routeProgress: number;
	currentEle: number;
}

const ElevationChart: React.FC<ElevationChartProps> = ({ routeProgress, currentEle }) => {
	const clipX = routeProgress * CHART_W;

	return (
		<div
			style={{
				padding: '0 50px 44px',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-end',
				gap: 28,
			}}
		>
			{/* Label */}
			<div
				style={{
					fontSize: 24,
					fontWeight: 600,
					color: 'rgba(255,255,255,0.45)',
					letterSpacing: 3,
					textTransform: 'uppercase',
					fontFamily: FONT,
					flexShrink: 0,
					marginBottom: 6,
				}}
			>
				Elevation
			</div>

			{/* SVG chart */}
			<svg
				width={CHART_W}
				height={CHART_H}
				style={{ flex: 1, overflow: 'visible' }}
				viewBox={`0 0 ${CHART_W} ${CHART_H}`}
				preserveAspectRatio="none"
			>
				<defs>
					<clipPath id="progress-clip">
						<rect x={0} y={0} width={clipX} height={CHART_H + 2} />
					</clipPath>
					<linearGradient id="ele-grad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#FF6B35" stopOpacity={0.7} />
						<stop offset="100%" stopColor="#FF6B35" stopOpacity={0.05} />
					</linearGradient>
				</defs>

				{/* Ghost area (full) */}
				<path d={AREA_PATH} fill="#FF6B35" fillOpacity={0.06} />
				<path d={LINE_PATH} fill="none" stroke="#FF6B35" strokeWidth={1.5} strokeOpacity={0.2} />

				{/* Animated filled area */}
				<path d={AREA_PATH} fill="url(#ele-grad)" clipPath="url(#progress-clip)" />
				<path
					d={LINE_PATH}
					fill="none"
					stroke="#FF6B35"
					strokeWidth={2.5}
					clipPath="url(#progress-clip)"
				/>
			</svg>

			{/* Current elevation value */}
			<div
				style={{
					flexShrink: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-end',
					marginBottom: 4,
				}}
			>
				<div
					style={{
						fontSize: 52,
						fontWeight: 700,
						color: '#FFFFFF',
						lineHeight: 1,
						fontFamily: FONT,
						fontVariantNumeric: 'tabular-nums',
					}}
				>
					{Math.round(currentEle)}
				</div>
				<div
					style={{
						fontSize: 22,
						color: 'rgba(255,255,255,0.4)',
						fontFamily: FONT,
						letterSpacing: 1,
						marginTop: 4,
					}}
				>
					m
				</div>
			</div>
		</div>
	);
};

// ── Panel ──────────────────────────────────────────────────────────────────────
interface MetricsPanelProps {
	currentPoint: RunPoint;
	routeProgress: number;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ currentPoint, routeProgress }) => {
	const dist = currentPoint.dist_km.toFixed(2);

	const pace =
		currentPoint.pace_s_per_km != null
			? formatPace(
					interpolate(
						routeProgress,
						[0, 0.05],
						[runData.summary.avg_pace_s_per_km, currentPoint.pace_s_per_km],
						{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
					),
				)
			: formatPace(runData.summary.avg_pace_s_per_km);

	const elapsed = formatTime(currentPoint.elapsed_s);

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 0,
				left: 0,
				right: 0,
				height: 660,
				backgroundColor: PANEL_BG,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
			}}
		>
			{/* Orange accent line at top of panel */}
			<div
				style={{
					height: 3,
					background: 'linear-gradient(to right, transparent 5%, #FF6B35 40%, #FF6B35 60%, transparent 95%)',
				}}
			/>

			{/* 3-column metric row */}
			<div style={{ display: 'flex', flexDirection: 'row' }}>
				<MetricCol label="Distance" value={dist} unit="km" />
				<div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />
				<MetricCol label="Pace" value={pace} unit="/km" />
				<div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />
				<MetricCol label="Time" value={elapsed} unit="" />
			</div>

			{/* Horizontal rule */}
			<div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 50px' }} />

			{/* Elevation row */}
			<ElevationChart routeProgress={routeProgress} currentEle={currentPoint.ele} />
		</div>
	);
};
