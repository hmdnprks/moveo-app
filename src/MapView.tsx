import { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useDelayRender, useVideoConfig } from 'remotion';
import maplibregl, { type GeoJSONSource, type Map, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import runData from './run_data.json';

const MAP_CENTER: [number, number] = [106.805, -6.21825];
const MAP_ZOOM = 16.2;
export const MAP_HEIGHT = 1260;

const darkStyle: StyleSpecification = {
	version: 8,
	sources: {
		carto: {
			type: 'raster',
			tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
			tileSize: 256,
			attribution: '© OpenStreetMap contributors © CARTO',
		},
	},
	layers: [{ id: 'carto-dark', type: 'raster', source: 'carto' }],
};

const fullRouteCoords: [number, number][] = runData.points.map((p) => [p.lon, p.lat]);
const fullRoute = turf.lineString(fullRouteCoords);
const fullRouteLength = turf.length(fullRoute);
const startCoord = fullRouteCoords[0];

const getPartialRoute = (progress: number) => {
	const dist = Math.max(0.0001, fullRouteLength * Math.min(progress, 1));
	return turf.lineSliceAlong(fullRoute, 0, dist);
};

const getPositionAt = (progress: number): [number, number] => {
	const dist = Math.max(0.0001, fullRouteLength * Math.min(progress, 1));
	const pt = turf.along(fullRoute, dist).geometry.coordinates;
	return [pt[0], pt[1]];
};

interface MapViewProps {
	routeProgress: number;
}

export const MapView: React.FC<MapViewProps> = ({ routeProgress }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const frame = useCurrentFrame();
	const { width } = useVideoConfig();
	const { delayRender, continueRender } = useDelayRender();
	const [map, setMap] = useState<Map | null>(null);
	const [loadingHandle] = useState(() => delayRender('Loading map tiles'));

	useEffect(() => {
		if (!containerRef.current) return;

		const mapInstance = new maplibregl.Map({
			container: containerRef.current,
			style: darkStyle,
			center: MAP_CENTER,
			zoom: MAP_ZOOM,
			interactive: false,
			attributionControl: false,
			fadeDuration: 0,
			canvasContextAttributes: { preserveDrawingBuffer: true },
		});

		mapInstance.on('load', () => {
			// Ghost route (full path, faint)
			mapInstance.addSource('route-ghost', { type: 'geojson', data: fullRoute });
			mapInstance.addLayer({
				id: 'route-ghost-line',
				type: 'line',
				source: 'route-ghost',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': '#FF6B35', 'line-width': 6, 'line-opacity': 0.2 },
			});

			// Animated trace
			mapInstance.addSource('route-trace', { type: 'geojson', data: getPartialRoute(0) });
			mapInstance.addLayer({
				id: 'route-trace-line',
				type: 'line',
				source: 'route-trace',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': '#FF6B35', 'line-width': 9, 'line-opacity': 1 },
			});

			// Start marker (green dot)
			mapInstance.addSource('start-marker', {
				type: 'geojson',
				data: turf.point(startCoord),
			});
			mapInstance.addLayer({
				id: 'start-dot',
				type: 'circle',
				source: 'start-marker',
				paint: {
					'circle-color': '#4CAF50',
					'circle-radius': 14,
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 4,
				},
			});

			// Current position: white dot with orange ring (matches reference)
			mapInstance.addSource('position-marker', {
				type: 'geojson',
				data: turf.point(startCoord),
			});
			mapInstance.addLayer({
				id: 'position-ring',
				type: 'circle',
				source: 'position-marker',
				paint: {
					'circle-color': 'transparent',
					'circle-radius': 22,
					'circle-stroke-color': '#FF6B35',
					'circle-stroke-width': 4,
				},
			});
			mapInstance.addLayer({
				id: 'position-dot',
				type: 'circle',
				source: 'position-marker',
				paint: {
					'circle-color': '#ffffff',
					'circle-radius': 10,
					'circle-stroke-color': '#FF6B35',
					'circle-stroke-width': 3,
				},
			});

			mapInstance.jumpTo({ center: MAP_CENTER, zoom: MAP_ZOOM });
			mapInstance.once('idle', () => {
				setMap(mapInstance);
				continueRender(loadingHandle);
			});
		});
	}, [continueRender, loadingHandle]);

	useEffect(() => {
		if (!map) return;
		const handle = delayRender('Rendering map frame');

		const trace = map.getSource('route-trace') as GeoJSONSource | undefined;
		trace?.setData(getPartialRoute(routeProgress));

		const position = map.getSource('position-marker') as GeoJSONSource | undefined;
		position?.setData(turf.point(getPositionAt(routeProgress)));

		map.once('idle', () => continueRender(handle));
		map.triggerRepaint();
	}, [map, frame, routeProgress, delayRender, continueRender]);

	return (
		<div
			ref={containerRef}
			style={{ position: 'absolute', top: 0, left: 0, width, height: MAP_HEIGHT }}
		/>
	);
};
