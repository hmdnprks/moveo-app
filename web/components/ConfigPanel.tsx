'use client';

import type { MetricKey, MapStyleKey, VideoConfig, RunData } from '@/lib/types';

// ── Static options ────────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  { label: 'Orange',  hex: '#FF6B35' },
  { label: 'Cyan',    hex: '#00BCD4' },
  { label: 'Pink',    hex: '#E91E8C' },
  { label: 'Lime',    hex: '#C6FF00' },
  { label: 'Purple',  hex: '#7C4DFF' },
  { label: 'White',   hex: '#FFFFFF' },
];

const BG_PRESETS = [
  { label: 'Near Black', hex: '#161618' },
  { label: 'Deep Navy',  hex: '#0D1B2A' },
  { label: 'Forest',     hex: '#0D1F0D' },
  { label: 'Dark Wine',  hex: '#1A0D0D' },
];

const ALL_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'pace',     label: 'Pace' },
  { key: 'time',     label: 'Time' },
  { key: 'hr',       label: 'Heart Rate' },
  { key: 'cadence',  label: 'Cadence' },
];

const MAP_STYLES: { key: MapStyleKey; label: string }[] = [
  { key: 'dark',      label: 'Dark' },
  { key: 'light',     label: 'Light' },
  { key: 'satellite', label: 'Satellite' },
];

const DURATIONS = [15, 30, 45, 60];

// ── Helpers ───────────────────────────────────────────────────────────────

function hasHr(runData: RunData)  { return runData.points.some((p) => p.hr  > 0); }
function hasCad(runData: RunData) { return runData.points.some((p) => p.cad > 0); }

// ── Sub-components ────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>{title}</p>
    {children}
  </div>
);

const Chip = ({ label, active, onClick, disabled, style }: {
  label: string; active: boolean; onClick: () => void; disabled?: boolean; style?: React.CSSProperties;
}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '7px 14px', borderRadius: 8, fontSize: 13,
    border: active ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: disabled ? 'rgba(255,255,255,0.2)' : active ? '#fff' : 'rgba(255,255,255,0.55)',
    fontWeight: active ? 600 : 400, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.12s',
    ...style,
  }}>{label}</button>
);

const Toggle = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <button onClick={onClick} style={{
      width: 36, height: 20, borderRadius: 10, position: 'relative', border: 'none', cursor: 'pointer',
      background: active ? '#FF6B35' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: active ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
    <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13 }}>{label}</span>
  </div>
);

// ── ConfigPanel ───────────────────────────────────────────────────────────

interface ConfigPanelProps {
  config: VideoConfig;
  onChange: (c: VideoConfig) => void;
  runData: RunData;
}

