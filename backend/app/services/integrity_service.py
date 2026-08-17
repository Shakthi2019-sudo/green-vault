from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.models import Document, DocumentVersion, User
from app.utils.crypto import compute_sha256, decrypt_document_bytes
from app.services.blockchain_service import BlockchainService

class IntegrityService:
    @classmethod
    def verify_document_version(
        cls,
        db: Session,
        document_id: str,
        version_number: int,
        user: User
    ) -> Dict[str, Any]:
        """
        Cryptographic document integrity verification:
        1. Reads stored ciphertext from Primary Vault.
        2. Decrypts with AES-256-GCM.
        3. Recalculates SHA-256 fingerprint.
        4. Compares with immutable blockchain record hash.
        5. Returns status and records verification event to ledger.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version_number
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail=f"Version {version_number} not found")

        trusted_hash = version.sha256_hash
        file_path = Path(version.encrypted_file_path)

        if not file_path.exists():
            return {
                "document_id": document_id,
                "version_number": version_number,
                "is_valid": False,
                "status": "FILE_MISSING",
                "message": "Critical: Vault payload file missing from storage.",
                "computed_hash": "N/A",
                "trusted_blockchain_hash": trusted_hash,
                "verified_at": datetime.now(timezone.utc)
            }

        # Check if marked as simulated tampered
        if version.is_tampered or doc.is_restricted:
            # Simulated tampered state
            computed_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_TAMPERED"
            is_valid = False
            status_str = "TAMPERED"
            message = "Warning: This document does not match its trusted record. Unexpected change detected."
        else:
            try:
                with open(file_path, "rb") as f:
                    ciphertext = f.read()

                plaintext = decrypt_document_bytes(ciphertext, version.iv_hex, version.tag_hex)
                computed_hash = compute_sha256(plaintext)
                is_valid = (computed_hash == trusted_hash)

                if is_valid:
                    status_str = "VERIFIED"
                    message = "Document verified. No unexpected changes detected."
                else:
                    status_str = "TAMPERED"
                    message = "Warning: This document does not match its trusted record. Unexpected change detected."
            except Exception:
                # Decryption tag failure or corrupted ciphertext
                computed_hash = "CORRUPTED_CIPHERTEXT_TAG_MISMATCH"
                is_valid = False
                status_str = "TAMPERED"
                message = "Warning: Document decryption tag mismatch. Unexpected ciphertext modification detected."

        # Record check event to Blockchain
        BlockchainService.recordIntegrityCheck(
            db=db,
            case_id=doc.case_id,
            document_id=doc.id,
            doc_title=doc.title,
            version_number=version_number,
            computed_hash=computed_hash,
            trusted_hash=trusted_hash,
            is_valid=is_valid,
            user_id=user.id,
            actor_name=user.full_name,
            actor_role=user.sub_role or user.role
        )

        return {
            "document_id": document_id,
            "version_number": version_number,
            "is_valid": is_valid,
            "status": status_str,
            "message": message,
            "computed_hash": computed_hash,
            "trusted_blockchain_hash": trusted_hash,
            "verified_at": datetime.now(timezone.utc)
        }
