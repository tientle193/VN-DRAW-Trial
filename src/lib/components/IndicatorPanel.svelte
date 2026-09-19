<script lang="ts">
    import { droughtState, type Basemap } from '$lib/state/drought-state.svelte';
    import { INDICATORS } from '$lib/dri';

    const NOTES: Record<string, string> = {
        dri: 'DRI is the composite of Hazard, Exposure and Vulnerability.',
        dhi: 'DHI is monthly — pick a year below and a month here.',
        dei: 'DEI reflects exposure of agricultural land and population to drought.',
        dvi: 'DVI reflects socio-economic vulnerability to drought impacts.',
        spei_gwr: 'GWR SPEI shows downscaled high-resolution raster predictions for Vietnam.',
        spei_lisa: 'LISA SPEI displays local spatial autocorrelation clusters and outliers.'
    };

    const note = $derived(
        droughtState.category === 'spei'
            ? NOTES[`spei_${droughtState.speiSubtype}`]
            : NOTES[droughtState.selectedIndicator]
    );
</script>

<aside class="panel indicator-panel">
    <section>
        <h2><span class="icon">☰</span> Indicators</h2>
        <div class="indicator-list" role="radiogroup" aria-label="Indicator">
            {#each INDICATORS as ind (ind.id)}
                <label class="radio-row">
                    <input
                        type="radio"
                        name="indicator"
                        checked={droughtState.category === 'drought' && ind.id === droughtState.selectedIndicator}
                        onchange={() => droughtState.setDroughtIndicator(ind.id)}
                    />
                    {ind.label}
                </label>
            {/each}

            <!-- SPEI Indicator Section -->
            <div class="spei-group">
                <label class="radio-row spei-parent">
                    <input
                        type="radio"
                        name="indicator"
                        checked={droughtState.category === 'spei'}
                        onchange={() => droughtState.setCategory('spei')}
                    />
                    <span class="spei-title">SPEI (Vietnam)</span>
                </label>

                {#if droughtState.category === 'spei'}
                    <div class="sub-indicator-list">
                        <label class="radio-row sub-row">
                            <input
                                type="radio"
                                name="spei-subtype"
                                checked={droughtState.speiSubtype === 'gwr'}
                                onchange={() => droughtState.setSpeiSubtype('gwr')}
                            />
                            GWR_SPEI (Raster)
                        </label>
                        <label class="radio-row sub-row">
                            <input
                                type="radio"
                                name="spei-subtype"
                                checked={droughtState.speiSubtype === 'lisa'}
                                onchange={() => droughtState.setSpeiSubtype('lisa')}
                            />
                            LISA_SPEI (Vector)
                        </label>
                    </div>
                {/if}
            </div>
        </div>
    </section>

    <section>
        <h2><span class="icon">📅</span> Year</h2>
        {#if droughtState.years.length}
            <input
                type="range"
                min={0}
                max={droughtState.years.length - 1}
                step={1}
                value={Math.max(0, droughtState.years.indexOf(droughtState.selectedYear))}
                oninput={(e) =>
                    droughtState.setYear(droughtState.years[Number(e.currentTarget.value)])}
            />
            <div class="year-ticks">
                {#each droughtState.years as year (year)}
                    <button
                        type="button"
                        class="year-tick"
                        class:active={year === droughtState.selectedYear}
                        onclick={() => droughtState.setYear(year)}
                    >
                        {year}
                    </button>
                {/each}
            </div>
        {/if}
    </section>

    <!-- Month dropdown shown for either DHI or SPEI -->
    {#if droughtState.category === 'spei' || droughtState.selectedIndicator === 'dhi'}
        <section>
            <h2><span class="icon">📆</span> Month</h2>
            <select
                value={droughtState.selectedMonth}
                onchange={(e) => droughtState.setMonth(Number(e.currentTarget.value))}
            >
                {#each Array.from({ length: 12 }, (_, i) => i + 1) as m (m)}
                    <option value={m}>Month {String(m).padStart(2, '0')}</option>
                {/each}
            </select>
        </section>
    {/if}

    <section>
        <h2><span class="icon">🗺</span> Basemap</h2>
        <select
            value={droughtState.basemap}
            onchange={(e) => (droughtState.basemap = e.currentTarget.value as Basemap)}
        >
            <option value="satellite">Satellite</option>
            <option value="street">Street</option>
        </select>
    </section>

    <section>
        <h2><span class="icon">📍</span> Boundaries</h2>
        <label class="checkbox-row">
            <input type="checkbox" bind:checked={droughtState.showNewBoundary} />
            New provincial boundaries (2025)
        </label>
    </section>

    <p class="note">{note}</p>
</aside>

<style>
    .panel {
        background: var(--surface-2);
        color: var(--ink);
        border-radius: var(--radius);
    }

    .indicator-panel {
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
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .icon {
        font-size: 0.9em;
    }

    .indicator-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .radio-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.88rem;
        cursor: pointer;
    }

    /* SPEI Sub-hierarchy Styling */
    .spei-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-top: 0.2rem;
        padding-top: 0.4rem;
        border-top: 1px dashed var(--border);
    }

    .spei-title {
        font-weight: 600;
    }

    .sub-indicator-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        padding-left: 1.4rem;
        margin-top: 0.1rem;
    }

    .sub-row {
        font-size: 0.82rem;
        color: var(--ink-muted);
    }

    .checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        cursor: pointer;
    }

    input[type='range'] {
        width: 100%;
        accent-color: var(--accent);
    }

    .year-ticks {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin-top: 0.5rem;
    }

    .year-tick {
        font-size: 0.75rem;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--ink-muted);
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        cursor: pointer;
    }

    .year-tick.active {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
        font-weight: 600;
    }

    select {
        width: 100%;
        padding: 0.4rem 0.5rem;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--ink);
        font-size: 0.85rem;
    }

    .note {
        font-size: 0.75rem;
        color: var(--ink-muted);
        background: var(--surface);
        padding: 0.6rem;
        border-radius: 8px;
        margin: 0;
    }
</style>