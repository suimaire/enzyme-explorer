import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from https://suimaire.github.io/enzyme-explorer/, so every asset URL
// needs the repository name as its base. There is no history-API router in this app (module
// navigation is hash-based), so a reload never asks the server for a path that does not exist.
export default defineConfig({
  plugins: [react()],
  base: '/enzyme-explorer/',
  build: {rollupOptions: {output: {manualChunks: (id) => (id.includes('/three/') ? 'three' : undefined)}}},
});
