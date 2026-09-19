<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import type * as LType from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { droughtState } from '$lib/state/drought-state.svelte';
	import { GWR_RASTER_BOUNDS, getGwrRasterUrl } from '$lib/data/gwrRegistry';
	import { loadLisaData } from '$lib/data/lisaRegistry';
	import {
		riskInfoFor,
		indicatorValue,
		INDICATORS,
		type DriFeature,
		type DriFeatureCollection,
		type DriProperties,
		type Domain,
		type IndicatorId
	} from '$lib/dri';

	const INDICATOR_LABEL: Record<IndicatorId, string> = Object.fromEntries(
		INDICATORS.map((ind) => [ind.id, ind.label])
	) as Record<IndicatorId, string>;

	const VN_BOUNDS: LType.LatLngBoundsExpression = [
		[7.891040705432752, 93.08914151330195],
		[24.91287850308276, 120.19799430215197]
	];

	let container: HTMLDivElement;
	let L: typeof LType | undefined;
	let map: LType.Map | undefined;

	let isMapReady = $state(false);

	let geoJsonLayer: LType.GeoJSON | undefined;
	let speiLisaLayer: LType.GeoJSON | undefined;
	let speiRasterOverlay: LType.ImageOverlay | undefined;
	let boundaryLayer: LType.GeoJSON | undefined;
	let renderedData: DriFeatureCollection | null = null;
	let satelliteLayer: LType.TileLayer | undefined;
	let streetLayer: LType.TileLayer | undefined;
	let resizeObserver: ResizeObserver | undefined;

	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const layersByName = new Map<string, LType.Layer>();

	function styleFor(
		feature: DriFeature,
		indicator: IndicatorId,
		year: number,
		month: number,
		domain: Domain | null
	): LType.PathOptions {
		const risk = riskInfoFor(
			indicatorValue(feature.properties, indicator, year, month),
			indicator,
			domain
		);
		return {
			color: '#232323',
			weight: 1,
			fillOpacity: 1,
			fillColor: risk?.color ?? '#cccccc'
		};
	}

	function popupHtml(
		props: DriProperties,
		indicator: IndicatorId,
		year: number,
		month: number,
		domain: Domain | null
	): string {
		const value = indicatorValue(props, indicator, year, month);
		const risk = riskInfoFor(value, indicator, domain);
		const label = INDICATOR_LABEL[indicator];
		const period = indicator === 'dhi' ? `${String(month).padStart(2, '0')}/${year}` : `${year}`;
		return `<div class="dri-popup">
			<h3>${props.ADM1_EN}</h3>
			<div class="popup-row"><strong>${label} ${period}:</strong> ${value != null ? value.toFixed(2) : 'No data'}</div>
			<div class="popup-row"><strong>Risk category:</strong> ${risk?.label ?? 'Unknown'}</div>
		</div>`;
	}

	function selectProvince(props: DriProperties) {
		droughtState.selectedProvinceName = props.ADM1_EN;
	}

	// Maps q_value from qgis2web exports directly to cluster colors
	function getLisaStyle(feature: any): LType.PathOptions {
    const p = feature?.properties ?? {};
    const q = Number(p.q_value);

    // Anselin LISA standard palette:
    // 0 = High-High (Hotspot, intense red)
    // 1 = Low-High Outlier (Soft sky blue)
    // 2 = High-Low Outlier (Soft rose pink)
    // 3 = Low-Low (Coldspot, rich cobalt blue)
    // 4 = Not Significant (Muted transparent warm gray)
    let fillColor = 'rgba(180, 185, 190, 0.25)'; // Muted background so clusters stand out
    let radius = 2.8;
    let fillOpacity = 0.35;

    if (q === 0) {
        fillColor = '#e31a1c'; // HH (Deep Red)
        radius = 3.6;
        fillOpacity = 0.9;
    } else if (q === 1) {
        fillColor = '#a6cee3'; // LH (Light Blue)
        radius = 3.2;
        fillOpacity = 0.85;
    } else if (q === 2) {
        fillColor = '#fb9a99'; // HL (Light Red / Salmon)
        radius = 3.2;
        fillOpacity = 0.85;
    } else if (q === 3) {
        fillColor = '#1f78b4'; // LL (Deep Blue)
        radius = 3.6;
        fillOpacity = 0.9;
    }

    return {
        radius,
        fillColor,
        fillOpacity,
        stroke: false, // Completely eliminates stroke/outlier borders
        weight: 0
    };
}

	function popupLisaHtml(props: any, year: number, month: number): string {
		const mm = String(month).padStart(2, '0');
		const qLabels: Record<number, string> = {
			0: 'High-High',
			1: 'Low-High',
			2: 'High-Low',
			3: 'Low-Low',
			4: 'Not Significant'
		};
		const clusterLabel = qLabels[Number(props.q_value)] ?? 'Not Significant';

		return `<div class="dri-popup">
			<h3>LISA SPEI (${mm}/${year})</h3>
			<div class="popup-row"><strong>Cluster:</strong> ${clusterLabel}</div>
			<div class="popup-row"><strong>Prediction:</strong> ${props.prediction != null ? Number(props.prediction).toFixed(3) : 'N/A'}</div>
			<div class="popup-row"><strong>Z-score:</strong> ${props.Z_score != null ? Number(props.Z_score).toFixed(3) : 'N/A'}</div>
			<div class="popup-row"><strong>p-value:</strong> ${props.p_value != null ? Number(props.p_value).toFixed(4) : 'N/A'}</div>
		</div>`;
	}

	onMount(async () => {
		await tick();
		if (!container) return;

		const mod = await import('leaflet');
		L = mod.default;

		if (!container) return;

		map = L.map(container, { zoomControl: false, maxZoom: 18, minZoom: 4 }).fitBounds(VN_BOUNDS);
		L.control.zoom({ position: 'topleft' }).addTo(map);

		satelliteLayer = L.tileLayer(
			'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			{ attribution: 'Tiles &copy; Esri', maxZoom: 18, opacity: 0.8 }
		);
		streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19
		});
		(droughtState.basemap === 'satellite' ? satelliteLayer : streetLayer).addTo(map);

		if (droughtState.category === 'drought') {
			void droughtState.ensureLoaded(droughtState.selectedIndicator, droughtState.selectedYear);
		}

		resizeObserver = new ResizeObserver(() => map?.invalidateSize());
		resizeObserver.observe(container);

		isMapReady = true;
	});

	onDestroy(() => resizeObserver?.disconnect());

	// Drought mode: Ensure standard datasets load
	$effect(() => {
		if (droughtState.category === 'drought') {
			void droughtState.ensureLoaded(droughtState.selectedIndicator, droughtState.selectedYear);
		}
	});

	// RENDER PIPELINE: Reactive to category, subtype, date, and map readiness
	$effect(() => {
		if (!isMapReady || !L || !map) return;

		const category = droughtState.category;
		const subtype = droughtState.speiSubtype;
		const year = droughtState.selectedYear;
		const month = droughtState.selectedMonth;

		// --- CASE 1: SPEI GWR RASTER ---
		if (category === 'spei' && subtype === 'gwr') {
			renderedData = null;

			if (geoJsonLayer) {
				map.removeLayer(geoJsonLayer);
				geoJsonLayer = undefined;
				layersByName.clear();
			}
			if (speiLisaLayer) {
				map.removeLayer(speiLisaLayer);
				speiLisaLayer = undefined;
			}
			if (speiRasterOverlay) {
				map.removeLayer(speiRasterOverlay);
				speiRasterOverlay = undefined;
			}

			const rasterUrl = getGwrRasterUrl(year, month);
			speiRasterOverlay = L.imageOverlay(rasterUrl, GWR_RASTER_BOUNDS, {
				opacity: 0.85,
				interactive: false
			}).addTo(map);
			return;
		}

		// --- CASE 2: SPEI LISA VECTOR ---
		if (category === 'spei' && subtype === 'lisa') {
			renderedData = null;

			if (speiRasterOverlay) {
				map.removeLayer(speiRasterOverlay);
				speiRasterOverlay = undefined;
			}
			if (geoJsonLayer) {
				map.removeLayer(geoJsonLayer);
				geoJsonLayer = undefined;
				layersByName.clear();
			}
			if (speiLisaLayer) {
				map.removeLayer(speiLisaLayer);
				speiLisaLayer = undefined;
			}

			loadLisaData(year, month)
				.then((fc) => {
					if (!L || !map || droughtState.category !== 'spei' || droughtState.speiSubtype !== 'lisa')
						return;

					speiLisaLayer = L.geoJSON(fc, {
						pointToLayer: (feature, latlng) => {
							return L.circleMarker(latlng, getLisaStyle(feature));
						},
						onEachFeature: (feature, layer) => {
							layer.bindPopup(popupLisaHtml(feature.properties, year, month), {
								maxWidth: 280
							});
						}
					}).addTo(map);
				})
				.catch((err) => console.error('Failed to load LISA data:', err));

			return;
		}

		// --- CASE 3: STANDARD DROUGHT CHOROPLETH ---
		if (speiRasterOverlay) {
			map.removeLayer(speiRasterOverlay);
			speiRasterOverlay = undefined;
		}
		if (speiLisaLayer) {
			map.removeLayer(speiLisaLayer);
			speiLisaLayer = undefined;
		}

		const fc = droughtState.currentData;
		if (!fc || fc === renderedData) return;

		if (geoJsonLayer) {
			map.removeLayer(geoJsonLayer);
			layersByName.clear();
		}

		const indicator = droughtState.selectedIndicator;
		const domain = droughtState.continuousDomain;
		geoJsonLayer = L.geoJSON(fc, {
			style: (feature) => styleFor(feature as DriFeature, indicator, year, month, domain),
			onEachFeature: (feature, layer) => {
				const props = (feature as DriFeature).properties;
				layersByName.set(props.ADM1_EN, layer);
				layer.bindPopup(popupHtml(props, indicator, year, month, domain), { maxWidth: 280 });
				layer.on('click', () => selectProvince(props));
			}
		}).addTo(map);
		renderedData = fc;

		droughtState.focusProvince = (name: string) => {
			const layer = layersByName.get(name) as LType.Polygon | undefined;
			if (!layer || !map) return;
			map.fitBounds(layer.getBounds(), { maxZoom: 8, padding: [40, 40] });
			layer.openPopup();
			selectProvince((layer as unknown as { feature: DriFeature }).feature.properties);
		};
	});

	// Restyle drought choropleth when sliders change inside the same dataset
	$effect(() => {
		if (droughtState.category !== 'drought' || !geoJsonLayer) return;
		const indicator = droughtState.selectedIndicator;
		const year = droughtState.selectedYear;
		const month = droughtState.selectedMonth;
		const domain = droughtState.continuousDomain;

		geoJsonLayer.setStyle((feature) =>
			styleFor(feature as DriFeature, indicator, year, month, domain)
		);
		geoJsonLayer.eachLayer((layer) => {
			const props = (layer as unknown as { feature: DriFeature }).feature.properties;
			layer.setPopupContent(popupHtml(props, indicator, year, month, domain));
		});
	});

	// 2025 Provincial boundary overlay
	$effect(() => {
		if (droughtState.showNewBoundary) void droughtState.loadBoundary();
	});

	$effect(() => {
		const fc = droughtState.boundary;
		const show = droughtState.showNewBoundary;
		if (!isMapReady || !L || !map) return;

		if (!boundaryLayer && fc) {
			boundaryLayer = L.geoJSON(fc, {
				style: { color: '#2563eb', weight: 1.5, opacity: 0.9, dashArray: '6 4', fill: false, interactive: false},
				onEachFeature: (feature, layer) => {
					const name = (feature as GeoJSON.Feature).properties?.adm1_name as string | undefined;
					if (name) layer.bindTooltip(name, { sticky: true });
				}
			});
		}

		if (!boundaryLayer) return;
		if (show) boundaryLayer.addTo(map);
		else map.removeLayer(boundaryLayer);
	});

	// Basemap switching
	$effect(() => {
		const target = droughtState.basemap;
		if (!isMapReady || !map || !satelliteLayer || !streetLayer) return;
		if (target === 'satellite') {
			map.addLayer(satelliteLayer);
			map.removeLayer(streetLayer);
		} else {
			map.addLayer(streetLayer);
			map.removeLayer(satelliteLayer);
		}
	});
</script>

<div class="map-host" bind:this={container}></div>

<style>
	.map-host {
		width: 100%;
		height: 100%;
	}

	:global(.dri-popup h3) {
		margin: 0 0 0.4rem;
		font-size: 0.95rem;
	}

	:global(.dri-popup .popup-row) {
		font-size: 0.85rem;
		margin: 0.15rem 0;
	}
</style>