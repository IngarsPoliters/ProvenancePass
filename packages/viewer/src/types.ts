export interface VerificationData {
  status: 'pass' | 'fail' | 'warning'
  file: string
  source: 'c2pa' | 'sidecar' | 'docx-custom' | 'none'
  passport_found: boolean
  signature_valid?: boolean
  artifact_hash?: string
  created_at?: string
  key_id?: string
  key_status?: 'active' | 'revoked' | 'unknown'
  steps?: ProcessingStep[]
  policy_checks?: PolicyCheck[]
  error?: string
  details?: string
}

export interface ProcessingStep {
  description: string
  timestamp?: string
  tool?: string
  version?: string
  command?: string[]
}

export interface PolicyCheck {
  policy: string
  result: 'pass' | 'fail' | 'warning'
  message?: string
}

export interface RevocationData {
  revoked_keys: Array<{
    key_id: string
    revoked_at: string
    reason?: string
  }>
  last_updated: string
}

export interface ProvenancePassport {
  artifact: {
    name: string
    mime: string
    byte_size: number
    sha256: string
    hash_binding: 'bytes' | 'c2pa-claim'
    created_at: string
  }
  steps: ProcessingStep[]
  policy_checks: PolicyCheck[]
  signature: {
    algo: string
    public_key: string
    signature: string
    key_id: string
  }
}