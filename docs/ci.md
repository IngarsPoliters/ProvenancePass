# CI/CD Integration Guide

*Integrate Provenance Passport into your build pipelines for automated provenance creation and verification.*

## 🔧 GitHub Actions

### Basic Setup

```yaml
name: Build with Provenance
on: [push, pull_request]

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Application
        run: |
          npm install
          npm run build
          
      - name: Create Provenance Passports
        uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: wrap
          glob: 'dist/**/*.{js,css,png,woff2}'
          embed_c2pa: true
          
      - name: Verify Created Passports
        uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: verify
          glob: 'dist/**/*'
          revocations_url: 'https://data.provenancepass.com/revocations.json'
          
      - name: Upload Signed Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: signed-build
          path: |
            dist/
            **/*.passport.json
```

### Advanced Pipeline with Key Management

```yaml
name: Production Release with Provenance
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write  # For provenance attestation
      
    steps:
      - uses: actions/checkout@v4
      
      # Secure key setup
      - name: Setup Signing Key
        run: |
          echo "${{ secrets.RELEASE_SIGNING_KEY }}" > release-key.pem
          chmod 600 release-key.pem
          
      - name: Build Release Artifacts
        run: |
          npm ci
          npm run build:production
          npm run test
          
      - name: Create Release Provenance
        uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: wrap
          command: "npm run package:release"
          keyfile: release-key.pem
          embed_c2pa: true
          output_dir: releases/
          
      - name: Verify Release Integrity
        uses: IngarsPoliters/ProvenancePass/packages/actions@main  
        with:
          mode: verify
          glob: 'releases/**/*'
          revocations_url: 'https://your-org.com/revocations.json'
          revocation_pubkey: ${{ secrets.REVOCATION_VERIFY_KEY }}
          
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            releases/*
            releases/**/*.passport.json
          body: |
            ## 🔐 Provenance Information
            This release includes cryptographic provenance passports for all artifacts.
            
            **Verification:**
            ```bash
            # Download and verify any file
            npx @provenancepass/cli@latest verify downloaded-file.zip
            ```
            
            **Key Fingerprint:** `${{ steps.sign.outputs.key_fingerprint }}`
            
      - name: Cleanup Keys
        if: always()
        run: |
          rm -f release-key.pem
          shred -vfz -n 3 release-key.pem || true
```

### Pull Request Verification

