import json
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import BlockchainTransaction

GENESIS_PREVIOUS_HASH = "0" * 64

class BlockchainService:
    @staticmethod
    def _compute_hash(
        sequence_number: int,
        timestamp_str: str,
        previous_hash: str,
        event_type: str,
        case_id: Optional[str],
        document_id: Optional[str],
        user_id: Optional[int],
        status: str,
        details_json: str
    ) -> str:
        """Compute cryptographic SHA-256 hash of a blockchain transaction block."""
        block_content = (
            f"{sequence_number}|{timestamp_str}|{previous_hash}|{event_type}|"
            f"{case_id or ''}|{document_id or ''}|{user_id or ''}|{status}|{details_json}"
        )
        return hashlib.sha256(block_content.encode("utf-8")).hexdigest()

    @classmethod
    def record_event(
        cls,
        db: Session,
        event_type: str,
        actor_name: str,
        actor_role: str,
        case_id: Optional[str] = None,
        document_id: Optional[str] = None,
        user_id: Optional[int] = None,
        status: str = "CONFIRMED",
        details: Optional[Dict[str, Any]] = None
    ) -> BlockchainTransaction:
        """
        Append a new tamper-evident transaction to the hash-chained ledger.
        """
        details = details or {}
        details_json = json.dumps(details, sort_keys=True)

        # Retrieve last transaction to link previous_hash
        last_tx = db.query(BlockchainTransaction).order_by(BlockchainTransaction.sequence_number.desc()).first()
        if last_tx:
            seq = last_tx.sequence_number + 1
            prev_hash = last_tx.transaction_hash
        else:
            seq = 1
            prev_hash = GENESIS_PREVIOUS_HASH

        tx_id = f"TX-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.utcnow()
        timestamp_iso = now.isoformat()

        tx_hash = cls._compute_hash(
            sequence_number=seq,
            timestamp_str=timestamp_iso,
            previous_hash=prev_hash,
            event_type=event_type,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status=status,
            details_json=details_json
        )

        tx = BlockchainTransaction(
            id=tx_id,
            sequence_number=seq,
            timestamp=now,
            previous_hash=prev_hash,
            transaction_hash=tx_hash,
            event_type=event_type,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            actor_name=actor_name,
            actor_role=actor_role,
            status=status,
            details_json=details_json
        )

        db.add(tx)
        db.commit()
        db.refresh(tx)
        return tx

    # --- REQUIRED BLOCKCHAIN METHODS ---

    @classmethod
    def registerDocument(
        cls, db: Session, case_id: str, document_id: str, doc_title: str,
        sha256_hash: str, user_id: int, actor_name: str, actor_role: str,
        category: str, version: int = 1
    ) -> BlockchainTransaction:
        """Register initial document with SHA-256 fingerprint onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="DOCUMENT_REGISTERED",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status="CONFIRMED",
            details={
                "action": "Register Initial Document",
                "document_title": doc_title,
                "category": category,
                "version": version,
                "sha256_fingerprint": sha256_hash,
                "encryption": "AES-256-GCM Encrypted Storage"
            }
        )

    @classmethod
    def createDocumentVersion(
        cls, db: Session, case_id: str, document_id: str, doc_title: str,
        version_number: int, sha256_hash: str, user_id: int,
        actor_name: str, actor_role: str, change_summary: str
    ) -> BlockchainTransaction:
        """Record newly created document version onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="VERSION_CREATED",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status="CONFIRMED",
            details={
                "action": f"Create Document Version {version_number}",
                "document_title": doc_title,
                "version_number": version_number,
                "change_summary": change_summary,
                "sha256_fingerprint": sha256_hash
            }
        )

    @classmethod
    def grantPermission(
        cls, db: Session, case_id: str, target_user_name: str, target_user_role: str,
        permissions: List[str], granter_id: int, granter_name: str, granter_role: str,
        document_id: Optional[str] = None
    ) -> BlockchainTransaction:
        """Record granted access permission onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="PERMISSION_GRANTED",
            actor_name=granter_name,
            actor_role=granter_role,
            case_id=case_id,
            document_id=document_id,
            user_id=granter_id,
            status="CONFIRMED",
            details={
                "action": "Grant Access Permission",
                "target_user": target_user_name,
                "target_role": target_user_role,
                "permissions_granted": permissions,
                "scope": "Case Level" if not document_id else f"Document: {document_id}"
            }
        )

    @classmethod
    def revokePermission(
        cls, db: Session, case_id: str, target_user_name: str,
        revoked_permissions: List[str], revoker_id: int, revoker_name: str, revoker_role: str
    ) -> BlockchainTransaction:
        """Record revoked permission onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="PERMISSION_REVOKED",
            actor_name=revoker_name,
            actor_role=revoker_role,
            case_id=case_id,
            user_id=revoker_id,
            status="CONFIRMED",
            details={
                "action": "Revoke Access Permission",
                "target_user": target_user_name,
                "revoked_permissions": revoked_permissions
            }
        )

    @classmethod
    def recordAccess(
        cls, db: Session, case_id: str, document_id: str,
        user_id: int, actor_name: str, actor_role: str, action: str = "VIEW"
    ) -> BlockchainTransaction:
        """Record authorized document access onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="ACCESS_LOGGED",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status="CONFIRMED",
            details={
                "action": f"Authorized Document Access ({action})",
                "access_type": action
            }
        )

    @classmethod
    def archiveDocument(
        cls, db: Session, case_id: str, document_id: str, doc_title: str,
        user_id: int, actor_name: str, actor_role: str, reason: str
    ) -> BlockchainTransaction:
        """Record document archival onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="DOCUMENT_ARCHIVED",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status="CONFIRMED",
            details={
                "action": "Archive Legal Document",
                "document_title": doc_title,
                "reason": reason,
                "immutability_note": "Record preserved in encrypted vault; status changed to archived."
            }
        )

    @classmethod
    def recordIntegrityCheck(
        cls, db: Session, case_id: str, document_id: str, doc_title: str,
        version_number: int, computed_hash: str, trusted_hash: str,
        is_valid: bool, user_id: int, actor_name: str, actor_role: str
    ) -> BlockchainTransaction:
        """Record live integrity verification outcome onto blockchain."""
        status = "CONFIRMED" if is_valid else "FLAGGED"
        return cls.record_event(
            db=db,
            event_type="INTEGRITY_CHECKED",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status=status,
            details={
                "action": "Document Integrity Check",
                "document_title": doc_title,
                "version_number": version_number,
                "computed_hash": computed_hash,
                "trusted_hash": trusted_hash,
                "integrity_result": "MATCH_VERIFIED" if is_valid else "UNEXPECTED_MISMATCH_DETECTED"
            }
        )

    @classmethod
    def recordSecurityIncident(
        cls, db: Session, incident_id: str, incident_type: str,
        risk_level: str, actor_name: str, actor_role: str,
        case_id: Optional[str] = None, document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> BlockchainTransaction:
        """Record security incident detection onto blockchain."""
        tx_details = {
            "incident_id": incident_id,
            "incident_type": incident_type,
            "risk_level": risk_level,
            **(details or {})
        }
        return cls.record_event(
            db=db,
            event_type="SECURITY_INCIDENT",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            status="RESTRICTED",
            details=tx_details
        )

    @classmethod
    def recordRecovery(
        cls, db: Session, case_id: str, document_id: str, doc_title: str,
        version_number: int, restored_hash: str, user_id: int,
        actor_name: str, actor_role: str, recovery_id: str
    ) -> BlockchainTransaction:
        """Record recovery from isolated vault onto blockchain."""
        return cls.record_event(
            db=db,
            event_type="DOCUMENT_RESTORED",
            actor_name=actor_name,
            actor_role=actor_role,
            case_id=case_id,
            document_id=document_id,
            user_id=user_id,
            status="CONFIRMED",
            details={
                "action": "Restore from Isolated Recovery Vault",
                "recovery_id": recovery_id,
                "document_title": doc_title,
                "version_number": version_number,
                "restored_hash": restored_hash,
                "integrity_status": "Restored & Re-verified ✓"
            }
        )

    # --- CRYPTOGRAPHIC CHAIN INTEGRITY AUDIT ---

    @classmethod
    def verify_chain_integrity(cls, db: Session) -> Dict[str, Any]:
        """
        Traverse the entire hash-chained ledger from genesis block (seq 1) to tip.
        Recalculates every block hash and verifies previous_hash links.
        Returns full audit report.
        """
        transactions = db.query(BlockchainTransaction).order_by(BlockchainTransaction.sequence_number.asc()).all()

        if not transactions:
            return {
                "is_valid": True,
                "total_blocks": 0,
                "verified_blocks": 0,
                "genesis_hash": "",
                "tip_hash": "",
                "tampered_blocks": [],
                "message": "Blockchain ledger is empty (Genesis pending)."
            }

        tampered_blocks = []
        expected_prev_hash = GENESIS_PREVIOUS_HASH

        for idx, tx in enumerate(transactions):
            # Check 1: Sequence number continuity
            if tx.sequence_number != idx + 1:
                tampered_blocks.append({
                    "sequence_number": tx.sequence_number,
                    "tx_id": tx.id,
                    "reason": f"Invalid sequence number {tx.sequence_number}, expected {idx + 1}"
                })

            # Check 2: Previous hash link
            if tx.previous_hash != expected_prev_hash:
                tampered_blocks.append({
                    "sequence_number": tx.sequence_number,
                    "tx_id": tx.id,
                    "reason": f"Broken chain link: previous_hash is {tx.previous_hash}, expected {expected_prev_hash}"
                })

            # Check 3: Block internal cryptographic hash
            computed = cls._compute_hash(
                sequence_number=tx.sequence_number,
                timestamp_str=tx.timestamp.isoformat(),
                previous_hash=tx.previous_hash,
                event_type=tx.event_type,
                case_id=tx.case_id,
                document_id=tx.document_id,
                user_id=tx.user_id,
                status=tx.status,
                details_json=tx.details_json
            )

            if computed != tx.transaction_hash:
                tampered_blocks.append({
                    "sequence_number": tx.sequence_number,
                    "tx_id": tx.id,
                    "reason": f"Hash mismatch: stored {tx.transaction_hash}, computed {computed}"
                })

            expected_prev_hash = tx.transaction_hash

        is_valid = len(tampered_blocks) == 0
        return {
            "is_valid": is_valid,
            "total_blocks": len(transactions),
            "verified_blocks": len(transactions) - len(tampered_blocks),
            "genesis_hash": transactions[0].transaction_hash if transactions else "",
            "tip_hash": transactions[-1].transaction_hash if transactions else "",
            "tampered_blocks": tampered_blocks,
            "message": "Chain Verified ✓ 0 Tampering Detected" if is_valid else f"Tampering detected in {len(tampered_blocks)} block(s)!"
        }

    @classmethod
    def format_human_description(cls, tx: BlockchainTransaction) -> str:
        """Format human readable description for UI."""
        try:
            details = json.loads(tx.details_json)
        except Exception:
            details = {}

        if tx.event_type == "DOCUMENT_REGISTERED":
            return f"Document '{details.get('document_title', tx.document_id)}' registered and fingerprinted ✓"
        elif tx.event_type == "VERSION_CREATED":
            return f"New Version {details.get('version_number', '')} created for '{details.get('document_title', tx.document_id)}' ✓"
        elif tx.event_type == "PERMISSION_GRANTED":
            return f"Access granted to {details.get('target_user', 'user')} ({details.get('scope', 'case')}) ✓"
        elif tx.event_type == "PERMISSION_REVOKED":
            return f"Access revoked for {details.get('target_user', 'user')} ✓"
        elif tx.event_type == "ACCESS_LOGGED":
            return f"Document accessed by {tx.actor_name} ({tx.actor_role}) ✓"
        elif tx.event_type == "DOCUMENT_ARCHIVED":
            return f"Document '{details.get('document_title', tx.document_id)}' archived (History preserved) ✓"
        elif tx.event_type == "INTEGRITY_CHECKED":
            res = details.get("integrity_result")
            if res == "MATCH_VERIFIED":
                return f"Integrity check passed for '{details.get('document_title', tx.document_id)}' ✓"
            return f"Integrity check FLAGGED mismatch for '{details.get('document_title', tx.document_id)}' ⚠️"
        elif tx.event_type == "SECURITY_INCIDENT":
            return f"Security incident logged: {details.get('incident_type', 'Suspicious activity')} ({tx.status}) ⚠️"
        elif tx.event_type == "DOCUMENT_RESTORED":
            return f"Document '{details.get('document_title', tx.document_id)}' restored from isolated recovery vault ✓"
        return f"Event {tx.event_type} recorded on blockchain ledger ✓"
