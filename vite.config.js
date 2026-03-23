import { defineConfig } from 'vite'

export default defineConfig({
    // Set base to repo name for aztecbird.github.io/blip-ai/
    base: '/blip-ai/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5173,
        cors: true,
        proxy: {
            '/api/google-calendar': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true
            },
            '/api/gmail': {
                target: 'http://127.0.0.1:8788',
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
