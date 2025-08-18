# Privacy Guidelines

This document outlines privacy considerations, data handling policies, and user control mechanisms for Provenance Passport implementations.

## Privacy-by-Design Principles

### Data Minimization

**Default Behavior**: Store only essential metadata required for provenance verification.

- **Hashes over content**: Use SHA-256 hashes instead of raw file contents
- **Claims over details**: Store high-level claims rather than detailed process information  
- **Metadata filtering**: Automatically remove sensitive fields from tool outputs
- **User opt-in**: Require explicit consent for including detailed information

### Selective Disclosure

**User Control**: Allow granular control over what information is included in passports.

```json
{
  "privacy_level": "minimal",  // minimal | standard | detailed | full
  "include_raw_inputs": false,
  "include_tool_details": false,
  "include_timing_precision": "hour",  // minute | hour | day
  "redact_patterns": ["email", "path", "credential"]
}
```

## Data Categories and Handling

### Always Safe to Include

- **Artifact hashes**: SHA-256 digests reveal minimal information
- **MIME types**: Standard content type identifiers
- **Public tool names**: Commonly known software (git, npm, docker)
- **Rounded timestamps**: Date/time precision limited to hours or days
- **Standard claims**: Predefined assertion types without custom values

### Require User Consent

- **Tool versions**: Specific software versions (may reveal vulnerabilities)
- **Processing durations**: Exact timing information
- **System paths**: File system locations or directory structures  
- **Custom metadata**: User-defined fields with potentially sensitive content
- **Error messages**: Tool output that might contain sensitive information

### Never Include by Default

- **Raw file contents**: Actual document text, code, or binary data
- **Credentials**: API keys, passwords, or authentication tokens
- **Personal identifiers**: Email addresses, usernames, or employee IDs
- **Detailed prompts**: Full AI instructions or sensitive user inputs
- **Internal URLs**: Private network addresses or internal service endpoints

## Default Privacy Settings

### Minimal Privacy Level (Default)

```json
{
  "artifact": {
    "sha256": "hash_only",
    "mime": "public_types_only",
    "created_at": "rounded_to_hour",
    "hash_binding": "bytes"
  },
  "steps": [
    {
      "action": "generalized_action_type", 
      "tool": "public_name_only",
      "started_at": "rounded_to_hour",
      "ended_at": "rounded_to_hour"
    }
  ],
  "inputs": [
    {
      "type": "hash_reference",
      "sha256": "input_hash_only"
    }
  ]
}
```

### Standard Privacy Level

- Include tool versions for security transparency
- Provide minute-level timestamp precision
- Allow generalized error categories (without specific messages)

### Detailed Privacy Level

- Include specific tool configurations (after redaction)
- Provide detailed step timing and resource usage
- Include sanitized environment information

### Full Disclosure Level

- Include all available metadata (user explicitly opted in)
- Maintain full timestamp precision
- Include detailed tool outputs (with user review)

## Data Retention and Lifecycle

### Passport Storage

- **Immutable by design**: Passports should not be modified after signing
- **Retention periods**: Follow organizational data retention policies
- **Geographic restrictions**: Respect data residency requirements
- **Access controls**: Limit access to authorized personnel only

### Key Material Lifecycle

- **Private keys**: Secure deletion after rotation or compromise
- **Public keys**: Indefinite retention for historical verification
- **Revocation records**: Permanent retention for security audit trails
- **Backup encryption**: All backups must be encrypted with current keys

### Artifact Correlation

- **Hash indexing**: Maintain indexes of artifact hashes for verification
- **Metadata separation**: Store sensitive metadata separately from public hashes
- **Anonymization**: Remove personally identifiable information from long-term storage
- **Purge procedures**: Define clear data deletion processes upon request

## Redaction Patterns

### Automatic Redaction Rules

Apply these patterns automatically to all passport content:

