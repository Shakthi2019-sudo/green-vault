from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, nullable=False)
    role = Column(String(64), nullable=False)  # JUDGE, LAWYER, CLIENT, COURT_ADMIN, SECURITY_SIMULATION
    sub_role = Column(String(64), nullable=False)  # Assigned Judge, Lead Lawyer, Court Administrator, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assignments = relationship("CaseAssignment", back_populates="user", cascade="all, delete-orphan")
    permissions = relationship("Permission", foreign_keys="[Permission.user_id]", back_populates="user")
    access_requests = relationship("AccessRequest", foreign_keys="[AccessRequest.user_id]", back_populates="user")

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)  # e.g., CASE-2026-001
    title = Column(String(255), nullable=False)
    case_type = Column(String(64), nullable=False)  # Civil Dispute, Contract Dispute, Property Dispute
    status = Column(String(32), default="ACTIVE")  # ACTIVE, UNDER_REVIEW, ADJUDICATED, CLOSED
    court_name = Column(String(255), nullable=False)
    filing_date = Column(String(32), nullable=False)
    next_hearing = Column(String(32), nullable=True)
    description = Column(Text, nullable=True)
    connected_systems = Column(Text, default="[]")  # JSON list of connected system keys
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    permissions = relationship("Permission", back_populates="case", cascade="all, delete-orphan")
    access_requests = relationship("AccessRequest", back_populates="case", cascade="all, delete-orphan")

class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignment_role = Column(String(64), nullable=False)  # Assigned Judge, Lead Lawyer, Litigant Client, etc.
    assigned_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="assignments")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)  # e.g., DOC-2026-001-PET
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)  # Petition, Evidence, Witness Statement, Court Order, etc.
    current_version = Column(Integer, default=1)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, RESTRICTED, ARCHIVED
    is_restricted = Column(Boolean, default=False)
    restriction_reason = Column(String(255), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case = relationship("Case", back_populates="documents")
    uploader = relationship("User")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version_number")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(64), ForeignKey("documents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    mime_type = Column(String(64), default="application/pdf")
    sha256_hash = Column(String(64), nullable=False)  # SHA-256 fingerprint of original file
    encrypted_file_path = Column(String(255), nullable=False)
    iv_hex = Column(String(32), nullable=False)  # 12-byte AES-GCM IV in hex
    tag_hex = Column(String(32), nullable=False)  # 16-byte AES-GCM Auth Tag in hex
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    change_summary = Column(String(255), default="Initial Document Registration")
    is_tampered = Column(Boolean, default=False)  # For security simulation
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="versions")
    uploader = relationship("User")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    document_id = Column(String(64), ForeignKey("documents.id"), nullable=True)
    permission_type = Column(String(32), nullable=False)  # VIEW, DOWNLOAD, UPLOAD, CREATE_VERSION, SHARE, ARCHIVE, APPROVE_ACCESS, VIEW_AUDIT, RECOVER
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    granted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="permissions")
    case = relationship("Case", back_populates="permissions")
    document = relationship("Document")
    granter = relationship("User", foreign_keys=[granted_by])

class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(String(64), primary_key=True, index=True)  # REQ-2026-001
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    requested_permissions = Column(Text, nullable=False)  # JSON list e.g. ["VIEW", "DOWNLOAD"]
    reason = Column(Text, nullable=False)
    status = Column(String(32), default="PENDING")  # PENDING, APPROVED, REJECTED
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="access_requests")
    case = relationship("Case", back_populates="access_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"

    id = Column(String(64), primary_key=True, index=True)  # TX-UUID
    sequence_number = Column(Integer, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_hash = Column(String(64), nullable=False)
    transaction_hash = Column(String(64), unique=True, nullable=False)
    event_type = Column(String(64), nullable=False)  # DOCUMENT_REGISTERED, VERSION_CREATED, PERMISSION_GRANTED, etc.
    case_id = Column(String(64), nullable=True, index=True)
    document_id = Column(String(64), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)
    actor_name = Column(String(128), nullable=False)
    actor_role = Column(String(64), nullable=False)
    status = Column(String(32), default="CONFIRMED")
    details_json = Column(Text, nullable=False, default="{}")

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String(64), primary_key=True, index=True)  # SEC-2026-001
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    risk_level = Column(String(32), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    category = Column(String(64), nullable=False)  # UNAUTHORIZED_ACCESS, INTEGRITY_MISMATCH, etc.
    title = Column(String(255), nullable=False)
    what_happened = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=False)
    what_to_do = Column(Text, nullable=False)
    actor_user_id = Column(Integer, nullable=True)
    actor_name = Column(String(128), nullable=True)
    case_id = Column(String(64), nullable=True)
    document_id = Column(String(64), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    details_json = Column(Text, nullable=True, default="{}")

class RecoveryRecord(Base):
    __tablename__ = "recovery_records"

    id = Column(String(64), primary_key=True, index=True)  # REC-2026-001
    document_id = Column(String(64), ForeignKey("documents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    incident_id = Column(String(64), nullable=True)
    trusted_hash = Column(String(64), nullable=False)
    tampered_hash = Column(String(64), nullable=True)
    restored_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    restored_at = Column(DateTime, nullable=True)
    status = Column(String(32), default="QUARANTINED")  # QUARANTINED, RESTORED
    details = Column(Text, nullable=True)

    document = relationship("Document")
    restorer = relationship("User")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, index=True)  # AUD-2026-001
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    actor_id = Column(Integer, nullable=True)
    actor_name = Column(String(128), nullable=False)
    actor_role = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    ip_address = Column(String(64), default="127.0.0.1")
    outcome = Column(String(32), default="SUCCESS")  # SUCCESS, DENIED, WARNING, ERROR
    details_json = Column(Text, default="{}")

class ConnectedSystem(Base):
    __tablename__ = "connected_systems"

    id = Column(String(64), primary_key=True)  # SYS-ECOURTS
    system_name = Column(String(64), nullable=False)  # eCourts, e-Filing, DigiLocker, ICJS, eSakshya
    system_code = Column(String(32), unique=True, nullable=False)
    description = Column(String(255), nullable=False)
    status = Column(String(32), default="CONNECTED_DEMO")
    records_count = Column(Integer, default=0)
    last_sync = Column(DateTime, default=datetime.utcnow)
    badge = Column(String(64), default="Demo Integration")
