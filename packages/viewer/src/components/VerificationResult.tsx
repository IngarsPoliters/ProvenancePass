import React from 'react'
import type { VerificationData } from '../types'

interface VerificationResultProps {
  data: VerificationData
  onReset: () => void
}

export function VerificationResult({ data, onReset }: VerificationResultProps) {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'pass': return '✅'
      case 'fail': return '❌'
      case 'warning': return '⚠️'
      default: return '❓'
    }
  }

  const getStatusText = () => {
    switch (data.status) {
      case 'pass': return 'VERIFICATION PASSED'
      case 'fail': return 'VERIFICATION FAILED'
      case 'warning': return 'VERIFICATION WARNING'
      default: return 'UNKNOWN STATUS'
    }
  }

  const getSourceText = () => {
    switch (data.source) {
      case 'c2pa': return 'C2PA Embedded Manifest'
      case 'sidecar': return 'Sidecar File'
      case 'docx-custom': return 'DOCX Custom XML Parts'
      case 'none': return 'No Passport Found'
      default: return 'Unknown Source'
    }
  }

  const formatHash = (hash: string) => {
    if (hash.length <= 16) return hash
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`
  }

  return (
    <div className={`verification-result ${data.status}`}>
      <div className="result-header">
        <span className="result-icon">{getStatusIcon()}</span>
        <div>
          <h3>{getStatusText()}</h3>
          <p style={{ margin: 0, color: 'var(--color-gray-500)' }}>
            File: {data.file}
          </p>
        </div>
        <button 
          onClick={onReset}
          style={{ 
            marginLeft: 'auto',
            padding: '0.5rem 1rem',
            border: '1px solid var(--color-gray-300)',
            borderRadius: '0.5rem',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          Verify Another File
        </button>
      </div>

      {data.error && (
        <div className="error" style={{ marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {data.error}
          {data.details && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              {data.details}
            </div>
          )}
        </div>
      )}

      <div className="result-details">
        <div className="detail-item">
          <label>Passport Source</label>
          <div className="value">{getSourceText()}</div>
        </div>

        {data.artifact_hash && (
          <div className="detail-item">
            <label>Artifact Hash (SHA-256)</label>
            <div className="value hash">{formatHash(data.artifact_hash)}</div>
          </div>
        )}

        {data.created_at && (
          <div className="detail-item">
            <label>Created At</label>
            <div className="value">{new Date(data.created_at).toLocaleString()}</div>
          </div>
        )}

        {data.key_id && (
          <div className="detail-item">
            <label>Signing Key</label>
            <div className="value">{data.key_id}</div>
          </div>
        )}

        {data.key_status && (
          <div className="detail-item">
            <label>Key Status</label>
            <div className="value">
              <span className={`key-status ${data.key_status}`}>
                {data.key_status}
              </span>
            </div>
          </div>
        )}

        {data.signature_valid !== undefined && (
          <div className="detail-item">
            <label>Signature Valid</label>
            <div className="value">
              {data.signature_valid ? '✅ Valid' : '❌ Invalid'}
            </div>
          </div>
        )}
      </div>

      {data.steps && data.steps.length > 0 && (
        <div className="steps-section">
          <h4>📋 Processing Steps ({data.steps.length})</h4>
          {data.steps.map((step, index) => (
            <div key={index} className="step-item">
              <div className="step-description">{step.description}</div>
              <div className="step-meta">
                {step.tool && `Tool: ${step.tool}`}
                {step.version && ` v${step.version}`}
                {step.timestamp && ` • ${new Date(step.timestamp).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.policy_checks && data.policy_checks.length > 0 && (
        <div className="steps-section">
          <h4>🛡️ Policy Checks ({data.policy_checks.length})</h4>
          {data.policy_checks.map((check, index) => (
            <div key={index} className="step-item">
              <div className="step-description">
                {check.result === 'pass' ? '✅' : check.result === 'fail' ? '❌' : '⚠️'} {check.policy}
              </div>
              {check.message && (
                <div className="step-meta">{check.message}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}