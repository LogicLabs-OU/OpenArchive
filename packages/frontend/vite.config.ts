import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: Number(process.env.PORT_FRONTEND) || 3000,
		proxy: {
			'/api': {
				target: `http://localhost:${process.env.PORT_BACKEND || 4000}`,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			}
		}
	},
	ssr: {
		noExternal: ['layerchart']
	}
});
