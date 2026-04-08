import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@model': resolve(__dirname, './src/model'),
            '@engine': resolve(__dirname, './src/engine'),
            '@audio': resolve(__dirname, './src/audio'),
            '@parsers': resolve(__dirname, './src/parsers'),
            '@stores': resolve(__dirname, './src/stores'),
            '@components': resolve(__dirname, './src/components'),
            '@utils': resolve(__dirname, './src/utils'),
        },
    },
    server: {
        port: 5173,
    },
    build: {
        target: 'es2022',
        sourcemap: true,
    },
});
