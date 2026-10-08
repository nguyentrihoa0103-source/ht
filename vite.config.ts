import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { handleApiPhp } from './src/server/mockApiHandler';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-php-sync-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            try {
              const handled = await handleApiPhp(req, res);
              if (!handled) {
                next();
              }
            } catch (err) {
              console.error('API php middleware error:', err);
              next();
            }
          });
        },
      },
    ],
    define: {
      __APP_BUILD_ID__: JSON.stringify(Date.now().toString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 10000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/jszip/') || id.includes('node_modules/canvas-confetti/')) {
              return 'vendor-utils';
            }
            if (id.includes('src/data/initialComicsData')) {
              return 'initial-comics-data';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          /data_store\.json/,
          /initialDataStore\.json/,
          /leesin_teams_crawled\.json/,
          /\.sql(\.gz)?$/,
          '**/*data_store*.json*',
          '**/leesin_teams_crawled.json',
          '**/*.sql',
          '**/*.sql.gz',
        ],
      },
    },
  };
});
