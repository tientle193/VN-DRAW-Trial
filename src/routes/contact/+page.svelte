<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';

	interface TeamMember {
		name: string;
		initials: string;
		affiliation: string;
		department: string;
		address: string;
		email: string;
	}

	// Placeholder details — swap in the real names/affiliations/contacts.
	const teamMembers: TeamMember[] = [
		{
			name: 'Tien Le',
			initials: 'TL',
			affiliation: 'Royal Melbourne Institute of Technology (RMIT) University',
			department: 'School of Science (Geospatial)',
			address: 'RMIT, Melbourne VIC 3000, Australia',
			email: 'tien.le3@rmit.edu.au'
		},
		{
			name: 'Chayn Sun',
			initials: 'CS',
			affiliation: 'Royal Melbourne Institute of Technology (RMIT) University',
			department: 'School of Science (Geospatial)',
			address: 'RMIT, Melbourne VIC 3000, Australia',
			email: 'chayn.sun@rmit.edu.au'
		},
		{
			name: 'Trinh Duc Tran',
			initials: 'TDT',
			affiliation: 'Royal Melbourne Institute of Technology (RMIT) University',
			department: 'School of Science (Geospatial)',
			address: 'RMIT, Melbourne VIC 3000, Australia',
			email: 'ductrinh.tran@rmit.edu.vn'
		},
		{
			name: 'Suelynn Choy',
			initials: 'SC',
			affiliation: 'Royal Melbourne Institute of Technology (RMIT) University',
			department: 'School of Science (Geospatial)',
			address: 'RMIT, Melbourne VIC 3000, Australia',
			email: 'suelynn.choy@rmit.edu.au'
		},
		{
			name: 'Yuriy Kuleshov',
			initials: 'YK',
			affiliation: 'The Australian Bureau of Meteorology',
			department: '',
			address: 'GPO Box 1289, Melbourne VIC 3001',
			email: 'yuriy.kuleshov@bom.gov.au'
		}
	];
</script>

<PageShell title="Contact">
	<section class="block">
		<h2>Contact details</h2>
		<div class="contact-list">
			<div class="contact-entry">
				<span class="role">Corresponding Author</span>
				<span class="name">Tien Le</span>
				<a class="detail" href="mailto:tien.le3@rmit.edu.au">tien.le3@rmit.edu.au</a>
				<span class="detail">RMIT University, School of Science, GPO Box 2476, Melbourne, VIC 3001, Australia</span>
			</div>

			<div class="contact-entry">
				<span class="role">Coordinator</span>
				<span class="name">Trinh Duc Tran</span>
				<a class="detail" href="mailto:ductrinh.tran@rmit.edu.vn">ductrinh.tran@rmit.edu.vn</a>
				<span class="detail">RMIT University, Ho Chi Minh City, Vietnam</span>
			</div>

			<div class="contact-entry">
				<span class="role">Web Design Helper</span>
				<span class="name">Tushen Lan</span>
				<a class="detail" href="mailto:S4137286@student.rmit.edu.au">S4137286@student.rmit.edu.au</a>
				<span class="detail">RMIT University, School of Science, Melbourne, VIC 3001, Australia</span>
			</div>
</div>
	
	</section>
	<section class="block">
		<h2>Research Team</h2>
		<div class="team-grid">
			{#each teamMembers as member (member.name)}
				<div class="team-box">
					<div class="box-square" tabindex="0" role="button" aria-label={member.name}>
						{member.initials}
					</div>
					<span class="box-name">{member.name}</span>
					<div class="tooltip">
						<strong>{member.affiliation}</strong>
						<span>{member.department}</span>
						<span>{member.address}</span>
						<a href="mailto:{member.email}">{member.email}</a>
					</div>
				</div>
			{/each}
		</div>
	</section>
</PageShell>

<style>
	.block + .block {
		margin-top: 2rem;
	}

	h2 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-muted);
		margin: 0 0 1rem;
	}

	.contact-list {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.contact-entry {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.role {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--ink-muted);
	}

	.name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--ink);
	}

	.detail {
		font-size: 0.88rem;
		color: var(--ink-secondary);
		text-decoration: none;
	}

	a.detail:hover {
		text-decoration: underline;
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
		gap: 1.25rem;
	}

	.team-box {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.box-square {
		width: 100%;
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: var(--accent);
		color: white;
		font-size: 1.3rem;
		font-weight: 700;
		cursor: default;
		transition: transform 0.15s ease;
	}

	.team-box:hover .box-square {
		transform: translateY(-2px);
	}

	.box-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink);
	}

	.tooltip {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%) translateY(4px);
		width: 220px;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: var(--surface);
		color: var(--ink);
		border-radius: 10px;
		box-shadow: var(--shadow);
		padding: 0.75rem 0.85rem;
		font-size: 0.78rem;
		text-align: left;
		z-index: 10;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	.tooltip strong {
		font-size: 0.85rem;
	}

	.tooltip span {
		color: var(--ink-secondary);
	}

	.tooltip a {
		color: var(--accent);
		text-decoration: none;
	}

	.tooltip a:hover {
		text-decoration: underline;
	}

	.team-box:hover .tooltip,
	.team-box:focus-within .tooltip {
		opacity: 1;
		visibility: visible;
		transform: translateX(-50%) translateY(0);
	}
</style>
