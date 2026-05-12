import { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentFrame, useDelayRender, useVideoConfig } from 'remotion';
import maplibregl, { type GeoJSONSource, type Map, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { MapStyleKey, RunData, VideoConfig } from './types';

export const MAP_HEIGHT = 1260;

const TILE_URLS: Record<MapStyleKey, string> = {
	dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
	light: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
	satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function buildMapStyle(styleKey: MapStyleKey): StyleSpecification {
	return {
		version: 8,
		sources: {
			tiles: {
				type: 'raster',
				tiles: [TILE_URLS[styleKey]],
				tileSize: 256,
				attribution: styleKey === 'satellite'
					? 'Tiles © Esri'
					: '© OpenStreetMap contributors © CARTO',
			},
		},
		layers: [{ id: 'base-tiles', type: 'raster', source: 'tiles' }],
	};
}

const getPartialRoute = (
	fullRoute: ReturnType<typeof turf.lineString>,
	fullRouteLength: number,
	progress: number,
) => {
	const dist = Math.max(0.0001, fullRouteLength * Math.min(progress, 1));
	return turf.lineSliceAlong(fullRoute, 0, dist);
};

const getPositionAt = (
	fullRoute: ReturnType<typeof turf.lineString>,
	fullRouteLength: number,
	progress: number,
): [number, number] => {
	const dist = Math.max(0.0001, fullRouteLength * Math.min(progress, 1));
	const pt = turf.along(fullRoute, dist).geometry.coordinates;
	return [pt[0], pt[1]];
};

interface MapViewProps {
	runData: RunData;
	routeProgress: number;
	config: VideoConfig;
}

export const MapView: React.FC<MapViewProps> = ({ runData, routeProgress, config }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const frame = useCurrentFrame();
	const { width } = useVideoConfig();
	const { delayRender, continueRender } = useDelayRender();
	const [map, setMap] = useState<Map | null>(null);
	const [loadingHandle] = useState(() => delayRender('Loading map tiles'));

	const accentColor = config.accentColor;
	const mapStyle = config.mapStyle;

	const { fullRoute, fullRouteLength, startCoord } = useMemo(() => {
		const coords: [number, number][] = runData.points.map((p) => [p.lon, p.lat]);
		const route = turf.lineString(coords);
		return { fullRoute: route, fullRouteLength: turf.length(route), startCoord: coords[0] };
	}, [runData]);

	const mapCenter = runData.map.center;
	const mapZoom = runData.map.zoom;

	useEffect(() => {
		if (!containerRef.current) return;

		const mapInstance = new maplibregl.Map({
			container: containerRef.current,
			style: buildMapStyle(mapStyle),
			center: mapCenter,
			zoom: mapZoom,
			interactive: false,
			attributionControl: false,
			fadeDuration: 0,
			canvasContextAttributes: { preserveDrawingBuffer: true },
		});

		mapInstance.on('load', () => {
			mapInstance.addSource('route-ghost', { type: 'geojson', data: fullRoute });
			mapInstance.addLayer({
				id: 'route-ghost-line',
				type: 'line',
				source: 'route-ghost',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': accentColor, 'line-width': 6, 'line-opacity': 0.2 },
			});

			mapInstance.addSource('route-trace', {
				type: 'geojson',
				data: getPartialRoute(fullRoute, fullRouteLength, 0),
			});
			mapInstance.addLayer({
				id: 'route-trace-line',
				type: 'line',
				source: 'route-trace',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': accentColor, 'line-width': 9, 'line-opacity': 1 },
			});

			mapInstance.addSource('start-marker', { type: 'geojson', data: turf.point(startCoord) });
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
					'circle-stroke-color': accentColor,
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
					'circle-stroke-color': accentColor,
					'circle-stroke-width': 3,
				},
			});

			mapInstance.jumpTo({ center: mapCenter, zoom: mapZoom });
			mapInstance.once('idle', () => {
				setMap(mapInstance);
				continueRender(loadingHandle);
			});
		});

		return () => {
			mapInstance.remove();
		};
		// Re-run if the map style or colors change (e.g. when user tweaks config in the web preview)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mapStyle, accentColor, continueRender, fullRoute, fullRouteLength, loadingHandle, mapCenter, mapZoom, startCoord]);

	useEffect(() => {
		if (!map) return;
		const handle = delayRender('Rendering map frame');

		const trace = map.getSource('route-trace') as GeoJSONSource | undefined;
		trace?.setData(getPartialRoute(fullRoute, fullRouteLength, routeProgress));

		const position = map.getSource('position-marker') as GeoJSONSource | undefined;
		position?.setData(turf.point(getPositionAt(fullRoute, fullRouteLength, routeProgress)));

		map.once('idle', () => continueRender(handle));
		map.triggerRepaint();
	}, [map, frame, routeProgress, delayRender, continueRender, fullRoute, fullRouteLength]);

	return (
		<div
			ref={containerRef}
			style={{ position: 'absolute', top: 0, left: 0, width, height: MAP_HEIGHT }}
		/>
	);
};
