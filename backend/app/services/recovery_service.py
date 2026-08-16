import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.config import settings
from app.models.models import Document, DocumentVersion, RecoveryRecord, SecurityEvent, User
from app.services.blockchain_service import BlockchainService

class RecoveryService:
    @classmethod
    def quarantine_tampered_document(
        cls,
        db: Session,
        document_id: str,
        incident_id: Optional[str] = None,
        tampered_hash: Optional[str] = None
    ) -> RecoveryRecord:
        """Quarantine a compromised/tampered document and mark for recovery review."""
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        doc.is_restricted = True
        doc.status = "RESTRICTED"
        doc.restriction_reason = "Quarantined due to unexpected integrity mismatch or security alert."

        latest_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == doc.current_version
        ).first()

        rec_id = f"REC-{uuid.uuid4().hex[:8].upper()}"
        rec = RecoveryRecord(
            id=rec_id,
            document_id=document_id,
            version_number=doc.current_version,
            incident_id=incident_id,
            trusted_hash=latest_version.sha256_hash if latest_version else "TRUSTED_HASH",
            tampered_hash=tampered_hash,
            status="QUARANTINED",
            details="Quarantined automatically. Pristine isolated recovery copy is available."
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    @classmethod
    def restore_trusted_version(
        cls,
        db: Session,
        document_id: str,
        user: User,
        reason: str = "Authorized recovery from isolated recovery vault"
    ) -> Dict[str, Any]:
        """
        Execute recovery:
        1. Copies pristine backup from Isolated Recovery Vault to Primary Vault.
        2. Clears tampered and restricted flags.
        3. Updates recovery record status.
        4. Resolves active security incidents on this document.
        5. Records recovery event to Blockchain Ledger.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == doc.current_version
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail="Version record not found")

        # Isolated recovery source path & target primary vault path
        recovery_path = settings.RECOVERY_VAULT_DIR / f"{document_id}_v{version.version_number}.master.enc"
        primary_path = Path(version.encrypted_file_path)

        if not recovery_path.exists():
            raise HTTPException(status_code=500, detail="Master backup copy not found in Isolated Recovery Vault")

        # Copy pristine recovery file to primary storage
        shutil.copyfile(recovery_path, primary_path)

        # Reset flags
        doc.is_restricted = False
        doc.status = "ACTIVE"
        doc.restriction_reason = None
        doc.updated_at = datetime.utcnow()

        version.is_tampered = False

        # Update recovery record
        rec = db.query(RecoveryRecord).filter(
            RecoveryRecord.document_id == document_id,
            RecoveryRecord.status == "QUARANTINED"
        ).order_by(RecoveryRecord.id.desc()).first()

        if not rec:
            rec = RecoveryRecord(
                id=f"REC-{uuid.uuid4().hex[:8].upper()}",
                document_id=document_id,
                version_number=version.version_number,
                trusted_hash=version.sha256_hash,
                status="RESTORED"
            )
            db.add(rec)

        rec.status = "RESTORED"
        rec.restored_by = user.id
        rec.restored_at = datetime.utcnow()
        rec.details = f"Restored successfully: {reason}"

        # Resolve associated security events
        events = db.query(SecurityEvent).filter(
            SecurityEvent.document_id == document_id,
            SecurityEvent.is_resolved == False
        ).all()
        for ev in events:
            ev.is_resolved = True
            ev.resolved_at = datetime.utcnow()

        db.commit()
        db.refresh(doc)

        # Record to Blockchain
        BlockchainService.recordRecovery(
            db=db,
            case_id=doc.case_id,
            document_id=doc.id,
            doc_title=doc.title,
            version_number=version.version_number,
            restored_hash=version.sha256_hash,
            user_id=user.id,
            actor_name=user.full_name,
            actor_role=user.sub_role or user.role,
            recovery_id=rec.id
        )

        return {
            "success": True,
            "document_id": document_id,
            "title": doc.title,
            "version": version.version_number,
            "trusted_hash": version.sha256_hash,
            "message": "Document restored successfully. Integrity verified ✓. Recovery event recorded on blockchain.",
            "recovery_record_id": rec.id
        }
