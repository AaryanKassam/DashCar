import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths so the built bundle works from a subdirectory as well as a
  // domain root — static hosts differ on this and the app has no router.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Three.js is by far the largest dependency and changes far less often
        // than the app does. Splitting it out means a code change ships a small
        // chunk instead of invalidating the whole bundle.
        manualChunks(id: string) {
          if (id.includes('node_modules/three/')) return 'three'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
