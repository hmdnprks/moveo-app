import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { MapView, MAP_HEIGHT } from './MapView';
import { MetricsPanel } from './MetricsPanel';
import type { RunData, VideoConfig } from './types';
import { DEFAULT_VIDEO_CONFIG } from './types';

const FONT = 'system-ui, -apple-system, sans-serif';
const FADE_IN_END = 20;
const ROUTE_START = 30;

export interface RunStoryProps {
	runData: RunData;
	config?: VideoConfig;
}

export const RunStory: React.FC<RunStoryProps> = ({ runData, config: configProp }) => {
	const config = configProp ?? DEFAULT_VIDEO_CONFIG;
	const frame = useCurrentFrame();

	const totalFrames = config.durationSeconds * 30;
	const ROUTE_END = totalFrames - 30; // leave 1 s of hold at the end

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

	const headerTranslate = interpolate(frame, [0, 30], [-100, 0], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});

	const displayTitle = (config.titleOverride?.trim() || runData.summary.name).toUpperCase();
	const date = new Date(runData.summary.date + 'T00:00:00');
	const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
	const showHeader = config.showTitle || config.showDate;

	return (
		<AbsoluteFill style={{ backgroundColor: config.bgColor, opacity: fadeIn }}>
			<MapView runData={runData} routeProgress={routeProgress} config={config} />

			{/* gradient overlays so text is readable over map */}
			<div style={{ position: 'absolute', top: MAP_HEIGHT - 200, left: 0, right: 0, height: 200, background: `linear-gradient(to bottom, transparent, ${config.bgColor})`, pointerEvents: 'none' }} />
			{showHeader && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, background: `linear-gradient(to bottom, ${config.bgColor}e0, transparent)`, pointerEvents: 'none' }} />}

			{showHeader && (
				<div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, transform: `translateY(${headerTranslate}px)` }}>
					{config.showTitle && (
						<div style={{ fontSize: 68, fontWeight: 900, color: '#FFFFFF', letterSpacing: 8, textTransform: 'uppercase', fontFamily: FONT, textShadow: '0 2px 24px rgba(0,0,0,0.7)' }}>
							{displayTitle}
						</div>
					)}
					{config.showDate && (
						<div style={{ fontSize: 36, color: 'rgba(255,255,255,0.75)', marginTop: config.showTitle ? 12 : 0, fontFamily: FONT, fontWeight: 500, textShadow: '0 2px 12px rgba(0,0,0,0.6)', letterSpacing: 1 }}>
							{dateStr}
						</div>
					)}
				</div>
			)}

			<MetricsPanel runData={runData} currentPoint={currentPoint} routeProgress={routeProgress} config={config} />
		</AbsoluteFill>
	);
};
