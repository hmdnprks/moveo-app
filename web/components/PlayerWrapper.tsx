'use client';

import { Player } from '@remotion/player';
import { RunStory } from '../../src/RunStory';
import type { RunData, VideoConfig } from '@/lib/types';

// Preview is capped at 10 s — the full-duration MP4 is only available via Export
const PREVIEW_FRAMES = 10 * 30; // 300 frames @ 30 fps

interface PlayerWrapperProps {
  runData: RunData;
  config: VideoConfig;
}

export function PlayerWrapper({ runData, config }: PlayerWrapperProps) {
  // Never exceed 10 s in the browser preview, even if the export is 30–60 s
  const durationInFrames = Math.min(config.durationSeconds * 30, PREVIEW_FRAMES);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <Player
        component={RunStory as unknown as React.ComponentType<Record<string, unknown>>}
        inputProps={{ runData, config }}
        durationInFrames={durationInFrames}
        fps={30}
        compositionWidth={1080}
        compositionHeight={1920}
        style={{ width: '100%', display: 'block' }}
        controls
        clickToPlay
      />

      {/* ── Repeating diagonal watermark ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          // Extend beyond the box so the pattern fills the corners after rotation
          top: -120, left: -120, right: -120, bottom: -120,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          transform: 'rotate(-32deg)',
        }}>
          {Array.from({ length: 10 }).map((_, row) => (
            <div
              key={row}
              style={{
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              {Array.from({ length: 5 }).map((_, col) => (
                <span
                  key={col}
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 5,
                    color: '#ffffff',
                    opacity: 0.13,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  MOVÉO
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── "10s preview" badge ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          color: 'rgba(255,255,255,0.65)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          padding: '4px 8px',
          borderRadius: 6,
          pointerEvents: 'none',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textTransform: 'uppercase',
        }}
      >
        Preview · 10s
      </div>
    </div>
  );
}
