<script lang="ts">
	import FrameworkDiagram from '$lib/components/FrameworkDiagram.svelte';
</script>

<div class="home">
	<h1>VN-DRAW</h1>
	<p class="lede">
		VN-DRAW (Vietnam Drought Risk Assessment and Warning) is a web-based portal developed to provide accessible information on drought risk assessment and early warning in Vietnam, 
		supporting decision-making for drought risk adaptation, particularly in the agricultural sector. The portal visualises the Drought Risk Index (DRI) for each administrative unit 
		at the provincial scale, based on the research findings of the RMIT research team. VN-DRAW is developed as part of the EIP Strategic Impact Fund 2026, to translate research outcomes 
		into an accessible tool for stakeholders and support more informed, spatially targeted drought adaptation and management.
	</p>
	
	<h2 class="section-title">KEY VALUES</h2>
	<FrameworkDiagram />
</div>

<style>
	.home {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 3rem;
	}

	h1 {
		font-size: 1.7rem;
		margin: 0 0 0.5rem;
		color: var(--ink);
	}

	.lede {
		color: var(--ink-secondary);
		margin: 0 0 1.5rem;
		max-width: 840px;
		max-width: 100%;
		line-height: 1.6;
		text-align: justify;
	}
</style>
