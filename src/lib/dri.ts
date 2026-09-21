export interface DriProperties {
	ADM1_EN: string;
	ADM1_VI: string;
	[key: string]: unknown;
}

export type DriFeature = GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, DriProperties>;
export type DriFeatureCollection = GeoJSON.FeatureCollection<
	GeoJSON.MultiPolygon | GeoJSON.Polygon,
	DriProperties
>;

export type IndicatorId = 'dri' | 'dhi' | 'dei' | 'dvi';

export const ALL_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

export interface IndicatorDef {
	id: IndicatorId;
	label: string;
	monthly: boolean;
	fieldFor: (year: number, month?: number) => string;
}

export const INDICATORS: IndicatorDef[] = [
	{
		id: 'dri',
		label: 'Drought Risk (DRI)',
		monthly: false,
		fieldFor: (year) => `Constant_yearlyDRI15to22_DRI${year}`
	},
	{
		id: 'dhi',
		label: 'Drought Hazard (DHI)',
		monthly: true,
		fieldFor: (year, month) => `DHI${year}_DHI${year}${String(month ?? 12).padStart(2, '0')}`
	},
	{
		id: 'dei',
		label: 'Drought Exposure (DEI)',
		monthly: false,
		fieldFor: (year) => `DEI15to22_EW_DEI_${year}`
	},
	{
		id: 'dvi',
		label: 'Drought Vulnerability (DVI)',
		monthly: false,
		fieldFor: (year) => `DVI15to22_PCA_DVI_${year}`
	}
];

const INDICATOR_BY_ID: Record<IndicatorId, IndicatorDef> = Object.fromEntries(
	INDICATORS.map((ind) => [ind.id, ind])
) as Record<IndicatorId, IndicatorDef>;

export function indicatorField(indicator: IndicatorId, year: number, month?: number): string {
	return INDICATOR_BY_ID[indicator].fieldFor(year, month);
}

export function indicatorValue(
	props: DriProperties,
	indicator: IndicatorId,
	year: number,
	month?: number
): number | null {
	if (!props) return null;

	// 1. Direct key lookup from indicator definition
	const primary = indicatorField(indicator, year, month);
	if (typeof props[primary] === 'number') return props[primary] as number;

	const mm = String(month ?? 1).padStart(2, '0');
	const m = String(month ?? 1);

	// 2. Resilient candidates based on typical QGIS naming patterns
	const candidates: string[] = [];
	if (indicator === 'dhi') {
		candidates.push(
			`DHI${year}_DHI${year}${mm}`,
			`DHI_${year}_${mm}`,
			`DHI${year}_${mm}`,
			`DHI_${year}_${m}`,
			`DHI${year}${mm}`,
			`DHI_${mm}`,
			`DHI${mm}`,
			`dhi_${year}_${mm}`,
			`dhi_${mm}`
		);
	} else if (indicator === 'dei') {
		candidates.push(
			`DEI15to22_EW_DEI_${year}`,
			`DEI_${year}`,
			`DEI${year}`,
			`dei_${year}`
		);
	} else if (indicator === 'dvi') {
		candidates.push(
			`DVI15to22_PCA_DVI_${year}`,
			`DVI_${year}`,
			`DVI${year}`,
			`dvi_${year}`
		);
	} else if (indicator === 'dri') {
		candidates.push(
			`Constant_yearlyDRI15to22_DRI${year}`,
			`DRI_${year}`,
			`DRI${year}`,
			`dri_${year}`
		);
	}

	for (const key of candidates) {
		if (typeof props[key] === 'number') return props[key] as number;
	}

	// 3. Fallback: scan property keys case-insensitively
	const targetEnd = indicator === 'dhi' ? `${year}${mm}` : `${year}`;
	const altEnd = indicator === 'dhi' ? `${mm}` : `${year}`;
	const prefix = indicator.toLowerCase();

	for (const [k, val] of Object.entries(props)) {
		if (typeof val !== 'number') continue;
		const lower = k.toLowerCase();
		if (lower.startsWith(prefix) && (lower.endsWith(targetEnd) || lower.endsWith(altEnd))) {
			return val;
		}
	}

	return null;
}

export function availableYears(fc: DriFeatureCollection, indicator: IndicatorId): number[] {
	return ALL_YEARS.filter((year) =>
		fc.features.some((f) => indicatorValue(f.properties, indicator, year) != null)
	);
}

export interface RiskClass {
	label: string;
	color: string;
	min: number;
	max: number;
}

const DRI_CLASSES: RiskClass[] = [
	{ label: 'Very Low', color: '#1a9641', min: -Infinity, max: 0.3 },
	{ label: 'Low', color: '#a6d96a', min: 0.3, max: 0.4 },
	{ label: 'Moderate', color: '#ffffc0', min: 0.4, max: 0.5 },
	{ label: 'High', color: '#fdae61', min: 0.5, max: 0.6 },
	{ label: 'Very High', color: '#d7191c', min: 0.6, max: Infinity }
];

export function riskClassFor(value: number | null): RiskClass | null {
	if (value == null) return null;
	return (
		DRI_CLASSES.find((c) => value >= c.min && value < c.max) ?? DRI_CLASSES[DRI_CLASSES.length - 1]
	);
}

export function driRiskClasses(): RiskClass[] {
	return DRI_CLASSES;
}

const CONTINUOUS_STOPS = ['#1a9641', '#a6d96a', '#ffffc0', '#fdae61', '#d7191c'];

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b);
	const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
	return (
		'#' +
		[mix(ar, br), mix(ag, bg), mix(ab, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')
	);
}

export function continuousColor(t: number): string {
	const clamped = Math.min(1, Math.max(0, t));
	const segments = CONTINUOUS_STOPS.length - 1;
	const scaled = clamped * segments;
	const i = Math.min(segments - 1, Math.floor(scaled));
	return mixHex(CONTINUOUS_STOPS[i], CONTINUOUS_STOPS[i + 1], scaled - i);
}

export function continuousStops(): string[] {
	return CONTINUOUS_STOPS;
}

const RELATIVE_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

export function relativeLabel(t: number): string {
	return RELATIVE_LABELS[Math.min(4, Math.floor(Math.min(1, Math.max(0, t)) * 5))];
}

export interface Domain {
	min: number;
	max: number;
}

export function continuousDomain(
	fc: DriFeatureCollection,
	indicator: IndicatorId,
	currentYear: number
): Domain {
	let min = Infinity;
	let max = -Infinity;

	for (const f of fc.features) {
		if (indicator === 'dhi') {
			for (let m = 1; m <= 12; m++) {
				const val = indicatorValue(f.properties, indicator, currentYear, m);
				if (val != null) {
					if (val < min) min = val;
					if (val > max) max = val;
				}
			}
		} else {
			for (const y of ALL_YEARS) {
				const val = indicatorValue(f.properties, indicator, y);
				if (val != null) {
					if (val < min) min = val;
					if (val > max) max = val;
				}
			}
		}
	}

	if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
		return { min, max };
	}
	return { min: 0, max: 1 };
}

export interface RiskInfo {
	color: string;
	label: string;
}

export function riskInfoFor(
	value: number | null,
	indicator: IndicatorId,
	domain: Domain | null
): RiskInfo | null {
	if (value == null) return null;
	if (indicator === 'dri') {
		const cls = riskClassFor(value);
		return cls ? { color: cls.color, label: cls.label } : null;
	}
	if (!domain) return null;
	const span = domain.max - domain.min || 1;
	const t = (value - domain.min) / span;
	return { color: continuousColor(t), label: relativeLabel(t) };
}