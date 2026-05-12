'use client';

import { useCallback, useState } from 'react';
import { parseGpx } from '@/lib/parseGpx';
import type { RunData } from '@/lib/types';

interface UploadZoneProps {
  onParsed: (data: RunData) => void;
}

export function UploadZone({ onParsed }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.gpx')) {
      setError('Please upload a .gpx file.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await parseGpx(file);
      onParsed(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse GPX file.');
    } finally {
      setLoading(false);
    }
  }, [onParsed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '60px 40px',
          border: `2px dashed ${dragging ? '#FF6B35' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 16,
          background: dragging ? 'rgba(255,107,53,0.06)' : 'rgba(255,255,255,0.03)',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div style={{ fontSize: 48 }}>🏃</div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>
            {loading ? 'Parsing your run…' : 'Drop your .gpx file here'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 }}>
            {loading ? 'This takes less than a second' : 'or click to browse'}
          </p>
        </div>
        <input
          type="file"
          accept=".gpx"
          style={{ display: 'none' }}
          onChange={onInputChange}
          disabled={loading}
        />
      </label>
      {error && (
        <p style={{ color: '#EF5350', fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</p>
      )}
    </div>
  );
}
