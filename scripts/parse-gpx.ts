#!/usr/bin/env bun
import { XMLParser } from 'fast-xml-parser';
import { join } from 'path';
import { mkdirSync } from 'fs';

const gpxPath = process.argv[2];
if (!gpxPath) {
	console.error('Usage: bun scripts/parse-gpx.ts <path-to-gpx>');
	process.exit(1);
}

// ── Parse XML ──────────────────────────────────────────────────────────────────
const gpxContent = await Bun.file(gpxPath).text();

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	removeNSPrefix: true,  // strips gpxtpx: prefixes so hr/cad are accessible directly
	parseAttributeValue: true,
	isArray: (name) => name === 'trkpt' || name === 'trkseg',
});

const parsed = parser.parse(gpxContent);
const trk = parsed.gpx?.trk;

if (!trk) {
	console.error('No <trk> element found in GPX file.');
	process.exit(1);
}

const name: string = trk.name || 'Run';

// Flatten all segments into one list of trkpts
const segments: unknown[] = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];
const allPoints = segments.flatMap((seg: any) => {
	const pts = seg?.trkpt;
	if (!pts) return [];
	return Array.isArray(pts) ? pts : [pts];
});

if (allPoints.length === 0) {
	console.error('No track points found in GPX file.');
	process.exit(1);
}

type RawPoint = { lat: number; lon: number; ele: number; time: string; hr: number; cad: number };

const points: RawPoint[] = allPoints.map((pt: any) => ({
	lat: Number(pt.lat),
	lon: Number(pt.lon),
	ele: Number(pt.ele ?? 0),
	time: String(pt.time ?? ''),
	hr: Number(pt.extensions?.TrackPointExtension?.hr ?? 0),
	cad: Number(pt.extensions?.TrackPointExtension?.cad ?? 0),
}));

// ── Downsample ─────────────────────────────────────────────────────────────────
const sampled = points.filter((_, i) => i % 5 === 0);
if (sampled[sampled.length - 1] !== points[points.length - 1]) {
	sampled.push(points[points.length - 1]);
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dphi = toRad(lat2 - lat1);
	const dlambda = toRad(lon2 - lon1);
	const a =
		Math.sin(dphi / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Cumulative distances ───────────────────────────────────────────────────────
const cumDist: number[] = [0];
for (let i = 1; i < sampled.length; i++) {
	cumDist.push(
		cumDist[i - 1] + haversine(sampled[i - 1].lat, sampled[i - 1].lon, sampled[i].lat, sampled[i].lon),
	);
}

// ── Enrich points ──────────────────────────────────────────────────────────────
const startMs = new Date(sampled[0].time).getTime();

const enriched = sampled.map((p, i) => {
	const elapsedS = Math.round((new Date(p.time).getTime() - startMs) / 1000);
	const distKm = cumDist[i] / 1000;

	let paceSecPerKm: number | null = null;
	if (distKm > 0.1) {
		const lookBack = Math.max(0, i - 10);
		const dDiff = cumDist[i] - cumDist[lookBack];
		if (dDiff > 0) {
			const tDiff =
				elapsedS -
				Math.round((new Date(sampled[lookBack].time).getTime() - startMs) / 1000);
			paceSecPerKm = Math.round((tDiff / dDiff) * 1000);
		}
	}

	return {
		lat: p.lat,
		lon: p.lon,
		ele: Math.round(p.ele * 10) / 10,
		hr: p.hr,
		cad: p.cad,
		elapsed_s: elapsedS,
		dist_km: Math.round(distKm * 1000) / 1000,
		pace_s_per_km: paceSecPerKm,
	};
});

// ── Summary ────────────────────────────────────────────────────────────────────
const totalDistKm = cumDist[cumDist.length - 1] / 1000;
const totalElapsedS = Math.round((new Date(sampled[sampled.length - 1].time).getTime() - startMs) / 1000);
const hrsWithData = points.filter((p) => p.hr > 0);
const avgHr = hrsWithData.length > 0
	? Math.round(hrsWithData.reduce((s, p) => s + p.hr, 0) / hrsWithData.length)
	: 0;
const maxHr = hrsWithData.length > 0 ? Math.max(...hrsWithData.map((p) => p.hr)) : 0;

// ── Map metadata ───────────────────────────────────────────────────────────────
const lats = points.map((p) => p.lat);
const lons = points.map((p) => p.lon);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const minLon = Math.min(...lons), maxLon = Math.max(...lons);
const centerLat = (minLat + maxLat) / 2;
const centerLon = (minLon + maxLon) / 2;
const latSpan = maxLat - minLat;
const lonSpan = maxLon - minLon;
// Compute zoom so the route fills ~65% of the 1080px composition width
const lonZoom = Math.log2((360 * 1080 * 0.65) / (256 * lonSpan));
const latZoom = Math.log2((360 * 1080 * 0.65) / (256 * latSpan));
const mapZoom = Math.round((Math.min(lonZoom, latZoom) - 0.3) * 10) / 10;

const output = {
	summary: {
		date: new Date(sampled[0].time).toISOString().split('T')[0],
		name,
		total_dist_km: Math.round(totalDistKm * 100) / 100,
		total_elapsed_s: totalElapsedS,
		avg_hr: avgHr,
		max_hr: maxHr,
		avg_pace_s_per_km: Math.round(totalElapsedS / totalDistKm),
	},
	map: {
		center: [centerLon, centerLat] as [number, number],
		zoom: mapZoom,
	},
	points: enriched,
};

// ── Write output ───────────────────────────────────────────────────────────────
const projectRoot = join(import.meta.dir, '..');
const json = JSON.stringify(output);

mkdirSync(join(projectRoot, 'src'), { recursive: true });
mkdirSync(join(projectRoot, 'public'), { recursive: true });

await Bun.write(join(projectRoot, 'src/run_data.json'), json);
await Bun.write(join(projectRoot, 'public/run_data.json'), json);

const mins = Math.floor(totalElapsedS / 60);
const secs = (totalElapsedS % 60).toString().padStart(2, '0');

console.log(`Parsed ${points.length} points → ${enriched.length} sampled`);
console.log(`  Name:     ${name}`);
console.log(`  Date:     ${output.summary.date}`);
console.log(`  Distance: ${output.summary.total_dist_km} km`);
console.log(`  Duration: ${mins}:${secs}`);
console.log(`  Avg HR:   ${avgHr} bpm`);
console.log(`  Center:   [${centerLon.toFixed(4)}, ${centerLat.toFixed(4)}] zoom ${mapZoom}`);
console.log(`  Written → src/run_data.json + public/run_data.json`);