```yaml
name: Verify Provenance on PR
on: 
  pull_request:
    paths: ['assets/**', 'docs/**/*.pdf', 'releases/**']

jobs:
  verify-provenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # Fetch full history to compare files
          fetch-depth: 0
          
      - name: Get Changed Files  
        id: changes
        run: |
          git diff --name-only origin/main...HEAD \
            | grep -E '\.(pdf|png|jpg|jpeg|docx|zip|tar\.gz)$' \
            > changed_files.txt || echo "No trackable files changed"
          echo "files=$(cat changed_files.txt | tr '\n' ' ')" >> $GITHUB_OUTPUT
          
      - name: Verify Changed Files
        if: steps.changes.outputs.files != ''
        uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: verify
          glob: ${{ steps.changes.outputs.files }}
          
      - name: Block PR if Verification Fails
        if: failure()
        run: |
          echo "::error::Some files failed provenance verification"
          echo "::error::Please ensure all binary files have valid provenance passports"
          echo "::error::See: https://provenancepass.com/docs/get-started"
          exit 1
          
      - name: Comment Verification Results
        uses: actions/github-script@v7
        if: always()
        with:
          script: |
            const fs = require('fs');
            
            // Read verification results if they exist
            let comment = '## 🔐 Provenance Verification Results\n\n';
            
            if (context.job.status === 'success') {
              comment += '✅ All files passed provenance verification!\n\n';
            } else {
              comment += '❌ Some files failed verification. Please check the action logs.\n\n';
              comment += '**How to fix:**\n';
              comment += '1. Generate passports: `npx @provenancepass/cli@latest wrap --glob "path/to/files/**/*"`\n';
              comment += '2. Commit the `.passport.json` files\n';
              comment += '3. For images/PDFs, consider C2PA embedding\n\n';
            }
            
            comment += '[📚 Documentation](https://provenancepass.com/docs/get-started)';
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## 🏗 Other CI/CD Platforms  

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        SIGNING_KEY = credentials('provenance-signing-key')
        REVOCATIONS_URL = 'https://data.provenancepass.com/revocations.json'
    }
    
    stages {
        stage('Setup') {
            steps {
                // Install CLI
                sh 'npm install -g @provenancepass/cli@latest'
                
                // Install c2patool for embedding
                sh '''
                    wget -q https://github.com/contentauth/c2patool/releases/latest/download/c2patool-linux-intel -O c2patool
                    chmod +x c2patool
                    sudo mv c2patool /usr/local/bin/
                '''
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
                sh 'npm test'
            }
        }
        
        stage('Create Provenance') {
            steps {
                sh '''
                    # Wrap build artifacts
                    pp wrap --glob "dist/**/*.{js,css,png}" --keyfile ${SIGNING_KEY} 
                    
                    # Embed in images
                    find dist -name "*.png" -exec pp embed --file {} --passport {}.passport.json --output {} \\;
                '''
            }
        }
        
        stage('Verify') {
            steps {
                sh '''
                    pp verify --glob "dist/**/*" --revocations ${REVOCATIONS_URL} --json > verification.json
                    
                    # Parse results and fail if any files failed
                    failed_count=$(jq '.summary.failed' verification.json)
                    if [ "$failed_count" -gt 0 ]; then
                        echo "❌ $failed_count files failed verification"
                        jq '.results[] | select(.status == "fail")' verification.json
                        exit 1
                    fi
                    
                    echo "✅ All files verified successfully"
                '''
            }
        }
        
        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**,**/*.passport.json', fingerprint: true
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '.',
                    reportFiles: 'verification.json',
                    reportName: 'Provenance Report'
                ])
            }
        }
    }
    
    post {
        always {
            // Clean up sensitive files
            sh 'rm -f ${SIGNING_KEY}'
        }
    }
}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - sign
  - verify
  - deploy

variables:
  REVOCATIONS_URL: "https://data.provenancepass.com/revocations.json"

before_script:
  - npm install -g @provenancepass/cli@latest
  - |
    if [ "$CI_RUNNER_OS" = "linux" ]; then
      wget -q https://github.com/contentauth/c2patool/releases/latest/download/c2patool-linux-intel -O c2patool
      chmod +x c2patool && sudo mv c2patool /usr/local/bin/
    fi

build:
  stage: build
  script:
    - npm ci
    - npm run build
    - npm test
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

sign:
  stage: sign
  script:
    # Use GitLab's file variables for keys
    - echo "$SIGNING_KEY_CONTENT" > signing-key.pem
    - chmod 600 signing-key.pem
    
    # Create provenance for all build artifacts
    - pp wrap --glob "dist/**/*.{js,css,png,woff2}" --keyfile signing-key.pem
    
    # Embed in supported files
    - find dist -name "*.png" -exec pp embed --file {} --passport {}.passport.json --output {} \;
    
    # Clean up key
    - rm signing-key.pem
    
  artifacts:
    paths:
      - dist/
      - "**/*.passport.json"
    expire_in: 1 week

verify:
  stage: verify
  script:
    - |
      pp verify --glob "dist/**/*" --revocations $REVOCATIONS_URL --json > verification-results.json
      
      # Check results
      failed=$(jq '.summary.failed' verification-results.json)
      if [ "$failed" -gt 0 ]; then
        echo "❌ $failed files failed verification"
        exit 1
      fi
      
      echo "✅ Verification successful"
      
  artifacts:
    reports:
      junit: verification-results.json
    paths:
      - verification-results.json

deploy:
  stage: deploy
  script:
    - echo "Deploy signed artifacts..."
    - rsync -av dist/ $DEPLOY_SERVER:/var/www/
  only:
    - main
```

## ⚠️ Common Pitfalls & Solutions

### 1. **Key Management Issues**

#### ❌ Problem: Keys in Version Control
```bash
# DON'T commit keys to git
git add signing-key.pem  # ❌ NEVER!
```

#### ✅ Solution: Use Secrets
```yaml
# GitHub Actions
- name: Setup Key
  run: echo "${{ secrets.SIGNING_KEY }}" > key.pem

# GitLab CI  
- echo "$SIGNING_KEY_CONTENT" > key.pem

# Jenkins
environment {
    SIGNING_KEY = credentials('signing-key-id')
}
```

### 2. **File Glob Issues**

#### ❌ Problem: Overly Broad Globs
```bash
pp verify --glob "**/*"  # ❌ Slow, includes everything
```

#### ✅ Solution: Specific Patterns  
```bash
pp verify --glob "dist/**/*.{js,css}" --glob "assets/**/*.png"  # ✅ Targeted
```

### 3. **C2PA Tool Installation**

#### ❌ Problem: Missing c2patool
```
Error: c2patool not found, cannot embed C2PA metadata
```

#### ✅ Solution: Install in CI
```yaml
- name: Install c2patool
  run: |
    if [[ "$RUNNER_OS" == "Linux" ]]; then
      wget -q https://github.com/contentauth/c2patool/releases/latest/download/c2patool-linux-intel -O c2patool
      chmod +x c2patool && sudo mv c2patool /usr/local/bin/
    elif [[ "$RUNNER_OS" == "macOS" ]]; then
      brew install c2patool
    fi
```

### 4. **Revocation Check Failures**

#### ❌ Problem: Network timeouts
```
Error: Failed to fetch revocation list from https://...
```

#### ✅ Solution: Retry logic + fallback
```bash
# Retry with timeout
pp verify --revocations $URL --timeout 30 --retries 3

# Or skip revocation checks in development
if [ "$CI" = "true" ]; then
  pp verify --revocations $URL --glob "dist/**/*"
else
  pp verify --glob "dist/**/*"  # Skip revocation checks locally
fi
```

### 5. **Large File Performance**

