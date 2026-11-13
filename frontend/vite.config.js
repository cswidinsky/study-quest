import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // During `npm run dev`, any request to /api is forwarded to the Flask server.
    // The browser only ever talks to the Vite server, so there's no cross-origin (CORS) problem.
    // Start Flask first: python -m flask --app backend.app run
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})