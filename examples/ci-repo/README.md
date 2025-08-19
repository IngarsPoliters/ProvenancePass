# Example CI Repository

This directory contains example GitHub workflows for using the Provenance Passport verification action in your CI/CD pipeline.

## Files

- `.github/workflows/passport.yml` - Complete example workflow with multiple verification strategies

## Usage

1. Copy the workflow file to your repository's `.github/workflows/` directory
2. Customize the `glob` patterns to match your file types
3. Optionally configure custom revocation and manifest URLs
4. Commit and push - the action will run on pull requests

## Workflow Features

The example workflow demonstrates:

- ✅ Basic provenance verification
- 📊 Results reporting and PR comments  
- 🔄 Matrix builds for different platforms
- 📁 Artifact upload for verification results
- 🎯 Separate jobs for different file types

## Customization

Edit the workflow to:
- Change file patterns (`glob` input)
- Add custom revocation lists
- Configure manifest URLs for DOCX fallback
- Adjust trigger conditions
- Add custom result handling

## Next Steps

- Add `.passport.json` sidecar files to your repository
- Use the CLI to embed passports into supported media files
- Set up signing keys for your organization
- Configure custom revocation management