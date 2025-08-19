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

  const handleAutoloadSample = useCallback(async () => {
    setLoading(true)
    setError(null)
    setVerification(null)

    try {
      // Fetch the sample file and its passport
      const [fileResponse, passportResponse] = await Promise.all([
        fetch('https://data.provenancepass.com/samples/pass/sidecar/document.txt'),
        fetch('https://data.provenancepass.com/samples/pass/sidecar/document.txt.passport.json')
      ])

      if (!fileResponse.ok || !passportResponse.ok) {
        throw new Error('Failed to fetch sample files')
      }

      const [fileBlob, passportBlob] = await Promise.all([
        fileResponse.blob(),
        passportResponse.blob()
      ])

      // Create File objects to simulate user drop
      const files = [
        new File([fileBlob], 'document.txt', { type: 'text/plain' }),
        new File([passportBlob], 'document.txt.passport.json', { type: 'application/json' })
      ]

      const result = await verifyFiles(files)
      setVerification(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="container">
      <header className="header">
        <h1>🔏 Provenance Passport Viewer</h1>
        <p>
          Drag and drop files to verify their cryptographic provenance.
          Supports C2PA-embedded files and sidecar passports.
        </p>
        <div className="header-actions">
          <a 
            href="https://github.com/IngarsPoliters/ProvenancePass" 
            target="_blank" 
            rel="noopener noreferrer"
            className="cta-button secondary"
          >
            📖 GitHub
          </a>
          <a 
            href="https://provenancepass.com/docs/cli" 
            target="_blank" 
            rel="noopener noreferrer"
            className="cta-button secondary"
          >
            🛠️ CLI Quickstart
          </a>
        </div>
      </header>

      <div className="try-sample-section">
        <h3>🧪 Try a Sample File</h3>
        <p>
          Test the viewer with a known-good signed document:
        </p>
        <div className="try-sample-actions">
          <button 
            onClick={handleAutoloadSample} 
            className="cta-button primary"
            disabled={loading}
          >
            ⚡ Try Sample Now
          </button>
          <div className="download-links">
            <span>Or download manually:</span>
            <a 
              href="https://data.provenancepass.com/samples/pass/sidecar/document.txt" 
              target="_blank" 
              rel="noopener noreferrer"
              className="sample-link"
            >
              📄 document.txt
            </a>
            <a 
              href="https://data.provenancepass.com/samples/pass/sidecar/document.txt.passport.json" 
              target="_blank" 
              rel="noopener noreferrer"
              className="sample-link"
            >
              🔏 passport.json
            </a>
          </div>
        </div>
      </div>

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

      <footer className="footer">
        <div className="footer-section">
          <h3>🛠️ CLI Quickstart</h3>
          <div className="code-block">
            <code>
              npm install -g @provenancepass/cli<br/>
              pp verify document.pdf \<br/>
              &nbsp;&nbsp;--revocations https://data.provenancepass.com/revocations.json
            </code>
          </div>
        </div>
        <div className="footer-section">
          <h3>🌐 Resources</h3>
          <div className="footer-links">
            <a href="https://viewer.provenancepass.com/" target="_blank" rel="noopener noreferrer">
              Web Viewer
            </a>
            <a href="https://github.com/IngarsPoliters/ProvenancePass" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
            <a href="https://provenancepass.com/docs/" target="_blank" rel="noopener noreferrer">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App