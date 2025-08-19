/**
 * Plausible Analytics Integration
 * Privacy-focused analytics that loads only in production
 * No cookies, no personal data collection
 */

(function() {
  'use strict';
  
  // Only load in production environment
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '') {
    console.log('Plausible: Skipping analytics in development');
    return;
  }
  
  // Configuration
  const config = {
    domain: 'provenancepass.com',
    apiHost: 'https://plausible.io',
    trackLocalhost: false
  };
  
  // Create and inject the Plausible script
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = config.domain;
  script.src = config.apiHost + '/js/script.js';
  
  // Add script to head
  document.head.appendChild(script);
  
  // Optional: Manual event tracking function
  window.plausible = window.plausible || function() {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
  
  console.log('Plausible: Analytics loaded for', config.domain);
})();