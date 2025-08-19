/**
 * Plausible Analytics Integration
 * Privacy-focused analytics that loads only in production
 * No cookies, no personal data collection, GDPR compliant
 */

(function() {
  'use strict';
  
  // Only load in production environment (not localhost or development)
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '' ||
      window.location.hostname.includes('localhost') ||
      window.location.protocol === 'file:') {
    console.log('🔒 Plausible: Skipping analytics in development environment');
    return;
  }
  
  // Configuration
  const config = {
    domain: 'provenancepass.com',
    apiHost: 'https://plausible.io',
    trackLocalhost: false,
    trackOutboundLinks: true
  };
  
  // Create and inject the Plausible script
  const script = document.createElement('script');
  script.defer = true;
  script.setAttribute('data-domain', config.domain);
  script.src = config.apiHost + '/js/script.outbound-links.js';
  
  // Add script to head
  (document.head || document.documentElement).appendChild(script);
  
  // Manual event tracking function for custom events
  window.plausible = window.plausible || function() {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
  
  // Track file verification attempts (custom event)
  function trackFileVerification() {
    if (typeof window.plausible === 'function') {
      window.plausible('File Verification Attempted');
    }
  }
  
  // Track CLI installation attempts (custom event)  
  function trackCliInstall() {
    if (typeof window.plausible === 'function') {
      window.plausible('CLI Installation Started');
    }
  }
  
  // Auto-track clicks on verification and installation CTAs
  document.addEventListener('DOMContentLoaded', function() {
    // Track viewer clicks
    const viewerLinks = document.querySelectorAll('a[href*="viewer.provenancepass.com"]');
    viewerLinks.forEach(function(link) {
      link.addEventListener('click', trackFileVerification);
    });
    
    // Track CLI/quickstart clicks
    const cliLinks = document.querySelectorAll('a[href*="get-started.md"], a[href*="quickstart"]');
    cliLinks.forEach(function(link) {
      link.addEventListener('click', trackCliInstall);
    });
  });
  
  console.log('📊 Plausible: Analytics loaded for', config.domain, '(privacy-focused, no cookies)');
})();