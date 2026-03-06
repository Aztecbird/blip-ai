import { defineConfig } from 'vite'

export default defineConfig({
    // Set base to repo name for aztecbird.github.io/blip-ai/
    base: '/blip-ai/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5173,
        cors: true
    }
})
