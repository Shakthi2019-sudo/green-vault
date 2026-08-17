from io import BytesIO
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database.database import get_db
from app.models.models import Document, DocumentVersion, User, Case
from app.schemas.schemas import DocumentResponse, DocumentVersionResponse, DocumentVerifyResponse, ArchiveDocumentRequest
from app.services.auth_service import get_current_user
from app.services.permission_service import PermissionService
from app.services.document_service import DocumentService
from app.services.integrity_service import IntegrityService
from app.services.audit_service import AuditService
from app.services.blockchain_service import BlockchainService

router = APIRouter(prefix="/documents", tags=["Documents"])

def validate_uploaded_file(file: UploadFile, file_bytes: bytes) -> str:
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if not ext or ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file type is not supported."
        )

    file_size_mb = len(file_bytes) / (1024 * 1024)
    if ext in settings.VIDEO_EXTENSIONS:
        if file_size_mb > settings.MAX_VIDEO_SIZE_MB:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video file exceeds maximum allowed size ({settings.MAX_VIDEO_SIZE_MB} MB)."
            )
    elif ext in settings.IMAGE_EXTENSIONS:
        if file_size_mb > settings.MAX_IMAGE_SIZE_MB:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image file exceeds maximum allowed size ({settings.MAX_IMAGE_SIZE_MB} MB)."
            )
    else:
        if file_size_mb > settings.MAX_DOCUMENT_SIZE_MB:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Document file exceeds maximum allowed size ({settings.MAX_DOCUMENT_SIZE_MB} MB)."
            )

    return ext

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    case_id: str = Form(...),
    title: str = Form(...),
    category: str = Form(...),
    classification: str = Form("PUBLIC_CASE_RECORD"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check upload permissions (Judges, Lawyers, Court Admins)
    if not PermissionService.user_has_case_access(db, current_user, case_id, "UPLOAD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to upload documents to this case."
        )

    file_bytes = await file.read()
    validate_uploaded_file(file, file_bytes)

    file_name = file.filename or f"{title.replace(' ', '_')}.pdf"
    mime_type = file.content_type or "application/pdf"

    doc, doc_version = DocumentService.save_and_encrypt_document(
        db=db,
        case_id=case_id,
        title=title,
        category=category,
        classification=classification,
        file_bytes=file_bytes,
        file_name=file_name,
        mime_type=mime_type,
        user=current_user
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="UPLOAD_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"case_id": case_id, "title": title, "classification": classification, "sha256": doc_version.sha256_hash}
    )

    case = db.query(Case).filter(Case.id == case_id).first()

    return DocumentResponse(
        id=doc.id,
        case_id=doc.case_id,
        case_title=case.title if case else None,
        title=doc.title,
        category=doc.category,
        classification=doc.classification,
        current_version=doc.current_version,
        status=doc.status,
        is_restricted=doc.is_restricted,
        restriction_reason=doc.restriction_reason,
        sha256_fingerprint=doc_version.sha256_hash,
        uploaded_by=doc.uploaded_by,
        uploader_name=current_user.full_name,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        versions=[
            DocumentVersionResponse(
                id=doc_version.id,
                document_id=doc_version.document_id,
                version_number=doc_version.version_number,
                file_name=doc_version.file_name,
                file_size=doc_version.file_size,
                mime_type=doc_version.mime_type,
                sha256_hash=doc_version.sha256_hash,
                change_summary=doc_version.change_summary,
                uploader_name=current_user.full_name,
                created_at=doc_version.created_at,
                is_tampered=doc_version.is_tampered
            )
        ]
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not PermissionService.user_has_document_access(db, current_user, doc, "VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this document."
        )

    # Record access on blockchain
    BlockchainService.recordAccess(
        db=db,
        case_id=doc.case_id,
        document_id=doc.id,
        user_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.sub_role or current_user.role,
        action="VIEW"
    )

    versions_resp = []
    for v in doc.versions:
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

    case = db.query(Case).filter(Case.id == doc.case_id).first()
    uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
    latest_v = doc.versions[-1] if doc.versions else None

    return DocumentResponse(
        id=doc.id,
        case_id=doc.case_id,
        case_title=case.title if case else None,
        title=doc.title,
        category=doc.category,
        classification=getattr(doc, "classification", "PUBLIC_CASE_RECORD") or "PUBLIC_CASE_RECORD",
        current_version=doc.current_version,
        status=doc.status,
        is_restricted=doc.is_restricted,
        restriction_reason=doc.restriction_reason,
        sha256_fingerprint=latest_v.sha256_hash if latest_v else "N/A",
        uploaded_by=doc.uploaded_by,
        uploader_name=uploader.full_name if uploader else "Registrar",
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        versions=versions_resp
    )

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    version: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not PermissionService.user_has_document_access(db, current_user, doc, "DOWNLOAD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to download this document."
        )

    file_bytes, doc_version = DocumentService.get_decrypted_document_bytes(db, document_id, version)

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="DOWNLOAD_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"version": doc_version.version_number}
    )

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type=doc_version.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc_version.file_name}"',
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(file_bytes))
        }
    )

