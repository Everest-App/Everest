import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: 'src/renderer',
    base: './',
    build: {
        outDir: '../../dist/renderer',
        emptyOutDir: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.debug'],
            },
            format: {
                comments: false,
            },
        },
        sourcemap: false,
        cssMinify: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                        return 'react';
                    }
                    if (id.includes('node_modules/zustand')) {
                        return 'zustand';
                    }
                },
            },
        },
        chunkSizeWarningLimit: 500,
    },
    resolve: {
        alias: {
            '@renderer': path.resolve(__dirname, 'src/renderer'),
        },
        dedupe: ['react', 'react-dom'],
        // Ensure Vite follows symlinks in npm workspaces
        preserveSymlinks: false,
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    // Explicitly include the workspace package so Vite pre-bundles it
    optimizeDeps: {
        include: ['@api-platform/core'],
    },
});
