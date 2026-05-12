import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { MapView, MAP_HEIGHT } from './MapView';
import { MetricsPanel } from './MetricsPanel';
import runData from './run_data.json';

const FADE_IN_END = 20;
const ROUTE_START = 30;
const ROUTE_END = 870;

export const RunStory: React.FC = () => {
	const frame = useCurrentFrame();

	const fadeIn = interpolate(frame, [0, FADE_IN_END], [0, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.ease),
	});

	const routeProgress = interpolate(frame, [ROUTE_START, ROUTE_END], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.inOut(Easing.quad),
	});

	const pointIdx = Math.min(
		Math.floor(routeProgress * (runData.points.length - 1)),
		runData.points.length - 1,
	);
	const currentPoint = runData.points[pointIdx];

	// Header slide-down
	const headerTranslate = interpolate(frame, [0, 30], [-100, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});

	return (
		<AbsoluteFill style={{ backgroundColor: '#161618', opacity: fadeIn }}>
			{/* Full-screen map */}
			<MapView routeProgress={routeProgress} />

			{/* Dark gradient fade from map into metrics panel */}
			<div
				style={{
					position: 'absolute',
					top: MAP_HEIGHT - 200,
					left: 0,
					right: 0,
					height: 200,
					background: 'linear-gradient(to bottom, transparent, #161618)',
					pointerEvents: 'none',
				}}
			/>

			{/* Top header gradient */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: 220,
					background: 'linear-gradient(to bottom, rgba(22,22,24,0.88), transparent)',
					pointerEvents: 'none',
				}}
			/>

			{/* Header: title + date */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					paddingTop: 80,
					transform: `translateY(${headerTranslate}px)`,
				}}
			>
				<div
					style={{
						fontSize: 68,
						fontWeight: 900,
						color: '#FFFFFF',
						letterSpacing: 8,
						textTransform: 'uppercase',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						textShadow: '0 2px 24px rgba(0,0,0,0.7)',
					}}
				>
					{runData.summary.name.toUpperCase()}
				</div>
				<div
					style={{
						fontSize: 36,
						color: 'rgba(255,255,255,0.75)',
						marginTop: 12,
						fontFamily: 'system-ui, -apple-system, sans-serif',
						fontWeight: 500,
						textShadow: '0 2px 12px rgba(0,0,0,0.6)',
						letterSpacing: 1,
					}}
				>
					May 11, 2026 · Jakarta
				</div>
			</div>

			{/* Metrics panel */}
			<MetricsPanel currentPoint={currentPoint} routeProgress={routeProgress} />
		</AbsoluteFill>
	);
};
