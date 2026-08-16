import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import AccessRequest, Case, User
from app.schemas.schemas import AccessRequestCreate, AccessRequestResponse, AccessRequestReview
from app.services.auth_service import get_current_user
from app.services.permission_service import PermissionService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/access-requests", tags=["Access Requests"])

@router.post("", response_model=AccessRequestResponse)
def submit_access_request(
    req_in: AccessRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == req_in.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    req = PermissionService.create_access_request(
        db=db,
        user=current_user,
        case_id=req_in.case_id,
        requested_permissions=req_in.requested_permissions,
        reason=req_in.reason
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="REQUEST_ACCESS",
        resource_type="CASE",
        resource_id=req_in.case_id,
        outcome="SUCCESS",
        details={"reason": req_in.reason, "requested_permissions": req_in.requested_permissions}
    )

    return AccessRequestResponse(
        id=req.id,
        user_id=req.user_id,
        username=current_user.username,
        user_full_name=current_user.full_name,
        user_role=current_user.sub_role,
        case_id=req.case_id,
        case_title=case.title,
        requested_permissions=json.loads(req.requested_permissions),
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewer_name=None,
        reviewed_at=req.reviewed_at,
        review_note=req.review_note,
        created_at=req.created_at
    )

@router.get("", response_model=List[AccessRequestResponse])
def list_access_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Court Admin sees all requests; other users see their own
    is_admin = current_user.role in ["COURT_ADMIN", "ADMIN"] or "Administrator" in current_user.sub_role

    if is_admin:
        requests = db.query(AccessRequest).order_by(AccessRequest.created_at.desc()).all()
    else:
        requests = db.query(AccessRequest).filter(AccessRequest.user_id == current_user.id).order_by(AccessRequest.created_at.desc()).all()

    results = []
    for r in requests:
        user_obj = db.query(User).filter(User.id == r.user_id).first()
        case_obj = db.query(Case).filter(Case.id == r.case_id).first()
        reviewer_obj = db.query(User).filter(User.id == r.reviewed_by).first() if r.reviewed_by else None

        results.append(AccessRequestResponse(
            id=r.id,
            user_id=r.user_id,
            username=user_obj.username if user_obj else "User",
            user_full_name=user_obj.full_name if user_obj else "User",
            user_role=user_obj.sub_role if user_obj else "Role",
            case_id=r.case_id,
            case_title=case_obj.title if case_obj else r.case_id,
            requested_permissions=json.loads(r.requested_permissions) if r.requested_permissions else [],
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewer_name=reviewer_obj.full_name if reviewer_obj else None,
            reviewed_at=r.reviewed_at,
            review_note=r.review_note,
            created_at=r.created_at
        ))

    return results

@router.post("/{request_id}/approve", response_model=AccessRequestResponse)
def approve_access_request(
    request_id: str,
    review_in: AccessRequestReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only Court Administrator or Admin can approve
    if current_user.role not in ["COURT_ADMIN", "ADMIN"] and "Administrator" not in current_user.sub_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Court Administrators have authority to approve case access requests."
        )

    req = PermissionService.review_access_request(
        db=db,
        request_id=request_id,
        reviewer=current_user,
        is_approved=True,
        review_note=review_in.review_note
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="APPROVE_ACCESS",
        resource_type="ACCESS_REQUEST",
        resource_id=request_id,
        outcome="SUCCESS",
        details={"case_id": req.case_id, "user_id": req.user_id}
    )

    user_obj = db.query(User).filter(User.id == req.user_id).first()
    case_obj = db.query(Case).filter(Case.id == req.case_id).first()

    return AccessRequestResponse(
        id=req.id,
        user_id=req.user_id,
        username=user_obj.username if user_obj else "User",
        user_full_name=user_obj.full_name if user_obj else "User",
        user_role=user_obj.sub_role if user_obj else "Role",
        case_id=req.case_id,
        case_title=case_obj.title if case_obj else req.case_id,
        requested_permissions=json.loads(req.requested_permissions),
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewer_name=current_user.full_name,
        reviewed_at=req.reviewed_at,
        review_note=req.review_note,
        created_at=req.created_at
    )

@router.post("/{request_id}/reject", response_model=AccessRequestResponse)
def reject_access_request(
    request_id: str,
    review_in: AccessRequestReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["COURT_ADMIN", "ADMIN"] and "Administrator" not in current_user.sub_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Court Administrators have authority to review case access requests."
        )

    req = PermissionService.review_access_request(
        db=db,
        request_id=request_id,
        reviewer=current_user,
        is_approved=False,
        review_note=review_in.review_note
    )

    AuditService.log_event(
        db=db,
        actor=current_user,
        action="REJECT_ACCESS",
        resource_type="ACCESS_REQUEST",
        resource_id=request_id,
        outcome="DENIED",
        details={"case_id": req.case_id, "user_id": req.user_id}
    )

    user_obj = db.query(User).filter(User.id == req.user_id).first()
    case_obj = db.query(Case).filter(Case.id == req.case_id).first()

    return AccessRequestResponse(
        id=req.id,
        user_id=req.user_id,
        username=user_obj.username if user_obj else "User",
        user_full_name=user_obj.full_name if user_obj else "User",
        user_role=user_obj.sub_role if user_obj else "Role",
        case_id=req.case_id,
        case_title=case_obj.title if case_obj else req.case_id,
        requested_permissions=json.loads(req.requested_permissions),
        reason=req.reason,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewer_name=current_user.full_name,
        reviewed_at=req.reviewed_at,
        review_note=req.review_note,
        created_at=req.created_at
    )
