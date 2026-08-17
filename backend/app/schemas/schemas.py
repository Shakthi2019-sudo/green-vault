from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional, List, Dict, Any, Annotated
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic.functional_serializers import PlainSerializer

IST = ZoneInfo("Asia/Kolkata")

def serialize_utc_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Serialize datetime as timezone-aware ISO 8601 string (with UTC offset e.g. +00:00)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

UTCDateTime = Annotated[datetime, PlainSerializer(serialize_utc_datetime, return_type=str)]

# --- AUTH SCHEMAS ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    role: str
    sub_role: str
    assigned_cases: List[str] = []
    permissions: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class DemoUserItem(BaseModel):
    username: str
    role: str
    sub_role: str
    full_name: str
    assigned_cases: List[str]

# --- CASE SCHEMAS ---
class CaseAssignmentResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    role: str
    sub_role: str
    assignment_role: str

class CaseResponse(BaseModel):
    id: str
    title: str
    case_type: str
    status: str
    court_name: str
    filing_date: str
    next_hearing: Optional[str] = None
    description: Optional[str] = None
    connected_systems: List[str] = []
    documents_count: int = 0
    created_at: UTCDateTime
    is_authorized: bool = True

    model_config = ConfigDict(from_attributes=True)

class CaseDetailResponse(CaseResponse):
    people: List[CaseAssignmentResponse] = []
    documents: List["DocumentResponse"] = []
    recent_transactions: List["BlockchainRecordResponse"] = []
    user_permissions: List[str] = []

# --- DOCUMENT SCHEMAS ---
class DocumentVersionResponse(BaseModel):
    id: int
    document_id: str
    version_number: int
    file_name: str
    file_size: int
    mime_type: str
    sha256_hash: str
    change_summary: str
    uploader_name: Optional[str] = None
    created_at: UTCDateTime
    is_tampered: bool = False

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: str
    case_id: str
    case_title: Optional[str] = None
    title: str
    category: str
    classification: str = "PUBLIC_CASE_RECORD"
    current_version: int
    status: str
    is_restricted: bool
    restriction_reason: Optional[str] = None
    sha256_fingerprint: str
    uploaded_by: int
    uploader_name: Optional[str] = None
    created_at: UTCDateTime
    updated_at: UTCDateTime
    versions: List[DocumentVersionResponse] = []

    model_config = ConfigDict(from_attributes=True)

class DocumentVerifyResponse(BaseModel):
    document_id: str
    version_number: int
    is_valid: bool
    status: str  # VERIFIED, TAMPERED, RESTRICTED
    message: str
    computed_hash: str
    trusted_blockchain_hash: str
    verified_at: UTCDateTime

class CreateVersionRequest(BaseModel):
    change_summary: str

class ArchiveDocumentRequest(BaseModel):
    reason: str

# --- ACCESS REQUEST SCHEMAS ---
class AccessRequestCreate(BaseModel):
    case_id: str
    requested_permissions: List[str] = ["VIEW", "DOWNLOAD"]
    reason: str

class AccessRequestResponse(BaseModel):
    id: str
    user_id: int
    username: str
    user_full_name: str
    user_role: str
    case_id: str
    case_title: str
    requested_permissions: List[str]
    reason: str
    status: str  # PENDING, APPROVED, REJECTED
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[UTCDateTime] = None
    review_note: Optional[str] = None
    created_at: UTCDateTime

    model_config = ConfigDict(from_attributes=True)

class AccessRequestReview(BaseModel):
    status: str  # APPROVED or REJECTED
    review_note: Optional[str] = "Access granted per administrative review."

# --- BLOCKCHAIN SCHEMAS ---
class BlockchainRecordResponse(BaseModel):
    id: str
    sequence_number: int
    timestamp: UTCDateTime
    previous_hash: str
    transaction_hash: str
    event_type: str
    case_id: Optional[str] = None
    document_id: Optional[str] = None
    user_id: Optional[int] = None
    actor_name: str
    actor_role: str
    status: str
    details: Dict[str, Any] = {}
    human_description: str = ""

    model_config = ConfigDict(from_attributes=True)

class ChainVerificationResponse(BaseModel):
    is_valid: bool
    total_blocks: int
    verified_blocks: int
    genesis_hash: str
    tip_hash: str
    tampered_blocks: List[Dict[str, Any]] = []
    message: str

class BlockchainStatsResponse(BaseModel):
    total_transactions: int
    documents_registered: int
    versions_created: int
    permissions_logged: int
    integrity_checks: int
    last_block_hash: str
    chain_status: str  # VERIFIED_HEALTHY, TAMPER_DETECTED

# --- SECURITY SCHEMAS ---
class SecurityEventResponse(BaseModel):
    id: str
    timestamp: UTCDateTime
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    category: str
    title: str
    what_happened: str
    why_it_matters: str
    what_to_do: str
    actor_name: Optional[str] = None
    case_id: Optional[str] = None
    document_id: Optional[str] = None
    is_resolved: bool
    resolved_at: Optional[UTCDateTime] = None
    details: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)

class SecurityStatusResponse(BaseModel):
    status: str  # GREEN, YELLOW, RED
    headline: str
    description: str
    active_incidents_count: int
    unresolved_events: List[SecurityEventResponse] = []

# --- RECOVERY SCHEMAS ---
class RecoveryRecordResponse(BaseModel):
    id: str
    document_id: str
    document_title: str
    case_id: str
    version_number: int
    incident_id: Optional[str] = None
    trusted_hash: str
    tampered_hash: Optional[str] = None
    status: str
    restored_at: Optional[UTCDateTime] = None
    restorer_name: Optional[str] = None
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RestoreDocumentRequest(BaseModel):
    reason: str = "Authorized restoration from isolated recovery vault"

# --- CONNECTED SYSTEMS ---
class ConnectedSystemResponse(BaseModel):
    id: str
    system_name: str
    system_code: str
    description: str
    status: str
    records_count: int
    last_sync: UTCDateTime
    badge: str

    model_config = ConfigDict(from_attributes=True)

# --- AUDIT SCHEMAS ---
class AuditEventResponse(BaseModel):
    id: str
    timestamp: UTCDateTime
    actor_name: str
    actor_role: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: str
    outcome: str
    details: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)

# --- SIMULATION SCHEMAS ---
class SimulationActionResponse(BaseModel):
    success: bool
    simulation_type: str
    message: str
    target_resource: Optional[str] = None
    security_event_id: Optional[str] = None
    blockchain_tx_id: Optional[str] = None
    recommended_recovery_action: Optional[str] = None
