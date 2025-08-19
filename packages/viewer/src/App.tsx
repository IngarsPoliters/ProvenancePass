import React, { useReducer, useCallback } from 'react'
import { DropZone } from './components/DropZone'
import { ResultBanner } from './components/ResultBanner'
import { verifyFilesLazy, preloadVerifier } from './lib/lazy-verifier'
import type { VerificationData } from './types'

type ViewerAction = 
  | { type: 'FILE_DROPPED'; payload: File[] }
  | { type: 'URL_ENTERED'; payload: string }
  | { type: 'SAMPLE_CLICKED' }
  | { type: 'VERIFY_START' }
  | { type: 'VERIFY_SUCCESS'; payload: VerificationData }
  | { type: 'VERIFY_ERROR'; payload: string }
  | { type: 'RESET' };

interface ViewerState {
  verification: VerificationData | null;
  loading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
}

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'FILE_DROPPED':
    case 'URL_ENTERED':
    case 'SAMPLE_CLICKED':
    case 'VERIFY_START':
      return { ...state, loading: true, error: null, verification: null, status: 'loading' };
    case 'VERIFY_SUCCESS':
      return { ...state, loading: false, verification: action.payload, status: 'success' };
    case 'VERIFY_ERROR':
      return { ...state, loading: false, error: action.payload, status: 'error' };
    case 'RESET':
      return { verification: null, loading: false, error: null, status: 'idle' };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(viewerReducer, {
    verification: null,
    loading: false,
    error: null,
    status: 'idle'
  });

  const handleFilesDropped = useCallback(async (files: File[]) => {
    dispatch({ type: 'FILE_DROPPED', payload: files })

    try {
      const result = await verifyFilesLazy(files)
      dispatch({ type: 'VERIFY_SUCCESS', payload: result })
    } catch (err) {
      dispatch({ type: 'VERIFY_ERROR', payload: err instanceof Error ? err.message : 'Verification failed' })
    }
  }, [])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const handleAutoloadSample = useCallback(async () => {
    dispatch({ type: 'SAMPLE_CLICKED' })

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

      const result = await verifyFilesLazy(files)
      dispatch({ type: 'VERIFY_SUCCESS', payload: result })
    } catch (err) {
      dispatch({ type: 'VERIFY_ERROR', payload: err instanceof Error ? err.message : 'Failed to load sample' })
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
            disabled={state.loading}
            onMouseEnter={() => preloadVerifier()}
            onFocus={() => preloadVerifier()}
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
        {!state.verification && !state.loading && (
          <DropZone onFilesDropped={handleFilesDropped} />
        )}

        <ResultBanner
          status={state.status}
          verification={state.verification}
          error={state.error}
          onReset={handleReset}
        />
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