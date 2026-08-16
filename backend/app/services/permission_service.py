import json
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import User, Case, Document, Permission, AccessRequest, CaseAssignment
from app.services.blockchain_service import BlockchainService

class PermissionService:
    @classmethod
    def user_has_case_access(cls, db: Session, user: User, case_id: str, required_permission: str = "VIEW") -> bool:
        """
        Check if user has authorization to access case.
        Based on: ROLE + SUB-ROLE + ASSIGNMENT + EXPLICIT PERMISSION
        """
        # Court Administrators have system-wide oversight
        if user.role in ["COURT_ADMIN", "ADMIN"] or "Administrator" in user.sub_role:
            return True

        # Check explicit Case Assignment
        assignment = db.query(CaseAssignment).filter(
            CaseAssignment.user_id == user.id,
            CaseAssignment.case_id == case_id
        ).first()

        if assignment:
            # Check role-specific constraints
            if required_permission in ["VIEW", "DOWNLOAD"]:
                return True
            if required_permission in ["UPLOAD", "CREATE_VERSION", "SHARE"]:
                if user.role in ["JUDGE", "LAWYER"]:
                    return True
            if required_permission == "ARCHIVE":
                if "Lead Lawyer" in user.sub_role or user.role == "JUDGE":
                    return True
            if required_permission == "APPROVE_ACCESS":
                return user.role in ["COURT_ADMIN", "ADMIN"]
            return True

        # Check explicit granted Permission table entry
        explicit_perm = db.query(Permission).filter(
            Permission.user_id == user.id,
            Permission.case_id == case_id,
            Permission.permission_type == required_permission
        ).first()

        if explicit_perm:
            return True

        # Also check if VIEW was explicitly granted for case
        if required_permission == "VIEW":
            any_perm = db.query(Permission).filter(
                Permission.user_id == user.id,
                Permission.case_id == case_id
            ).first()
            if any_perm:
                return True

        return False

    @classmethod
    def user_has_document_access(cls, db: Session, user: User, document: Document, required_permission: str = "VIEW") -> bool:
        """Check document level authorization."""
        # First check case level access
        if not cls.user_has_case_access(db, user, document.case_id, required_permission):
            return False

        # If document is RESTRICTED (e.g. during security incident), only Admin or Judge can access
        if document.is_restricted or document.status == "RESTRICTED":
            if user.role not in ["JUDGE", "COURT_ADMIN", "ADMIN"]:
                return False

        return True

    @classmethod
    def create_access_request(
        cls,
        db: Session,
        user: User,
        case_id: str,
        requested_permissions: List[str],
        reason: str
    ) -> AccessRequest:
        """Submit an access authorization request."""
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        # Check if already has a pending request
        existing = db.query(AccessRequest).filter(
            AccessRequest.user_id == user.id,
            AccessRequest.case_id == case_id,
            AccessRequest.status == "PENDING"
        ).first()

        if existing:
            return existing

        req_id = f"REQ-{case_id.split('-')[-1]}-{uuid.uuid4().hex[:4].upper()}"
        req = AccessRequest(
            id=req_id,
            user_id=user.id,
            case_id=case_id,
            requested_permissions=json.dumps(requested_permissions),
            reason=reason,
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    @classmethod
    def review_access_request(
        cls,
        db: Session,
        request_id: str,
        reviewer: User,
        is_approved: bool,
        review_note: Optional[str] = None
    ) -> AccessRequest:
        """
        Review and resolve an access request.
        If approved, grants explicit Permission records and registers on Blockchain.
        """
        req = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Access request not found")

        req.status = "APPROVED" if is_approved else "REJECTED"
        req.reviewed_by = reviewer.id
        req.reviewed_at = datetime.utcnow()
        req.review_note = review_note or ("Approved by Court Administrator" if is_approved else "Rejected by Court Administrator")

        if is_approved:
            perms = json.loads(req.requested_permissions)
            target_user = db.query(User).filter(User.id == req.user_id).first()

            for perm_type in perms:
                # Add to DB permissions table if not existing
                exists = db.query(Permission).filter(
                    Permission.user_id == req.user_id,
                    Permission.case_id == req.case_id,
                    Permission.permission_type == perm_type
                ).first()

                if not exists:
                    new_perm = Permission(
                        user_id=req.user_id,
                        case_id=req.case_id,
                        document_id=None,
                        permission_type=perm_type,
                        granted_by=reviewer.id,
                        granted_at=datetime.utcnow()
                    )
                    db.add(new_perm)

            # Record on Blockchain Ledger
            BlockchainService.grantPermission(
                db=db,
                case_id=req.case_id,
                target_user_name=target_user.full_name if target_user else f"User {req.user_id}",
                target_user_role=target_user.sub_role if target_user else "User",
                permissions=perms,
                granter_id=reviewer.id,
                granter_name=reviewer.full_name,
                granter_role=reviewer.sub_role or reviewer.role
            )

        db.commit()
        db.refresh(req)
        return req
