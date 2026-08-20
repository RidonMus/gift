import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://RidonMus.github.io/gift/, so every asset path needs
// the '/gift/' prefix baked in at build time.
export default defineConfig({
  base: '/gift/',
  plugins: [react()],
  server: { host: true },
})