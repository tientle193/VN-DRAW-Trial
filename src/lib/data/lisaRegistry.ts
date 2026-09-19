// Helper function to build keys: "2015-01", "2020-12"
export function formatKey(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, '0')}`;
}

// Map keys to dynamic import functions
export const lisaLoaders: Record<string, () => Promise<any>> = {
	// 2015
	'2015-01': () => import('$lib/data/lisa/lisa_spei_2015_01.js'),
	'2015-02': () => import('$lib/data/lisa/lisa_spei_2015_02.js'),
	'2015-03': () => import('$lib/data/lisa/lisa_spei_2015_03.js'),
	'2015-04': () => import('$lib/data/lisa/lisa_spei_2015_04.js'),
	'2015-05': () => import('$lib/data/lisa/lisa_spei_2015_05.js'),
	'2015-06': () => import('$lib/data/lisa/lisa_spei_2015_06.js'),
	'2015-07': () => import('$lib/data/lisa/lisa_spei_2015_07.js'),
	'2015-08': () => import('$lib/data/lisa/lisa_spei_2015_08.js'),
	'2015-09': () => import('$lib/data/lisa/lisa_spei_2015_09.js'),
	'2015-10': () => import('$lib/data/lisa/lisa_spei_2015_10.js'),
	'2015-11': () => import('$lib/data/lisa/lisa_spei_2015_11.js'),
	'2015-12': () => import('$lib/data/lisa/lisa_spei_2015_12.js'),

	// 2020
	'2020-01': () => import('$lib/data/lisa/lisa_spei_2020_01.js'),
	'2020-02': () => import('$lib/data/lisa/lisa_spei_2020_02.js'),
	'2020-03': () => import('$lib/data/lisa/lisa_spei_2020_03.js'),
	'2020-04': () => import('$lib/data/lisa/lisa_spei_2020_04.js'),
	'2020-05': () => import('$lib/data/lisa/lisa_spei_2020_05.js'),
	'2020-06': () => import('$lib/data/lisa/lisa_spei_2020_06.js'),
	'2020-07': () => import('$lib/data/lisa/lisa_spei_2020_07.js'),
	'2020-08': () => import('$lib/data/lisa/lisa_spei_2020_08.js'),
	'2020-09': () => import('$lib/data/lisa/lisa_spei_2020_09.js'),
	'2020-10': () => import('$lib/data/lisa/lisa_spei_2020_10.js'),
	'2020-11': () => import('$lib/data/lisa/lisa_spei_2020_11.js'),
	'2020-12': () => import('$lib/data/lisa/lisa_spei_2020_12.js')
};

/**
 * Loads and extracts the GeoJSON object from the module.
 */
export async function loadLisaData(year: number, month: number): Promise<any> {
	const key = formatKey(year, month);
	const loader = lisaLoaders[key];

	if (!loader) {
		throw new Error(`LISA loader not found for key: ${key}`);
	}

	const mod = await loader();

	// 1. Direct check: Is default or named 'data' a FeatureCollection?
	if (mod?.default?.type === 'FeatureCollection') return mod.default;
	if (mod?.data?.type === 'FeatureCollection') return mod.data;
	if (mod?.type === 'FeatureCollection') return mod;

	// 2. Scan all exported properties for a FeatureCollection
	// (Matches qgis2web's json_LISA_predictions_SPEI_* variable names)
	for (const prop of Object.values(mod ?? {})) {
		if (prop && typeof prop === 'object' && (prop as any).type === 'FeatureCollection') {
			return prop;
		}
	}

	// 3. Fallback: inspect the default object if it holds nested keys
	if (mod?.default && typeof mod.default === 'object') {
		for (const prop of Object.values(mod.default)) {
			if (prop && typeof prop === 'object' && (prop as any).type === 'FeatureCollection') {
				return prop;
			}
		}
	}

	// If everything failed, log what Vite actually imported so we can see the structure
	console.error(`[loadLisaData] Failed to resolve FeatureCollection for ${key}. Module keys:`, Object.keys(mod ?? {}));
	console.error(`[loadLisaData] Module content:`, mod);

	throw new Error(`Invalid GeoJSON object for ${key}.`);
}