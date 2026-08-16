from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import Document, DocumentVersion, User, SecurityEvent, RecoveryRecord
from app.schemas.schemas import SimulationActionResponse
from app.services.security_service import SecurityService
from app.services.recovery_service import RecoveryService
from app.services.audit_service import AuditService
from app.services.blockchain_service import BlockchainService

router = APIRouter(prefix="/simulation", tags=["Security Simulation (DEMO ONLY)"])

@router.post("/tamper-document", response_model=SimulationActionResponse)
def simulate_document_tampering(
    document_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    DEMO ONLY: Safely simulates tampering of a document payload in Primary Vault.
    Demonstrates the automated response pipeline:
    1. Integrity Mismatch Flagged.
    2. Document Quarantined & Restricted.
    3. High-Risk Security Event Created with Plain-Language Guidance.
    4. Isolated Recovery Vault retains pristine master copy.
    5. Incident Recorded on Blockchain Ledger.
    """
    # Pick a document to simulate
    if not document_id:
        doc = db.query(Document).filter(Document.title.ilike("%Evidence%")).first()
        if not doc:
            doc = db.query(Document).first()
    else:
        doc = db.query(Document).filter(Document.id == document_id).first()

    if not doc:
        raise HTTPException(status_code=404, detail="No document available for simulation")

    # Mark latest version as tampered
    latest_v = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc.id,
        DocumentVersion.version_number == doc.current_version
    ).first()

    if latest_v:
        latest_v.is_tampered = True

    # Log security event
    sec_event = SecurityService.log_security_event(
        db=db,
        category="INTEGRITY_MISMATCH",
        title=f"Document Integrity Alert: '{doc.title}'",
        risk_level="HIGH",
        what_happened=f"Cryptographic fingerprint recalculation detected an unexpected modification in document '{doc.title}' ({doc.id}). Stored fingerprint does not match the immutable blockchain ledger hash.",
        why_it_matters="If a legal document is unexpectedly altered outside authorized versioning channels, it cannot be admitted as valid judicial evidence.",
        what_to_do="The document has been automatically quarantined. Review the Isolated Recovery Vault and restore the certified master copy.",
        case_id=doc.case_id,
        document_id=doc.id,
        details={
            "simulation": "DEMO_SAFE_SIMULATION",
            "tampered_version": doc.current_version,
            "trusted_hash": latest_v.sha256_hash if latest_v else "KNOWN_HASH"
        }
    )

    # Quarantine document in recovery vault
    rec_record = RecoveryService.quarantine_tampered_document(
        db=db,
        document_id=doc.id,
        incident_id=sec_event.id,
        tampered_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_TAMPERED"
    )

    AuditService.log_event(
        db=db,
        actor=None,
        action="TAMPER_SIMULATION",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="WARNING",
        details={"simulation_type": "DOCUMENT_TAMPERING", "target": doc.title}
    )

    return SimulationActionResponse(
        success=True,
        simulation_type="SIMULATED_DOCUMENT_TAMPERING",
        message=f"Document '{doc.title}' integrity alert simulated. Operation restricted, pristine copy preserved in Isolated Recovery Vault.",
        target_resource=doc.id,
        security_event_id=sec_event.id,
        recommended_recovery_action="Navigate to Recovery Vault to inspect and restore trusted copy."
    )

@router.post("/unauthorized-access", response_model=SimulationActionResponse)
def simulate_unauthorized_access(db: Session = Depends(get_db)):
    """DEMO ONLY: Simulates an unauthorized case access attempt."""
    sec_event = SecurityService.log_security_event(
        db=db,
        category="UNAUTHORIZED_ACCESS",
        title="Simulated Unauthorized Access Incident",
        risk_level="HIGH",
        what_happened="An unauthorized user role attempted direct API access to Case CASE-2026-003 without holding active case permissions.",
        why_it_matters="Case privacy protocols mandate that records remain invisible to non-assigned stakeholders unless granted by Court Administration.",
        what_to_do="Verify that access request workflows are enforced and no records were exposed.",
        case_id="CASE-2026-003",
        details={"simulation": True, "actor_role": "Unassigned Legal Assistant"}
    )
    return SimulationActionResponse(
        success=True,
        simulation_type="UNAUTHORIZED_ACCESS_ATTEMPT",
        message="Simulated unauthorized case access attempt logged and blocked.",
        target_resource="CASE-2026-003",
        security_event_id=sec_event.id
    )

@router.post("/failed-logins", response_model=SimulationActionResponse)
def simulate_failed_logins(db: Session = Depends(get_db)):
    """DEMO ONLY: Simulates multiple consecutive failed login attempts."""
    sec_event = SecurityService.log_security_event(
        db=db,
        category="FAILED_LOGINS",
        title="Multiple Failed Authentication Attempts",
        risk_level="MEDIUM",
        what_happened="5 consecutive failed login attempts recorded for account 'judge.001' from IP 192.168.1.104 within 60 seconds.",
        why_it_matters="Repeated incorrect passwords may indicate credential guessing or brute-force testing.",
        what_to_do="Account login rate-limiting has been enforced. Check with judicial staff if assistance is needed.",
        details={"simulation": True, "failed_count": 5, "target_user": "judge.001"}
    )
    return SimulationActionResponse(
        success=True,
        simulation_type="FAILED_LOGIN_BURST",
        message="Simulated 5 failed login attempts. Security status updated to YELLOW.",
        target_resource="judge.001",
        security_event_id=sec_event.id
    )

@router.post("/mass-modification", response_model=SimulationActionResponse)
def simulate_mass_modification(db: Session = Depends(get_db)):
    """DEMO ONLY: Simulates rapid suspicious modification attempts across multiple records."""
    sec_event = SecurityService.log_security_event(
        db=db,
        category="MASS_MODIFICATION",
        title="Suspicious Rapid Document Modifications",
        risk_level="CRITICAL",
        what_happened="Anomalous burst: 12 document alteration requests submitted across 3 distinct cases within 10 seconds.",
        why_it_matters="Bulk alterations without prior judicial scheduling can indicate an automated script or compromised credentials.",
        what_to_do="Automated circuit-breaker triggered: Document editing temporarily paused for affected sessions.",
        details={"simulation": True, "burst_count": 12}
    )
    return SimulationActionResponse(
        success=True,
        simulation_type="MASS_MODIFICATION_ANOMALY",
        message="Simulated mass modification anomaly. Security status set to RED.",
        target_resource="SYSTEM_WIDE",
        security_event_id=sec_event.id
    )

@router.post("/reset", response_model=SimulationActionResponse)
def reset_security_simulation(db: Session = Depends(get_db)):
    """DEMO ONLY: Reset all simulated security events and restore clean state."""
    # Resolve all security events
    events = db.query(SecurityEvent).all()
    for ev in events:
        ev.is_resolved = True

    # Reset all tampered documents
    docs = db.query(Document).all()
    for d in docs:
        d.is_restricted = False
        d.status = "ACTIVE"
        d.restriction_reason = None

    versions = db.query(DocumentVersion).all()
    for v in versions:
        v.is_tampered = False

    recs = db.query(RecoveryRecord).all()
    for r in recs:
        r.status = "RESTORED"

    db.commit()

    return SimulationActionResponse(
        success=True,
        simulation_type="SIMULATION_RESET",
        message="All simulation flags cleared. System status restored to GREEN ✓."
    )
