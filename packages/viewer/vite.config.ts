import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

// Copy C2PA WASM files to public directory
const copyC2paAssets = () => {
  const publicDir = resolve(__dirname, 'public')
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true })
  }
  
  try {
    // Copy WASM file
    copyFileSync(
      resolve(__dirname, 'node_modules/c2pa/dist/assets/wasm/toolkit_bg.wasm'),
      resolve(publicDir, 'c2pa.wasm')
    )
    
    // Copy worker file
    copyFileSync(
      resolve(__dirname, 'node_modules/c2pa/dist/c2pa.worker.min.js'),
      resolve(publicDir, 'c2pa.worker.js')
    )
    
    console.log('✅ C2PA assets copied to public directory')
  } catch (error) {
    console.warn('⚠️  Failed to copy C2PA assets:', error)
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-c2pa-assets',
      buildStart() {
        copyC2paAssets()
      }
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // Note: c2pa will be lazy loaded, so removed from manual chunks
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Enable advanced minification using esbuild (faster than terser)
    minify: 'esbuild',
    // Report bundle size
    reportCompressedSize: true,
    chunkSizeWarningLimit: 100
  },
  define: {
    // Provide default revocation URL if not set
    'process.env.REVOCATIONS_URL': JSON.stringify(
      process.env.REVOCATIONS_URL || 
      'https://data.provenancepass.com/revocations.json'
    )
  },
  server: {
    port: 3000,
    fs: {
      // Allow serving files from one level up
      allow: ['..']
    }
  },
  optimizeDeps: {
    exclude: ['c2pa']
  }
})