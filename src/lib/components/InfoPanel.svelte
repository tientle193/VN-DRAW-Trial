<script lang="ts">
    import { droughtState } from '$lib/state/drought-state.svelte';
    import {
        INDICATORS,
        indicatorValue,
        riskInfoFor,
        driRiskClasses,
        continuousStops,
        type IndicatorId
    } from '$lib/dri';
    import { resolve } from '$app/paths';

    const isSpei = $derived(droughtState.category === 'spei');
    const speiSubtype = $derived(droughtState.speiSubtype);

    const indicator = $derived(droughtState.selectedIndicator);
    const indicatorLabel = $derived(
        INDICATORS.find((ind) => ind.id === indicator)?.label ?? indicator.toUpperCase()
    );
    const isContinuous = $derived(indicator !== 'dri');
    const domain = $derived(droughtState.continuousDomain);
    const isMonthly = $derived(indicator === 'dhi');
    const periodLabel = $derived(
        isMonthly || isSpei
            ? `${String(droughtState.selectedMonth).padStart(2, '0')}/${droughtState.selectedYear}`
            : `${droughtState.selectedYear}`
    );

    // Anselin LISA standard color items
    const lisaItems = [
        { label: 'High-High (Hotspot)', color: '#e31a1c' },
        { label: 'Low-High Outlier', color: '#a6cee3' },
        { label: 'High-Low Outlier', color: '#fb9a99' },
        { label: 'Low-Low (Coldspot)', color: '#1f78b4' },
        { label: 'Not Significant', color: '#b4b9be' }
    ];

    // The selected province is just a name (droughtState.selectedProvinceName),
    // carried across indicator switches — look its properties up fresh in
    // whichever dataset is currently active, since each indicator has its own
    // FeatureCollection (and DHI has one per year on top of that).
    const province = $derived.by(() => {
        if (isSpei) return null;
        const name = droughtState.selectedProvinceName;
        const fc = droughtState.currentData;
        if (!name || !fc) return null;
        return fc.features.find((f) => f.properties.ADM1_EN === name)?.properties ?? null;
    });

    const currentValue = $derived(
        province
            ? indicatorValue(province, indicator, droughtState.selectedYear, droughtState.selectedMonth)
            : null
    );
    const currentRisk = $derived(riskInfoFor(currentValue, indicator, domain));

    const trend = $derived.by(() => {
        if (!province || isSpei) return [];
        return droughtState.years.map((year) => ({
            year,
            value: indicatorValue(province, indicator, year, droughtState.selectedMonth)
        }));
    });

    const geoJsonHref = $derived.by(() => {
        if (isSpei) return null;
        if (indicator === 'dhi')
            return resolve('/api/dhi/[year]', { year: String(droughtState.selectedYear) });
        const paths: Record<Exclude<IndicatorId, 'dhi'>, string> = {
            dri: resolve('/api/dri'),
            dei: resolve('/api/dei'),
            dvi: resolve('/api/dvi')
        };
        return paths[indicator];
    });

    const csvHref = $derived.by(() => {
        if (isSpei || indicator === 'dhi') return null;
        const paths: Record<Exclude<IndicatorId, 'dhi'>, string> = {
            dri: resolve('/api/downloads/dri-csv'),
            dei: resolve('/api/downloads/dei-csv'),
            dvi: resolve('/api/downloads/dvi-csv')
        };
        return paths[indicator];
    });

    function rangeLabel(min: number, max: number): string {
        if (min === -Infinity) return `< ${max.toFixed(2)}`;
        if (max === Infinity) return `≥ ${min.toFixed(2)}`;
        return `${min.toFixed(2)} – ${max.toFixed(2)}`;
    }

    // Chart geometry: fixed 240x112 viewBox, plot area x:[20,220] y:[15,75].
    const PLOT_X0 = 20;
    const PLOT_X1 = 220;
    const PLOT_Y0 = 15; // top of plot area
    const PLOT_Y1 = 75; // bottom of plot area

    function xFor(i: number, n: number): number {
        return n <= 1 ? PLOT_X0 : PLOT_X0 + (i * (PLOT_X1 - PLOT_X0)) / (n - 1);
    }

    const trendDomain = $derived.by(() => {
        const values = trend.map((p) => p.value).filter((v): v is number => v != null);
        if (values.length === 0) return { min: 0, max: 1 };
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const pad = Math.max((dataMax - dataMin) * 0.25, 0.03);
        return { min: dataMin - pad, max: dataMax + pad };
    });

    function yFor(value: number): number {
        const { min, max } = trendDomain;
        const span = max - min || 1;
        return PLOT_Y1 - ((value - min) / span) * (PLOT_Y1 - PLOT_Y0);
    }

    const visibleBoundaries = $derived(
        !isSpei && indicator === 'dri'
            ? driRiskClasses()
                    .slice(1)
                    .map((c) => c.min)
                    .filter((b) => b > trendDomain.min && b < trendDomain.max)
            : []
    );

    const linePoints = $derived(
        trend
            .map((p, i) => (p.value == null ? null : `${xFor(i, trend.length)},${yFor(p.value)}`))
            .filter((v): v is string => v != null)
            .join(' ')
    );
