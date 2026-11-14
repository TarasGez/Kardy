import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/kardy-192.png', 'icons/kardy-512.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Kardy',
        short_name: 'Kardy',
        description: 'Особисті картки лояльності — завжди під рукою',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f6f2',
        theme_color: '#f7f6f2',
        icons: [
          { src: '/icons/kardy-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/kardy-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/kardy-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
});
