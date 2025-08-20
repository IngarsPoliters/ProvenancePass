#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'

const BUNDLE_SIZE_LIMIT_KB = 120
const DIST_DIR = 'dist/assets'

function getGzippedSize(filePath) {
  const content = readFileSync(filePath)
  return gzipSync(content).length
}

function analyzeBundle() {
  const files = readdirSync(DIST_DIR).filter(f => f.endsWith('.js'))
  const bundles = {}
  let initialLoadSize = 0
  let totalSize = 0

  for (const file of files) {
    const path = join(DIST_DIR, file)
    const size = getGzippedSize(path)
    const sizeKB = size / 1024
    
    bundles[file] = sizeKB
    totalSize += sizeKB

    // Initial load includes index and vendor chunks
    if (file.startsWith('index-') || file.startsWith('vendor-')) {
      initialLoadSize += sizeKB
    }
  }

  return { bundles, initialLoadSize, totalSize }
}

function main() {
  try {
    const { bundles, initialLoadSize, totalSize } = analyzeBundle()
    
    console.log('📦 Bundle Size Analysis')
    console.log('========================')
    
    Object.entries(bundles).forEach(([file, sizeKB]) => {
      const isLazyChunk = !file.startsWith('index-') && !file.startsWith('vendor-')
      const marker = isLazyChunk ? '🔄' : '⚡'
      console.log(`${marker} ${file}: ${sizeKB.toFixed(2)} KB`)
    })
    
    console.log('========================')
    console.log(`⚡ Initial load: ${initialLoadSize.toFixed(2)} KB`)
    console.log(`📦 Total bundle: ${totalSize.toFixed(2)} KB`)
    console.log(`🎯 Target: < ${BUNDLE_SIZE_LIMIT_KB} KB`)
    
    if (initialLoadSize > BUNDLE_SIZE_LIMIT_KB) {
      console.error(`❌ Initial bundle size ${initialLoadSize.toFixed(2)} KB exceeds limit of ${BUNDLE_SIZE_LIMIT_KB} KB`)
      process.exit(1)
    } else {
      const savings = ((1 - initialLoadSize / BUNDLE_SIZE_LIMIT_KB) * 100).toFixed(1)
      console.log(`✅ Bundle size check passed! ${savings}% under limit`)
    }
  } catch (error) {
    console.error('Failed to analyze bundle:', error)
    process.exit(1)
  }
}

main()