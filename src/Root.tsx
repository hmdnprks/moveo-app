import './index.css';
import { Composition } from 'remotion';
import { RunStory } from './RunStory';
import staticRunData from './run_data.json';
import type { RunData } from './types';
import { DEFAULT_VIDEO_CONFIG } from './types';

const runData = staticRunData as RunData;

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="RunStory"
			component={RunStory as unknown as React.ComponentType<Record<string, unknown>>}
			durationInFrames={DEFAULT_VIDEO_CONFIG.durationSeconds * 30}
			fps={30}
			width={1080}
			height={1920}
			defaultProps={{ runData, config: DEFAULT_VIDEO_CONFIG }}
		/>
	);
};
