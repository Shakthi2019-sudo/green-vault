from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import RecoveryRecord, Document, User
from app.schemas.schemas import RecoveryRecordResponse, RestoreDocumentRequest
from app.services.auth_service import get_current_user
from app.services.recovery_service import RecoveryService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/recovery", tags=["Isolated Recovery Vault"])

@router.get("/records", response_model=List[RecoveryRecordResponse])
def get_recovery_records(
    db: Session = Depends(get_db)
):
    records = db.query(RecoveryRecord).order_by(RecoveryRecord.id.desc()).all()
    results = []

    for r in records:
        doc = db.query(Document).filter(Document.id == r.document_id).first()
        restorer = db.query(User).filter(User.id == r.restored_by).first() if r.restored_by else None

        results.append(RecoveryRecordResponse(
            id=r.id,
            document_id=r.document_id,
            document_title=doc.title if doc else r.document_id,
            case_id=doc.case_id if doc else "N/A",
            version_number=r.version_number,
            incident_id=r.incident_id,
            trusted_hash=r.trusted_hash,
            tampered_hash=r.tampered_hash,
            status=r.status,
            restored_at=r.restored_at,
            restorer_name=restorer.full_name if restorer else None,
            details=r.details
        ))

    return results

@router.post("/{document_id}/restore")
def restore_document_from_recovery_vault(
    document_id: str,
    req_body: RestoreDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only Judge or Court Administrator can restore
    if current_user.role not in ["JUDGE", "COURT_ADMIN", "ADMIN"] and "Administrator" not in current_user.sub_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Judges and Court Administrators have authority to execute recovery operations from the isolated vault."
        )

    res = RecoveryService.restore_trusted_version(
        db=db,
        document_id=document_id,
        user=current_user,
        reason=req_body.reason
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="RESTORE_DOCUMENT",
        resource_type="RECOVERY",
        resource_id=document_id,
        outcome="SUCCESS",
        details={"reason": req_body.reason, "recovery_record_id": res.get("recovery_record_id")}
    )

    return res
