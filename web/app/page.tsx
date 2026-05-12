'use client';

import { useState, useCallback } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { StaticPreview } from '@/components/StaticPreview';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ConfigPanel } from '@/components/ConfigPanel';
import type { RunData, VideoConfig } from '@/lib/types';
import { DEFAULT_VIDEO_CONFIG } from '@/lib/types';

const fmt2  = (n: number) => n.toString().padStart(2, '0');
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${fmt2(Math.round(s % 60))}`;
const fmtPace = (s: number) => `${Math.floor(s / 60)}:${fmt2(Math.round(s % 60))}`;

export default function HomePage() {
  const [runData, setRunData]         = useState<RunData | null>(null);
  const [config, setConfig]           = useState<VideoConfig>(DEFAULT_VIDEO_CONFIG);
  const [rendering, setRendering]     = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showConfig, setShowConfig]   = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [editingTitle, setEditingTitle]   = useState(false);

  const handleParsed = useCallback((data: RunData) => {
    setRunData(data);
    setRenderError(null);
    setConfig(DEFAULT_VIDEO_CONFIG);
    setShowAnimation(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunData(null);
    setRenderError(null);
    setConfig(DEFAULT_VIDEO_CONFIG);
    setShowAnimation(false);
  }, []);

  const handleRender = useCallback(async () => {
    if (!runData) return;
    setRendering(true);
    setRenderError(null);
    // Switch back to static preview so the Remotion Player isn't fighting
    // the render subprocess for GPU / Chromium resources
    setShowAnimation(false);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runData, config }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Render failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'moveo-run.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setRendering(false);
    }
  }, [runData, config]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: 6, color: '#fff' }}>MOVÉO</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 10, letterSpacing: 1 }}>
          Turn your run into an animated story
        </p>
      </div>

      {!runData ? (
        <UploadZone onParsed={handleParsed} />
      ) : (
        <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'row', gap: 48, alignItems: 'flex-start' }}>

          {/* ── Left column: preview ── */}
          <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Preview toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowAnimation(false)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13,
                  border: !showAnimation ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
                  background: !showAnimation ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: !showAnimation ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontWeight: !showAnimation ? 600 : 400,
                }}
              >
                Preview
              </button>
              <button
                onClick={() => setShowAnimation(true)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13,
                  border: showAnimation ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
                  background: showAnimation ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: showAnimation ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontWeight: showAnimation ? 600 : 400,
                }}
              >
                ▶ Animate
              </button>
            </div>

            {/* Static preview — always mounted, hidden when showing animation */}
            <div style={{ display: showAnimation ? 'none' : 'block' }}>
              <StaticPreview runData={runData} config={config} displayWidth={320} />
            </div>

            {/* Remotion Player — only mounted when needed to avoid GPU / HMR conflicts */}
            {showAnimation && (
              <VideoPlayer runData={runData} config={config} />
            )}

            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
              {showAnimation
                ? '10s watermarked preview — export for the full unwatermarked MP4'
                : 'Static frame at 50% progress — updates instantly with config changes'}
            </p>
          </div>

          {/* ── Right column: stats + config + export ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 40 }}>

            {/* Run title — click pencil or the title itself to edit */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {editingTitle ? (
                  <input
                    autoFocus
                    value={config.titleOverride ?? runData.summary.name}
                    onChange={(e) => setConfig((c) => ({ ...c, titleOverride: e.target.value }))}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false); }}
                    style={{
                      fontSize: 24, fontWeight: 800, color: '#fff',
                      background: 'transparent', border: 'none',
                      borderBottom: '2px solid rgba(255,255,255,0.4)',
                      outline: 'none', width: '100%', padding: '2px 0',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  />
                ) : (
                  <h2
                    onClick={() => setEditingTitle(true)}
                    style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, cursor: 'text' }}
                  >
                    {config.titleOverride?.trim() || runData.summary.name}
                  </h2>
                )}
                <button
                  onClick={() => setEditingTitle(true)}
                  title="Edit title"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 4, lineHeight: 1, flexShrink: 0 }}
                >
                  ✏️
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{runData.summary.date}</p>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Distance',     value: `${runData.summary.total_dist_km} km` },
                {
                  label: 'Moving Time',
                  value: fmtTime(runData.summary.moving_time_s ?? runData.summary.total_elapsed_s),
                  sub: runData.summary.moving_time_s != null
                    ? `${fmtTime(runData.summary.total_elapsed_s)} elapsed`
                    : undefined,
                },
                { label: 'Avg Pace', value: `${fmtPace(runData.summary.avg_pace_s_per_km)} /km` },
                { label: 'Avg HR',   value: runData.summary.avg_hr > 0 ? `${runData.summary.avg_hr} bpm` : '—' },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 18px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
                  <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                  {sub && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2 }}>{sub}</p>}
                </div>
              ))}
            </div>

            {/* Customise toggle */}
            <div>
              <button
                onClick={() => setShowConfig((v) => !v)}
                style={{
                  background: 'transparent',
                  color: showConfig ? '#fff' : 'rgba(255,255,255,0.55)',
                  border: `1px solid ${showConfig ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10,
                  padding: '10px 18px',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 16 }}>🎨</span>
                <span>{showConfig ? 'Hide customise' : 'Customise video'}</span>
                <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{showConfig ? '▲' : '▼'}</span>
              </button>

              {showConfig && (
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 16, marginTop: 4 }}>
                  <ConfigPanel config={config} onChange={setConfig} runData={runData} />
                </div>
              )}
            </div>

            {/* Export */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleRender}
                disabled={rendering}
                style={{
                  background: rendering ? 'rgba(255,107,53,0.35)' : config.accentColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '16px 28px',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: rendering ? 'wait' : 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {rendering ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                    Rendering {config.durationSeconds}s video…
                  </>
                ) : (
                  `Export ${config.durationSeconds}s MP4`
                )}
              </button>
              <button
                onClick={handleReset}
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 28px', fontSize: 14, cursor: 'pointer' }}
              >
                Upload different run
              </button>
              {renderError && <p style={{ color: '#EF5350', fontSize: 13 }}>{renderError}</p>}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12, lineHeight: 1.6 }}>
              Preview updates instantly — no reload needed. Use ▶ Animate to scrub the full 30-frame animation before exporting.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
