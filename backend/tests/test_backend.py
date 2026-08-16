import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.models import (
    User, Case, Document, DocumentVersion, Permission,
    AccessRequest, BlockchainTransaction, SecurityEvent, RecoveryRecord
)
from app.utils.crypto import (
    hash_password, verify_password,
    encrypt_document_bytes, decrypt_document_bytes,
    compute_sha256
)
from app.services.blockchain_service import BlockchainService
from app.services.document_service import DocumentService
from app.services.permission_service import PermissionService
from app.services.integrity_service import IntegrityService
from app.services.recovery_service import RecoveryService
from app.services.security_service import SecurityService

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_argon2id_password_hashing():
    raw = "Vault@Test2026SecretKey"
    hashed = hash_password(raw)
    assert hashed != raw
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword@123", hashed) is False

def test_aes_256_gcm_encryption_roundtrip():
    secret_text = b"CONFIDENTIAL LEGAL MEMORANDUM - HIGH COURT BENCH II"
    ciphertext, iv_hex, tag_hex = encrypt_document_bytes(secret_text)

    assert ciphertext != secret_text
    assert len(iv_hex) == 24  # 12 bytes = 24 hex chars
    assert len(tag_hex) == 32  # 16 bytes = 32 hex chars

    decrypted = decrypt_document_bytes(ciphertext, iv_hex, tag_hex)
    assert decrypted == secret_text

def test_sha256_document_integrity():
    doc_a = b"Original Petition Content"
    doc_b = b"Modified Petition Content"

    hash_a = compute_sha256(doc_a)
    hash_b = compute_sha256(doc_b)

    assert len(hash_a) == 64
    assert hash_a != hash_b
    assert compute_sha256(doc_a) == hash_a

def test_blockchain_hash_chained_ledger(db):
    # Genesis transaction
    tx1 = BlockchainService.record_event(
        db=db,
        event_type="DOCUMENT_REGISTERED",
        actor_name="Registrar General",
        actor_role="Court Administrator",
        case_id="CASE-2026-001",
        document_id="DOC-001",
        details={"title": "Case_Registration.pdf"}
    )
    assert tx1.sequence_number == 1
    assert tx1.previous_hash == "0" * 64
    assert len(tx1.transaction_hash) == 64

    # Second transaction linked to tx1
    tx2 = BlockchainService.record_event(
        db=db,
        event_type="VERSION_CREATED",
        actor_name="Adv. Vikram Sethi",
        actor_role="Lead Lawyer",
        case_id="CASE-2026-001",
        document_id="DOC-001",
        details={"version": 2}
    )
    assert tx2.sequence_number == 2
    assert tx2.previous_hash == tx1.transaction_hash

    # Verify blockchain chain integrity
    report = BlockchainService.verify_chain_integrity(db)
    assert report["is_valid"] is True
    assert report["total_blocks"] == 2
    assert len(report["tampered_blocks"]) == 0

def test_blockchain_tamper_detection(db):
    # Record 3 transactions
    tx1 = BlockchainService.record_event(db, "TX1", "Actor1", "Role1", "CASE-001")
    tx2 = BlockchainService.record_event(db, "TX2", "Actor2", "Role2", "CASE-001")
    tx3 = BlockchainService.record_event(db, "TX3", "Actor3", "Role3", "CASE-001")

    # Tamper with tx2's stored details without updating hash
    tx2.details_json = '{"tampered": true}'
    db.commit()

    # Blockchain verification must detect tampering
    report = BlockchainService.verify_chain_integrity(db)
    assert report["is_valid"] is False
    assert len(report["tampered_blocks"]) > 0

def test_access_request_approval_workflow(db):
    user = User(username="Judge-001", password_hash="hash", full_name="Hon. Justice Sharma", email="judge@test.com", role="JUDGE", sub_role="Assigned Judge")
    admin = User(username="Admin-001", password_hash="hash", full_name="Registrar Admin", email="admin@test.com", role="COURT_ADMIN", sub_role="Court Administrator")
    case = Case(id="CASE-2026-003", title="Heritage Estate", case_type="Property", court_name="High Court", filing_date="2026-01-01")

    db.add_all([user, admin, case])
    db.commit()

    # Initially unauthorized
    assert PermissionService.user_has_case_access(db, user, case.id, "VIEW") is False

    # Create request
    req = PermissionService.create_access_request(db, user, case.id, ["VIEW", "DOWNLOAD"], "Judicial review assignment")
    assert req.status == "PENDING"

    # Admin approves
    resolved_req = PermissionService.review_access_request(db, req.id, admin, is_approved=True)
    assert resolved_req.status == "APPROVED"

    # Now authorized
    assert PermissionService.user_has_case_access(db, user, case.id, "VIEW") is True
