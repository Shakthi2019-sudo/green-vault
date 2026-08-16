import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import BlockchainTransaction
from app.schemas.schemas import BlockchainRecordResponse, ChainVerificationResponse, BlockchainStatsResponse
from app.services.blockchain_service import BlockchainService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/blockchain", tags=["Blockchain Ledger"])

@router.get("/records", response_model=List[BlockchainRecordResponse])
def get_blockchain_records(
    case_id: Optional[str] = None,
    document_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(BlockchainTransaction)
    if case_id:
        query = query.filter(BlockchainTransaction.case_id == case_id)
    if document_id:
        query = query.filter(BlockchainTransaction.document_id == document_id)

    txs = query.order_by(BlockchainTransaction.sequence_number.desc()).limit(limit).all()

    results = []
    for tx in txs:
        try:
            details_dict = json.loads(tx.details_json)
        except Exception:
            details_dict = {}

        results.append(BlockchainRecordResponse(
            id=tx.id,
            sequence_number=tx.sequence_number,
            timestamp=tx.timestamp,
            previous_hash=tx.previous_hash,
            transaction_hash=tx.transaction_hash,
            event_type=tx.event_type,
            case_id=tx.case_id,
            document_id=tx.document_id,
            user_id=tx.user_id,
            actor_name=tx.actor_name,
            actor_role=tx.actor_role,
            status=tx.status,
            details=details_dict,
            human_description=BlockchainService.format_human_description(tx)
        ))

    return results

@router.get("/verify-chain", response_model=ChainVerificationResponse)
def verify_blockchain_chain(db: Session = Depends(get_db)):
    """
    Cryptographic verification endpoint: Walks the chain from Genesis block (seq 1)
    to current tip, confirming every SHA-256 block hash and previous_hash linkage.
    """
    res = BlockchainService.verify_chain_integrity(db)
    return ChainVerificationResponse(**res)

@router.get("/stats", response_model=BlockchainStatsResponse)
def get_blockchain_stats(db: Session = Depends(get_db)):
    total = db.query(BlockchainTransaction).count()
    docs = db.query(BlockchainTransaction).filter(BlockchainTransaction.event_type == "DOCUMENT_REGISTERED").count()
    versions = db.query(BlockchainTransaction).filter(BlockchainTransaction.event_type == "VERSION_CREATED").count()
    perms = db.query(BlockchainTransaction).filter(BlockchainTransaction.event_type.in_(["PERMISSION_GRANTED", "PERMISSION_REVOKED"])).count()
    checks = db.query(BlockchainTransaction).filter(BlockchainTransaction.event_type == "INTEGRITY_CHECKED").count()

    last_tx = db.query(BlockchainTransaction).order_by(BlockchainTransaction.sequence_number.desc()).first()
    chain_ver = BlockchainService.verify_chain_integrity(db)

    return BlockchainStatsResponse(
        total_transactions=total,
        documents_registered=docs,
        versions_created=versions,
        permissions_logged=perms,
        integrity_checks=checks,
        last_block_hash=last_tx.transaction_hash if last_tx else "GENESIS_EMPTY",
        chain_status="VERIFIED_HEALTHY" if chain_ver["is_valid"] else "TAMPER_DETECTED"
    )
