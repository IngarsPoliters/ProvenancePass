import * as core from '@actions/core';
import * as github from '@actions/github';
import { readFileSync } from 'fs';

interface VerificationResult {
  file: string;
  status: 'pass' | 'fail' | 'warning';
  passport_found: boolean;
  passport_source?: 'c2pa' | 'docx-custom' | 'sidecar';
  signature_valid?: boolean;
  key_id?: string;
  key_status?: 'active' | 'revoked' | 'unknown';
  created_at?: string;
  artifact_hash?: string;
  steps_count?: number;
  policies_passed?: number;
  error?: string;
  details?: string;
}

interface VerificationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

interface VerificationOutput {
  summary: VerificationSummary;
  results: VerificationResult[];
}

async function run(): Promise<void> {
  try {
    const resultsFile = core.getInput('results_file') || 'verification_results.json';
    
    // Read and parse the verification results
    const resultsContent = readFileSync(resultsFile, 'utf-8');
    const verification: VerificationOutput = JSON.parse(resultsContent);
    
    const { summary, results } = verification;
    
    // Set outputs
    core.setOutput('total', summary.total.toString());
    core.setOutput('passed', summary.passed.toString());
    core.setOutput('failed', summary.failed.toString());
    core.setOutput('warnings', summary.warnings.toString());
    core.setOutput('success', (summary.failed === 0).toString());
    
    // Process each result and add annotations
    for (const result of results) {
      if (result.status === 'fail') {
        const message = result.error || 'Verification failed';
        const details = result.details ? `\n\n${result.details}` : '';
        
        core.error(
          `❌ ${result.file}: ${message}${details}\n\n` +
          `📚 Learn more: https://github.com/IngarsPoliters/ProvenancePass/blob/main/docs/spec/embedding.md`,
          {
            file: result.file,
            title: 'Provenance Passport Verification Failed'
          }
        );
      } else if (result.status === 'warning') {
        const message = result.error || 'Verification warning';
        const details = result.details ? `\n\n${result.details}` : '';
        
        core.warning(
          `⚠️  ${result.file}: ${message}${details}\n\n` +
          `📚 Learn more: https://github.com/IngarsPoliters/ProvenancePass/blob/main/docs/spec/embedding.md`,
          {
            file: result.file,
            title: 'Provenance Passport Verification Warning'
          }
        );
      }
    }
    
    // Create summary comment
    const summaryLines = [
      '## 🔐 Provenance Passport Verification Results',
      '',
      `📊 **Summary**: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''}`,
      ''
    ];
    
    if (summary.failed > 0) {
      summaryLines.push('❌ **Some files failed verification:**');
      summaryLines.push('');
      
      const failedFiles = results.filter(r => r.status === 'fail');
      for (const result of failedFiles) {
        summaryLines.push(`- \`${result.file}\`: ${result.error || 'Verification failed'}`);
      }
      summaryLines.push('');
    }
    
    if (summary.warnings > 0) {
      summaryLines.push('⚠️  **Files with warnings:**');
      summaryLines.push('');
      
      const warningFiles = results.filter(r => r.status === 'warning');
      for (const result of warningFiles) {
        summaryLines.push(`- \`${result.file}\`: ${result.error || 'Warning'}`);
      }
      summaryLines.push('');
    }
    
    if (summary.passed > 0) {
      summaryLines.push('✅ **Successfully verified files:**');
      summaryLines.push('');
      
      const passedFiles = results.filter(r => r.status === 'pass');
      for (const result of passedFiles) {
        const sourceIcon = result.passport_source === 'c2pa' ? '🏷️' : 
                          result.passport_source === 'docx-custom' ? '📄' : '📋';
        summaryLines.push(`- ${sourceIcon} \`${result.file}\` (${result.passport_source || 'sidecar'})`);
      }
      summaryLines.push('');
    }
    
    summaryLines.push('---');
    summaryLines.push('');
    summaryLines.push('📚 [Documentation](https://github.com/IngarsPoliters/ProvenancePass/blob/main/docs/spec/embedding.md) | 🛠️ [CLI Usage](https://github.com/IngarsPoliters/ProvenancePass/tree/main/packages/cli)');
    
    // Add summary to job output
    core.summary.addRaw(summaryLines.join('\n'));
    await core.summary.write();
    
    // Fail the action if any files failed verification
    if (summary.failed > 0) {
      core.setFailed(`${summary.failed} file${summary.failed !== 1 ? 's' : ''} failed provenance verification`);
    }
    
    core.info(`Verification complete: ${summary.passed}/${summary.total} files passed`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
  }
}

// Don't auto-execute in test environment
if (require.main === module) {
  run();
}

export { run };