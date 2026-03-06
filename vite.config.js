import { defineConfig } from 'vite'

export default defineConfig({
    // Set base to repo name if deploying to https://<USER>.github.io/<REPO>/
    // Change 'blip-ai' to your actual repository name
    base: './',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5173,
        cors: true
    }
})
