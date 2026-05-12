import dynamic from 'next/dynamic';
import type { RunData, VideoConfig } from '@/lib/types';

interface VideoPlayerProps {
  runData: RunData;
  config: VideoConfig;
}

const DynamicPlayer = dynamic(
  () => import('./PlayerWrapper').then((m) => m.PlayerWrapper),
  {
    ssr: false,
    loading: () => (
      <div style={{ aspectRatio: '9/16', background: '#161618', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading player…</p>
      </div>
    ),
  }
);

export function VideoPlayer(props: VideoPlayerProps) {
  return <DynamicPlayer {...props} />;
}
