import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile, status

from app.config import settings
from app.models.models import Document, DocumentVersion, User, Case
from app.utils.crypto import compute_sha256, encrypt_document_bytes, decrypt_document_bytes
from app.services.blockchain_service import BlockchainService

class DocumentService:
    @staticmethod
    def _get_primary_vault_path(doc_id: str, version: int) -> Path:
        return settings.PRIMARY_VAULT_DIR / f"{doc_id}_v{version}.enc"

    @staticmethod
    def _get_recovery_vault_path(doc_id: str, version: int) -> Path:
        return settings.RECOVERY_VAULT_DIR / f"{doc_id}_v{version}.master.enc"

    @classmethod
    def save_and_encrypt_document(
        cls,
        db: Session,
        case_id: str,
        title: str,
        category: str,
        file_bytes: bytes,
        file_name: str,
        mime_type: str,
        user: User,
        doc_id: Optional[str] = None
    ) -> Tuple[Document, DocumentVersion]:
        """
        Secure upload pipeline:
        1. Compute SHA-256 hash on original plaintext.
        2. Encrypt plaintext using AES-256-GCM.
        3. Save ciphertext to Primary Vault.
        4. Mirror pristine ciphertext to Isolated Recovery Vault.
        5. Create Document and DocumentVersion DB entities.
        6. Register event on the Hash-Chained Blockchain Ledger.
        """
        # Step 1: SHA-256 fingerprint
        sha256_hash = compute_sha256(file_bytes)
        file_size = len(file_bytes)

        # Step 2: AES-256-GCM Encryption
        ciphertext, iv_hex, tag_hex = encrypt_document_bytes(file_bytes)

        # Generate doc_id if not provided
        if not doc_id:
            cat_abbr = category[:3].upper() if len(category) >= 3 else "DOC"
            doc_id = f"DOC-{case_id.split('-')[-1]}-{cat_abbr}-{uuid.uuid4().hex[:4].upper()}"

        version_num = 1
        primary_path = cls._get_primary_vault_path(doc_id, version_num)
        recovery_path = cls._get_recovery_vault_path(doc_id, version_num)

        # Step 3 & 4: Write encrypted payloads to vaults
        with open(primary_path, "wb") as f:
            f.write(ciphertext)
        with open(recovery_path, "wb") as f:
            f.write(ciphertext)

        # Step 5: Database records
        now = datetime.utcnow()
        doc = Document(
            id=doc_id,
            case_id=case_id,
            title=title,
            category=category,
            current_version=version_num,
            status="ACTIVE",
            is_restricted=False,
            uploaded_by=user.id,
            created_at=now,
            updated_at=now
        )
        db.add(doc)
        db.flush()

        doc_version = DocumentVersion(
            document_id=doc_id,
            version_number=version_num,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            sha256_hash=sha256_hash,
            encrypted_file_path=str(primary_path),
            iv_hex=iv_hex,
            tag_hex=tag_hex,
            uploaded_by=user.id,
            change_summary="Initial Document Registration & Certification",
            is_tampered=False,
            created_at=now
        )
        db.add(doc_version)
        db.commit()
        db.refresh(doc)
        db.refresh(doc_version)

        # Step 6: Blockchain Event Registration
        BlockchainService.registerDocument(
            db=db,
            case_id=case_id,
            document_id=doc_id,
            doc_title=title,
            sha256_hash=sha256_hash,
            user_id=user.id,
            actor_name=user.full_name,
            actor_role=user.sub_role or user.role,
            category=category,
            version=version_num
        )

        return doc, doc_version

    @classmethod
    def create_new_version(
        cls,
        db: Session,
        document_id: str,
        file_bytes: bytes,
        file_name: str,
        mime_type: str,
        user: User,
        change_summary: str
    ) -> DocumentVersion:
        """
        Document versioning workflow:
        Preserves all prior versions immutably.
        Creates next version (e.g. v2, v3) with fresh encryption, hash, and blockchain record.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        next_version = doc.current_version + 1
        sha256_hash = compute_sha256(file_bytes)
        file_size = len(file_bytes)

        ciphertext, iv_hex, tag_hex = encrypt_document_bytes(file_bytes)
        primary_path = cls._get_primary_vault_path(document_id, next_version)
        recovery_path = cls._get_recovery_vault_path(document_id, next_version)

        with open(primary_path, "wb") as f:
            f.write(ciphertext)
        with open(recovery_path, "wb") as f:
            f.write(ciphertext)

        now = datetime.utcnow()
        doc.current_version = next_version
        doc.updated_at = now

        doc_version = DocumentVersion(
            document_id=document_id,
            version_number=next_version,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            sha256_hash=sha256_hash,
            encrypted_file_path=str(primary_path),
            iv_hex=iv_hex,
            tag_hex=tag_hex,
            uploaded_by=user.id,
            change_summary=change_summary,
            is_tampered=False,
            created_at=now
        )
        db.add(doc_version)
        db.commit()
        db.refresh(doc)
        db.refresh(doc_version)

        # Blockchain Version Event
        BlockchainService.createDocumentVersion(
            db=db,
            case_id=doc.case_id,
            document_id=document_id,
            doc_title=doc.title,
            version_number=next_version,
            sha256_hash=sha256_hash,
            user_id=user.id,
            actor_name=user.full_name,
            actor_role=user.sub_role or user.role,
            change_summary=change_summary
        )

        return doc_version

    @classmethod
    def get_decrypted_document_bytes(
        cls,
        db: Session,
        document_id: str,
        version_num: Optional[int] = None
    ) -> Tuple[bytes, DocumentVersion]:
        """
        Decrypt and retrieve document bytes for authorized viewing/download.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        v_num = version_num if version_num is not None else doc.current_version
        version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == v_num
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail=f"Version {v_num} not found")

        primary_path = Path(version.encrypted_file_path)
        if not primary_path.exists():
            raise HTTPException(status_code=500, detail="Encrypted file not found in Primary Vault")

        with open(primary_path, "rb") as f:
            ciphertext = f.read()

        try:
            plaintext = decrypt_document_bytes(ciphertext, version.iv_hex, version.tag_hex)
            return plaintext, version
        except Exception as e:
            # If ciphertext was tampered or tag mismatch
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Decryption integrity check failed: {str(e)}"
            )

    @classmethod
    def archive_document(
        cls,
        db: Session,
        document_id: str,
        user: User,
        reason: str
    ) -> Document:
        """
        Archive a document without permanently deleting any bytes or history.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        doc.status = "ARCHIVED"
        doc.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(doc)

        BlockchainService.archiveDocument(
            db=db,
            case_id=doc.case_id,
            document_id=doc.id,
            doc_title=doc.title,
            user_id=user.id,
            actor_name=user.full_name,
            actor_role=user.sub_role or user.role,
            reason=reason
        )

        return doc
