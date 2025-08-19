import React, { useState, useCallback } from 'react'
import { DropZone } from './components/DropZone'
import { VerificationResult } from './components/VerificationResult'
import { verifyFiles } from './lib/verifier'
import type { VerificationData } from './types'

function App() {
  const [verification, setVerification] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilesDropped = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)
    setVerification(null)

    try {
      const result = await verifyFiles(files)
      setVerification(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReset = useCallback(() => {
    setVerification(null)
    setError(null)
  }, [])

  return (
    <div className="container">
      <header className="header">
        <h1>🔏 Provenance Passport Viewer</h1>
        <p>
          Drag and drop files to verify their cryptographic provenance.
          Supports C2PA-embedded files and sidecar passports.
        </p>
      </header>

      <main>
        {!verification && !loading && (
          <DropZone onFilesDropped={handleFilesDropped} />
        )}

        {loading && (
          <div className="loading">
            <div className="dropzone">
              <div className="dropzone-icon">⏳</div>
              <h3>Verifying files...</h3>
              <p>Checking for C2PA manifests and sidecar passports</p>
            </div>
          </div>
        )}

        {error && (
          <div className="error">
            <strong>Verification Error:</strong> {error}
            <button 
              onClick={handleReset} 
              style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
            >
              Try Again
            </button>
          </div>
        )}

        {verification && (
          <VerificationResult 
            data={verification} 
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}

export default App