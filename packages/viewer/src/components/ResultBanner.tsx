import React, { useEffect, useRef } from 'react';
import type { VerificationData } from '../types';
import { VerificationResult } from './VerificationResult';
import '../styles/tokens.css';

interface ResultBannerProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  verification?: VerificationData | null;
  error?: string | null;
  details?: string;
  onReset?: () => void;
}

export function ResultBanner({ status, verification, error, details, onReset }: ResultBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  // Focus banner when verification completes
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      bannerRef.current?.focus();
    }
  }, [status]);

  if (status === 'idle') return null;

  if (status === 'loading') {
    return (
      <div 
        className="result-banner result-banner--loading"
        role="status"
        aria-live="polite"
        aria-label="Verifying passport"
      >
        <div className="result-banner__content">
          <div className="result-banner__spinner" aria-hidden="true"></div>
          <h2 className="result-banner__title">Verifying Content Credentials...</h2>
          <p className="result-banner__message">Please wait while we validate the digital signature.</p>
        </div>
      </div>
    );
  }

  const isSuccess = status === 'success' && verification?.status === 'pass';
  const bannerClass = `result-banner ${isSuccess ? 'result-banner--success' : 'result-banner--error'}`;

  return (
    <div 
      ref={bannerRef}
      className={bannerClass}
      role="status"
      aria-live="assertive"
      tabIndex={-1}
      aria-label={isSuccess ? "Verification successful" : "Verification failed"}
    >
      <div className="result-banner__content">
        <div className="result-banner__icon" aria-hidden="true">
          {isSuccess ? '✓' : '✗'}
        </div>
        <h2 className="result-banner__title">
          {isSuccess ? 'Content Credentials Verified' : 'Verification Failed'}
        </h2>
        <p className="result-banner__message">
          {isSuccess 
            ? 'This content has a valid digital signature and provenance information.'
            : (error || verification?.error || 'Unable to verify content credentials.')
          }
        </p>
      </div>

      {!isSuccess && (details || verification?.details) && (
        <details className="result-banner__details">
          <summary 
            className="result-banner__details-toggle"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
          >
            Show Technical Details
          </summary>
          <pre className="result-banner__details-content">{details || verification?.details}</pre>
        </details>
      )}

      {verification && (
        <VerificationResult 
          data={verification} 
          onReset={onReset || (() => {})}
        />
      )}
    </div>
  );
}