```javascript
const REDACTION_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  api_key: /[A-Za-z0-9]{20,}/g,
  file_path: /\/[^\s"'<>]+/g,
  ip_address: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  jwt_token: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g
};

function redactSensitiveData(text) {
  let redacted = text;
  for (const [type, pattern] of Object.entries(REDACTION_PATTERNS)) {
    redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  }
  return redacted;
}
```

### Custom Redaction Policies

Organizations can define custom redaction rules:

```json
{
  "redaction_policy": {
    "patterns": [
      {
        "name": "internal_servers",
        "regex": "internal-.*\\.company\\.com",
        "replacement": "[REDACTED_INTERNAL_SERVER]"
      },
      {
        "name": "employee_ids", 
        "regex": "EMP[0-9]{6}",
        "replacement": "[REDACTED_EMPLOYEE_ID]"
      }
    ],
    "field_filters": [
      "actor.id",
      "tool.configuration.server",
      "inputs[].metadata.source"
    ]
  }
}
```

## Viewer Privacy Controls

### Default Display Behavior

When displaying passports to users, viewers should:

- **Show hashes by default**: Display artifact SHA-256 instead of attempting content preview
- **Summarize steps**: Present generalized action types rather than detailed tool output
- **Hide sensitive fields**: Never display credentials, tokens, or internal identifiers
- **Provide privacy indicators**: Show privacy level and what information is hidden

### User Disclosure Options

Allow users to progressively disclose more information:

```
Privacy Level Selector:
[🔒 Minimal] [🔓 Standard] [👁️ Detailed] [📖 Full Access]

Current view: Minimal (hashes and basic metadata only)
↓
Additional information available with user consent:
- Tool versions and configurations
- Detailed timing information  
- System environment details
- Raw input references
```

### Privacy Indicators

Visual indicators for different privacy levels:

- 🔒 **Minimal**: Essential metadata only
- 🔓 **Standard**: Common development metadata
- 👁️ **Detailed**: Comprehensive technical details
- 📖 **Full**: All available information

## Compliance and Legal Considerations

### GDPR Compliance

- **Right to information**: Clear disclosure of what data is collected
- **Right of access**: Users can retrieve their passport data
- **Right to rectification**: Ability to correct inaccurate metadata
- **Right to erasure**: Procedures for deleting personal data from passports
- **Data portability**: Export passports in standard formats

### Industry-Specific Requirements

- **HIPAA**: Healthcare data requires additional anonymization
- **SOX**: Financial data may require enhanced audit trails
- **ITAR**: Export-controlled content needs geographic restrictions
- **PCI DSS**: Payment data requires tokenization instead of raw values

### Cross-Border Data Transfer

- **Data residency**: Respect local data storage requirements
- **Transfer mechanisms**: Use standard contractual clauses where applicable
- **Encryption in transit**: Always encrypt passport data during transmission
- **Jurisdictional compliance**: Follow applicable local privacy laws

## Implementation Recommendations

### Development Guidelines

1. **Privacy by default**: Configure tools to minimize data collection
2. **Consent mechanisms**: Implement clear opt-in flows for detailed data
3. **Regular audits**: Review passport contents for privacy compliance
4. **Staff training**: Educate developers on privacy implications

### Configuration Templates

Provide pre-configured privacy settings for common use cases:

```yaml
# privacy-minimal.yaml
default_privacy_level: minimal
auto_redaction: true
timestamp_precision: hour
include_tool_versions: false
require_consent_for_details: true

# privacy-development.yaml  
default_privacy_level: standard
auto_redaction: true
timestamp_precision: minute
include_tool_versions: true
include_environment_info: false

# privacy-audit.yaml
default_privacy_level: detailed
auto_redaction: false
timestamp_precision: second  
include_all_metadata: true
require_explicit_approval: true
```

### Monitoring and Alerting

- **Privacy violations**: Alert when sensitive patterns detected in passports
- **Consent tracking**: Log all user privacy setting changes
- **Access monitoring**: Track who accesses detailed passport information
- **Compliance reporting**: Generate privacy compliance reports for audits