import { resolve } from '$app/paths';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import {
    availableYears,
    continuousDomain as computeContinuousDomain,
    ALL_YEARS,
    type DriFeatureCollection,
    type Domain,
    type IndicatorId
} from '$lib/dri';

export type Basemap = 'satellite' | 'street';

// SPEI Types
export type LayerCategory = 'drought' | 'spei';
export type SpeiSubtype = 'gwr' | 'lisa';
export const VALID_SPEI_YEARS = [2015, 2020] as const;

function cacheKey(indicator: IndicatorId, year: number): string {
    return indicator === 'dhi' ? `dhi:${year}` : indicator;
}

function apiPathFor(indicator: IndicatorId, year: number): string {
    switch (indicator) {
        case 'dri':
            return resolve('/api/dri');
        case 'dei':
            return resolve('/api/dei');
        case 'dvi':
            return resolve('/api/dvi');
        case 'dhi':
            return resolve('/api/dhi/[year]', { year: String(year) });
    }
}

class DroughtState {
    private datasets = new SvelteMap<string, DriFeatureCollection>();
    private loadingKeys = new SvelteSet<string>();
    private errorsByKey = new SvelteMap<string, string>();

    // Mode / Category selection
    category = $state<LayerCategory>('drought');
    speiSubtype = $state<SpeiSubtype>('gwr');

    // Indicator & Time state
    selectedIndicator = $state<IndicatorId>('dri');
    selectedYear = $state(2020);
    selectedMonth = $state(1); // Used by both DHI and SPEI (1 to 12)
    selectedProvinceName = $state<string | null>(null);
    basemap = $state<Basemap>('satellite');

    // Vietnam's new 34-province boundary (2025 merger)
    showNewBoundary = $state(false);
    boundary = $state.raw<DriFeatureCollection | null>(null);
    private boundaryLoading = false;

    // Derived states
    currentKey = $derived(cacheKey(this.selectedIndicator, this.selectedYear));
    currentData = $derived(this.datasets.get(this.currentKey) ?? null);
    loading = $derived(this.loadingKeys.has(this.currentKey));
    error = $derived(this.errorsByKey.get(this.currentKey) ?? null);

    // Dynamic year list based on current category
    years = $derived.by(() => {
        if (this.category === 'spei') return [...VALID_SPEI_YEARS];
        if (this.selectedIndicator === 'dhi') return ALL_YEARS;
        return this.currentData ? availableYears(this.currentData, this.selectedIndicator) : [];
    });

    continuousDomain: Domain | null = $derived(
        this.category === 'drought' && this.selectedIndicator !== 'dri' && this.currentData
            ? computeContinuousDomain(this.currentData, this.selectedIndicator)
            : null
    );

    focusProvince: ((name: string) => void) | null = null;

    // --- State Actions & Transitions ---

    setCategory(cat: LayerCategory) {
        this.category = cat;
        if (cat === 'spei') {
            // Auto-reset year to 2015 if the current year isn't 2015 or 2020
            if (!VALID_SPEI_YEARS.includes(this.selectedYear as any)) {
                this.selectedYear = 2015;
            }
        }
    }

    setSpeiSubtype(sub: SpeiSubtype) {
        this.setCategory('spei');
        this.speiSubtype = sub;
    }

    setDroughtIndicator(indicator: IndicatorId) {
        this.setCategory('drought');
        this.selectedIndicator = indicator;
        this.ensureLoaded(indicator, this.selectedYear);
    }

    setYear(year: number) {
        if (this.category === 'spei' && !VALID_SPEI_YEARS.includes(year as any)) {
            return;
        }
        this.selectedYear = year;
        if (this.category === 'drought') {
            this.ensureLoaded(this.selectedIndicator, year);
        }
    }

    setMonth(month: number) {
        if (month >= 1 && month <= 12) {
            this.selectedMonth = month;
        }
    }

    // --- Data Loaders ---

    async ensureLoaded(indicator: IndicatorId, year: number) {
        const key = cacheKey(indicator, year);
        if (this.datasets.has(key) || this.loadingKeys.has(key)) return;
        this.loadingKeys.add(key);
        try {
            const res = await fetch(apiPathFor(indicator, year));
            if (!res.ok) throw new Error(`Failed to load ${indicator} data (${res.status})`);
            const fc = (await res.json()) as DriFeatureCollection;
            this.datasets.set(key, fc);
            if (this.years.length && !this.years.includes(this.selectedYear)) {
                this.selectedYear = this.years.at(-1)!;
            }
        } catch (err) {
            this.errorsByKey.set(
                key,
                err instanceof Error ? err.message : `Unknown error loading ${indicator}`
            );
        } finally {
            this.loadingKeys.delete(key);
        }
    }

    async loadBoundary() {
        if (this.boundary || this.boundaryLoading) return;
        this.boundaryLoading = true;
        try {
            const res = await fetch(resolve('/api/boundary'));
            if (res.ok) this.boundary = (await res.json()) as DriFeatureCollection;
        } finally {
            this.boundaryLoading = false;
        }
    }
}

export const droughtState = new DroughtState();