export function ConfigPanel({ config, onChange, runData }: ConfigPanelProps) {
  const set = (patch: Partial<VideoConfig>) => onChange({ ...config, ...patch });

  const hrAvailable  = hasHr(runData);
  const cadAvailable = hasCad(runData);

  const canAddMetric  = config.metrics.length < 4;
  const canRemoveMetric = config.metrics.length > 3;

  const setMetric = (slot: number, key: MetricKey) => {
    const next = [...config.metrics];
    next[slot] = key;
    set({ metrics: next });
  };

  const addMetric = () => {
    // Pick the first metric not already in the list
    const next = ALL_METRICS.find((m) => !config.metrics.includes(m.key));
    if (next) set({ metrics: [...config.metrics, next.key] });
  };

  const removeLastMetric = () => {
    if (config.metrics.length > 3) {
      set({ metrics: config.metrics.slice(0, -1) });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '18px 0' }}>

      {/* ── Content ── */}
      <Section title="Content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title toggle + inline edit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Toggle label="Show title" active={config.showTitle} onClick={() => set({ showTitle: !config.showTitle })} />
            {config.showTitle && (
              <input
                type="text"
                value={config.titleOverride ?? runData.summary.name}
                onChange={(e) => set({ titleOverride: e.target.value })}
                placeholder={runData.summary.name}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 12px',
                  color: '#fff', fontSize: 14, outline: 'none',
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              />
            )}
          </div>
          {/* Date toggle */}
          <Toggle label="Show date" active={config.showDate} onClick={() => set({ showDate: !config.showDate })} />
        </div>
      </Section>

      {/* ── Accent colour ── */}
      <Section title="Accent Color">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {ACCENT_PRESETS.map(({ label, hex }) => (
            <button key={hex} title={label} onClick={() => set({ accentColor: hex })} style={{
              width: 28, height: 28, borderRadius: '50%', background: hex,
              border: config.accentColor === hex ? '3px solid #fff' : '2px solid rgba(255,255,255,0.15)',
              cursor: 'pointer', flexShrink: 0,
            }} />
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <input type="color" value={config.accentColor} onChange={(e) => set({ accentColor: e.target.value })}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>{config.accentColor}</span>
          </label>
        </div>
      </Section>

      {/* ── Background ── */}
      <Section title="Background">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {BG_PRESETS.map(({ label, hex }) => (
            <button key={hex} title={label} onClick={() => set({ bgColor: hex })} style={{
              width: 28, height: 28, borderRadius: '50%', background: hex,
              border: config.bgColor === hex ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
              cursor: 'pointer', flexShrink: 0,
            }} />
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <input type="color" value={config.bgColor} onChange={(e) => set({ bgColor: e.target.value })}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>{config.bgColor}</span>
          </label>
        </div>
      </Section>

      {/* ── Map style ── */}
      <Section title="Map Style">
        <div style={{ display: 'flex', gap: 8 }}>
          {MAP_STYLES.map(({ key, label }) => (
            <Chip key={key} label={label} active={config.mapStyle === key} onClick={() => set({ mapStyle: key })} />
          ))}
        </div>
      </Section>

      {/* ── Metrics ── */}
      <Section title={`Metrics (${config.metrics.length}/4)${config.metrics.length === 4 ? ' — 4th shown large below' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {config.metrics.map((currentKey, slot) => {
            const usedByOthers = config.metrics.filter((_, i) => i !== slot);
            const isFeatured = config.metrics.length === 4 && slot === 3;
            return (
              <div key={slot} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: isFeatured ? 'rgba(255,165,0,0.7)' : 'rgba(255,255,255,0.25)', fontSize: 11, width: 52, flexShrink: 0 }}>
                  {isFeatured ? 'Featured' : `Slot ${slot + 1}`}
                </span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                  {ALL_METRICS.map(({ key, label }) => {
                    const noData = (key === 'hr' && !hrAvailable) || (key === 'cadence' && !cadAvailable);
                    const usedElsewhere = usedByOthers.includes(key);
                    return (
                      <Chip key={key} label={noData ? `${label} —` : label}
                        active={currentKey === key} disabled={usedElsewhere || noData}
                        onClick={() => setMetric(slot, key)} />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add / remove metric buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {canAddMetric && (
              <button onClick={addMetric} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13,
                border: '1.5px dashed rgba(255,255,255,0.25)',
                background: 'transparent', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}>＋ Add 4th metric</button>
            )}
            {canRemoveMetric && (
              <button onClick={removeLastMetric} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13,
                border: '1.5px solid rgba(255,80,80,0.3)',
                background: 'transparent', color: 'rgba(255,100,100,0.7)',
                cursor: 'pointer',
              }}>× Remove</button>
            )}
          </div>
        </div>
      </Section>

      {/* ── Elevation chart ── */}
      <Section title="Elevation Chart">
        <Toggle label="Show elevation" active={config.showElevation} onClick={() => set({ showElevation: !config.showElevation })} />
      </Section>

      {/* ── Duration ── */}
      <Section title="Duration">
        <div style={{ display: 'flex', gap: 8 }}>
          {DURATIONS.map((s) => (
            <Chip key={s} label={`${s}s`} active={config.durationSeconds === s} onClick={() => set({ durationSeconds: s })} />
          ))}
        </div>
      </Section>

    </div>
  );
}
