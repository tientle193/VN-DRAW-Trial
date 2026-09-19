import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// GitHub Pages serves this repo at https://github.com/tientle193/VN-DRAW-Trial, so
// production builds need that path prefixed onto every route/asset. Local
// dev/preview stay at the root. The deploy workflow sets BASE_PATH.
const rawBase = process.env.BASE_PATH ?? '/VN-DRAW-Trial';
if (rawBase !== '' && !rawBase.startsWith('/')) {
	throw new Error(`BASE_PATH must start with "/", got "${rawBase}"`);
}
const base = rawBase as '' | `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// The whole app is prerendered to static HTML/JSON for GitHub Pages
			// (see src/routes/+layout.ts), so adapter-static's default fully-static
			// output mode applies — no SPA fallback needed.
			adapter: adapter(),
			paths: { base }
		})
	]
});
