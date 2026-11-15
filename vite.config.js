import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In `npm run dev` the /api/proxy function is served by this middleware,
// on Vercel it is the real serverless function in /api/proxy.js
const devProxy = () => ({
  name: 'dev-proxy',
  configureServer(server) {
    server.middlewares.use('/api/proxy', async (req, res) => {
      const { default: handler } = await import('./api/proxy.js');
      await handler(req, res);
    });
  },
});

export default defineConfig({ plugins: [react(), devProxy()] });
