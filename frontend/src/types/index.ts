export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: 'JUDGE' | 'LAWYER' | 'CLIENT' | 'COURT_ADMIN' | 'SECURITY_SIMULATION';
  sub_role: string;
  assigned_cases: string[];
  permissions: string[];
}

export interface DemoUserItem {
  username: string;
  role: string;
  sub_role: string;
  full_name: string;
  assigned_cases: string[];
}

export interface CaseAssignment {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  sub_role: string;
  assignment_role: string;
}

export interface CaseItem {
  id: string;
  title: string;
  case_type: string;
  status: string;
  court_name: string;
  filing_date: string;
  next_hearing?: string;
  description?: string;
  connected_systems: string[];
  documents_count: number;
  created_at: string;
  is_authorized: boolean;
}

export interface CaseDetail extends CaseItem {
  people: CaseAssignment[];
  documents: DocumentItem[];
  recent_transactions: BlockchainRecord[];
  user_permissions: string[];
}

export interface DocumentVersionItem {
  id: number;
  document_id: string;
  version_number: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  change_summary: string;
  uploader_name?: string;
  created_at: string;
  is_tampered: boolean;
}

export interface DocumentItem {
  id: string;
  case_id: string;
  case_title?: string;
  title: string;
  category: string;
  current_version: number;
  status: string;
  is_restricted: boolean;
  restriction_reason?: string;
  sha256_fingerprint: string;
  uploaded_by: number;
  uploader_name?: string;
  created_at: string;
  updated_at: string;
  versions: DocumentVersionItem[];
}

export interface DocumentVerifyResult {
  document_id: string;
  version_number: number;
  is_valid: boolean;
  status: string;
  message: string;
  computed_hash: string;
  trusted_blockchain_hash: string;
  verified_at: string;
}

export interface AccessRequestItem {
  id: string;
  user_id: number;
  username: string;
  user_full_name: string;
  user_role: string;
  case_id: string;
  case_title: string;
  requested_permissions: string[];
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  review_note?: string;
  created_at: string;
}

export interface BlockchainRecord {
  id: string;
  sequence_number: number;
  timestamp: string;
  previous_hash: string;
  transaction_hash: string;
  event_type: string;
  case_id?: string;
  document_id?: string;
  user_id?: number;
  actor_name: string;
  actor_role: string;
  status: string;
  details: Record<string, any>;
  human_description: string;
}

export interface ChainVerificationReport {
  is_valid: boolean;
  total_blocks: number;
  verified_blocks: number;
  genesis_hash: string;
  tip_hash: string;
  tampered_blocks: Array<{ sequence_number: number; tx_id: string; reason: string }>;
  message: string;
}

export interface BlockchainStats {
  total_transactions: number;
  documents_registered: number;
  versions_created: number;
  permissions_logged: number;
  integrity_checks: number;
  last_block_hash: string;
  chain_status: string;
}

export interface SecurityEventItem {
  id: string;
  timestamp: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  title: string;
  what_happened: string;
  why_it_matters: string;
  what_to_do: string;
  actor_name?: string;
  case_id?: string;
  document_id?: string;
  is_resolved: boolean;
  resolved_at?: string;
  details: Record<string, any>;
}

export interface SecurityStatusReport {
  status: 'GREEN' | 'YELLOW' | 'RED';
  headline: string;
  description: string;
  active_incidents_count: number;
  unresolved_events: SecurityEventItem[];
}

export interface RecoveryRecordItem {
  id: string;
  document_id: string;
  document_title: string;
  case_id: string;
  version_number: number;
  incident_id?: string;
  trusted_hash: string;
  tampered_hash?: string;
  status: string;
  restored_at?: string;
  restorer_name?: string;
  details?: string;
}

export interface ConnectedSystemItem {
  id: string;
  system_name: string;
  system_code: string;
  description: string;
  status: string;
  records_count: number;
  last_sync: string;
  badge: string;
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  outcome: string;
  details: Record<string, any>;
}

export interface SimulationActionResponse {
  success: boolean;
  simulation_type: string;
  message: string;
  target_resource?: string;
  security_event_id?: string;
  blockchain_tx_id?: string;
  recommended_recovery_action?: string;
}
