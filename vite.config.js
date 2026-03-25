import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
    // Set base to repo name for aztecbird.github.io/blip-ai/
    base: '/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5173,
        cors: true,
        // Avoid stale UI when the browser caches dev responses aggressively.
        headers: { 'Cache-Control': 'no-store' },
        proxy: {
            '/api/gemini': {
                target: 'http://127.0.0.1:8793',
                changeOrigin: true
            },
            '/api/google-calendar': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true
            },
            '/api/gmail': {
                target: 'http://127.0.0.1:8788',
                changeOrigin: true
            },
            '/api/telegram': {
                target: 'http://127.0.0.1:8789',
                changeOrigin: true
            },
            '/api/media-actions': {
                target: 'http://127.0.0.1:8791',
                changeOrigin: true
            },
            '/api/openai-image': {
                target: 'http://127.0.0.1:8790',
                changeOrigin: true
            },
            '/api/weather': {
                target: 'http://127.0.0.1:8792',
                changeOrigin: true
            },
            '/api/comfyui': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/comfyui/, ''),
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq) => {
                        proxyReq.removeHeader('origin');
                    });
                }
            }
        }
    }
})
