import json
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import AuditEvent
from app.schemas.schemas import AuditEventResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("/logs", response_model=List[AuditEventResponse])
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    logs = AuditService.get_logs(db, limit=limit)
    results = []
    for l in logs:
        try:
            details_dict = json.loads(l.details_json) if l.details_json else {}
        except Exception:
            details_dict = {}

        results.append(AuditEventResponse(
            id=l.id,
            timestamp=l.timestamp,
            actor_name=l.actor_name,
            actor_role=l.actor_role,
            action=l.action,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            ip_address=l.ip_address,
            outcome=l.outcome,
            details=details_dict
        ))
    return results
