import './index.css';
import { Composition } from 'remotion';
import { RunStory } from './RunStory';

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="RunStory"
			component={RunStory}
			durationInFrames={900}
			fps={30}
			width={1080}
			height={1920}
		/>
	);
};
