import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import Case, Document, User, BlockchainTransaction, CaseAssignment
from app.schemas.schemas import CaseResponse, CaseDetailResponse, CaseAssignmentResponse, DocumentResponse, DocumentVersionResponse, BlockchainRecordResponse
from app.services.auth_service import get_current_user, get_user_permissions_list
from app.services.permission_service import PermissionService
from app.services.blockchain_service import BlockchainService
from app.services.security_service import SecurityService

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.get("", response_model=List[CaseResponse])
def get_cases(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_cases = db.query(Case).order_by(Case.id.asc()).all()
    results = []

    for c in all_cases:
        is_auth = PermissionService.user_has_case_access(db, current_user, c.id, "VIEW")
        if is_auth:
            case_docs = db.query(Document).filter(Document.case_id == c.id).all()
            doc_count = len(PermissionService.filter_case_documents_for_user(db, current_user, case_docs))
        else:
            doc_count = 0
        systems = json.loads(c.connected_systems) if c.connected_systems else []

        results.append(CaseResponse(
            id=c.id,
            title=c.title,
            case_type=c.case_type,
            status=c.status,
            court_name=c.court_name,
            filing_date=c.filing_date,
            next_hearing=c.next_hearing,
            description=c.description,
            connected_systems=systems,
            documents_count=doc_count,
            created_at=c.created_at,
            is_authorized=is_auth
        ))

    return results

@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case_detail(case_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    is_auth = PermissionService.user_has_case_access(db, current_user, case.id, "VIEW")
    if not is_auth:
        # Log unauthorized attempt as a security event
        SecurityService.log_security_event(
            db=db,
            category="UNAUTHORIZED_ACCESS",
            title=f"Unauthorized Case Access Attempt ({case_id})",
            risk_level="HIGH",
            what_happened=f"User {current_user.full_name} ({current_user.sub_role}) attempted to view case {case_id} without active authorization.",
            why_it_matters="Legal documents and case records must be restricted strictly to assigned parties and authorized judicial officers.",
            what_to_do="If access is legitimately required, the user must submit an Access Request for Court Administrator review.",
            actor_user=current_user,
            case_id=case_id
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not currently authorized to view this case."
        )

    # Fetch People
    assignments = db.query(CaseAssignment).filter(CaseAssignment.case_id == case_id).all()
    people_resp = []
    for a in assignments:
        u = a.user
        people_resp.append(CaseAssignmentResponse(
            user_id=u.id,
            username=u.username,
            full_name=u.full_name,
            role=u.role,
            sub_role=u.sub_role,
            assignment_role=a.assignment_role
        ))

    # Fetch Documents (Filtered by Role & Classification Access)
    raw_docs = db.query(Document).filter(Document.case_id == case_id).all()
    docs = PermissionService.filter_case_documents_for_user(db, current_user, raw_docs)

    docs_resp = []
    for d in docs:
        versions_resp = []
        for v in d.versions:
            uploader = db.query(User).filter(User.id == v.uploaded_by).first()
            versions_resp.append(DocumentVersionResponse(
                id=v.id,
                document_id=v.document_id,
                version_number=v.version_number,
                file_name=v.file_name,
                file_size=v.file_size,
                mime_type=v.mime_type,
                sha256_hash=v.sha256_hash,
                change_summary=v.change_summary,
                uploader_name=uploader.full_name if uploader else "Registrar",
                created_at=v.created_at,
                is_tampered=v.is_tampered
            ))

        uploader = db.query(User).filter(User.id == d.uploaded_by).first()
        latest_version = d.versions[-1] if d.versions else None

        docs_resp.append(DocumentResponse(
            id=d.id,
            case_id=d.case_id,
            case_title=case.title,
            title=d.title,
            category=d.category,
            classification=getattr(d, "classification", "PUBLIC_CASE_RECORD") or "PUBLIC_CASE_RECORD",
            current_version=d.current_version,
            status=d.status,
            is_restricted=d.is_restricted,
            restriction_reason=d.restriction_reason,
            sha256_fingerprint=latest_version.sha256_hash if latest_version else "N/A",
            uploaded_by=d.uploaded_by,
            uploader_name=uploader.full_name if uploader else "Registrar",
            created_at=d.created_at,
            updated_at=d.updated_at,
            versions=versions_resp
        ))

    # Fetch Recent Blockchain Transactions for this case
    txs = db.query(BlockchainTransaction).filter(
        BlockchainTransaction.case_id == case_id
    ).order_by(BlockchainTransaction.sequence_number.desc()).limit(15).all()

    tx_resp = []
    for tx in txs:
        try:
            details_dict = json.loads(tx.details_json)
        except Exception:
            details_dict = {}

        tx_resp.append(BlockchainRecordResponse(
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

    systems = json.loads(case.connected_systems) if case.connected_systems else []
    user_perms = get_user_permissions_list(db, current_user.id)

    return CaseDetailResponse(
        id=case.id,
        title=case.title,
        case_type=case.case_type,
        status=case.status,
        court_name=case.court_name,
        filing_date=case.filing_date,
        next_hearing=case.next_hearing,
        description=case.description,
        connected_systems=systems,
        documents_count=len(docs),
        created_at=case.created_at,
        is_authorized=True,
        people=people_resp,
        documents=docs_resp,
        recent_transactions=tx_resp,
        user_permissions=user_perms
    )