@router.get("/{document_id}/preview")
def preview_document(
    document_id: str,
    version: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not PermissionService.user_has_document_access(db, current_user, doc, "VIEW"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this document."
        )

    file_bytes, doc_version = DocumentService.get_decrypted_document_bytes(db, document_id, version)

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="VIEW_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"version": doc_version.version_number, "file_name": doc_version.file_name}
    )

    return Response(
        content=file_bytes,
        media_type=doc_version.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{doc_version.file_name}"',
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(file_bytes))
        }
    )


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse)
async def create_version(
    document_id: str,
    change_summary: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not PermissionService.user_has_case_access(db, current_user, doc.case_id, "CREATE_VERSION"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to create new versions for this document."
        )

    file_bytes = await file.read()
    validate_uploaded_file(file, file_bytes)
    file_name = file.filename or f"{doc.title}_v{doc.current_version + 1}.pdf"
    mime_type = file.content_type or "application/pdf"

    new_v = DocumentService.create_new_version(
        db=db,
        document_id=document_id,
        file_bytes=file_bytes,
        file_name=file_name,
        mime_type=mime_type,
        user=current_user,
        change_summary=change_summary
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="CREATE_VERSION",
        resource_type="DOCUMENT",
        resource_id=document_id,
        outcome="SUCCESS",
        details={"new_version": new_v.version_number, "change_summary": change_summary}
    )

    return DocumentVersionResponse(
        id=new_v.id,
        document_id=new_v.document_id,
        version_number=new_v.version_number,
        file_name=new_v.file_name,
        file_size=new_v.file_size,
        mime_type=new_v.mime_type,
        sha256_hash=new_v.sha256_hash,
        change_summary=new_v.change_summary,
        uploader_name=current_user.full_name,
        created_at=new_v.created_at,
        is_tampered=new_v.is_tampered
    )

@router.post("/{document_id}/verify", response_model=DocumentVerifyResponse)
def verify_document_integrity(
    document_id: str,
    version: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    v_num = version if version is not None else doc.current_version
    result = IntegrityService.verify_document_version(
        db=db,
        document_id=document_id,
        version_number=v_num,
        user=current_user
    )

    return DocumentVerifyResponse(**result)

@router.post("/{document_id}/archive", response_model=DocumentResponse)
def archive_document(
    document_id: str,
    request: ArchiveDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not PermissionService.user_has_case_access(db, current_user, doc.case_id, "ARCHIVE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to archive this document."
        )

    archived_doc = DocumentService.archive_document(
        db=db,
        document_id=document_id,
        user=current_user,
        reason=request.reason
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="ARCHIVE_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"reason": request.reason}
    )

    versions_resp = []
    for v in archived_doc.versions:
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

    case = db.query(Case).filter(Case.id == archived_doc.case_id).first()
    uploader = db.query(User).filter(User.id == archived_doc.uploaded_by).first()
    latest_v = archived_doc.versions[-1] if archived_doc.versions else None

    return DocumentResponse(
        id=archived_doc.id,
        case_id=archived_doc.case_id,
        case_title=case.title if case else None,
        title=archived_doc.title,
        category=archived_doc.category,
        classification=getattr(archived_doc, "classification", "PUBLIC_CASE_RECORD") or "PUBLIC_CASE_RECORD",
        current_version=archived_doc.current_version,
        status=archived_doc.status,
        is_restricted=archived_doc.is_restricted,
        restriction_reason=archived_doc.restriction_reason,
        sha256_fingerprint=latest_v.sha256_hash if latest_v else "N/A",
        uploaded_by=archived_doc.uploaded_by,
        uploader_name=uploader.full_name if uploader else "Registrar",
        created_at=archived_doc.created_at,
        updated_at=archived_doc.updated_at,
        versions=versions_resp
    )
