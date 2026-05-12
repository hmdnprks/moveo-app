# Movéo

Turn your GPX run files into animated Instagram Stories — dark map, live metrics, and an elevation chart, all rendered frame-by-frame with Remotion.

## Preview

| Frame 0 | Mid-run | Final |
|---|---|---|
| Route starts drawing | Distance, pace & time count up live | Full route revealed with final stats |

**Output:** 1080×1920 MP4 · 30 fps · 30 seconds · ready for Instagram Stories

## Stack

- **[Remotion](https://remotion.dev)** — React-based video rendering
- **[MapLibre GL JS](https://maplibre.org)** — WebGL map with animated route
- **[Turf.js](https://turfjs.org)** — geospatial route slicing & position interpolation
- **CARTO Dark Matter** — dark tile style
- **OpenStreetMap** — map data

## How it works

1. A TypeScript script parses your `.gpx` file into `src/run_data.json` (coordinates, pace, elevation, heart rate per point)
2. Remotion renders 900 frames (30s × 30fps) in headless Chromium — each frame advances the route progress and updates the metrics
3. ffmpeg encodes the frames into an MP4

## Getting started

**Install dependencies**

```bash
bun install
```

**Parse your GPX file**

```bash
bun run parse your_run.gpx
```

This writes `src/run_data.json` and `public/run_data.json`.

**Preview in Remotion Studio**

```bash
bun run dev
```

Open [localhost:3000](http://localhost:3000) to scrub through the animation.

**Render the video**

```bash
bunx remotion render RunStory out/run_story.mp4 --gl=angle --concurrency=1
```

The `--gl=angle` flag is required for WebGL (MapLibre) to render correctly in headless Chromium.

## Project structure

```
src/
  RunStory.tsx      # Main composition (1080×1920, 30s)
  MapView.tsx       # MapLibre map with animated route trace
  MetricsPanel.tsx  # Distance / pace / time + elevation chart
  run_data.json     # Parsed GPX data (generated, not hand-edited)
public/
  run_data.json     # Same data served as a static asset
```

## Composition

| Property | Value |
|---|---|
| Resolution | 1080 × 1920 (Instagram Story 9:16) |
| Duration | 30 seconds |
| FPS | 30 |
| Map style | CARTO Dark Matter |
| Route color | `#FF6B35` |

## Roadmap

- [ ] Web UI to upload GPX and download the rendered video
- [ ] Cloud Run deployment for server-side rendering
- [ ] Support for cycling and hiking GPX files
- [ ] Multiple map style options
- [ ] Customisable color themes

## License

MIT