</script>

<aside class="panel info-panel">
    <section>
        <h2>Legend</h2>

        {#if isSpei}
            {#if speiSubtype === 'gwr'}
                <p class="legend-title">GWR Downscaled SPEI ({periodLabel})</p>
                <div class="spei-bar"></div>
                <div class="gradient-labels">
                    <span>&le; -2.0</span>
                    <span>-1.0</span>
                    <span>0.0</span>
                    <span>+1.0</span>
                    <span>&ge; +2.0</span>
                </div>
                <div class="scale-descriptors">
                    <span class="dry-tag">Severe Drought</span>
                    <span class="mid-tag">Normal</span>
                    <span class="wet-tag">Extreme Wet</span>
                </div>
            {:else}
                <p class="legend-title">LISA SPEI Clusters ({periodLabel})</p>
                <div class="legend-list">
                    {#each lisaItems as item}
                        <div class="legend-row">
                            <span class="cluster-dot" style:background={item.color}></span>
                            <span class="legend-label">{item.label}</span>
                        </div>
                    {/each}
                </div>
            {/if}
        {:else}
            <p class="legend-title">{indicatorLabel}</p>
            {#if !isContinuous}
                <div class="legend-list">
                    {#each driRiskClasses() as risk (risk.label)}
                        <div class="legend-row">
                            <span class="swatch" style:background={risk.color}></span>
                            <span class="legend-label">{risk.label}</span>
                            <span class="legend-range">{rangeLabel(risk.min, risk.max)}</span>
                        </div>
                    {/each}
                </div>
            {:else if domain}
                <div
                    class="gradient-bar"
                    style:background="linear-gradient(to right, {continuousStops().join(', ')})"
                ></div>
                <div class="gradient-labels">
                    <span>{domain.min.toFixed(2)} (Low)</span>
                    <span>{domain.max.toFixed(2)} (High)</span>
                </div>
            {:else}
                <p class="pending-note">Loading data to compute the color scale…</p>
            {/if}
        {/if}
    </section>

    {#if !isSpei}
        <section>
            <h2>Province information</h2>
            {#if province}
                <div class="province-row">
                    <span class="province-name">{province.ADM1_EN}</span>
                </div>
                <div class="stat-row">
                    <span>{indicator.toUpperCase()} ({periodLabel})</span>
                    <span class="stat-value" style:color={currentRisk?.color}>
                        {currentValue != null ? currentValue.toFixed(2) : '—'}
                        {#if currentRisk}
                            <span class="risk-badge" style:background={currentRisk.color}>
                                {currentRisk.label}
                            </span>
                        {/if}
                    </span>
                </div>

                {#if trend.length}
                    <p class="chart-title">{indicator.toUpperCase()} trend ({province.ADM1_EN})</p>
                    <svg
                        class="trend-chart"
                        viewBox="0 0 240 112"
                        role="img"
                        aria-label="{indicator.toUpperCase()} trend by year"
                    >
                        <line x1={PLOT_X0} y1={PLOT_Y1} x2={PLOT_X1} y2={PLOT_Y1} class="axis-line" />
                        {#each visibleBoundaries as boundary (boundary)}
                            <line
                                x1={PLOT_X0}
                                y1={yFor(boundary)}
                                x2={PLOT_X1}
                                y2={yFor(boundary)}
                                class="grid-line"
                            />
                        {/each}
                        {#if linePoints}
                            <polyline points={linePoints} class="trend-line" />
                        {/if}
                        {#each trend as p, i (p.year)}
                            {#if p.value != null}
                                {@const risk = riskInfoFor(p.value, indicator, domain)}
                                {@const isSelected = p.year === droughtState.selectedYear}
                                <text
                                    x={xFor(i, trend.length)}
                                    y={yFor(p.value) - 8}
                                    class="value-label"
                                    text-anchor="middle"
                                >
                                    {p.value.toFixed(2)}
                                </text>
                                <circle
                                    cx={xFor(i, trend.length)}
                                    cy={yFor(p.value)}
                                    r={isSelected ? 5.5 : 4}
                                    fill={risk?.color ?? '#999'}
                                    class="trend-dot"
                                    class:selected={isSelected}
                                >
                                    <title>{p.year}: {p.value.toFixed(2)} ({risk?.label})</title>
                                </circle>
                            {/if}
                            <text x={xFor(i, trend.length)} y={PLOT_Y1 + 14} class="year-label" text-anchor="middle">
                                {p.year}
                            </text>
                        {/each}
                    </svg>
                {/if}
            {:else}
                <p class="empty-hint">Click a province on the map to see its details.</p>
            {/if}
        </section>
    {/if}

    <section>
        <h2>Download data</h2>
        <div class="download-row">
            <!-- eslint-disable svelte/no-navigation-without-resolve -->
            {#if geoJsonHref}
                <a
                    class="download-btn geojson"
                    href={geoJsonHref}
                    download="VN-DRAW_{indicator.toUpperCase()}.geojson">GeoJSON</a
                >
            {:else}
                <span class="download-btn disabled" title="Available for Provincial DRI Indicators">GeoJSON</span>
            {/if}

            {#if csvHref}
                <a class="download-btn csv" href={csvHref} download>CSV</a>
            {:else}
                <span class="download-btn disabled" title="Not available for this layer">CSV</span>
            {/if}
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
            <span class="download-btn disabled" title="Not yet available">Metadata (PDF)</span>
        </div>
    </section>
</aside>

<style>
    .panel {
        background: var(--surface-2);
        color: var(--ink);
        border-radius: var(--radius);
    }

    .info-panel {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        overflow-y: auto;
    }

    h2 {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ink-muted);
        margin: 0 0 0.5rem;
    }

    .legend-title {
        font-size: 0.85rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
    }

    .legend-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .pending-note {
        font-size: 0.78rem;
        color: var(--ink-muted);
        background: var(--surface);
        padding: 0.6rem;
        border-radius: 8px;
        margin: 0;
    }

    .gradient-bar {
        height: 14px;
        border-radius: 999px;
    }

    .spei-bar {
        height: 14px;
        width: 100%;
        border-radius: 999px;
        background: linear-gradient(to right, #d7191c, #fdae61, #ffffbf, #abd9e9, #2c7bb6);
    }

    .gradient-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--ink-muted);
        margin-top: 0.3rem;
        font-variant-numeric: tabular-nums;
    }

    .scale-descriptors {
        display: flex;
        justify-content: space-between;
        font-size: 0.68rem;
        font-weight: 600;
        margin-top: 0.2rem;
    }

    .dry-tag {
        color: #b91c1c;
    }
    .mid-tag {
        color: var(--ink-muted);
    }
    .wet-tag {
        color: #1d4ed8;
    }

    .legend-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.82rem;
    }

    .cluster-dot {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .swatch {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .legend-label {
        flex: 1;
    }

    .legend-range {
        color: var(--ink-muted);
        font-variant-numeric: tabular-nums;
    }

    .province-name {
        font-weight: 700;
        font-size: 1rem;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
        margin-top: 0.5rem;
    }

    .stat-value {
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .risk-badge {
        color: white;
        font-size: 0.68rem;
        font-weight: 600;
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
    }

    .chart-title {
        font-size: 0.78rem;
        color: var(--ink-muted);
        margin: 0.9rem 0 0.2rem;
    }

    .trend-chart {
        width: 100%;
        height: auto;
    }

    .axis-line {
        stroke: var(--border);
        stroke-width: 1;
    }

    .grid-line {
        stroke: var(--border);
        stroke-width: 1;
        stroke-dasharray: 2 3;
    }

    .trend-line {
        fill: none;
        stroke: var(--ink-secondary);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .trend-dot {
        stroke: var(--surface-2);
        stroke-width: 1.5;
    }

    .trend-dot.selected {
        stroke: var(--accent);
        stroke-width: 2;
    }

    .value-label {
        font-size: 7.5px;
        fill: var(--ink-muted);
    }

    .year-label {
        font-size: 7.5px;
        fill: var(--ink-muted);
    }

    .empty-hint {
        font-size: 0.82rem;
        color: var(--ink-muted);
        margin: 0;
    }

    .download-row {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .download-btn {
        text-align: center;
        font-size: 0.82rem;
        font-weight: 600;
        padding: 0.45rem;
        border-radius: 6px;
        text-decoration: none;
        color: white;
    }

    .download-btn.geojson {
        background: #16a34a;
    }

    .download-btn.csv {
        background: #2563eb;
    }

    .download-btn.disabled {
        background: var(--surface);
        color: var(--ink-muted);
        cursor: not-allowed;
    }
</style>