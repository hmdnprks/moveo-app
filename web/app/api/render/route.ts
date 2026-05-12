import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { VideoConfig } from '@/lib/types';

const REMOTION_ROOT = join(process.cwd(), '..');
const OUTPUT        = join(REMOTION_ROOT, 'out/run_story.mp4');

export async function POST(req: NextRequest) {
  const { runData, config }: { runData: unknown; config: VideoConfig } = await req.json();

  const durationFrames = (config?.durationSeconds ?? 30) * 30;

  // Pass everything via --props so we never touch src/run_data.json
  // (writing watched source files would trigger Next.js HMR and reset the UI)
  const inputProps = JSON.stringify({ runData, config });

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'bunx',
      [
        'remotion', 'render', 'RunStory',
        'out/run_story.mp4',
        `--frames=0-${durationFrames - 1}`,
        `--props=${inputProps}`,
        '--gl=angle',
        '--concurrency=1',
      ],
      { cwd: REMOTION_ROOT, stdio: 'inherit' },
    );
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Render exited with code ${code}`))));
    proc.on('error', reject);
  });

  if (!existsSync(OUTPUT)) {
    return NextResponse.json({ error: 'Render failed — output file not found.' }, { status: 500 });
  }

  const videoBuffer = readFileSync(OUTPUT);
  return new NextResponse(videoBuffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="moveo-run.mp4"`,
    },
  });
}