#### ❌ Problem: Slow verification
```bash
pp verify --glob "**/*"  # Processes everything including large files
```

#### ✅ Solution: Selective verification
```bash
# Only verify specific file types
pp verify --glob "**/*.{pdf,png,js,css}" 

# Or use exclude patterns
pp verify --glob "dist/**/*" --exclude "*.log" --exclude "*.tmp"
```

### 6. **Cross-Platform Issues**

#### ❌ Problem: Windows path issues
```yaml
- run: pp verify --keyfile C:\path\key.pem  # ❌ Escaping issues
```

#### ✅ Solution: Use environment variables
```yaml
env:
  SIGNING_KEY_PATH: ${{ github.workspace }}/signing-key.pem
  
- run: pp verify --keyfile "$SIGNING_KEY_PATH"  # ✅ Cross-platform
```

## 🔒 Security Best Practices

### Key Rotation Strategy
```yaml
name: Key Rotation
on:
  schedule:
    - cron: '0 0 1 */3 *'  # Quarterly key rotation
    
jobs:
  rotate-keys:
    runs-on: ubuntu-latest
    steps:
      - name: Generate New Key
        run: |
          pp keygen --out-file new-key.pem
          echo "NEW_KEY_FINGERPRINT=$(pp fingerprint --keyfile new-key.pem)" >> $GITHUB_ENV
          
      - name: Update Repository Secret
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const newKey = fs.readFileSync('new-key.pem', 'utf8');
            
            await github.rest.actions.createOrUpdateRepoSecret({
              owner: context.repo.owner,
              repo: context.repo.repo,
              secret_name: 'SIGNING_KEY',
              encrypted_value: newKey
            });
            
      - name: Revoke Old Key
        run: |
          # Add old key to revocation list
          curl -X POST https://your-org.com/api/revoke-key \
            -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}" \
            -d '{"key_id": "${{ secrets.OLD_KEY_ID }}", "reason": "scheduled_rotation"}'
```

### Environment Separation
```yaml
# Different keys for different environments
jobs:
  deploy-staging:
    environment: staging
    steps:
      - run: echo "${{ secrets.STAGING_SIGNING_KEY }}" > key.pem
        
  deploy-production:
    environment: production  
    steps:
      - run: echo "${{ secrets.PRODUCTION_SIGNING_KEY }}" > key.pem
```

### Audit Logging
```yaml
- name: Log Provenance Activity
  run: |
    pp verify --glob "dist/**/*" --json > verification.json
    
    # Send to audit log
    curl -X POST https://your-org.com/api/audit-log \
      -H "Content-Type: application/json" \
      -d "{
        \"event\": \"provenance_verification\",
        \"repo\": \"$GITHUB_REPOSITORY\",
        \"sha\": \"$GITHUB_SHA\",
        \"actor\": \"$GITHUB_ACTOR\",
        \"results\": $(cat verification.json)
      }"
```

## 📊 Monitoring & Alerting

### Verification Metrics
```yaml
- name: Upload Metrics
  run: |
    # Parse verification results
    total=$(jq '.summary.total' verification.json)
    passed=$(jq '.summary.passed' verification.json)  
    failed=$(jq '.summary.failed' verification.json)
    
    # Send to monitoring system (DataDog, CloudWatch, etc.)
    curl -X POST https://api.datadoghq.com/api/v1/series \
      -H "Content-Type: application/json" \
      -H "DD-API-KEY: ${{ secrets.DATADOG_API_KEY }}" \
      -d '{
        "series": [{
          "metric": "provenance.verification.total",
          "points": [['$(date +%s)', '$total']],
          "tags": ["repo:'$GITHUB_REPOSITORY'", "branch:'$GITHUB_REF_NAME'"]
        }]
      }'
```

### Slack Notifications
```yaml
- name: Notify on Failures
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: |
      🚨 Provenance verification failed in ${{ github.repository }}
      
      **Branch:** ${{ github.ref_name }}
      **Commit:** ${{ github.sha }}
      **Files failed:** Check action logs
      
      [View Details](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## 🚀 Advanced Integration Patterns

### Multi-Stage Verification
```yaml
jobs:
  verify-development:
    runs-on: ubuntu-latest
    steps:
      # Lenient verification for development
      - uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: verify
          glob: 'dist/**/*'
          # No revocation checks in dev
          
  verify-staging:
    needs: verify-development
    runs-on: ubuntu-latest  
    steps:
      # Stricter verification for staging
      - uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: verify
          glob: 'dist/**/*'
          revocations_url: 'https://staging.example.com/revocations.json'
          
  verify-production:
    needs: verify-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      # Full verification for production
      - uses: IngarsPoliters/ProvenancePass/packages/actions@main
        with:
          mode: verify
          glob: 'dist/**/*'
          revocations_url: 'https://data.provenancepass.com/revocations.json'
          revocation_pubkey: ${{ secrets.REVOCATION_VERIFY_KEY }}
```

---

*Ready to secure your CI/CD pipeline? Start with the [quickstart guide](./get-started.md) or explore the [web viewer](./viewer.md)!* 🔐